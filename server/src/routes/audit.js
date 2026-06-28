import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireSuperAdmin } from '../auth.js';

// Detailed audit log — Super Admin only.
const router = Router();
router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    // Optional filters
    const where = [];
    const params = [];
    if (req.query.entity) { where.push('a.entity = ?'); params.push(String(req.query.entity)); }
    if (req.query.action) { where.push('a.action = ?'); params.push(String(req.query.action)); }
    if (req.query.user_id) { where.push('a.user_id = ?'); params.push(Number(req.query.user_id)); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (await db.get(`SELECT COUNT(*) n FROM audit_log a ${whereSql}`, params)).n;
    const rows = await db.all(
      `SELECT a.id, a.created_at, a.user_id, a.action, a.entity, a.entity_id, a.detail,
              u.name AS user_name, u.email AS user_email
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ total, limit, offset, entries: rows });
  } catch (e) { next(e); }
});

// distinct entities + actions, to drive filter dropdowns
router.get('/facets', async (_req, res, next) => {
  try {
    const entities = (await db.all(`SELECT DISTINCT entity FROM audit_log WHERE entity IS NOT NULL ORDER BY entity`)).map((r) => r.entity);
    const actions = (await db.all(`SELECT DISTINCT action FROM audit_log ORDER BY action`)).map((r) => r.action);
    res.json({ entities, actions });
  } catch (e) { next(e); }
});

export default router;
