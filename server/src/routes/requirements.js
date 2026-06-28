import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { nextRequirementRef } from '../util/helpers.js';

const router = Router();
router.use(requireAuth);

// ---- list (role-aware) ---------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.*, u.name AS raised_by_name, a.name AS approved_by_name,
        (SELECT COUNT(*) FROM requirement_items ri WHERE ri.requirement_id = r.id) AS item_count,
        (SELECT COUNT(*) FROM rfqs q WHERE q.requirement_id = r.id) AS rfq_count,
        (SELECT COUNT(*) FROM rfqs q JOIN quotes qt ON qt.rfq_id=q.id WHERE q.requirement_id = r.id) AS quote_count
      FROM requirements r
      JOIN users u ON u.id = r.raised_by
      LEFT JOIN users a ON a.id = r.approved_by
      WHERE 1=1`;
    const args = [];
    if (status) { sql += ' AND r.status = ?'; args.push(status); }
    sql += ' ORDER BY r.created_at DESC';
    res.json({ requirements: await db.all(sql, args) });
  } catch (e) { next(e); }
});

// ---- single (with items) -------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const r = await db.get(`
      SELECT r.*, u.name AS raised_by_name, a.name AS approved_by_name
      FROM requirements r JOIN users u ON u.id = r.raised_by
      LEFT JOIN users a ON a.id = r.approved_by WHERE r.id = ?`, [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Requirement not found' });
    const items = await db.all('SELECT * FROM requirement_items WHERE requirement_id = ? ORDER BY line_no, id', [r.id]);
    const rfqs = await db.all(`
      SELECT rfq.*, v.name AS vendor_name,
        (SELECT COUNT(*) FROM quotes q WHERE q.rfq_id = rfq.id) AS has_quote
      FROM rfqs rfq JOIN vendors v ON v.id = rfq.vendor_id
      WHERE rfq.requirement_id = ? ORDER BY v.name`, [r.id]);
    res.json({ requirement: r, items, rfqs });
  } catch (e) { next(e); }
});

const itemSchema = z.object({
  material_id: z.coerce.number().int().nullable().optional(),
  mat_code: z.string().optional().default(''),
  description: z.string().optional().default(''),
  required_qty_kg: z.coerce.number().positive(),
  target_price: z.coerce.number().nullable().optional(),
});

const reqSchema = z.object({
  title: z.string().min(2),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  needed_by: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

// auto-fill last PO price/date/supplier from price_history when material known
async function fillAndInsertItem(cx, requirementId, it, lineNo) {
  let lastPoPrice = null, lastPoDate = null, lastSupplierId = null, lastSupplierName = null;
  let matCode = it.mat_code, desc = it.description, materialId = it.material_id || null;

  if (materialId) {
    const m = await cx.get('SELECT * FROM materials WHERE id = ?', [materialId]);
    if (m) { matCode = m.mat_code; desc = desc || m.description; }
    const po = await cx.get(`
      SELECT ph.*, v.name AS vendor_name FROM price_history ph
      LEFT JOIN vendors v ON v.id = ph.vendor_id
      WHERE ph.material_id = ? AND ph.source = 'po'
      ORDER BY ph.price_date DESC LIMIT 1`, [materialId]);
    if (po) { lastPoPrice = po.price_per_kg; lastPoDate = po.price_date; lastSupplierId = po.vendor_id; lastSupplierName = po.vendor_name; }
  }
  await cx.run(
    `INSERT INTO requirement_items
      (requirement_id, material_id, mat_code, description, required_qty_kg, target_price,
       last_po_price, last_po_date, last_supplier_id, last_supplier_name, line_no)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [requirementId, materialId, matCode, desc, it.required_qty_kg, it.target_price ?? null,
      lastPoPrice, lastPoDate, lastSupplierId, lastSupplierName, lineNo]
  );
}

// ---- create (requisitioner / procurement) -------------------------------
router.post('/', requireRole(ROLES.REQUISITIONER, ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const parsed = reqSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
    const data = parsed.data;

    const result = await db.tx(async (cx) => {
      const ref = await nextRequirementRef(cx);
      const row = await cx.get(
        `INSERT INTO requirements (ref_no, title, status, priority, needed_by, raised_by, remarks)
         VALUES (?, ?, 'pending_approval', ?, ?, ?, ?) RETURNING id`,
        [ref, data.title, data.priority, data.needed_by || null, req.user.id, data.remarks || null]
      );
      let i = 1;
      for (const it of data.items) await fillAndInsertItem(cx, row.id, it, i++);
      return { reqId: row.id, ref };
    });
    await audit(req.user.id, 'create', 'requirement', result.reqId, { ref: result.ref });
    res.status(201).json({ id: result.reqId, ref_no: result.ref });
  } catch (e) { next(e); }
});

// ---- update (only while draft / pending / rejected) ----------------------
router.put('/:id', async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'pending_approval', 'rejected'].includes(r.status))
      return res.status(409).json({ error: `Cannot edit a requirement in status "${r.status}"` });
    const parsed = reqSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const data = parsed.data;
    await db.tx(async (cx) => {
      await cx.run(`UPDATE requirements SET title=?, priority=?, needed_by=?, remarks=?, status='pending_approval', updated_at=now() WHERE id=?`,
        [data.title, data.priority, data.needed_by || null, data.remarks || null, r.id]);
      await cx.run('DELETE FROM requirement_items WHERE requirement_id = ?', [r.id]);
      let i = 1;
      for (const it of data.items) await fillAndInsertItem(cx, r.id, it, i++);
    });
    await audit(req.user.id, 'update', 'requirement', r.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- approve / reject (dept head) ---------------------------------------
router.post('/:id/approve', requireRole(ROLES.DEPTHEAD), async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.status !== 'pending_approval') return res.status(409).json({ error: `Requirement is "${r.status}", not pending approval` });
    await db.run(`UPDATE requirements SET status='approved', approved_by=?, approved_at=now(), rejected_reason=NULL, updated_at=now() WHERE id=?`,
      [req.user.id, r.id]);
    await audit(req.user.id, 'approve', 'requirement', r.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/reject', requireRole(ROLES.DEPTHEAD), async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.status !== 'pending_approval') return res.status(409).json({ error: `Requirement is "${r.status}"` });
    await db.run(`UPDATE requirements SET status='rejected', rejected_reason=?, updated_at=now() WHERE id=?`,
      [req.body?.reason || 'Rejected', r.id]);
    await audit(req.user.id, 'reject', 'requirement', r.id, req.body?.reason);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- submit a draft for approval ----------------------------------------
router.post('/:id/submit', async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    await db.run(`UPDATE requirements SET status='pending_approval', updated_at=now() WHERE id=?`, [r.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- cancel --------------------------------------------------------------
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    await db.run(`UPDATE requirements SET status='cancelled', updated_at=now() WHERE id=?`, [r.id]);
    await audit(req.user.id, 'cancel', 'requirement', r.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
