import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES, hashPassword, isSuperAdmin } from '../auth.js';

// User management — admin only (admin role grants everything).
const router = Router();
router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN));

const roleEnum = z.enum([ROLES.REQUISITIONER, ROLES.PROCUREMENT, ROLES.DEPTHEAD, ROLES.ADMIN]);

// list (the Super Admin account is hidden — never listed)
router.get('/', async (_req, res, next) => {
  try {
    const users = await db.all(
      `SELECT id, name, email, role, active, created_at FROM users ORDER BY role, name`
    );
    res.json({ users: users.filter((u) => !isSuperAdmin(u)) });
  } catch (e) { next(e); }
});

// create
const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: roleEnum,
  password: z.string().min(6),
});

router.post('/', async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    const email = d.email.toLowerCase().trim();
    const exists = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ error: 'A user with that email already exists.' });

    const row = await db.get(
      `INSERT INTO users (name, email, role, password_hash, active)
       VALUES (?, ?, ?, ?, 1) RETURNING id`,
      [d.name.trim(), email, d.role, hashPassword(d.password)]
    );
    await audit(req.user.id, 'create', 'user', row.id, { email, role: d.role });
    res.status(201).json({ id: row.id });
  } catch (e) { next(e); }
});

// update (name / role / active / optional password reset). Email is immutable.
const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: roleEnum.optional(),
  active: z.coerce.boolean().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
});

router.put('/:id', async (req, res, next) => {
  try {
    const target = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const p = updateSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;

    const targetIsSuper = isSuperAdmin(target);
    const isSelf = target.id === req.user.id;

    // Guards: never let the Super Admin be locked out or demoted, and don't let
    // an admin lock out or demote themselves.
    const wantsDeactivate = d.active === false;
    const wantsRoleChange = d.role && d.role !== target.role;
    if (targetIsSuper && (wantsDeactivate || wantsRoleChange))
      return res.status(403).json({ error: 'The Super Admin account cannot be deactivated or have its role changed.' });
    if (isSelf && wantsDeactivate)
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    if (isSelf && wantsRoleChange)
      return res.status(400).json({ error: 'You cannot change your own role.' });

    const m = {
      name: d.name ?? target.name,
      role: d.role ?? target.role,
      active: d.active != null ? (d.active ? 1 : 0) : target.active,
    };
    await db.run('UPDATE users SET name=?, role=?, active=? WHERE id=?', [m.name, m.role, m.active, target.id]);
    if (d.password) await db.run('UPDATE users SET password_hash=? WHERE id=?', [hashPassword(d.password), target.id]);

    await audit(req.user.id, 'update', 'user', target.id,
      { role: m.role, active: m.active, password_reset: !!d.password });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
