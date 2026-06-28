import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Spinner } from '../components/ui.jsx';
import { kg, date } from '../lib/format.js';

export default function VendorPortal() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [lines, setLines] = useState([]);
  const [meta, setMeta] = useState({ contact_name: '', valid_until: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/portal/${token}`).then((r) => {
      const ex = {}; (r.data.existing?.lines || []).forEach((l) => { ex[l.requirement_item_id] = l; });
      setLines(r.data.items.map((it) => {
        const l = ex[it.id] || {};
        return { ...it, price_per_kg: l.price_per_kg ?? '', gst_pct: l.gst_pct ?? 5,
          lead_time_days: l.lead_time_days ?? (r.data.rfq.default_lead_time ?? ''),
          payment_terms: l.payment_terms ?? (r.data.rfq.default_payment_terms ?? ''),
          remarks: l.remarks ?? '', no_quote: !!l.no_quote };
      }));
      if (r.data.existing) setMeta({ contact_name: '', valid_until: r.data.existing.valid_until || '', notes: r.data.existing.notes || '' });
      setState({ loading: false, rfq: r.data.rfq });
    }).catch((e) => { setState({ loading: false }); setErr(e.message); });
  }, [token]);

  function setLine(i, patch) { setLines((a) => a.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); }

  async function submit() {
    setBusy(true); setErr('');
    try {
      await api.post(`/portal/${token}`, { ...meta, valid_until: meta.valid_until || null, lines: lines.map((l) => ({
        requirement_item_id: l.id, no_quote: l.no_quote,
        price_per_kg: l.no_quote ? null : (l.price_per_kg === '' ? null : Number(l.price_per_kg)),
        gst_pct: Number(l.gst_pct) || 0, lead_time_days: l.lead_time_days === '' ? null : Number(l.lead_time_days),
        payment_terms: l.payment_terms || null, remarks: l.remarks || null,
      })) });
      setDone(true);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (state.loading) return <div className="min-h-screen grid place-items-center bg-paper"><Spinner className="text-indigo-600" /></div>;

  if (err && !state.rfq) return (
    <Shell><div className="card p-8 text-center max-w-md mx-auto">
      <div className="text-3xl mb-2">🔗</div><h2 className="font-display font-semibold text-ink">Link not valid</h2>
      <p className="text-sm text-slate-500 mt-1">{err}</p>
    </div></Shell>
  );

  if (done) return (
    <Shell><div className="card p-10 text-center max-w-md mx-auto">
      <div className="h-14 w-14 rounded-full bg-sage-50 text-sage-700 grid place-items-center text-2xl mx-auto mb-3">✓</div>
      <h2 className="font-display text-xl font-bold text-ink">Quote received</h2>
      <p className="text-sm text-slate-500 mt-2">Thank you. The D'Decor procurement team has your quote for <b>{state.rfq.ref_no}</b>. You may close this window — reopen the link anytime to revise before award.</p>
      <button className="btn-outline mt-5" onClick={() => setDone(false)}>Revise my quote</button>
    </div></Shell>
  );

  const r = state.rfq;
  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        <div className="card p-6 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-marigold-600 font-semibold">Request for Quotation</div>
              <h1 className="font-display text-2xl font-bold text-ink mt-1">{r.title}</h1>
              <div className="font-mono text-sm text-indigo-600 mt-1">{r.ref_no}</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-slate-400 text-xs">Quote requested from</div>
              <div className="font-semibold text-ink">{r.vendor_name}</div>
              {r.due_date && <div className="text-xs text-clay-600 mt-1">Please respond by {date(r.due_date)}</div>}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-3 px-1">Enter your best rates below. Use <b>Can't supply</b> for any item you cannot offer. You can reopen this link to revise until the order is awarded.</p>

        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.id} className={`card p-4 ${l.no_quote ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div><div className="font-mono text-xs text-indigo-600">{l.mat_code}</div>
                  <div className="font-medium text-ink">{l.description}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Required: {kg(l.required_qty_kg)}</div></div>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                  <input type="checkbox" className="accent-clay-500" checked={l.no_quote} onChange={(e) => setLine(i, { no_quote: e.target.checked })} /> Can't supply
                </label>
              </div>
              {!l.no_quote && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className="label">Price / Kg (₹)</label><input className="input tnum" type="number" step="any" value={l.price_per_kg} onChange={(e) => setLine(i, { price_per_kg: e.target.value })} placeholder="0.00" /></div>
                  <div><label className="label">GST %</label><input className="input tnum" type="number" step="any" value={l.gst_pct} onChange={(e) => setLine(i, { gst_pct: e.target.value })} /></div>
                  <div><label className="label">Lead time (days)</label><input className="input tnum" type="number" value={l.lead_time_days} onChange={(e) => setLine(i, { lead_time_days: e.target.value })} /></div>
                  <div><label className="label">Payment terms</label><input className="input" value={l.payment_terms} onChange={(e) => setLine(i, { payment_terms: e.target.value })} placeholder="30 Days" /></div>
                  <div className="col-span-2 sm:col-span-4"><label className="label">Remarks (optional)</label><input className="input" value={l.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} placeholder="Origin, packing, validity…" /></div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="card p-4 mt-3 grid sm:grid-cols-3 gap-3">
          <div><label className="label">Your name</label><input className="input" value={meta.contact_name} onChange={(e) => setMeta({ ...meta, contact_name: e.target.value })} placeholder="Contact person" /></div>
          <div><label className="label">Quote valid until</label><input className="input" type="date" value={meta.valid_until} onChange={(e) => setMeta({ ...meta, valid_until: e.target.value })} /></div>
          <div><label className="label">Overall note</label><input className="input" value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} /></div>
        </div>

        {err && <div className="text-sm text-clay-600 bg-clay-50 rounded-lg px-3 py-2 mt-3">{err}</div>}

        <div className="flex items-center gap-3 mt-5 pb-10">
          <button className="btn-accent" disabled={busy} onClick={submit}>{busy ? <Spinner className="text-white" /> : 'Submit quote'}</button>
          <span className="text-xs text-slate-400">Your prices are shared only with the D'Decor procurement team.</span>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-indigo-800 text-white">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <img src="/logo-light.png" alt="D'Decor" className="h-8 w-auto" />
          <div className="border-l border-white/20 pl-3">
            <div className="font-display font-semibold leading-tight text-sm">Yarn Procurement</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-indigo-200">Vendor Quote Portal</div>
          </div>
        </div>
      </header>
      <div className="px-5 py-8">{children}</div>
    </div>
  );
}
