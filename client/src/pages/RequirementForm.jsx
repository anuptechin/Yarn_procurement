import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { PageHeader, Spinner, useToast } from '../components/ui.jsx';

const CATS = {
  yarn:           { label: 'Yarn',           unit: 'Kg',  descLabel: 'Yarn Description' },
  bedding_fabric: { label: 'Bedding Fabric', unit: 'Mtr', descLabel: 'Description' },
  lining_fabric:  { label: 'Lining Fabric',  unit: 'Mtr', descLabel: 'Description' },
};
const YARN_TYPES = ['Blends', 'Cotton', 'Linen', 'Polyester'];

const blankItem = () => ({ key: Math.random().toString(36).slice(2), mat_code: '', description: '', required_qty_kg: '', yarn_type: '', thread_count: '' });

export default function RequirementForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const isProc = can.procure(user.role);      // procurement / admin — may set Yarn Type & raise fabrics
  const allowedCats = isProc ? Object.keys(CATS) : ['yarn'];

  const [form, setForm] = useState({ title: '', category: 'yarn', priority: 'normal', needed_by: '', remarks: '' });
  const [items, setItems] = useState([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    api.get(`/requirements/${id}`).then((r) => {
      const { requirement, items } = r.data;
      setForm({
        title: requirement.title, category: requirement.category || 'yarn', priority: requirement.priority,
        needed_by: requirement.needed_by || '', remarks: requirement.remarks || '',
      });
      setItems(items.map((it) => ({
        key: String(it.id), mat_code: it.mat_code || '', description: it.description || '',
        required_qty_kg: it.required_qty_kg, yarn_type: it.yarn_type || '', thread_count: it.thread_count || '',
      })));
    }).finally(() => setLoading(false));
  }, [id, editing]);

  const cat = CATS[form.category] || CATS.yarn;
  const isYarn = form.category === 'yarn';
  // Material type: shown for fabrics always (procurement-only), and for yarn only to procurement.
  const showType = isYarn ? isProc : true;
  const typeLabel = isYarn ? 'Yarn Type' : 'Fabric Type';
  const descSpan = 7 - (showType ? 2 : 0) - (isYarn ? 0 : 2); // 3 | 5 | 7
  const SPAN = { 3: 'sm:col-span-3', 5: 'sm:col-span-5', 7: 'sm:col-span-7' };
  function setItem(key, patch) { setItems((arr) => arr.map((it) => (it.key === key ? { ...it, ...patch } : it))); }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Give the requirement a title.');
    const rows = items.filter((it) => it.required_qty_kg && it.mat_code.trim());
    if (rows.length === 0) return toast.error('Add at least one line with a SAP code and quantity.');
    const payload = {
      title: form.title, category: form.category, priority: form.priority,
      needed_by: form.needed_by || null, remarks: form.remarks || null,
      items: rows.map((it) => ({
        mat_code: it.mat_code.trim(), description: it.description.trim(),
        required_qty_kg: Number(it.required_qty_kg),
        yarn_type: it.yarn_type || null,                          // material type (yarn or fabric)
        thread_count: isYarn ? null : (it.thread_count || null),  // TC (fabric only)
      })),
    };
    setBusy(true);
    try {
      if (editing) { await api.put(`/requirements/${id}`, payload); toast.success('Requirement updated & sent for approval.'); navigate(`/requirements/${id}`); }
      else { const r = await api.post('/requirements', payload); toast.success(`Requirement ${r.data.ref_no} submitted for approval.`); navigate(`/requirements/${r.data.id}`); }
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (loading) return <div className="py-16 grid place-items-center"><Spinner className="text-indigo-600" /></div>;

  return (
    <form onSubmit={submit} className="max-w-4xl">
      <PageHeader eyebrow={editing ? 'Edit requirement' : 'New requirement'}
        title={editing ? `Revise ${cat.label.toLowerCase()} requirement` : `Raise a ${cat.label.toLowerCase()} requirement`}
        sub="Once submitted, it goes to the dept head for approval before RFQs are sent." />

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Spun Polyester 2/30 — monthly replenishment" required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} disabled={editing}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {allowedCats.map((c) => <option key={c} value={c}>{CATS[c].label}</option>)}
            </select>
            {editing && <p className="text-xs text-slate-400 mt-1">Category can’t be changed after creation.</p>}
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="normal">Normal</option>
              <option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Needed by</label>
            <input className="input" type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="font-display font-semibold text-ink">Line items</h2>
        <button type="button" className="btn-ghost" onClick={() => setItems((a) => [...a, blankItem()])}>+ Add line</button>
      </div>

      {isYarn && !isProc && (
        <p className="text-xs text-slate-500 mb-2">Yarn Type is set by the procurement team before approval.</p>
      )}

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={it.key} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 mt-6 shrink-0 rounded-full bg-indigo-50 text-indigo-700 grid place-items-center text-xs font-bold font-mono">{i + 1}</div>
              <div className="flex-1 grid sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="label">SAP Code</label>
                  <input className="input font-mono" value={it.mat_code} onChange={(e) => setItem(it.key, { mat_code: e.target.value })} placeholder="e.g. 50302SP0" required />
                </div>
                <div className={SPAN[descSpan]}>
                  <label className="label">{cat.descLabel}</label>
                  <input className="input" value={it.description} onChange={(e) => setItem(it.key, { description: e.target.value })} placeholder="Description" />
                </div>
                {showType && (
                  <div className="sm:col-span-2">
                    <label className="label">{typeLabel}</label>
                    <select className="input" value={it.yarn_type} onChange={(e) => setItem(it.key, { yarn_type: e.target.value })}>
                      <option value="">— select —</option>
                      {YARN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {!isYarn && (
                  <div className="sm:col-span-2">
                    <label className="label">TC</label>
                    <input className="input tnum" value={it.thread_count} onChange={(e) => setItem(it.key, { thread_count: e.target.value })} placeholder="e.g. 300" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="label">Qty ({cat.unit})</label>
                  <input className="input tnum" type="number" min="0" step="any" value={it.required_qty_kg}
                    onChange={(e) => setItem(it.key, { required_qty_kg: e.target.value })} placeholder="0" required />
                </div>
              </div>
              {items.length > 1 && <button type="button" onClick={() => setItems((a) => a.filter((x) => x.key !== it.key))} className="mt-6 text-slate-300 hover:text-clay-500 text-lg shrink-0" title="Remove">×</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 mt-6">
        <label className="label">Remarks (optional)</label>
        <textarea className="input min-h-[72px]" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          placeholder="Anything the dept head or vendors should know — quality grade, packing, delivery location…" />
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="text-white" /> : editing ? 'Save & resubmit' : 'Submit for approval'}</button>
        <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </form>
  );
}
