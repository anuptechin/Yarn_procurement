import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data', 'market_trend.json');

/**
 * Load the Yarn Market Price Trend (extracted from SAP work.xlsx) into the DB.
 * Idempotent: upserts each material, then replaces its 'market' price history.
 * Does not touch users, vendors, requirements, or 'po'/'quote' prices.
 */
export async function loadMarketTrend(db) {
  const materials = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  let mats = 0, pts = 0;
  for (const m of materials) {
    let row = await db.get('SELECT id FROM materials WHERE mat_code = ?', [m.mat_code]);
    if (row) {
      await db.run('UPDATE materials SET description = ?, category = ? WHERE id = ?',
        [m.description, m.category, row.id]);
    } else {
      row = await db.get('INSERT INTO materials (mat_code, description, category) VALUES (?, ?, ?) RETURNING id',
        [m.mat_code, m.description, m.category]);
    }
    mats++;
    await db.run(`DELETE FROM price_history WHERE material_id = ? AND source = 'market'`, [row.id]);
    for (const [d, p] of Object.entries(m.prices)) {
      await db.run(`INSERT INTO price_history (material_id, price_date, price_per_kg, source) VALUES (?, ?, ?, 'market')`,
        [row.id, d, p]);
      pts++;
    }
  }
  return { materials: mats, points: pts };
}
