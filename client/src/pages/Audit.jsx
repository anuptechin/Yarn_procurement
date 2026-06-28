import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, EmptyState } from '../components/ui.jsx';
import { dateTime } from '../lib/format.js';

const PAGE = 100;

export default function Audit() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [facets, setFacets] = useState({ entities: [], actions: [] });
  const [filter, setFilter] = useState({ entity: '', action: '' });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!user?.is_super) return <Navigate to="/" replace />;

  useEffect(() => { api.get('/audit/facets').then((r) => setFacets(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: PAGE, offset };
    if (filter.entity) params.entity = filter.entity;
    if (filter.action) params.action = filter.action;
    api.get('/audit', { params }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [offset, filter]);

  const setF = (k) => (e) => { setOffset(0); setFilter((f) => ({ ...f, [k]: e.target.value })); };
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <>
      <PageHeader eyebrow="Administration · Super Admin" title="Audit log"
        sub="Every create / update / award / dispatch action, with the user who performed it." />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Entity</label>
          <select className="input min-w-[160px]" value={filter.entity} onChange={setF('entity')}>
            <option value="">All</option>
            {facets.entities.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Action</label>
          <select className="input min-w-[160px]" value={filter.action} onChange={setF('action')}>
            <option value="">All</option>
            {facets.actions.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">{total > 0 ? `Showing ${from}–${to} of ${total}` : ''}</div>
      </div>

      {loading && !data ? <Loading /> : !data || data.entries.length === 0 ? (
        <div className="card"><EmptyState icon="🗂️" title="No audit entries" sub="Actions will appear here as users work in the portal." /></div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">When</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 align-top">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateTime(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{e.user_name || '—'}</div>
                      {e.user_email && <div className="text-xs text-slate-400">{e.user_email}</div>}
                    </td>
                    <td className="px-4 py-3"><Badge tone="indigo">{e.action}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{e.entity || '—'}{e.entity_id != null ? ` #${e.entity_id}` : ''}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono break-all max-w-md">{fmtDetail(e.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > PAGE && (
            <div className="flex items-center justify-between mt-4">
              <button className="btn-outline !py-1.5 text-xs" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>← Newer</button>
              <span className="text-xs text-slate-400">Page {Math.floor(offset / PAGE) + 1} of {Math.ceil(total / PAGE)}</span>
              <button className="btn-outline !py-1.5 text-xs" disabled={to >= total} onClick={() => setOffset(offset + PAGE)}>Older →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function fmtDetail(d) {
  if (!d) return '—';
  try {
    const o = typeof d === 'string' ? JSON.parse(d) : d;
    if (o && typeof o === 'object') return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('  ·  ');
  } catch { /* not JSON */ }
  return String(d);
}
