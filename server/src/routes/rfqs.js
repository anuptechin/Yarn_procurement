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

// Build a gentle reminder email for a still-pending RFQ.
function reminderEmail(rfq, items, fromName) {
  const link = portalLink(rfq.token);
  const lines = items
    .map((it, i) => `  ${i + 1}. [${it.mat_code || '-'}] ${it.description} — ${Number(it.required_qty_kg).toLocaleString('en-IN')} Kg`)
    .join('\n');
  const subject = `Reminder · RFQ ${rfq.ref_no} — ${rfq.title} | D'Decor Yarn Procurement`;
  const dueLine = rfq.due_date ? `\nWe had requested your quote by ${new Date(rfq.due_date).toLocaleDateString('en-IN')}.` : '';
  const text =
`Dear ${rfq.vendor_contact || rfq.vendor_name},

A gentle reminder to share your best rates for the following yarn requirement:

${lines}
${dueLine}

You can submit your quote quickly online:
${link}

If you have already responded, kindly ignore this message.

Regards,
${fromName}
D'Decor Yarn Procurement`;
  return { subject, text, link };
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

// ---- send a reminder nudge to one pending vendor -------------------------
router.post('/:rfqId/remind', requireAuth, requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const rfq = await getRfqFull(req.params.rfqId);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    const quote = await db.get('SELECT id FROM quotes WHERE rfq_id = ?', [rfq.id]);
    if (quote || rfq.status === 'responded') return res.status(409).json({ error: 'This vendor has already responded.' });
    if (rfq.status === 'declined') return res.status(409).json({ error: 'This RFQ was declined.' });
    if (!rfq.vendor_email) return res.status(400).json({ error: 'No email on file for this vendor — use Copy link to share manually.' });

    const items = await db.all('SELECT * FROM requirement_items WHERE requirement_id=? ORDER BY line_no', [rfq.requirement_id]);
    const { subject, text, link } = reminderEmail(rfq, items, req.user.name);
    const mail = await sendMail({ to: rfq.vendor_email, subject, text });
    const sent = mail.mode === 'smtp';
    if (sent) {
      await db.run('UPDATE rfqs SET reminder_count = reminder_count + 1, last_reminded_at = now() WHERE id = ?', [rfq.id]);
      await audit(req.user.id, 'remind', 'rfq', rfq.id, { vendor: rfq.vendor_name });
    }
    res.json({
      sent, mail, link,
      message: sent ? `Reminder sent to ${rfq.vendor_name}.`
                    : 'Email is OFF — draft generated. Set MAIL_ENABLED=true to auto-send.',
    });
  } catch (e) { next(e); }
});

// ---- nudge every still-pending vendor on a requirement -------------------
router.post('/requirement/:reqId/remind-pending', requireAuth, requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const r = await db.get('SELECT id FROM requirements WHERE id = ?', [req.params.reqId]);
    if (!r) return res.status(404).json({ error: 'Requirement not found' });

    const pending = await db.all(`
      SELECT rfq.*, r.ref_no, r.title,
             v.name AS vendor_name, v.contact_person AS vendor_contact, v.email AS vendor_email
      FROM rfqs rfq
      JOIN requirements r ON r.id = rfq.requirement_id
      JOIN vendors v ON v.id = rfq.vendor_id
      WHERE rfq.requirement_id = ? AND rfq.status NOT IN ('responded','declined')
        AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.rfq_id = rfq.id)`, [r.id]);
    const items = await db.all('SELECT * FROM requirement_items WHERE requirement_id=? ORDER BY line_no', [r.id]);

    let sent = 0;
    const skipped = [];
    for (const rfq of pending) {
      if (!rfq.vendor_email) { skipped.push({ vendor: rfq.vendor_name, reason: 'no email' }); continue; }
      const { subject, text } = reminderEmail(rfq, items, req.user.name);
      const mail = await sendMail({ to: rfq.vendor_email, subject, text });
      if (mail.mode === 'smtp') {
        sent++;
        await db.run('UPDATE rfqs SET reminder_count = reminder_count + 1, last_reminded_at = now() WHERE id = ?', [rfq.id]);
      } else {
        skipped.push({ vendor: rfq.vendor_name, reason: 'mail off' });
      }
    }
    if (sent) await audit(req.user.id, 'remind_pending', 'requirement', r.id, { sent });
    res.json({ pending: pending.length, sent, skipped, mail_enabled: config.mail.enabled });
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
