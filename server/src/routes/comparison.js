import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { buildComparison, DEFAULT_WEIGHTS } from '../services/comparison.js';
import { streamComparisonXlsx } from '../services/excel.js';
import { isoDate } from '../util/helpers.js';

const router = Router();
router.use(requireAuth);

function weightsFromQuery(q) {
  const w = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(DEFAULT_WEIGHTS)) {
    if (q[k] != null && !Number.isNaN(Number(q[k]))) w[k] = Number(q[k]);
  }
  return w;
}

// JSON comparison matrix
router.get('/requirement/:reqId', async (req, res, next) => {
  try {
    const data = await buildComparison(req.params.reqId, weightsFromQuery(req.query));
    if (!data) return res.status(404).json({ error: 'Requirement not found' });
    res.json(data);
  } catch (e) { next(e); }
});

// Excel export
router.get('/requirement/:reqId/export', async (req, res, next) => {
  try {
    const data = await buildComparison(req.params.reqId, weightsFromQuery(req.query));
    if (!data) return res.status(404).json({ error: 'Requirement not found' });
    await streamComparisonXlsx(res, data);
  } catch (e) { next(e); }
});

// ---- award (dept head) ---------------------------------------------------
const awardSchema = z.object({
  awards: z.array(z.object({
    requirement_item_id: z.coerce.number().int(),
    vendor_id: z.coerce.number().int(),
    justification: z.string().nullable().optional(),
  })).min(1),
});

router.post('/requirement/:reqId/award', requireRole(ROLES.DEPTHEAD), async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id=?', [req.params.reqId]);
    if (!r) return res.status(404).json({ error: 'Requirement not found' });
    const p = awardSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });

    await db.tx(async (cx) => {
      for (const a of p.data.awards) {
        const item = await cx.get('SELECT * FROM requirement_items WHERE id=? AND requirement_id=?', [a.requirement_item_id, r.id]);
        if (!item) continue;
        const rfq = await cx.get('SELECT id FROM rfqs WHERE requirement_id=? AND vendor_id=?', [r.id, a.vendor_id]);
        const quote = rfq ? await cx.get('SELECT id FROM quotes WHERE rfq_id=?', [rfq.id]) : null;
        const line = quote ? await cx.get('SELECT * FROM quote_lines WHERE quote_id=? AND requirement_item_id=?', [quote.id, item.id]) : null;
        // Award & last-PO are tracked on the basic price (ex-GST); GST stays separate.
        const basePrice = line && line.price_per_kg != null ? Number(line.price_per_kg) : null;

        await cx.run(`
          INSERT INTO awards (requirement_id, requirement_item_id, vendor_id, quote_line_id, awarded_price, decided_by, justification)
          VALUES (?,?,?,?,?,?,?)
          ON CONFLICT(requirement_item_id) DO UPDATE SET
            vendor_id=excluded.vendor_id, quote_line_id=excluded.quote_line_id,
            awarded_price=excluded.awarded_price, decided_by=excluded.decided_by,
            decided_at=now(), justification=excluded.justification`,
          [r.id, item.id, a.vendor_id, line ? line.id : null, basePrice, req.user.id, a.justification || null]);

        // record awarded basic price as new "last PO" reference for the material
        if (item.material_id && basePrice != null) {
          await cx.run(`INSERT INTO price_history (material_id, price_date, price_per_kg, source, vendor_id) VALUES (?, ?, ?, 'po', ?)`,
            [item.material_id, isoDate(), basePrice, a.vendor_id]);
        }
      }
      await cx.run(`UPDATE requirements SET status='awarded', updated_at=now() WHERE id=?`, [r.id]);
    });
    await audit(req.user.id, 'award', 'requirement', r.id, { items: p.data.awards.length });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
