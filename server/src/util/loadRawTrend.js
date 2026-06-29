import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAW_MATERIALS } from '../data/rawMaterials.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.resolve(__dirname, '..', 'data', 'raw_trend.json');

// Seed/refresh the raw-material catalog (cheap; safe to run on every boot).
export async function ensureRawMaterials(db) {
  let i = 0;
  for (const m of RAW_MATERIALS) {
    i += 1;
    await db.run(
      `INSERT INTO raw_materials (code, name, grp, unit, kind, compute, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (code) DO UPDATE SET
         name=excluded.name, grp=excluded.grp, unit=excluded.unit,
         kind=excluded.kind, compute=excluded.compute, sort=excluded.sort`,
      [m.code, m.name, m.grp, m.unit, m.kind, m.compute ? JSON.stringify(m.compute) : null, i]
    );
  }
  return RAW_MATERIALS.length;
}

// Load historical price points from data/raw_trend.json (idempotent upsert).
export async function loadRawTrend(db) {
  await ensureRawMaterials(db);
  if (!fs.existsSync(JSON_PATH)) return { rows: 0, points: 0 };
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const idByCode = Object.fromEntries((await db.all('SELECT id, code FROM raw_materials')).map((r) => [r.code, r.id]));
  let points = 0;
  for (const row of data) {
    for (const [code, val] of Object.entries(row.values)) {
      const id = idByCode[code];
      if (!id || val == null) continue;
      await db.run(
        `INSERT INTO raw_material_prices (raw_material_id, price_date, value) VALUES (?, ?, ?)
         ON CONFLICT (raw_material_id, price_date) DO UPDATE SET value = excluded.value`,
        [id, row.date, val]
      );
      points += 1;
    }
  }
  return { rows: data.length, points };
}
