import { db } from '../db.js';

/**
 * Upsert a vendor's quote (and its line items) against an RFQ.
 * Shared by manual entry (procurement) and the public vendor portal.
 *
 * payload = {
 *   entered_via: 'manual'|'portal', submitted_by, valid_until, notes,
 *   lines: [{ requirement_item_id, price_per_kg, gst_pct, lead_time_days, payment_terms, remarks, no_quote }]
 * }
 */
export async function upsertQuote(rfq, payload) {
  return db.tx(async (cx) => {
    const items = await cx.all('SELECT id FROM requirement_items WHERE requirement_id = ?', [rfq.requirement_id]);
    const validItemIds = new Set(items.map((i) => i.id));

    let quote = await cx.get('SELECT * FROM quotes WHERE rfq_id = ?', [rfq.id]);
    if (quote) {
      await cx.run(
        `UPDATE quotes SET entered_via=?, submitted_by=?, valid_until=?, notes=?, submitted_at=now() WHERE id=?`,
        [payload.entered_via, payload.submitted_by || null, payload.valid_until || null, payload.notes || null, quote.id]
      );
      await cx.run('DELETE FROM quote_lines WHERE quote_id = ?', [quote.id]);
    } else {
      quote = await cx.get(
        `INSERT INTO quotes (rfq_id, entered_via, submitted_by, valid_until, notes) VALUES (?,?,?,?,?) RETURNING id`,
        [rfq.id, payload.entered_via, payload.submitted_by || null, payload.valid_until || null, payload.notes || null]
      );
    }

    for (const l of payload.lines || []) {
      if (!validItemIds.has(Number(l.requirement_item_id))) continue;
      const noQuote = l.no_quote ? 1 : 0;
      await cx.run(
        `INSERT INTO quote_lines (quote_id, requirement_item_id, price_per_kg, currency, gst_pct, lead_time_days, payment_terms, remarks, no_quote)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [quote.id, l.requirement_item_id,
          noQuote ? null : (l.price_per_kg ?? null),
          l.currency || 'INR',
          l.gst_pct ?? 0,
          noQuote ? null : (l.lead_time_days ?? null),
          noQuote ? null : (l.payment_terms ?? null),
          l.remarks ?? null,
          noQuote]
      );
    }

    await cx.run(`UPDATE rfqs SET status='responded', responded_at=now() WHERE id=?`, [rfq.id]);

    // advance requirement to 'quoting' (or 'comparison_ready' when all responded)
    const counts = await cx.get(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('responded','declined') THEN 1 ELSE 0 END) AS done
       FROM rfqs WHERE requirement_id = ?`, [rfq.requirement_id]
    );
    const newStatus = counts.total > 0 && counts.done >= counts.total ? 'comparison_ready' : 'quoting';
    await cx.run(`UPDATE requirements SET status=?, updated_at=now() WHERE id=? AND status IN ('rfq_sent','quoting')`,
      [newStatus, rfq.requirement_id]);

    return quote.id;
  });
}
