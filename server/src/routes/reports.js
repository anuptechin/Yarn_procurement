import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { isoDate } from '../util/helpers.js';

const router = Router();
router.use(requireAuth);

// dashboard KPIs (role-aware counts)
router.get('/dashboard', async (req, res, next) => {
  try {
    const byStatus = await db.all(`SELECT status, COUNT(*) AS n FROM requirements GROUP BY status`);
    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));

    const kpis = {
      pendingApproval: statusMap['pending_approval'] || 0,
      awaitingQuotes: (statusMap['rfq_sent'] || 0) + (statusMap['quoting'] || 0),
      readyToAward: statusMap['comparison_ready'] || 0,
      awarded: statusMap['awarded'] || 0,
    };

    const today = isoDate();
    const soon = isoDate(60);
    const expiringCerts = (await db.all(`
      SELECT c.*, v.name AS vendor_name FROM vendor_certificates c JOIN vendors v ON v.id=c.vendor_id
      WHERE c.expiry_date IS NOT NULL AND c.expiry_date <= ? ORDER BY c.expiry_date`, [soon]))
      .map((r) => ({ ...r, expired: r.expiry_date < today }));

    const recent = await db.all(`
      SELECT r.id, r.ref_no, r.title, r.status, r.priority, r.created_at, u.name AS raised_by_name
      FROM requirements r JOIN users u ON u.id=r.raised_by ORDER BY r.created_at DESC LIMIT 8`);

    const totals = {
      requirements: (await db.get('SELECT COUNT(*) n FROM requirements')).n,
      vendors: (await db.get('SELECT COUNT(*) n FROM vendors WHERE active=1')).n,
      materials: (await db.get('SELECT COUNT(*) n FROM materials WHERE active=1')).n,
    };

    res.json({ kpis, statusMap, totals, expiringCerts, recent });
  } catch (e) { next(e); }
});

// price trends — all yarns' market price series for the dashboard chart
router.get('/price-trends', async (_req, res, next) => {
  try {
    const rows = await db.all(`
      SELECT m.id, m.mat_code, m.description, m.category,
             ph.price_date, ph.price_per_kg
      FROM materials m
      JOIN price_history ph ON ph.material_id = m.id
      WHERE m.active = 1 AND ph.source = 'market'
      ORDER BY m.mat_code, ph.price_date`);

    const byMat = new Map();
    for (const r of rows) {
      if (!byMat.has(r.id)) byMat.set(r.id, { id: r.id, mat_code: r.mat_code, description: r.description, category: r.category, series: [] });
      byMat.get(r.id).series.push({ date: r.price_date, price: Number(r.price_per_kg) });
    }

    const materials = [...byMat.values()]
      .filter((m) => m.series.length >= 2)
      .map((m) => {
        const prices = m.series.map((p) => p.price);
        const first = prices[0], latest = prices[prices.length - 1];
        const prev = prices.length >= 2 ? prices[prices.length - 2] : first;
        return {
          ...m, first, latest,
          prev_latest: prev,
          change_pct: first ? ((latest - first) / first) * 100 : null,
          mom_pct: prev ? ((latest - prev) / prev) * 100 : null,
          min: Math.min(...prices), max: Math.max(...prices),
        };
      });

    const dates = [...new Set(rows.map((r) => r.price_date))].sort();
    res.json({ materials, dates });
  } catch (e) { next(e); }
});

// award history (savings realized)
router.get('/awards', async (req, res, next) => {
  try {
    const rows = await db.all(`
      SELECT a.*, r.ref_no, r.title, ri.mat_code, ri.description, ri.required_qty_kg,
             ri.last_po_price, v.name AS vendor_name, u.name AS decided_by_name
      FROM awards a
      JOIN requirements r ON r.id=a.requirement_id
      JOIN requirement_items ri ON ri.id=a.requirement_item_id
      JOIN vendors v ON v.id=a.vendor_id
      LEFT JOIN users u ON u.id=a.decided_by
      ORDER BY a.decided_at DESC`);
    const awards = rows.map((r) => {
      const savingsPerKg = r.last_po_price != null && r.awarded_price != null ? r.last_po_price - r.awarded_price : null;
      return {
        ...r,
        savings_per_kg: savingsPerKg,
        savings_total: savingsPerKg != null ? savingsPerKg * r.required_qty_kg : null,
        order_value: r.awarded_price != null ? r.awarded_price * r.required_qty_kg : null,
      };
    });
    res.json({ awards });
  } catch (e) { next(e); }
});

export default router;
