import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Stat, Badge, Loading, PageHeader } from '../components/ui.jsx';
import PriceTrendPanel from '../components/PriceTrendPanel.jsx';
import { STATUS, PRIORITY, date, daysUntil } from '../lib/format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/reports/dashboard').then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="text-clay-600">{err}</div>;
  if (!data) return <Loading />;

  const { kpis, totals, expiringCerts, recent } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0].replace(/[^A-Za-z]/g, '');

  return (
    <>
      <PageHeader
        eyebrow={`${greeting}${firstName ? ', ' + firstName : ''}`}
        title="Procurement at a glance"
        sub="Everything moving through the sourcing desk — what needs you, and what's on track."
        actions={can.raise(user.role) && <Link to="/requirements/new" className="btn-accent">+ New Requirement</Link>}
      />

      {/* KPIs — the four things that need a human */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Pending approval" value={kpis.pendingApproval} tone="marigold"
          hint={can.approve(user.role) ? 'Awaiting your decision' : 'With the dept head'}
          onClick={() => navigate('/requirements?status=pending_approval')} />
        <Stat label="Awaiting quotes" value={kpis.awaitingQuotes} tone="indigo"
          hint="RFQ out with vendors" onClick={() => navigate('/requirements?status=rfq_sent')} />
        <Stat label="Ready to award" value={kpis.readyToAward} tone="sage"
          hint="Comparison prepared" onClick={() => navigate('/requirements?status=comparison_ready')} />
        <Stat label="Awarded" value={kpis.awarded} tone="sage" hint="Decision made"
          onClick={() => navigate('/requirements?status=awarded')} />
      </div>

      {/* Price intelligence — the centrepiece for management review */}
      <div className="mt-6">
        <PriceTrendPanel />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Recent requirements */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
            <h2 className="font-display font-semibold text-ink">Recent requirements</h2>
            <Link to="/requirements" className="text-sm text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-line">
            {recent.length === 0 && <div className="px-5 py-8 text-sm text-slate-500 text-center">Nothing yet. Raise the first requirement to get started.</div>}
            {recent.map((r) => (
              <Link key={r.id} to={`/requirements/${r.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-paper transition">
                <div className="font-mono text-xs text-indigo-600 w-28 shrink-0">{r.ref_no}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{r.title}</div>
                  <div className="text-xs text-slate-400">by {r.raised_by_name} · {date(r.created_at)}</div>
                </div>
                {r.priority !== 'normal' && <Badge tone={PRIORITY[r.priority]?.tone}>{PRIORITY[r.priority]?.label}</Badge>}
                <Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Side column: totals + cert alerts */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-display font-semibold text-ink mb-3">Master data</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Requirements', totals.requirements], ['Vendors', totals.vendors], ['Yarns', totals.materials]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-paper py-3">
                  <div className="text-2xl font-bold font-display text-ink tnum">{v}</div>
                  <div className="text-[11px] text-slate-500">{k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
              <h2 className="font-display font-semibold text-ink">Certificate watch</h2>
              <Link to="/vendors" className="text-xs text-indigo-600 hover:underline">Vendors →</Link>
            </div>
            <div className="divide-y divide-line">
              {expiringCerts.length === 0 && <div className="px-5 py-6 text-sm text-slate-500 text-center">All vendor certificates valid for 60+ days. ✓</div>}
              {expiringCerts.slice(0, 6).map((c) => {
                const d = daysUntil(c.expiry_date);
                return (
                  <div key={c.id} className="px-5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{c.vendor_name}</div>
                      <div className="text-xs text-slate-400">{c.cert_type} · exp {date(c.expiry_date)}</div>
                    </div>
                    <Badge tone={c.expired ? 'clay' : d <= 30 ? 'marigold' : 'slate'}>
                      {c.expired ? 'Expired' : `${d}d`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
