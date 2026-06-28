import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Stars, ScoreBar, Spinner, useToast } from '../components/ui.jsx';
import { STATUS, inr, kg, num, date } from '../lib/format.js';

const WEIGHT_KEYS = [
  { key: 'price', label: 'Price' },
  { key: 'lead_time', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
  { key: 'rating', label: 'Rating' },
];

export default function Comparison() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [weights, setWeights] = useState({ price: 50, lead_time: 15, payment: 10, rating: 25 });
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [picks, setPicks] = useState({});      // itemId -> vendorId
  const [reasons, setReasons] = useState({});  // itemId -> justification
  const [awarding, setAwarding] = useState(false);

  const load = useCallback(() => {
    api.get(`/comparison/requirement/${id}`, { params: weights })
      .then((r) => {
        setData(r.data);
        // default award picks to the recommended vendor (or existing award)
        const p = {};
        r.data.items.forEach((row) => {
          p[row.item.id] = row.award ? row.award.vendor_id : row.recommended_vendor_id;
        });
        setPicks((prev) => ({ ...p, ...prev }));
      })
      .catch((e) => setErr(e.message));
  }, [id, weights]);
  useEffect(load, [load]);

  if (err) return <div className="text-clay-600">{err}</div>;
  if (!data) return <Loading label="Building comparison…" />;

  const { requirement: r, vendors, items, summary } = data;
  const isHead = can.award(user.role);
  const alreadyAwarded = r.status === 'awarded';

  async function award() {
    const awards = items
      .filter((row) => picks[row.item.id])
      .map((row) => ({ requirement_item_id: row.item.id, vendor_id: picks[row.item.id], justification: reasons[row.item.id] || null }));
    if (awards.length === 0) return toast.error('Select a vendor for at least one item.');
    setAwarding(true);
    try { await api.post(`/comparison/requirement/${id}/award`, { awards }); toast.success('Awarded. Last-PO prices updated for next time.'); load(); }
    catch (e) { toast.error(e.message); } finally { setAwarding(false); }
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to={`/requirements/${id}`} className="hover:underline">← {r.ref_no}</Link>}
        title="Quote comparison"
        sub={<>{r.title} · <Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</Badge></>}
        actions={<a className="btn-outline" href={`/api/comparison/requirement/${id}/export?${new URLSearchParams(weights)}`} target="_blank" rel="noreferrer">Export Excel</a>}
      />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Weights control */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="card p-5 lg:sticky lg:top-6">
            <h3 className="font-display font-semibold text-ink mb-1">Decision weights</h3>
            <p className="text-xs text-slate-500 mb-4">Tune what matters most. Scores update live.</p>
            {WEIGHT_KEYS.map((w) => (
              <div key={w.key} className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-ink">{w.label}</span><span className="font-mono text-indigo-600">{weights[w.key]}</span></div>
                <input type="range" min="0" max="100" step="5" value={weights[w.key]} className="w-full accent-indigo-700"
                  onChange={(e) => setWeights((wt) => ({ ...wt, [w.key]: Number(e.target.value) }))} />
              </div>
            ))}
            <div className="text-xs text-slate-500 mt-2 border-t border-line pt-3">
              {summary.responded_count}/{summary.vendor_count} vendors quoted · {summary.item_count} item(s)
            </div>
            <button className="btn-ghost w-full mt-2 text-xs" onClick={() => setWeights({ price: 50, lead_time: 15, payment: 10, rating: 25 })}>Reset to default</button>
          </div>
        </div>

        {/* Matrix + decisions */}
        <div className="lg:col-span-3 order-1 lg:order-2 space-y-5">
          {summary.responded_count === 0 && (
            <div className="card p-8 text-center text-slate-500 text-sm">No quotes received yet. Once vendors respond, the comparison appears here.</div>
          )}

          {items.map((row) => (
            <ItemComparison key={row.item.id} row={row} vendors={vendors} isHead={isHead && !alreadyAwarded}
              pick={picks[row.item.id]} onPick={(vid) => setPicks((p) => ({ ...p, [row.item.id]: vid }))}
              reason={reasons[row.item.id] || ''} onReason={(t) => setReasons((p) => ({ ...p, [row.item.id]: t }))} />
          ))}

          {isHead && !alreadyAwarded && summary.responded_count > 0 && (
            <div className="card p-5 flex flex-wrap items-center justify-between gap-3 bg-indigo-50 border-indigo-200">
              <div className="text-sm text-ink">Ready to decide? Confirm the selected vendor for each item.</div>
              <button className="btn-accent" disabled={awarding} onClick={award}>{awarding ? <Spinner className="text-white" /> : 'Award selected vendors'}</button>
            </div>
          )}
          {alreadyAwarded && (
            <div className="card p-5 bg-sage-50 border-sage-500/30 text-sm text-sage-700">✓ This requirement has been awarded. Awarded prices are highlighted below.</div>
          )}
        </div>
      </div>
    </>
  );
}

