import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { isoDate } from '../util/helpers.js';

const router = Router();
router.use(requireAuth);

// list (with active cert count + soonest expiry)
router.get('/', async (req, res, next) => {
  try {
    const today = isoDate();
    const vendors = await db.all(`
      SELECT v.*,
        (SELECT COUNT(*) FROM vendor_certificates c WHERE c.vendor_id=v.id) AS cert_count,
        (SELECT COUNT(*) FROM vendor_certificates c WHERE c.vendor_id=v.id AND (c.expiry_date IS NULL OR c.expiry_date >= ?)) AS active_certs,
        (SELECT MIN(c.expiry_date) FROM vendor_certificates c WHERE c.vendor_id=v.id AND c.expiry_date >= ?) AS next_expiry
      FROM vendors v ${req.query.all ? '' : 'WHERE v.active = 1'} ORDER BY v.name`, [today, today]);
    res.json({ vendors });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const v = await db.get('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    const certificates = await db.all('SELECT * FROM vendor_certificates WHERE vendor_id = ? ORDER BY expiry_date', [v.id]);
    res.json({ vendor: v, certificates });
  } catch (e) { next(e); }
});

const vendorSchema = z.object({
  name: z.string().min(2),
  contact_person: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gst_no: z.string().nullable().optional(),
  rating: z.coerce.number().min(0).max(5).default(3),
  default_payment_terms: z.string().nullable().optional(),
  default_lead_time: z.coerce.number().int().nullable().optional(),
  active: z.coerce.boolean().optional(),
  notes: z.string().nullable().optional(),
});

router.post('/', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const p = vendorSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    const row = await db.get(
      `INSERT INTO vendors (name, contact_person, email, phone, address, gst_no, rating, default_payment_terms, default_lead_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [d.name, d.contact_person || null, d.email || null, d.phone || null, d.address || null,
        d.gst_no || null, d.rating, d.default_payment_terms || null, d.default_lead_time ?? null, d.notes || null]
    );
    await audit(req.user.id, 'create', 'vendor', row.id);
    res.status(201).json({ id: row.id });
  } catch (e) { next(e); }
});

router.put('/:id', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const v = await db.get('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ error: 'Not found' });
    const p = vendorSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    const m = {
      name: d.name ?? v.name,
      contact_person: d.contact_person ?? v.contact_person,
      email: d.email ?? v.email,
      phone: d.phone ?? v.phone,
      address: d.address ?? v.address,
      gst_no: d.gst_no ?? v.gst_no,
      rating: d.rating ?? v.rating,
      default_payment_terms: d.default_payment_terms ?? v.default_payment_terms,
      default_lead_time: d.default_lead_time ?? v.default_lead_time,
      active: d.active != null ? (d.active ? 1 : 0) : v.active,
      notes: d.notes ?? v.notes,
    };
    await db.run(
      `UPDATE vendors SET name=?, contact_person=?, email=?, phone=?, address=?, gst_no=?,
         rating=?, default_payment_terms=?, default_lead_time=?, active=?, notes=? WHERE id=?`,
      [m.name, m.contact_person, m.email, m.phone, m.address, m.gst_no, m.rating,
        m.default_payment_terms, m.default_lead_time, m.active, m.notes, v.id]
    );
    await audit(req.user.id, 'update', 'vendor', v.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- certificates --------------------------------------------------------
const certSchema = z.object({
  cert_type: z.string().min(1),
  issued_by: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
});

router.post('/:id/certificates', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const v = await db.get('SELECT id FROM vendors WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    const p = certSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const d = p.data;
    const row = await db.get(
      `INSERT INTO vendor_certificates (vendor_id, cert_type, issued_by, issue_date, expiry_date, remark)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [v.id, d.cert_type, d.issued_by || null, d.issue_date || null, d.expiry_date || null, d.remark || null]
    );
    res.status(201).json({ id: row.id });
  } catch (e) { next(e); }
});

router.delete('/:id/certificates/:certId', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    await db.run('DELETE FROM vendor_certificates WHERE id = ? AND vendor_id = ?', [req.params.certId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// certificates expiring within N days (default 60) across all vendors
router.get('/alerts/expiring', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 60;
    const today = isoDate();
    const until = isoDate(days);
    const rows = await db.all(`
      SELECT c.*, v.name AS vendor_name FROM vendor_certificates c
      JOIN vendors v ON v.id = c.vendor_id
      WHERE c.expiry_date IS NOT NULL AND c.expiry_date <= ?
      ORDER BY c.expiry_date`, [until]);
    res.json({ expiring: rows.map((r) => ({ ...r, expired: r.expiry_date < today })) });
  } catch (e) { next(e); }
});

export default router;
