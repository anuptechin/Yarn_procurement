/**
 * Seed the database with realistic starter data derived from the sample
 * spreadsheets (users, vendors, yarn materials, price history, certificates,
 * and one demo requirement). Idempotent: skips rows that already exist.
 *
 * Run:  npm run seed         (seed, keep existing)
 *       npm run reset        (wipe + reseed)
 */
import { db, pool, migrate } from './db.js';
import { hashPassword, ROLES, ensureSuperAdmin } from './auth.js';
import { nextRequirementRef, newToken, isoDate } from './util/helpers.js';
import { loadMarketTrend } from './util/loadTrend.js';

const reset = process.argv.includes('--reset');
// Demo accounts + demo requirement are dev-only. Skip them in production so a
// stray `npm run seed` can't create weak-password logins. Force with --demo.
const seedDemo = process.env.NODE_ENV !== 'production' || process.argv.includes('--demo');

async function main() {
  await migrate();

  // Always ensure the env-driven Super Admin exists (no-op if not configured).
  await ensureSuperAdmin();

  if (reset) {
    console.log('Resetting all data...');
    await pool.query(`TRUNCATE
      audit_log, awards, quote_lines, quotes, rfqs, requirement_items, requirements,
      price_history, vendor_certificates, materials, vendors, users RESTART IDENTITY CASCADE`);
  }

  // ---- Users (demo, dev-only) ------------------------------------------
  if (seedDemo) {
    const users = [
      { name: 'Ravi (Requisitioner)', email: 'requisitioner@ddecor.com', role: ROLES.REQUISITIONER, pw: 'pass123' },
      { name: 'Anupam (Procurement)', email: 'procurement@ddecor.com', role: ROLES.PROCUREMENT, pw: 'pass123' },
      { name: 'Dept Head (Yarn)', email: 'depthead@ddecor.com', role: ROLES.DEPTHEAD, pw: 'pass123' },
      { name: 'Administrator', email: 'admin@ddecor.com', role: ROLES.ADMIN, pw: 'admin123' },
    ];
    for (const u of users) {
      await db.run(`INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)
                    ON CONFLICT(email) DO NOTHING`, [u.name, u.email, u.role, hashPassword(u.pw)]);
    }
  } else {
    console.log('NODE_ENV=production — skipping demo accounts (use --demo to force).');
  }
  const userId = async (email) => (await db.get('SELECT id FROM users WHERE email = ?', [email])).id;

  // ---- Vendors ----------------------------------------------------------
  const vendors = [
    { name: 'Gimatex Industries', contact: 'Sales Desk', email: 'sales@gimatex.com', phone: '+91-7152-000000', gst: '27AAACG0000A1Z5', rating: 4.5, pay: '30 Days', lead: 15, addr: 'Hinganghat, Maharashtra' },
    { name: 'RSWM Ltd', contact: 'Yarn Marketing', email: 'yarn@rswm.in', phone: '+91-1482-000000', gst: '08AAACR0000B1Z2', rating: 4.0, pay: '30 Days', lead: 20, addr: 'Bhilwara, Rajasthan' },
    { name: 'Nitin Spinners Ltd', contact: 'Sales', email: 'sales@nitinspinners.com', phone: '+91-1482-111111', gst: '08AAACN0000C1Z9', rating: 3.8, pay: '45 Days', lead: 25, addr: 'Bhilwara, Rajasthan' },
  ];
  const vendorByName = {};
  for (const v of vendors) {
    let row = await db.get('SELECT id FROM vendors WHERE name = ?', [v.name]);
    if (!row) {
      row = await db.get(
        `INSERT INTO vendors (name, contact_person, email, phone, gst_no, rating, default_payment_terms, default_lead_time, address)
         VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`,
        [v.name, v.contact, v.email, v.phone, v.gst, v.rating, v.pay, v.lead, v.addr]);
    }
    vendorByName[v.name] = row.id;
  }

  // ---- Vendor certificates ---------------------------------------------
  const certs = [
    { vendor: 'Gimatex Industries', type: 'Oeko-Tex', issued: '2025-03-13', expiry: '2026-03-12' },
    { vendor: 'Gimatex Industries', type: 'GOTS', issued: '2025-03-13', expiry: '2026-03-12' },
    { vendor: 'Gimatex Industries', type: 'GRS Scope', issued: '2025-03-13', expiry: '2026-03-12' },
    { vendor: 'RSWM Ltd', type: 'Oeko-Tex', issued: '2025-06-01', expiry: '2026-05-31' },
    { vendor: 'Nitin Spinners Ltd', type: 'GRS Scope', issued: '2024-11-01', expiry: '2025-10-31' }, // expired -> alert demo
  ];
  if ((await db.get('SELECT COUNT(*) n FROM vendor_certificates')).n === 0) {
    for (const c of certs) {
      await db.run(`INSERT INTO vendor_certificates (vendor_id, cert_type, issued_by, issue_date, expiry_date) VALUES (?,?,?,?,?)`,
        [vendorByName[c.vendor], c.type, c.issued, c.issued, c.expiry]);
    }
  }

  // ---- Materials --------------------------------------------------------
  const materials = [
    { code: '50302SP0', desc: '2/30 SPUN POLYESTER KNOTLESS', cat: 'Polyester' },
    { code: '50301SCC', desc: '1/30 Combed Compact Cotton', cat: 'Cotton' },
    { code: '50401SCC', desc: '1/40 Combed Compact Cotton', cat: 'Cotton' },
    { code: '50062CRS', desc: '2/6 Karded Cotton', cat: 'Cotton' },
    { code: '50D61CCV', desc: '0.6 Combed Cotton', cat: 'Cotton' },
    { code: '50201SC0', desc: '1/20 Combed RS Cotton', cat: 'Cotton' },
    { code: '50162CWS', desc: '2/16 Combed Slub Cotton', cat: 'Cotton' },
    { code: '50161SLL', desc: '16 LEA LINEN BLEACHED', cat: 'Linen' },
    { code: '52200F298', desc: '2000d SF 298 Cotton Linen', cat: 'Blends' },
    { code: '50D61RPL', desc: '0.6 HANK POLY LINEN', cat: 'Polyester' },
    { code: '50162SPRF', desc: '2/16 Sparrow Poly Cotton', cat: 'Blends' },
  ];
  for (const m of materials) {
    await db.run(`INSERT INTO materials (mat_code, description, category) VALUES (?,?,?) ON CONFLICT(mat_code) DO NOTHING`,
      [m.code, m.desc, m.cat]);
  }
  const matId = async (code) => {
    const r = await db.get('SELECT id FROM materials WHERE mat_code = ?', [code]);
    return r ? r.id : null;
  };

  // ---- Price history (Yarn Market Price Trend) -------------------------
  // Full Yarn Market Price Trend (extracted from SAP work.xlsx)
  const trendResult = await loadMarketTrend(db);
  console.log(`Loaded market trend: ${trendResult.materials} materials, ${trendResult.points} price points.`);

  if ((await db.get(`SELECT COUNT(*) n FROM price_history WHERE source='po'`)).n === 0) {
    await db.run(`INSERT INTO price_history (material_id, price_date, price_per_kg, source, vendor_id) VALUES (?, '2026-02-01', 175, 'po', ?)`,
      [await matId('50302SP0'), vendorByName['Gimatex Industries']]);
  }

  // ---- Demo requirement (matches the sample comparison sheet) ----------
  // Dev-only: depends on the demo users above.
  if (seedDemo && (await db.get('SELECT COUNT(*) n FROM requirements')).n === 0) {
    const ref = await nextRequirementRef();
    const reqRow = await db.get(
      `INSERT INTO requirements (ref_no, title, status, priority, needed_by, raised_by, approved_by, approved_at, remarks)
       VALUES (?, ?, 'approved', 'normal', ?, ?, ?, now(), 'Seeded demo requirement') RETURNING id`,
      [ref, 'Spun Polyester 2/30 — replenishment', isoDate(20), await userId('requisitioner@ddecor.com'), await userId('depthead@ddecor.com')]);
    const reqId = reqRow.id;

    const itemRow = await db.get(
      `INSERT INTO requirement_items
        (requirement_id, material_id, mat_code, description, required_qty_kg, last_po_price, last_po_date, last_supplier_id, last_supplier_name, line_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING id`,
      [reqId, await matId('50302SP0'), '50302SP0', '2/30 SPUN POLYESTER KNOTLESS', 5000, 175, '2026-02-01',
        vendorByName['Gimatex Industries'], 'Gimatex Industries']);
    const itemId = itemRow.id;

    const quoteData = [
      { vendor: 'Gimatex Industries', price: 175, lead: 15, pay: '30 Days' },
      { vendor: 'RSWM Ltd', price: 180, lead: 20, pay: '30 Days' },
      { vendor: 'Nitin Spinners Ltd', price: 185, lead: 25, pay: '45 Days' },
    ];
    for (const q of quoteData) {
      const rfqRow = await db.get(
        `INSERT INTO rfqs (requirement_id, vendor_id, token, status, due_date, sent_at, responded_at)
         VALUES (?, ?, ?, 'responded', ?, now(), now()) RETURNING id`,
        [reqId, vendorByName[q.vendor], newToken(), isoDate(10)]);
      const quoteRow = await db.get(`INSERT INTO quotes (rfq_id, entered_via, submitted_by) VALUES (?, 'manual', ?) RETURNING id`,
        [rfqRow.id, q.vendor]);
      await db.run(`INSERT INTO quote_lines (quote_id, requirement_item_id, price_per_kg, gst_pct, lead_time_days, payment_terms) VALUES (?,?,?,5,?,?)`,
        [quoteRow.id, itemId, q.price, q.lead, q.pay]);
    }
    await db.run(`UPDATE requirements SET status='comparison_ready' WHERE id=?`, [reqId]);
    console.log(`Seeded demo requirement ${ref} with 3 vendor quotes.`);
  }

  if (seedDemo) {
    console.log('\nSeed complete. Login accounts (password in brackets):');
    console.log('  requisitioner@ddecor.com  (pass123)  - raise requirements');
    console.log('  procurement@ddecor.com    (pass123)  - RFQ, quotes, comparison');
    console.log('  depthead@ddecor.com       (pass123)  - approve & award');
    console.log('  admin@ddecor.com          (admin123) - full access\n');
  } else {
    console.log('\nSeed complete (production: reference data only, no demo accounts).');
    console.log('Log in with the Super Admin from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.\n');
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('\nSeed failed:', err.message);
    await pool.end();
    process.exit(1);
  });
