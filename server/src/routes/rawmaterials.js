import { Router } from 'express';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';
import { computeAll, RAW_MATERIALS, GROUP_ORDER } from '../data/rawMaterials.js';

// Raw material price trend — procurement negotiation intelligence.
// Visible to procurement / dept head / admin (requisitioners excluded).
const router = Router();
router.use(requireAuth);
router.use(requireRole(ROLES.PROCUREMENT, ROLES.DEPTHEAD));

const INPUT_CODES = new Set(RAW_MATERIALS.filter((m) => m.kind === 'input').map((m) => m.code));

// catalog (grouped) — for the entry form & filters
router.get('/catalog', async (_req, res, next) => {
  try {
    const rows = await db.all('SELECT id, code, name, grp, unit, kind, compute, sort FROM raw_materials WHERE active = 1 ORDER BY sort');
    res.json({ materials: rows, groups: GROUP_ORDER });
  } catch (e) { next(e); }
});

// overview — latest value, previous value, % change per material
router.get('/', async (_req, res, next) => {
  try {
    const rows = await db.all(`
      SELECT * FROM (
        SELECT m.id, m.code, m.name, m.grp, m.unit, m.kind, m.sort,
               p.value, p.price_date,
               ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY p.price_date DESC) AS rn
        FROM raw_materials m
        LEFT JOIN raw_material_prices p ON p.raw_material_id = m.id
        WHERE m.active = 1
      ) t WHERE rn <= 2 ORDER BY sort, rn`);

    const byId = new Map();
    for (const r of rows) {
      if (!byId.has(r.id)) byId.set(r.id, { id: r.id, code: r.code, name: r.name, grp: r.grp, unit: r.unit, kind: r.kind, sort: r.sort, latest: null, latest_date: null, prev: null });
      const m = byId.get(r.id);
      if (r.value == null) continue;
      if (r.rn === 1) { m.latest = Number(r.value); m.latest_date = r.price_date; }
      else if (r.rn === 2) { m.prev = Number(r.value); }
    }
    const materials = [...byId.values()].map((m) => ({
      ...m,
      change_pct: m.latest != null && m.prev != null && m.prev !== 0 ? ((m.latest - m.prev) / m.prev) * 100 : null,
    }));
    const lastDate = (await db.get('SELECT MAX(price_date) d FROM raw_material_prices'))?.d || null;
    res.json({ materials, groups: GROUP_ORDER, last_date: lastDate });
  } catch (e) { next(e); }
});

// history for one or more series — for charting
router.get('/history', async (req, res, next) => {
  try {
    const codes = String(req.query.codes || '').split(',').map((c) => c.trim()).filter(Boolean);
    if (codes.length === 0) return res.json({ series: {} });
    const placeholders = codes.map(() => '?').join(',');
    const rows = await db.all(`
      SELECT m.code, p.price_date, p.value
      FROM raw_material_prices p JOIN raw_materials m ON m.id = p.raw_material_id
      WHERE m.code IN (${placeholders})
      ORDER BY p.price_date`, codes);
    const series = {};
    for (const c of codes) series[c] = [];
    for (const r of rows) (series[r.code] ||= []).push({ date: r.price_date, value: Number(r.value) });
    res.json({ series });
  } catch (e) { next(e); }
});

// latest input values (to prefill the entry form)
router.get('/entry/latest', async (_req, res, next) => {
  try {
    const rows = await db.all(`
      SELECT m.code, p.value FROM (
        SELECT raw_material_id, value,
               ROW_NUMBER() OVER (PARTITION BY raw_material_id ORDER BY price_date DESC) rn
        FROM raw_material_prices
      ) p JOIN raw_materials m ON m.id = p.raw_material_id WHERE p.rn = 1`);
    const values = {};
    for (const r of rows) if (INPUT_CODES.has(r.code)) values[r.code] = Number(r.value);
    const lastDate = (await db.get('SELECT MAX(price_date) d FROM raw_material_prices'))?.d || null;
    res.json({ values, last_date: lastDate });
  } catch (e) { next(e); }
});

// add / update a dated set of input prices; computed series are derived here
const entrySchema = z.object({
  price_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  values: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
});
router.post('/entry', requireRole(ROLES.PROCUREMENT), async (req, res, next) => {
  try {
    const p = entrySchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'A valid date and values are required.' });
    // keep only known input codes with a numeric value
    const inputs = {};
    for (const [code, v] of Object.entries(p.data.values)) {
      if (!INPUT_CODES.has(code) || v === '' || v == null) continue;
      const n = Number(v);
      if (Number.isFinite(n)) inputs[code] = n;
    }
    if (Object.keys(inputs).length === 0) return res.status(400).json({ error: 'Enter at least one price.' });

    const full = computeAll(inputs); // adds the per-Kg / Rs-candy values
    const idByCode = Object.fromEntries((await db.all('SELECT id, code FROM raw_materials')).map((r) => [r.code, r.id]));
    let n = 0;
    await db.tx(async (cx) => {
      for (const [code, val] of Object.entries(full)) {
        const id = idByCode[code];
        if (!id || val == null || !Number.isFinite(Number(val))) continue;
        await cx.run(
          `INSERT INTO raw_material_prices (raw_material_id, price_date, value) VALUES (?, ?, ?)
           ON CONFLICT (raw_material_id, price_date) DO UPDATE SET value = excluded.value`,
          [id, p.data.price_date, Number(val)]);
        n += 1;
      }
    });
    await audit(req.user.id, 'raw_price_update', 'raw_material', null, { date: p.data.price_date, inputs: Object.keys(inputs).length });
    res.json({ ok: true, saved: n, date: p.data.price_date });
  } catch (e) { next(e); }
});

export default router;
