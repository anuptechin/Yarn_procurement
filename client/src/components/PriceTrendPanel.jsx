import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { inr, num, date } from '../lib/format.js';
import { Loading } from './ui.jsx';

// Distinct, brand-aligned line colours (indigo/marigold anchored).
const PALETTE = ['#22335B', '#C8932A', '#2F7D5B', '#B5462E', '#3E6BA8', '#7A4E9E', '#1C8C8C', '#A9791E', '#5E74A6', '#C2603F'];
const RANGES = [{ k: '3m', m: 3 }, { k: '6m', m: 6 }, { k: '12m', m: 12 }, { k: 'all', m: 999 }];

export default function PriceTrendPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('All');
  const [mode, setMode] = useState('abs');     // 'abs' | 'indexed'
  const [range, setRange] = useState('12m');
  const [hidden, setHidden] = useState(() => new Set());
  const [hover, setHover] = useState(null);    // index into rangeDates

  useEffect(() => {
    api.get('/reports/price-trends').then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return ['All', ...[...new Set(data.materials.map((m) => m.category).filter(Boolean))].sort()];
  }, [data]);

  // colour map is stable across the full material list
  const colorOf = useMemo(() => {
    const map = {};
    (data?.materials || []).forEach((m, i) => { map[m.id] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [data]);

  const inCat = useMemo(
    () => (data?.materials || []).filter((m) => cat === 'All' || m.category === cat),
    [data, cat]
  );

  // date axis (equal spacing), filtered by range
  const rangeDates = useMemo(() => {
    if (!data) return [];
    const all = data.dates;
    if (range === 'all' || !all.length) return all;
    const months = RANGES.find((r) => r.k === range).m;
    const last = new Date(all[all.length - 1]);
    const cutoff = new Date(last); cutoff.setMonth(cutoff.getMonth() - months);
    const c = cutoff.toISOString().slice(0, 10);
    return all.filter((d) => d >= c);
  }, [data, range]);

  // series prepared for plotting (respect hidden + range + mode)
  const plotted = useMemo(() => {
    if (!rangeDates.length) return [];
    return inCat.filter((m) => !hidden.has(m.id)).map((m) => {
      const byDate = Object.fromEntries(m.series.map((p) => [p.date, p.price]));
      const pts = rangeDates.map((d, i) => (byDate[d] != null ? { i, date: d, price: byDate[d] } : null)).filter(Boolean);
      if (!pts.length) return null;
      const base = pts[0].price;
      return { ...m, color: colorOf[m.id], pts: pts.map((p) => ({ ...p, value: mode === 'indexed' ? (p.price / base) * 100 : p.price })) };
    }).filter(Boolean);
  }, [inCat, hidden, rangeDates, mode, colorOf]);

  if (err) return <div className="card p-5 text-clay-600 text-sm">{err}</div>;
  if (!data) return <div className="card"><Loading label="Loading price intelligence…" /></div>;
  if (!data.materials.length) return null;

  // ---- chart geometry ----
  const W = 920, H = 340, padL = 56, padR = 18, padT = 18, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = rangeDates.length;
  const xAt = (i) => padL + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));

  const vals = plotted.flatMap((m) => m.pts.map((p) => p.value));
  let yMin = vals.length ? Math.min(...vals) : 0;
  let yMax = vals.length ? Math.max(...vals) : 100;
  const pad = (yMax - yMin) * 0.12 || 10;
  yMin -= pad; yMax += pad;
  const yAt = (v) => padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);
  const xLabelIdx = pickLabels(n);

  // insight: biggest mover across plotted set over the range
  const movers = plotted
    .map((m) => ({ m, pct: m.pts.length >= 2 ? ((m.pts.at(-1).price - m.pts[0].price) / m.pts[0].price) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
  const riser = movers[0], faller = movers.at(-1);

  return (
    <div className="card overflow-hidden">
      {/* header + insight */}
      <div className="px-5 pt-4 pb-3 border-b border-line flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-cond font-bold uppercase tracking-[0.16em] text-marigold-600">Price intelligence</div>
          <h2 className="font-display text-lg font-bold text-ink">Yarn price trends</h2>
          {riser && faller && plotted.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              Over this window, <b className="text-clay-600">{shortName(riser.m)} {riser.pct >= 0 ? '▲' : '▼'} {num(Math.abs(riser.pct), 1)}%</b>
              {movers.length > 1 && <> · <b className="text-sage-700">{shortName(faller.m)} {faller.pct >= 0 ? '▲' : '▼'} {num(Math.abs(faller.pct), 1)}%</b></>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Toggle options={[['abs', '₹'], ['indexed', 'Indexed %']]} value={mode} onChange={setMode} />
          <Toggle options={RANGES.map((r) => [r.k, r.k === 'all' ? 'All' : r.k.toUpperCase()])} value={range} onChange={setRange} />
        </div>
      </div>

      {/* category chips */}
      <div className="px-5 pt-3 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button key={c} onClick={() => { setCat(c); setHidden(new Set()); }}
            className={`pill border ${cat === c ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-surface text-slate-600 border-line hover:border-indigo-300'}`}>{c}</button>
        ))}
      </div>

      {/* chart */}
      <div className="relative px-3 pt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}
          onMouseLeave={() => setHover(null)}>
          {/* gridlines + y labels */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={yAt(t)} x2={W - padR} y2={yAt(t)} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={padL - 8} y={yAt(t) + 3} textAnchor="end" fontSize="10" fill="var(--chart-axis)" fontFamily="IBM Plex Mono, monospace">
                {mode === 'indexed' ? num(t, 0) : num(t, 0)}
              </text>
            </g>
          ))}
          {/* x labels */}
          {rangeDates.map((d, i) => xLabelIdx.includes(i) && (
            <text key={d} x={xAt(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--chart-axis)">{shortDate(d)}</text>
          ))}

          {/* hover guide */}
          {hover != null && (
            <line x1={xAt(hover)} y1={padT} x2={xAt(hover)} y2={padT + plotH} stroke="var(--chart-accent)" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {/* lines */}
          {plotted.map((m) => (
            <g key={m.id}>
              <path d={linePath(m.pts, xAt, yAt)} fill="none" stroke={m.color} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" opacity={hover != null ? 0.92 : 1} />
              {hover != null && m.pts.find((p) => p.i === hover) && (
                <circle cx={xAt(hover)} cy={yAt(m.pts.find((p) => p.i === hover).value)} r="3.5" fill="var(--chart-dot-fill)" stroke={m.color} strokeWidth="2" />
              )}
            </g>
          ))}

          {/* hit columns for hover */}
          {rangeDates.map((d, i) => (
            <rect key={i} x={xAt(i) - plotW / (2 * Math.max(n - 1, 1))} y={padT} width={plotW / Math.max(n - 1, 1)} height={plotH}
              fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>

        {/* tooltip */}
        {hover != null && plotted.length > 0 && (
          <Tooltip xFrac={(xAt(hover)) / W} date={rangeDates[hover]} mode={mode}
            rows={plotted.map((m) => ({ name: shortName(m), color: m.color, pt: m.pts.find((p) => p.i === hover) }))
              .filter((r) => r.pt).sort((a, b) => b.pt.price - a.pt.price)} />
        )}
      </div>

      {/* legend (click to toggle) */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2 border-t border-line mt-2">
        {inCat.map((m) => {
          const off = hidden.has(m.id);
          return (
            <button key={m.id} onClick={() => setHidden((s) => { const x = new Set(s); x.has(m.id) ? x.delete(m.id) : x.add(m.id); return x; })}
              className={`flex items-center gap-2 text-left transition ${off ? 'opacity-40' : ''}`}>
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorOf[m.id] }} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-ink truncate">{shortName(m)}</span>
                <span className="block text-[11px] text-slate-400 font-mono">{inr(m.latest)} <span className={m.change_pct >= 0 ? 'text-clay-600' : 'text-sage-700'}>
                  {m.change_pct >= 0 ? '▲' : '▼'}{num(Math.abs(m.change_pct), 1)}%</span></span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- helpers ----
function linePath(pts, xAt, yAt) {
  return pts.map((p, k) => `${k ? 'L' : 'M'}${xAt(p.i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(' ');
}
function pickLabels(n) {
  if (n <= 1) return [0];
  const want = Math.min(7, n);
  const step = (n - 1) / (want - 1);
  return Array.from({ length: want }, (_, i) => Math.round(i * step));
}
function shortName(m) {
  // trim leading mat code from description for a cleaner label
  const d = (m.description || '').replace(new RegExp('^' + m.mat_code + '\\s*'), '').trim();
  return d ? `${m.mat_code} · ${d}`.slice(0, 30) : m.mat_code;
}
const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {options.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${value === k ? 'bg-indigo-700 text-white' : 'text-slate-500 hover:text-ink'}`}>{label}</button>
      ))}
    </div>
  );
}

function Tooltip({ xFrac, date: d, rows, mode }) {
  const flip = xFrac > 0.62;
  return (
    <div className="absolute z-20 pointer-events-none" style={{ left: `${xFrac * 100}%`, top: 8 }}>
      <div className={`card shadow-pop px-3 py-2 w-52 ${flip ? '-translate-x-full -ml-3' : 'ml-3'}`}>
        <div className="text-[11px] font-semibold text-slate-400 mb-1.5">{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="flex-1 truncate text-slate-600">{r.name}</span>
              <span className="font-mono font-semibold text-ink">{mode === 'indexed' ? num(r.pt.value, 1) : inr(r.pt.price, { dp: 0 })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
