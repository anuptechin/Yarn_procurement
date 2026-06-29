import { db } from '../db.js';
import { sendMail } from './mailer.js';
import { isoDate } from '../util/helpers.js';

// Build + send a certificate-expiry digest to all active admin & procurement
// users. Returns a summary. Actual sending only happens when mail is ON
// (MAIL_ENABLED=true); otherwise sendMail returns a draft and we report it.
export async function sendCertExpiryDigest() {
  const today = isoDate();
  const horizon = isoDate(30); // expiring within the next 30 days

  const rows = await db.all(`
    SELECT c.cert_type, c.expiry_date, v.name AS vendor_name
    FROM vendor_certificates c
    JOIN vendors v ON v.id = c.vendor_id
    WHERE v.active = 1 AND c.expiry_date IS NOT NULL AND c.expiry_date <= ?
    ORDER BY c.expiry_date`, [horizon]);
  if (rows.length === 0) return { sent: false, reason: 'nothing expiring', count: 0 };

  const recipients = (await db.all(
    `SELECT email FROM users WHERE active = 1 AND email IS NOT NULL AND role IN ('admin','procurement')`
  )).map((u) => u.email).filter(Boolean);
  if (recipients.length === 0) return { sent: false, reason: 'no recipients', count: rows.length };

  const expired = rows.filter((r) => r.expiry_date < today);
  const soon = rows.filter((r) => r.expiry_date >= today);
  const line = (r) => `  - ${r.vendor_name} | ${r.cert_type} | ${r.expiry_date < today ? 'EXPIRED on' : 'expires'} ${new Date(r.expiry_date).toLocaleDateString('en-IN')}`;

  const text =
`Vendor certificate status as of ${new Date(today).toLocaleDateString('en-IN')}:

${expired.length ? `EXPIRED (${expired.length}):\n${expired.map(line).join('\n')}\n\n` : ''}${soon.length ? `Expiring within 30 days (${soon.length}):\n${soon.map(line).join('\n')}\n\n` : ''}Please review and arrange renewals. Open the portal and go to Certificates for details and documents.

D'Decor Yarn Procurement Portal`;
  const subject = `Certificate alert — ${expired.length} expired, ${soon.length} expiring soon`;

  const mail = await sendMail({ to: recipients.join(', '), subject, text });
  return {
    sent: mail.mode === 'smtp', mode: mail.mode,
    recipients: recipients.length, count: rows.length, expired: expired.length, soon: soon.length,
  };
}

// Run shortly after boot, then once a day.
let started = false;
export function startCertAlertScheduler() {
  if (started) return;
  started = true;
  const run = () => sendCertExpiryDigest()
    .then((r) => { if (r.sent) console.log(`  → Certificate expiry digest emailed to ${r.recipients} user(s) (${r.count} certs).`); })
    .catch((e) => console.error('cert alert error:', e.message));
  const t1 = setTimeout(run, 60 * 1000);          // ~1 min after startup
  const t2 = setInterval(run, 24 * 60 * 60 * 1000); // daily
  t1.unref?.(); t2.unref?.();
}
