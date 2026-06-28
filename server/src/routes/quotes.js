import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { upsertQuote } from '../services/quoteIntake.js';

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({
  requirement_item_id: z.coerce.number().int(),
  price_per_kg: z.coerce.number().nonnegative().nullable().optional(),
  gst_pct: z.coerce.number().min(0).max(100).default(0),
  lead_time_days: z.coerce.number().int().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  no_quote: z.coerce.boolean().optional(),
});
const quoteSchema = z.object({
  submitted_by: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1),
});

// procurement enters a quote on a vendor's behalf
router.post('/rfq/:rfqId', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const rfq = await db.get('SELECT * FROM rfqs WHERE id = ?', [req.params.rfqId]);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    const p = quoteSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const vendor = await db.get('SELECT name FROM vendors WHERE id=?', [rfq.vendor_id]);
    const quoteId = await upsertQuote(rfq, {
      entered_via: 'manual',
      submitted_by: p.data.submitted_by || `${req.user.name} (manual)`,
      valid_until: p.data.valid_until,
      notes: p.data.notes,
      lines: p.data.lines,
    });
    await audit(req.user.id, 'enter_quote', 'rfq', rfq.id, { vendor: vendor?.name });
    res.json({ ok: true, quote_id: quoteId });
  } catch (e) { next(e); }
});

// fetch a quote (for editing) by rfq
router.get('/rfq/:rfqId', async (req, res, next) => {
  try {
    const rfq = await db.get('SELECT * FROM rfqs WHERE id = ?', [req.params.rfqId]);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    const quote = await db.get('SELECT * FROM quotes WHERE rfq_id = ?', [rfq.id]);
    const lines = quote ? await db.all('SELECT * FROM quote_lines WHERE quote_id = ?', [quote.id]) : [];
    res.json({ rfq, quote: quote || null, lines });
  } catch (e) { next(e); }
});

export default router;
