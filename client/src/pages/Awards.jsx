import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Loading, PageHeader, EmptyState, Stat } from '../components/ui.jsx';
import { inr, kg, date } from '../lib/format.js';

export default function Awards() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/reports/awards').then((r) => setRows(r.data.awards)); }, []);
  if (!rows) return <Loading />;

  const totalOrder = rows.reduce((a, r) => a + (r.order_value || 0), 0);
  const totalSavings = rows.reduce((a, r) => a + (r.savings_total || 0), 0);

  return (
    <>
      <PageHeader eyebrow="Outcomes" title="Awards & savings"
        sub="Every awarded item, the chosen vendor, and what it saved against the last purchase price." />

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="🏆" title="No awards yet" sub="Once the dept head awards a comparison, results land here with realized savings." /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="Items awarded" value={rows.length} tone="indigo" />
            <Stat label="Total order value" value={inr(totalOrder, { dp: 0 })} tone="indigo" />
            <Stat label="Savings vs last PO" value={inr(totalSavings, { dp: 0 })} tone={totalSavings >= 0 ? 'sage' : 'clay'} hint="across awarded items" />
            <Stat label="Avg saving / item" value={inr(totalSavings / rows.length, { dp: 0 })} tone="sage" />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[820px]">
                <thead className="bg-paper border-b border-line"><tr>
                  <th className="th">Ref</th><th className="th">Yarn</th><th className="th">Vendor</th>
                  <th className="th text-right">Qty</th><th className="th text-right">Awarded/Kg</th>
                  <th className="th text-right">Last PO</th><th className="th text-right">Saving</th><th className="th">Decided</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-paper">
                      <td className="td"><Link to={`/requirements/${r.requirement_id}/compare`} className="font-mono text-xs text-indigo-600 hover:underline">{r.ref_no}</Link></td>
                      <td className="td"><div className="font-medium text-ink">{r.description}</div><div className="font-mono text-xs text-slate-400">{r.mat_code}</div></td>
                      <td className="td font-medium">{r.vendor_name}</td>
                      <td className="td text-right tnum">{kg(r.required_qty_kg)}</td>
                      <td className="td text-right tnum font-semibold">{inr(r.awarded_price)}</td>
                      <td className="td text-right tnum text-slate-500">{r.last_po_price ? inr(r.last_po_price) : '—'}</td>
                      <td className={`td text-right tnum font-semibold ${(r.savings_total || 0) >= 0 ? 'text-sage-700' : 'text-clay-600'}`}>
                        {r.savings_total != null ? inr(r.savings_total, { dp: 0 }) : '—'}
                      </td>
                      <td className="td text-slate-500 text-xs">{date(r.decided_at)}<div className="text-slate-400">{r.decided_by_name}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
