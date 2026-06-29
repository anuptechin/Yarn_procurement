/* Import the Raw Material Price Trend.
 * If the source .xlsx is present it (re)generates data/raw_trend.json, then
 * loads the catalog + history into the DB. In production the committed
 * raw_trend.json is enough (no .xlsx needed).
 *   Run:  npm --prefix server run import:raw
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { RAW_MATERIALS } from './data/rawMaterials.js';
import { db, pool, migrate } from './db.js';
import { loadRawTrend } from './util/loadRawTrend.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX = path.resolve(__dirname, '..', '..', 'Raw Material Price Trend.xlsx');
const JSON_OUT = path.resolve(__dirname, 'data', 'raw_trend.json');

async function parseXlsx() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.getWorksheet('Raw Trend');
  const out = [];
  const lastRow = Math.min(ws.rowCount, 5000);
  for (let r = 7; r <= lastRow; r++) {
    const dcell = ws.getCell(r, 2).value;
    if (!dcell) continue;
    const d = dcell instanceof Date ? dcell : new Date(dcell);
    if (Number.isNaN(d.getTime())) continue;
    const date = d.toISOString().slice(0, 10);
    const values = {};
    for (const m of RAW_MATERIALS) {
      let v = ws.getCell(r, m.col).value;
      if (v && typeof v === 'object') v = v.result !== undefined ? v.result : null;
      if (typeof v === 'number' && Number.isFinite(v)) values[m.code] = Math.round(v * 10000) / 10000;
    }
    if (Object.keys(values).length) out.push({ date, values });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

async function main() {
  if (fs.existsSync(XLSX)) {
    const data = await parseXlsx();
    fs.writeFileSync(JSON_OUT, JSON.stringify(data, null, 1));
    console.log(`Parsed ${data.length} dated rows from the workbook → ${path.basename(JSON_OUT)}`);
  } else {
    console.log('Workbook not found; loading committed raw_trend.json.');
  }
  await migrate();
  const res = await loadRawTrend(db);
  console.log(`Raw material trend loaded: ${res.rows} rows, ${res.points} price points across ${RAW_MATERIALS.length} series.`);
}

main().then(() => pool.end()).catch(async (e) => { console.error('Import failed:', e.message); await pool.end(); process.exit(1); });
