import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { newToken } from '../util/helpers.js';
import { config } from '../config.js';
import { streamRfqPdf } from '../services/pdf.js';
import { sendMail } from '../services/mailer.js';

const router = Router();

const portalLink = (token) => `${config.publicBaseUrl}/quote/${token}`;

async function getRfqFull(rfqId) {
  return db.get(`
    SELECT rfq.*, r.ref_no, r.title,
           v.name AS vendor_name, v.contact_person AS vendor_contact, v.email AS vendor_email
    FROM rfqs rfq
    JOIN requirements r ON r.id = rfq.requirement_id
    JOIN vendors v ON v.id = rfq.vendor_id
    WHERE rfq.id = ?`, [rfqId]);
}

// ---- dispatch RFQ to a set of vendors (procurement) ----------------------
const dispatchSchema = z.object({
  vendor_ids: z.array(z.coerce.number().int()).min(1),
  due_date: z.string().nullable().optional(),
});

router.post('/requirement/:reqId/dispatch', requireAuth, requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const r = await db.get('SELECT * FROM requirements WHERE id = ?', [req.params.reqId]);
    if (!r) return res.status(404).json({ error: 'Requirement not found' });
    if (!['approved', 'rfq_sent', 'quoting', 'comparison_ready'].includes(r.status))
      return res.status(409).json({ error: `Requirement must be approved before sending RFQ (current: ${r.status})` });

    const p = dispatchSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });

    const created = await db.tx(async (cx) => {
      const out = [];
      for (const vid of p.data.vendor_ids) {
        const exists = await cx.get('SELECT id FROM rfqs WHERE requirement_id=? AND vendor_id=?', [r.id, vid]);
        if (exists) { out.push({ vendor_id: vid, rfq_id: exists.id, existing: true }); continue; }
        const token = newToken();
        const row = await cx.get(
          `INSERT INTO rfqs (requirement_id, vendor_id, token, status, due_date, sent_at)
           VALUES (?, ?, ?, 'sent', ?, now()) RETURNING id`,
          [r.id, vid, token, p.data.due_date || null]
        );
        out.push({ vendor_id: vid, rfq_id: row.id, token });
      }
      if (r.status === 'approved')
        await cx.run(`UPDATE requirements SET status='rfq_sent', updated_at=now() WHERE id=?`, [r.id]);
      return out;
    });
    await audit(req.user.id, 'dispatch_rfq', 'requirement', r.id, { count: created.length });
    res.json({ ok: true, rfqs: created });
  } catch (e) { next(e); }
});

// ---- get an RFQ's email draft (text + mailto) ----------------------------
router.get('/:rfqId/email', requireAuth, requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const rfq = await getRfqFull(req.params.rfqId);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    const items = await db.all('SELECT * FROM requirement_items WHERE requirement_id=? ORDER BY line_no', [rfq.requirement_id]);

    const link = portalLink(rfq.token);
    const lines = items.map((it, i) => `  ${i + 1}. [${it.mat_code || '-'}] ${it.description} — ${Number(it.required_qty_kg).toLocaleString('en-IN')} Kg`).join('\n');
    const subject = `RFQ ${rfq.ref_no} — ${rfq.title} | D'Decor Yarn Procurement`;
    const text =
`Dear ${rfq.vendor_contact || rfq.vendor_name},

Please quote your best rates for the following yarn requirement:

${lines}

For each item, kindly provide:
  • Price per Kg (and applicable GST %)
  • Delivery lead time (days)
  • Payment terms
  • Quote validity & any remarks

Fastest way to respond — submit online:
${link}
${rfq.due_date ? `\nKindly send your quote by ${new Date(rfq.due_date).toLocaleDateString('en-IN')}.` : ''}

Regards,
${req.user.name}
D'Decor Yarn Procurement`;

    const result = await sendMail({ to: rfq.vendor_email || '', subject, text });
    res.json({
      rfq_id: rfq.id, vendor_name: rfq.vendor_name, to: rfq.vendor_email,
      subject, text, link, mail: result, pdf_url: `/api/rfqs/${rfq.id}/pdf`,
    });
  } catch (e) { next(e); }
});

// ---- RFQ PDF -------------------------------------------------------------
router.get('/:rfqId/pdf', requireAuth, async (req, res, next) => {
  try {
    const rfq = await getRfqFull(req.params.rfqId);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    const items = await db.all('SELECT * FROM requirement_items WHERE requirement_id=? ORDER BY line_no', [rfq.requirement_id]);
    streamRfqPdf(res, {
      requirement: { ref_no: rfq.ref_no, title: rfq.title },
      items,
      vendor: { name: rfq.vendor_name, contact_person: rfq.vendor_contact, email: rfq.vendor_email },
      dueDate: rfq.due_date,
      link: portalLink(rfq.token),
      fromName: req.user.name,
    });
  } catch (e) { next(e); }
});

// ---- mark an RFQ declined (manually) -------------------------------------
router.post('/:rfqId/decline', requireAuth, requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    await db.run(`UPDATE rfqs SET status='declined' WHERE id=?`, [req.params.rfqId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- delete an RFQ (if no quote yet) -------------------------------------
router.delete('/:rfqId', requireAuth, requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const q = await db.get('SELECT id FROM quotes WHERE rfq_id=?', [req.params.rfqId]);
    if (q) return res.status(409).json({ error: 'Cannot remove — vendor has already quoted' });
    await db.run('DELETE FROM rfqs WHERE id=?', [req.params.rfqId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
