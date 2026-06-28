import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Modal, Spinner, useToast, EmptyState } from '../components/ui.jsx';
import { inr, num, date } from '../lib/format.js';

const CAT_TONE = { Cotton: 'sage', Linen: 'marigold', Polyester: 'indigo', Blends: 'slate' };

export default function Materials() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [trend, setTrend] = useState(null);
  const [adding, setAdding] = useState(false);
  const canEdit = can.procure(user.role);

  function load() { api.get('/materials', { params: q ? { q } : {} }).then((r) => setRows(r.data.materials)); }
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  return (
    <>
      <PageHeader eyebrow="Master data · price intelligence" title="Yarn & prices"
        sub="Your yarn catalogue with last purchase price and market trend — the reference for every comparison."
        actions={canEdit && <button className="btn-accent" onClick={() => setAdding(true)}>+ Add yarn</button>} />

      <input className="input max-w-sm mb-4" placeholder="Search code or description…" value={q} onChange={(e) => setQ(e.target.value)} />

      {!rows ? <Loading /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon="🧵" title="No yarns found" sub="Add yarn materials to track their prices over time." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[680px]">
              <thead className="bg-paper border-b border-line"><tr>
                <th className="th">Code</th><th className="th">Description</th><th className="th">Category</th>
                <th className="th text-right">Last PO</th><th className="th">PO date</th><th className="th text-right">Latest</th><th className="th"></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-paper">
                    <td className="td font-mono text-indigo-600 text-xs">{m.mat_code}</td>
                    <td className="td font-medium text-ink">{m.description}</td>
                    <td className="td">{m.category ? <Badge tone={CAT_TONE[m.category] || 'slate'}>{m.category}</Badge> : '—'}</td>
                    <td className="td text-right tnum">{m.last_po_price ? inr(m.last_po_price) : '—'}</td>
                    <td className="td text-slate-500">{date(m.last_po_date)}</td>
                    <td className="td text-right tnum">{m.latest_price ? inr(m.latest_price) : '—'}</td>
                    <td className="td text-right"><button className="btn-ghost !py-1 text-xs" onClick={() => setTrend(m)}>Trend →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trend && <TrendModal material={trend} canEdit={canEdit} onClose={() => setTrend(null)} onChange={load} />}
      {adding && <AddMaterialModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast.success('Yarn added.'); }} />}
    </>
  );
}

function TrendModal({ material, canEdit, onClose, onChange }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [add, setAdd] = useState({ price_date: '', price_per_kg: '', source: 'market' });
  const load = () => api.get(`/materials/${material.id}`).then((r) => setData(r.data));
  useEffect(() => { load(); }, [material.id]);

  async function addPoint() {
    if (!add.price_date || !add.price_per_kg) return toast.error('Enter date and price.');
    try { await api.post(`/materials/${material.id}/prices`, { ...add, price_per_kg: Number(add.price_per_kg) }); setAdd({ price_date: '', price_per_kg: '', source: 'market' }); load(); onChange?.(); toast.success('Price point added.'); }
    catch (e) { toast.error(e.message); }
  }

  return (
    <Modal open title={`${material.mat_code} · price trend`} onClose={onClose} size="lg">
      {!data ? <Loading /> : (
        <div className="space-y-4">
          <div className="text-sm text-slate-500">{material.description}</div>
          <Sparkline history={data.history} />
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2 bg-paper rounded-lg p-3">
              <div><label className="label">Date</label><input className="input !py-1.5" type="date" value={add.price_date} onChange={(e) => setAdd({ ...add, price_date: e.target.value })} /></div>
              <div><label className="label">Price/Kg</label><input className="input !py-1.5 tnum w-28" type="number" step="any" value={add.price_per_kg} onChange={(e) => setAdd({ ...add, price_per_kg: e.target.value })} /></div>
              <div><label className="label">Source</label><select className="input !py-1.5" value={add.source} onChange={(e) => setAdd({ ...add, source: e.target.value })}><option value="market">Market</option><option value="po">PO</option></select></div>
              <button className="btn-primary !py-1.5" onClick={addPoint}>Add</button>
            </div>
          )}
          <div className="max-h-52 overflow-auto scroll-thin border-t border-line pt-2">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {[...data.history].reverse().map((h) => (
                  <tr key={h.id}><td className="py-1.5 text-slate-500">{date(h.price_date)}</td>
                    <td className="py-1.5"><Badge tone={h.source === 'po' ? 'sage' : 'slate'}>{h.source}</Badge></td>
                    <td className="py-1.5 text-right tnum font-medium">{inr(h.price_per_kg)}</td>
                    <td className="py-1.5 text-right text-slate-400 text-xs">{h.vendor_name || ''}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Sparkline({ history }) {
  const pts = history.filter((h) => h.price_per_kg != null);
  if (pts.length < 2) return <div className="text-sm text-slate-400 bg-paper rounded-lg p-6 text-center">Not enough data points to chart yet.</div>;
  const W = 560, H = 160, pad = 28;
  const prices = pts.map((p) => Number(p.price_per_kg));
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(Number(p.price_per_kg))}`).join(' ');
  const area = `${line} L${x(pts.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const last = prices[prices.length - 1], first = prices[0];
  const change = ((last - first) / first) * 100;

  return (
    <div className="bg-paper rounded-lg p-3">
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="text-slate-500">{pts.length} points · {date(pts[0].price_date)} → {date(pts[pts.length - 1].price_date)}</span>
        <span className={`font-semibold ${change >= 0 ? 'text-clay-600' : 'text-sage-700'}`}>{change >= 0 ? '▲' : '▼'} {num(Math.abs(change), 1)}%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.18" /><stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#g)" />
        <path d={line} fill="none" stroke="var(--chart-line)" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(Number(p.price_per_kg))} r="2.5" fill={p.source === 'po' ? 'var(--chart-po)' : 'var(--chart-market)'} />)}
        <text x={pad} y={16} className="fill-slate-400" fontSize="11">{inr(max, { dp: 0 })}</text>
        <text x={pad} y={H - 8} className="fill-slate-400" fontSize="11">{inr(min, { dp: 0 })}</text>
      </svg>
    </div>
  );
}

function AddMaterialModal({ onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ mat_code: '', description: '', category: 'Cotton', uom: 'Kg' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true);
    try { await api.post('/materials', f); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open title="Add yarn material" onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">Material code</label><input className="input font-mono" value={f.mat_code} onChange={set('mat_code')} placeholder="50302SP0" /></div>
        <div><label className="label">Category</label><select className="input" value={f.category} onChange={set('category')}>{['Cotton', 'Linen', 'Polyester', 'Blends', 'Viscose', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label">Description</label><input className="input" value={f.description} onChange={set('description')} placeholder="2/30 Spun Polyester Knotless" /></div>
      </div>
      <div className="flex gap-2 mt-5"><button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner className="text-white" /> : 'Add yarn'}</button>
        <button className="btn-outline" onClick={onClose}>Cancel</button></div>
    </Modal>
  );
}
