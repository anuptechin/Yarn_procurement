import { db } from '../db.js';
import { landedPrice, isoDate } from '../util/helpers.js';

export const DEFAULT_WEIGHTS = {
  price: 50,       // landed price/kg (lower better)
  lead_time: 15,   // delivery lead time (lower better)
  payment: 10,     // credit period (higher better)
  rating: 25,      // vendor rating + certificate validity (higher better)
};

// parse "30 Days" / "Net 45" / "Advance" -> credit days (Advance = 0)
export function parsePaymentDays(text) {
  if (text == null) return null;
  const s = String(text).toLowerCase();
  if (s.includes('advance')) return 0;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

async function activeCertCount(vendorId, asOf) {
  const row = await db.get(
    `SELECT COUNT(*) AS n FROM vendor_certificates
     WHERE vendor_id = ? AND (expiry_date IS NULL OR expiry_date >= ?)`, [vendorId, asOf]);
  return row.n;
}

/**
 * Build the full comparison payload for a requirement.
 */
export async function buildComparison(requirementId, weights = DEFAULT_WEIGHTS) {
  const requirement = await db.get('SELECT * FROM requirements WHERE id = ?', [requirementId]);
  if (!requirement) return null;

  const items = await db.all('SELECT * FROM requirement_items WHERE requirement_id = ? ORDER BY line_no, id', [requirementId]);

  const rfqs = await db.all(
    `SELECT r.*, v.name AS vendor_name, v.rating AS vendor_rating,
            v.default_payment_terms, v.default_lead_time
     FROM rfqs r JOIN vendors v ON v.id = r.vendor_id
     WHERE r.requirement_id = ? ORDER BY v.name`, [requirementId]);

  const today = isoDate();

  const vendors = [];
  for (const r of rfqs) {
    const quote = await db.get('SELECT * FROM quotes WHERE rfq_id = ?', [r.id]);
    const lines = quote ? await db.all('SELECT * FROM quote_lines WHERE quote_id = ?', [quote.id]) : [];
    const lineByItem = {};
    for (const l of lines) lineByItem[l.requirement_item_id] = l;
    vendors.push({
      rfq_id: r.id,
      vendor_id: r.vendor_id,
      vendor_name: r.vendor_name,
      rating: r.vendor_rating ?? 3,
      active_certs: await activeCertCount(r.vendor_id, today),
      rfq_status: r.status,
      has_quote: !!quote,
      quote_id: quote ? quote.id : null,
      entered_via: quote ? quote.entered_via : null,
      submitted_at: quote ? quote.submitted_at : null,
      lineByItem,
    });
  }

  const awardsRows = await db.all('SELECT * FROM awards WHERE requirement_id = ?', [requirementId]);
  const awardByItem = {};
  for (const a of awardsRows) awardByItem[a.requirement_item_id] = a;

  const itemRows = items.map((item) => {
    const cells = vendors.map((v) => {
      const line = v.lineByItem[item.id];
      const quoted = line && !line.no_quote && line.price_per_kg != null;
      return {
        vendor_id: v.vendor_id,
        vendor_name: v.vendor_name,
        rating: v.rating,
        active_certs: v.active_certs,
        has_quote: v.has_quote,
        no_quote: line ? !!line.no_quote : false,
        quoted,
        quote_line_id: line ? line.id : null,
        price_per_kg: line ? line.price_per_kg : null,
        gst_pct: line ? line.gst_pct : null,
        landed_price: quoted ? landedPrice(line) : null, // base + GST (reference only)
        currency: line ? line.currency : null,
        lead_time_days: line ? line.lead_time_days : null,
        payment_terms: line ? line.payment_terms : null,
        payment_days: line ? parsePaymentDays(line.payment_terms) : null,
        remarks: line ? line.remarks : null,
        line_total: quoted ? Number(line.price_per_kg) * item.required_qty_kg : null,   // basic value (ex-GST)
        landed_total: quoted ? landedPrice(line) * item.required_qty_kg : null,
      };
    });

    const quotedCells = cells.filter((c) => c.quoted);
    const prices = quotedCells.map((c) => c.price_per_kg).filter((x) => x != null);
    const leads = quotedCells.map((c) => c.lead_time_days).filter((x) => x != null);
    const pays = quotedCells.map((c) => c.payment_days).filter((x) => x != null);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const minLead = leads.length ? Math.min(...leads) : null;
    const maxPay = pays.length ? Math.max(...pays) : null;

    const wSum = (weights.price || 0) + (weights.lead_time || 0) + (weights.payment || 0) + (weights.rating || 0);

    for (const c of quotedCells) {
      const sPrice = minPrice != null && c.price_per_kg ? (minPrice / c.price_per_kg) * 100 : 0;
      const sLead = minLead != null && c.lead_time_days ? (minLead / c.lead_time_days) * 100 : (c.lead_time_days == null ? 60 : 0);
      const sPay = maxPay && c.payment_days != null ? (c.payment_days / maxPay) * 100 : (c.payment_days == null ? 50 : 0);
      const sRating = Math.min(100, (Number(c.rating || 0) / 5) * 100 + Math.min(c.active_certs * 3, 10));

      c.scores = {
        price: round1(sPrice), lead_time: round1(sLead), payment: round1(sPay), rating: round1(sRating),
      };
      c.total_score = wSum
        ? round1((sPrice * (weights.price || 0) + sLead * (weights.lead_time || 0) +
            sPay * (weights.payment || 0) + sRating * (weights.rating || 0)) / wSum)
        : 0;

      if (item.last_po_price != null && c.price_per_kg != null) {
        c.savings_per_kg = round2(item.last_po_price - c.price_per_kg);
        c.savings_pct = round1(((item.last_po_price - c.price_per_kg) / item.last_po_price) * 100);
        c.savings_total = round2((item.last_po_price - c.price_per_kg) * item.required_qty_kg);
      }
    }

    let recommended = null;
    if (quotedCells.length) {
      recommended = [...quotedCells].sort((a, b) => b.total_score - a.total_score || a.price_per_kg - b.price_per_kg)[0];
    }
    const cheapest = quotedCells.length
      ? [...quotedCells].sort((a, b) => a.price_per_kg - b.price_per_kg)[0] : null;

    return {
      item: {
        id: item.id, mat_code: item.mat_code, description: item.description,
        required_qty_kg: item.required_qty_kg, last_po_price: item.last_po_price,
        last_po_date: item.last_po_date, last_supplier_name: item.last_supplier_name,
        target_price: item.target_price,
      },
      cells,
      recommended_vendor_id: recommended ? recommended.vendor_id : null,
      cheapest_vendor_id: cheapest ? cheapest.vendor_id : null,
      award: awardByItem[item.id] || null,
    };
  });

  const respondedCount = vendors.filter((v) => v.has_quote).length;

  return {
    requirement, weights,
    vendors: vendors.map(({ lineByItem, ...rest }) => rest),
    items: itemRows,
    summary: { vendor_count: vendors.length, responded_count: respondedCount, item_count: items.length },
  };
}

function round1(n) { return n == null ? null : Math.round(n * 10) / 10; }
function round2(n) { return n == null ? null : Math.round(n * 100) / 100; }
