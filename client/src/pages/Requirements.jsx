import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, EmptyState } from '../components/ui.jsx';
import { STATUS, PRIORITY, date } from '../lib/format.js';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending_approval', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rfq_sent', label: 'RFQ Sent' },
  { key: 'comparison_ready', label: 'Ready to Award' },
  { key: 'awarded', label: 'Awarded' },
];

export default function Requirements() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setRows(null);
    api.get('/requirements', { params: status ? { status } : {} })
      .then((r) => setRows(r.data.requirements)).catch((e) => setErr(e.message));
  }, [status]);

  return (
    <>
      <PageHeader eyebrow="Sourcing" title="Requirements"
        sub="Every yarn indent, from request through award."
        actions={can.raise(user.role) && <Link to="/requirements/new" className="btn-accent">+ New Requirement</Link>} />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setSp(f.key ? { status: f.key } : {})}
            className={`pill border ${status === f.key ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-surface text-slate-600 border-line hover:border-indigo-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {err && <div className="text-clay-600">{err}</div>}
      {!rows ? <Loading /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon="🧶" title="No requirements here"
          sub="When a yarn requirement is raised it will appear in this list."
          action={can.raise(user.role) && <Link to="/requirements/new" className="btn-primary">Raise a requirement</Link>} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[760px]">
              <thead className="bg-paper border-b border-line">
                <tr>
                  <th className="th">Ref</th><th className="th">Title</th><th className="th">Raised by</th>
                  <th className="th">Items</th><th className="th">Quotes</th><th className="th">Needed by</th>
                  <th className="th">Priority</th><th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-paper transition">
                    <td className="td"><Link to={`/requirements/${r.id}`} className="font-mono text-xs text-indigo-600 hover:underline">{r.ref_no}</Link></td>
                    <td className="td"><Link to={`/requirements/${r.id}`} className="font-medium text-ink hover:text-indigo-700">{r.title}</Link></td>
                    <td className="td text-slate-500">{r.raised_by_name}</td>
                    <td className="td tnum text-slate-600">{r.item_count}</td>
                    <td className="td tnum text-slate-600">{r.quote_count}/{r.rfq_count}</td>
                    <td className="td text-slate-500">{date(r.needed_by)}</td>
                    <td className="td">{r.priority !== 'normal' ? <Badge tone={PRIORITY[r.priority]?.tone}>{PRIORITY[r.priority]?.label}</Badge> : <span className="text-slate-300">—</span>}</td>
                    <td className="td"><Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
