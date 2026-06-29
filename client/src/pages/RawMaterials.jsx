import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Modal, Spinner, useToast } from '../components/ui.jsx';
import { num, date } from '../lib/format.js';

const fmt = (v, unit) => {
  if (v == null) return '—';
  const n = Number(v);
  const s = Math.abs(n) >= 1000 ? num(n, 0) : num(n, 2);
  return unit && unit.startsWith('$') ? `$${s}` : s;
};

export default function RawMaterials() {
  const { user } = useAuth();
  const toast = useToast();
  const canView = can.procure(user.role) || user.role === 'depthead';
  const canEdit = can.procure(user.role); // procurement / admin
  const [data, setData] = useState(null);
  const [sel, setSel] = useState('shankar6_perkg');
  const [adding, setAdding] = useState(false);

  if (!canView) return <Navigate to="/" replace />;

  function load() { api.get('/raw-materials').then((r) => setData(r.data)); }
  useEffect(load, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    return data.groups
      .map((g) => ({ grp: g, items: data.materials.filter((m) => m.grp === g) }))
      .filter((x) => x.items.length);
  }, [data]);

  if (!data) return <Loading />;
  const selMat = data.materials.find((m) => m.code === sel) || data.materials.find((m) => m.latest != null);

  return (
    <>
      <PageHeader eyebrow="Procurement intelligence" title="Raw Material Price Trend"
        sub="Cotton, polyester chain, crude, linen & viscose movements — the benchmarks for negotiating yarn and fabric rates."
        actions={canEdit && <button className="btn-accent" onClick={() => setAdding(true)}>+ Add price update</button>} />

      <div className="text-xs text-slate-400 mb-4">Latest data: {date(data.last_date)}</div>

      {selMat && <TrendCard mat={selMat} />}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {grouped.map(({ grp, items }) => (
          <div key={grp} className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line bg-paper"><h3 className="font-display font-semibold text-sm text-ink">{grp}</h3></div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {items.map((m) => {
                  const up = m.change_pct != null && m.change_pct > 0;
                  const down = m.change_pct != null && m.change_pct < 0;
                  return (
                    <tr key={m.code} onClick={() => setSel(m.code)}
                      className={`cursor-pointer transition ${sel === m.code ? 'bg-indigo-50' : 'hover:bg-slate-50/60'}`}>
                      <td className="px-4 py-2">
                        <div className="font-medium text-ink leading-tight">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.unit}</div>
                      </td>
                      <td className="px-3 py-2 text-right tnum font-semibold text-ink whitespace-nowrap">{fmt(m.latest, m.unit)}</td>
                      <td className="px-4 py-2 text-right tnum text-xs whitespace-nowrap">
                        {m.change_pct == null ? <span className="text-slate-300">—</span>
                          : <span className={up ? 'text-clay-600' : down ? 'text-sage-700' : 'text-slate-400'}>{up ? '▲' : down ? '▼' : ''} {num(Math.abs(m.change_pct), 1)}%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">Tip: a rise in cotton candy / index or PTA-MEG usually precedes vendor yarn quotes moving up — use these as your negotiation anchor.</p>

      {adding && <AddModal lastDate={data.last_date} onClose={() => setAdding(false)}
        onDone={(d) => { setAdding(false); load(); toast.success(`Prices saved for ${date(d)}.`); }} />}
    </>
  );
}

function TrendCard({ mat }) {
  const [series, setSeries] = useState(null);
  useEffect(() => { setSeries(null); api.get('/raw-materials/history', { params: { codes: mat.code } }).then((r) => setSeries(r.data.series[mat.code] || [])); }, [mat.code]);
  const up = mat.change_pct != null && mat.change_pct > 0;
  const down = mat.change_pct != null && mat.change_pct < 0;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <div className="font-display font-semibold text-ink">{mat.name}</div>
          <div className="text-xs text-slate-400">{mat.grp} · {mat.unit}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tnum text-ink">{fmt(mat.latest, mat.unit)}</div>
          {mat.change_pct != null && <div className={`text-xs font-semibold ${up ? 'text-clay-600' : down ? 'text-sage-700' : 'text-slate-400'}`}>{up ? '▲' : down ? '▼' : ''} {num(Math.abs(mat.change_pct), 1)}% vs previous</div>}
        </div>
      </div>
      {!series ? <div className="h-44 grid place-items-center"><Spinner className="text-indigo-600" /></div>
        : series.length < 2 ? <div className="h-44 grid place-items-center text-sm text-slate-400">Not enough history to chart.</div>
        : <LineChart points={series} />}
    </div>
  );
}

function LineChart({ points }) {
  const W = 900, H = 200, padL = 48, padR = 12, padT = 12, padB = 24;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`;
  const ticks = [max, (max + min) / 2, min];
  const labelIdx = [0, Math.floor(points.length / 2), points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
      <defs><linearGradient id="rmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.16" /><stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0" /></linearGradient></defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--chart-axis)" fontFamily="IBM Plex Mono, monospace">{num(t, Math.abs(t) >= 1000 ? 0 : 1)}</text>
        </g>
      ))}
      {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--chart-axis)">{date(points[i].date)}</text>)}
      <path d={area} fill="url(#rmg)" />
      <path d={line} fill="none" stroke="var(--chart-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function AddModal({ lastDate, onClose, onDone }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState(null);
  const [groups, setGroups] = useState([]);
  const [vals, setVals] = useState({});
  const [pdate, setPdate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/raw-materials/catalog'), api.get('/raw-materials/entry/latest')]).then(([c, l]) => {
      setCatalog(c.data.materials.filter((m) => m.kind === 'input'));
      setGroups(c.data.groups);
      const v = {}; Object.entries(l.data.values).forEach(([k, val]) => { v[k] = String(val); });
      setVals(v);
    });
  }, []);

  async function save() {
    if (!pdate) return toast.error('Pick a date for this update.');
    setBusy(true);
    try {
      const r = await api.post('/raw-materials/entry', { price_date: pdate, values: vals });
      onDone(r.data.date);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open title="Add price update" onClose={onClose} size="xl">
      {!catalog ? <Loading /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="label">Date of this update</label>
              <input className="input" type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} /></div>
            <p className="text-xs text-slate-400 pb-2">Prefilled with the latest values ({date(lastDate)}). Enter only what changed — per-Kg & Rs/candy are computed automatically.</p>
          </div>
          {groups.map((g) => {
            const items = catalog.filter((m) => m.grp === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-marigold-600 mb-1.5">{g}</div>
                <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {items.map((m) => (
                    <div key={m.code}>
                      <label className="block text-xs text-slate-500 mb-0.5 truncate" title={`${m.name} (${m.unit})`}>{m.name}</label>
                      <input className="input tnum !py-1.5 text-sm" type="number" step="any" value={vals[m.code] ?? ''}
                        onChange={(e) => setVals({ ...vals, [m.code]: e.target.value })} placeholder={m.unit} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pt-2 border-t border-line">
            <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner className="text-white" /> : 'Save update'}</button>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
