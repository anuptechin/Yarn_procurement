import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { upsertQuote } from '../services/quoteIntake.js';

// Public, token-authenticated vendor portal. No login required.
const router = Router();

async function loadByToken(token) {
  return db.get(`
    SELECT rfq.*, r.ref_no, r.title, r.needed_by, r.category, v.name AS vendor_name, v.contact_person, v.default_payment_terms, v.default_lead_time
    FROM rfqs rfq
    JOIN requirements r ON r.id = rfq.requirement_id
    JOIN vendors v ON v.id = rfq.vendor_id
    WHERE rfq.token = ?`, [token]);
}

// GET the RFQ a vendor needs to fill
router.get('/:token', async (req, res, next) => {
  try {
    const rfq = await loadByToken(req.params.token);
    if (!rfq) return res.status(404).json({ error: 'This quote link is invalid or has expired.' });

    if (rfq.status === 'sent') {
      await db.run(`UPDATE rfqs SET status='viewed', viewed_at=now() WHERE id=?`, [rfq.id]);
    }
    const items = await db.all('SELECT id, mat_code, description, required_qty_kg FROM requirement_items WHERE requirement_id=? ORDER BY line_no', [rfq.requirement_id]);
    const quote = await db.get('SELECT * FROM quotes WHERE rfq_id=?', [rfq.id]);
    const lines = quote ? await db.all('SELECT * FROM quote_lines WHERE quote_id=?', [quote.id]) : [];

    res.json({
      rfq: {
        ref_no: rfq.ref_no, title: rfq.title, needed_by: rfq.needed_by, due_date: rfq.due_date, category: rfq.category,
        status: rfq.status, vendor_name: rfq.vendor_name, contact_person: rfq.contact_person,
        default_payment_terms: rfq.default_payment_terms, default_lead_time: rfq.default_lead_time,
      },
      items,
      existing: quote ? { submitted_at: quote.submitted_at, notes: quote.notes, valid_until: quote.valid_until, lines } : null,
    });
  } catch (e) { next(e); }
});

const lineSchema = z.object({
  requirement_item_id: z.coerce.number().int(),
  price_per_kg: z.coerce.number().nonnegative().nullable().optional(),
  gst_pct: z.coerce.number().min(0).max(100).default(0),
  lead_time_days: z.coerce.number().int().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  no_quote: z.coerce.boolean().optional(),
});
const submitSchema = z.object({
  contact_name: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1),
});

// vendor submits / updates their quote
router.post('/:token', async (req, res, next) => {
  try {
    const rfq = await loadByToken(req.params.token);
    if (!rfq) return res.status(404).json({ error: 'This quote link is invalid or has expired.' });
    if (rfq.status === 'declined') return res.status(409).json({ error: 'This RFQ was marked declined.' });

    const p = submitSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });

    await upsertQuote(rfq, {
      entered_via: 'portal',
      submitted_by: p.data.contact_name || rfq.contact_person || rfq.vendor_name,
      valid_until: p.data.valid_until,
      notes: p.data.notes,
      lines: p.data.lines,
    });
    res.json({ ok: true, message: 'Thank you — your quote has been received.' });
  } catch (e) { next(e); }
});

// vendor declines
router.post('/:token/decline', async (req, res, next) => {
  try {
    const rfq = await loadByToken(req.params.token);
    if (!rfq) return res.status(404).json({ error: 'Invalid link' });
    await db.run(`UPDATE rfqs SET status='declined' WHERE id=?`, [rfq.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
