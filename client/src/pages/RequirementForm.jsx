import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, useToast } from '../components/ui.jsx';
import { inr, date } from '../lib/format.js';

const blankItem = () => ({ key: Math.random().toString(36).slice(2), material_id: null, mat_code: '', description: '', required_qty_kg: '', target_price: '', _last: null });

export default function RequirementForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ title: '', priority: 'normal', needed_by: '', remarks: '' });
  const [items, setItems] = useState([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => { api.get('/materials').then((r) => setMaterials(r.data.materials)); }, []);

  useEffect(() => {
    if (!editing) return;
    api.get(`/requirements/${id}`).then((r) => {
      const { requirement, items } = r.data;
      setForm({
        title: requirement.title, priority: requirement.priority,
        needed_by: requirement.needed_by || '', remarks: requirement.remarks || '',
      });
      setItems(items.map((it) => ({
        key: String(it.id), material_id: it.material_id, mat_code: it.mat_code || '',
        description: it.description || '', required_qty_kg: it.required_qty_kg, target_price: it.target_price || '',
        _last: it.last_po_price ? { price: it.last_po_price, date: it.last_po_date, supplier: it.last_supplier_name } : null,
      })));
    }).finally(() => setLoading(false));
  }, [id, editing]);

  function setItem(key, patch) { setItems((arr) => arr.map((it) => (it.key === key ? { ...it, ...patch } : it))); }
  function pickMaterial(key, m) {
    setItem(key, {
      material_id: m.id, mat_code: m.mat_code, description: m.description,
      _last: m.last_po_price ? { price: m.last_po_price, date: m.last_po_date } : null,
    });
  }

  async function submit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      needed_by: form.needed_by || null,
      items: items.filter((it) => it.required_qty_kg).map((it) => ({
        material_id: it.material_id || null, mat_code: it.mat_code, description: it.description,
        required_qty_kg: Number(it.required_qty_kg), target_price: it.target_price ? Number(it.target_price) : null,
      })),
    };
    if (payload.items.length === 0) return toast.error('Add at least one line item with a quantity.');
    if (!payload.title.trim()) return toast.error('Give the requirement a title.');
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
        title={editing ? 'Revise yarn requirement' : 'Raise a yarn requirement'}
        sub="Add the yarns and quantities you need. Once submitted, it goes to the dept head for approval before RFQs are sent." />

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Spun Polyester 2/30 — monthly replenishment" required />
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
        <button type="button" className="btn-ghost" onClick={() => setItems((a) => [...a, blankItem()])}>+ Add yarn</button>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <ItemRow key={it.key} index={i} item={it} materials={materials}
            onChange={(patch) => setItem(it.key, patch)} onPick={(m) => pickMaterial(it.key, m)}
            onRemove={items.length > 1 ? () => setItems((a) => a.filter((x) => x.key !== it.key)) : null} />
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

function ItemRow({ index, item, materials, onChange, onPick, onRemove }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = q.trim()
    ? materials.filter((m) => (m.mat_code + ' ' + m.description).toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : materials.slice(0, 8);

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 mt-6 shrink-0 rounded-full bg-indigo-50 text-indigo-700 grid place-items-center text-xs font-bold font-mono">{index + 1}</div>
        <div className="flex-1 grid sm:grid-cols-12 gap-3">
          {/* material picker */}
          <div className="sm:col-span-6 relative">
            <label className="label">Yarn / Material</label>
            <input className="input" placeholder="Search code or description…"
              value={item.mat_code ? `${item.mat_code} · ${item.description}` : q}
              onChange={(e) => { onChange({ material_id: null, mat_code: '', description: e.target.value }); setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
            {open && matches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full card shadow-pop max-h-64 overflow-auto scroll-thin">
                {matches.map((m) => (
                  <button type="button" key={m.id} onMouseDown={() => { onPick(m); setQ(''); setOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-paper border-b border-line last:border-0">
                    <div className="text-sm font-medium text-ink"><span className="font-mono text-indigo-600">{m.mat_code}</span> · {m.description}</div>
                    <div className="text-xs text-slate-400">{m.category}{m.last_po_price ? ` · last PO ${inr(m.last_po_price)}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
            {item._last && (
              <div className="mt-1.5 text-xs text-sage-700 bg-sage-50 rounded px-2 py-1 inline-block">
                Last PO: <b>{inr(item._last.price)}</b>/Kg{item._last.date ? ` · ${date(item._last.date)}` : ''}{item._last.supplier ? ` · ${item._last.supplier}` : ''}
              </div>
            )}
          </div>
          <div className="sm:col-span-3">
            <label className="label">Required Qty (Kg)</label>
            <input className="input tnum" type="number" min="0" step="any" value={item.required_qty_kg}
              onChange={(e) => onChange({ required_qty_kg: e.target.value })} placeholder="0" required />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Target price (opt)</label>
            <input className="input tnum" type="number" min="0" step="any" value={item.target_price}
              onChange={(e) => onChange({ target_price: e.target.value })} placeholder="₹ / Kg" />
          </div>
        </div>
        {onRemove && <button type="button" onClick={onRemove} className="mt-6 text-slate-300 hover:text-clay-500 text-lg shrink-0" title="Remove">×</button>}
      </div>
    </div>
  );
}
