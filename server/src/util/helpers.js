import { customAlphabet } from 'nanoid';
import { db } from '../db.js';

// URL-safe token for vendor links (no ambiguous chars)
const tokenGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 28);
export const newToken = () => tokenGen();

// Requirement ref no like  YRN-2026-0007
export async function nextRequirementRef(cx = db) {
  const year = new Date().getFullYear();
  const prefix = `YRN-${year}-`;
  const row = await cx.get(
    `SELECT ref_no FROM requirements WHERE ref_no LIKE ? ORDER BY id DESC LIMIT 1`,
    [prefix + '%']
  );
  let n = 1;
  if (row) {
    const last = parseInt(row.ref_no.slice(prefix.length), 10);
    if (!Number.isNaN(last)) n = last + 1;
  }
  return prefix + String(n).padStart(4, '0');
}

export function nowIso() {
  return new Date().toISOString();
}

// ISO date (YYYY-MM-DD), optionally offset by N days
export function isoDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

// landed price per kg = base price + GST
export function landedPrice(line) {
  if (line == null || line.price_per_kg == null) return null;
  const gst = line.gst_pct || 0;
  return Number(line.price_per_kg) * (1 + gst / 100);
}
