import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, EmptyState, Stat, useToast, Spinner } from '../components/ui.jsx';
import { date } from '../lib/format.js';

const STATUS = {
  expired:  { label: 'Expired',       tone: 'clay' },
  expiring: { label: 'Expiring soon', tone: 'marigold' },
  valid:    { label: 'Valid',         tone: 'sage' },
  none:     { label: 'No expiry',     tone: 'slate' },
};

export default function Certificates() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = can.admin(user.role);

  function load() { api.get('/certificates').then((r) => setData(r.data)); }
  useEffect(load, []);

  async function runAlerts() {
    setBusy(true);
    try {
      const r = await api.post('/certificates/run-alerts');
      if (r.data.sent) toast.success(`Alert emailed to ${r.data.recipients} user(s) — ${r.data.expired} expired, ${r.data.soon} expiring.`);
      else if (r.data.reason === 'nothing expiring') toast.info('Nothing expiring within 30 days — no email sent.');
      else if (r.data.mode === 'draft') toast.warn('Email is OFF — turn on MAIL_ENABLED to send alerts.');
      else toast.info(`No email sent (${r.data.reason || 'n/a'}).`);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (!data) return <Loading />;
  const s = data.summary || {};
  const rows = filter ? data.certificates.filter((c) => c.status === filter) : data.certificates;

  return (
    <>
      <PageHeader eyebrow="Master data" title="Certificate master"
        sub="Every vendor certificate and its current status. Documents can be downloaded by anyone; only an administrator can upload them."
        actions={isAdmin && <button className="btn-outline" disabled={busy} onClick={runAlerts}>{busy ? <Spinner /> : 'Email alert now'}</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Expired" value={s.expired || 0} tone="clay" onClick={() => setFilter(filter === 'expired' ? '' : 'expired')} />
        <Stat label="Expiring ≤30d" value={s.expiring || 0} tone="marigold" onClick={() => setFilter(filter === 'expiring' ? '' : 'expiring')} />
        <Stat label="Valid" value={s.valid || 0} tone="sage" onClick={() => setFilter(filter === 'valid' ? '' : 'valid')} />
        <Stat label="Total" value={data.certificates.length} tone="indigo" onClick={() => setFilter('')} />
      </div>

      {filter && <div className="mb-3 text-sm text-slate-500">Filtered by <Badge tone={STATUS[filter].tone}>{STATUS[filter].label}</Badge> · <button className="text-indigo-600 hover:underline" onClick={() => setFilter('')}>clear</button></div>}

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="📜" title="No certificates" sub="Add certificates from a vendor’s page to track them here." /></div>
      ) : (
        <div className="card overflow-x-auto scroll-thin">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-paper border-b border-line"><tr>
              <th className="th">Vendor</th><th className="th">Certificate</th><th className="th">Issued by</th>
              <th className="th">Issued</th><th className="th">Expires</th><th className="th">Status</th><th className="th">Document</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="td"><Link to={`/vendors/${c.vendor_id}`} className="font-medium text-ink hover:text-indigo-700">{c.vendor_name}</Link>
                    {!c.vendor_active && <Badge tone="slate" className="ml-2">Inactive</Badge>}</td>
                  <td className="td font-medium text-ink">{c.cert_type}</td>
                  <td className="td text-slate-500">{c.issued_by || '—'}</td>
                  <td className="td text-slate-500">{date(c.issue_date)}</td>
                  <td className="td text-slate-500">{date(c.expiry_date)}</td>
                  <td className="td"><Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge></td>
                  <td className="td">
                    {c.has_file
                      ? <a className="btn-outline !py-1 !px-2.5 text-xs" href={`/api/vendors/${c.vendor_id}/certificates/${c.id}/file`}>Download</a>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-4">Administrators and the procurement team also receive an automatic email when certificates are expiring or have expired.</p>
    </>
  );
}