function ItemComparison({ row, vendors, isHead, pick, onPick, reason, onReason }) {
  const { item, cells, recommended_vendor_id, cheapest_vendor_id, award } = row;
  const cellByVendor = useMemo(() => Object.fromEntries(cells.map((c) => [c.vendor_id, c])), [cells]);

  return (
    <div className="card overflow-hidden">
      {/* item header */}
      <div className="px-5 py-3.5 border-b border-line bg-paper flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-indigo-600">{item.mat_code}</div>
          <div className="font-display font-semibold text-ink">{item.description}</div>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Req Qty</div><div className="tnum font-semibold">{kg(item.required_qty_kg)}</div></div>
          <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Last PO</div><div className="tnum font-semibold">{item.last_po_price ? inr(item.last_po_price) : '—'}</div>
            {item.last_po_date && <div className="text-[10px] text-slate-400">{date(item.last_po_date)}</div>}</div>
        </div>
      </div>

      {/* vendor cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
        {vendors.map((v) => {
          const c = cellByVendor[v.vendor_id];
          const recommended = v.vendor_id === recommended_vendor_id;
          const cheapest = v.vendor_id === cheapest_vendor_id;
          const selected = pick === v.vendor_id;
          const awarded = award && award.vendor_id === v.vendor_id;

          if (!c || !c.has_quote) {
            return (
              <div key={v.vendor_id} className="rounded-xl2 border border-dashed border-line p-4 opacity-70">
                <div className="font-medium text-ink">{v.vendor_name}</div>
                <div className="text-xs text-slate-400 mt-2">{c?.has_quote === false ? 'No response yet' : 'Did not quote'}</div>
              </div>
            );
          }
          if (c.no_quote || !c.quoted) {
            return (
              <div key={v.vendor_id} className="rounded-xl2 border border-line p-4 opacity-70">
                <div className="font-medium text-ink">{v.vendor_name}</div>
                <Badge tone="clay" className="mt-2">Can't supply this item</Badge>
              </div>
            );
          }

          return (
            <button key={v.vendor_id} type="button" disabled={!isHead} onClick={() => isHead && onPick(v.vendor_id)}
              className={`relative text-left rounded-xl2 border p-4 transition ${
                awarded ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-500/30'
                : selected && isHead ? 'border-marigold-500 ring-2 ring-marigold-500/40 bg-marigold-50'
                : recommended ? 'border-marigold-300 bg-marigold-50/40'
                : 'border-line bg-white'} ${isHead ? 'hover:border-marigold-400 cursor-pointer' : 'cursor-default'}`}>
              {awarded ? <span className="absolute -top-2 left-3 pill bg-sage-500 text-white text-[10px]">✓ Awarded</span>
                : recommended ? <span className="absolute -top-2 left-3 pill bg-marigold-500 text-white text-[10px]">★ Recommended</span> : null}

              <div className="flex items-center justify-between">
                <div className="font-medium text-ink">{v.vendor_name}</div>
                {isHead && <span className={`h-4 w-4 rounded-full border-2 grid place-items-center ${selected ? 'border-marigold-500 bg-marigold-500' : 'border-slate-300'}`}>{selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5"><Stars value={v.rating} />{v.active_certs > 0 && <span className="text-[10px] text-sage-700 bg-sage-50 rounded px-1.5 py-0.5">{v.active_certs} cert</span>}</div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-2xl font-semibold text-ink tnum">{inr(c.landed_price)}</div>
                  <div className="text-[11px] text-slate-400">landed / Kg{c.gst_pct ? ` · incl ${num(c.gst_pct)}% GST` : ''}</div>
                </div>
                {cheapest && <Badge tone="indigo">Lowest</Badge>}
              </div>

              {c.savings_per_kg != null && (
                <div className={`mt-2 text-xs font-semibold ${c.savings_per_kg >= 0 ? 'text-sage-700' : 'text-clay-600'}`}>
                  {c.savings_per_kg >= 0 ? '▼' : '▲'} {inr(Math.abs(c.savings_per_kg))}/Kg vs last PO
                  <span className="text-slate-400 font-normal"> · {c.savings_total >= 0 ? 'save' : 'extra'} {inr(Math.abs(c.savings_total), { dp: 0 })}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                <Spec label="Lead time" value={c.lead_time_days != null ? `${c.lead_time_days} days` : '—'} />
                <Spec label="Payment" value={c.payment_terms || '—'} />
                <Spec label="Line value" value={inr(c.line_total, { dp: 0 })} />
                <Spec label="Ext. GST" value={c.gst_pct ? `${num(c.gst_pct)}%` : '—'} />
              </div>

              <div className="mt-3 pt-3 border-t border-line">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Weighted score</div>
                <ScoreBar value={c.total_score} highlight={recommended || awarded} />
              </div>
              {c.remarks && <div className="mt-2 text-[11px] text-slate-500 italic">“{c.remarks}”</div>}
            </button>
          );
        })}
      </div>

      {isHead && pick && (
        <div className="px-4 pb-4">
          <input className="input text-sm" placeholder="Why this vendor? (optional justification for the record)"
            value={reason} onChange={(e) => onReason(e.target.value)} />
        </div>
      )}
      {award?.justification && <div className="px-5 pb-4 text-xs text-slate-500">Award note: {award.justification}</div>}
    </div>
  );
}

function Spec({ label, value }) {
  return <div className="flex justify-between"><span className="text-slate-400">{label}</span><span className="font-medium text-ink tnum">{value}</span></div>;
}
