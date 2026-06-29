import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { isoDate } from '../util/helpers.js';
import { sendCertExpiryDigest } from '../services/certAlerts.js';

// Certificate master — visible to anyone with portal access.
const router = Router();
router.use(requireAuth);

export function certStatus(expiry, today) {
  if (!expiry) return 'none';
  if (expiry < today) return 'expired';
  const days = Math.round((new Date(expiry) - new Date(today)) / 86400000);
  return days <= 30 ? 'expiring' : 'valid';
}

// list every certificate across all vendors, with status + file availability
router.get('/', async (_req, res, next) => {
  try {
    const today = isoDate();
    const rows = await db.all(`
      SELECT c.id, c.vendor_id, c.cert_type, c.issued_by, c.issue_date, c.expiry_date, c.remark,
             c.file_name, c.file_size, (c.file_data IS NOT NULL) AS has_file,
             v.name AS vendor_name, v.active AS vendor_active
      FROM vendor_certificates c
      JOIN vendors v ON v.id = c.vendor_id
      ORDER BY (c.expiry_date IS NULL), c.expiry_date, v.name`);
    const certificates = rows.map((r) => ({ ...r, status: certStatus(r.expiry_date, today) }));
    const summary = certificates.reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
    res.json({ certificates, summary });
  } catch (e) { next(e); }
});

// admin: send the expiry digest email now (useful for testing / on demand)
router.post('/run-alerts', requireRole(ROLES.ADMIN), async (_req, res, next) => {
  try {
    const result = await sendCertExpiryDigest();
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
