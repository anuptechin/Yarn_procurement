import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    let sql = `SELECT m.*,
        (SELECT price_per_kg FROM price_history p WHERE p.material_id=m.id AND p.source='po' ORDER BY price_date DESC LIMIT 1) AS last_po_price,
        (SELECT price_date FROM price_history p WHERE p.material_id=m.id AND p.source='po' ORDER BY price_date DESC LIMIT 1) AS last_po_date,
        (SELECT price_per_kg FROM price_history p WHERE p.material_id=m.id ORDER BY price_date DESC LIMIT 1) AS latest_price
      FROM materials m WHERE m.active = 1`;
    const args = [];
    if (q) { sql += ' AND (m.mat_code ILIKE ? OR m.description ILIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY m.mat_code';
    res.json({ materials: await db.all(sql, args) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const m = await db.get('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!m) return res.status(404).json({ error: 'Material not found' });
    const history = await db.all(`
      SELECT p.*, v.name AS vendor_name FROM price_history p
      LEFT JOIN vendors v ON v.id = p.vendor_id
      WHERE p.material_id = ? ORDER BY p.price_date`, [m.id]);
    res.json({ material: m, history });
  } catch (e) { next(e); }
});

const matSchema = z.object({
  mat_code: z.string().min(2),
  description: z.string().min(2),
  category: z.string().nullable().optional(),
  uom: z.string().default('Kg'),
});

router.post('/', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const p = matSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    const row = await db.get(`INSERT INTO materials (mat_code, description, category, uom) VALUES (?,?,?,?) RETURNING id`,
      [d.mat_code, d.description, d.category || null, d.uom]);
    await audit(req.user.id, 'create', 'material', row.id);
    res.status(201).json({ id: row.id });
  } catch (e) {
    if (String(e.message).includes('duplicate') || String(e.code) === '23505')
      return res.status(409).json({ error: 'Material code already exists' });
    next(e);
  }
});

router.put('/:id', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const m = await db.get('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!m) return res.status(404).json({ error: 'Not found' });
    const p = matSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    await db.run(`UPDATE materials SET mat_code=?, description=?, category=?, uom=? WHERE id=?`,
      [d.mat_code ?? m.mat_code, d.description ?? m.description, d.category ?? m.category, d.uom ?? m.uom, m.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// add a price point (market or PO)
const priceSchema = z.object({
  price_date: z.string().min(4),
  price_per_kg: z.coerce.number().positive(),
  source: z.enum(['po', 'market', 'quote']).default('market'),
  vendor_id: z.coerce.number().int().nullable().optional(),
});
router.post('/:id/prices', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const m = await db.get('SELECT id FROM materials WHERE id = ?', [req.params.id]);
    if (!m) return res.status(404).json({ error: 'Material not found' });
    const p = priceSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    const row = await db.get(`INSERT INTO price_history (material_id, price_date, price_per_kg, source, vendor_id) VALUES (?,?,?,?,?) RETURNING id`,
      [m.id, d.price_date, d.price_per_kg, d.source, d.vendor_id || null]);
    res.status(201).json({ id: row.id });
  } catch (e) { next(e); }
});

export default router;
