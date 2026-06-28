import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Modal, Stars, Spinner, useToast, EmptyState } from '../components/ui.jsx';
import { date, daysUntil } from '../lib/format.js';

export default function Vendors() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null); // vendor object or {} for new
  const canEdit = can.procure(user.role);

  function load() { api.get('/vendors', { params: { all: 1 } }).then((r) => setRows(r.data.vendors)); }
  useEffect(load, []);

  return (
    <>
      <PageHeader eyebrow="Master data" title="Vendor master"
        sub="Spinners and traders you source from — ratings, payment terms, lead times and certificates."
        actions={canEdit && <button className="btn-accent" onClick={() => setEdit({})}>+ Add vendor</button>} />

      {!rows ? <Loading /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon="🏭" title="No vendors yet" sub="Add your spinners and traders to start sending RFQs."
          action={canEdit && <button className="btn-primary" onClick={() => setEdit({})}>Add the first vendor</button>} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((v) => {
            const expSoon = v.next_expiry && daysUntil(v.next_expiry) <= 30;
            return (
              <div key={v.id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/vendors/${v.id}`} className="font-display font-semibold text-ink hover:text-indigo-700">{v.name}</Link>
                    <div className="text-xs text-slate-400 mt-0.5">{v.address || v.gst_no || '—'}</div>
                  </div>
                  {!v.active && <Badge tone="slate">Inactive</Badge>}
                </div>
                <div className="mt-3"><Stars value={v.rating} /></div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <Kv k="Payment" v={v.default_payment_terms || '—'} />
                  <Kv k="Lead time" v={v.default_lead_time ? `${v.default_lead_time} days` : '—'} />
                  <Kv k="Contact" v={v.contact_person || '—'} />
                  <Kv k="Certs" v={`${v.active_certs}/${v.cert_count} valid`} />
                </div>
                {v.cert_count > 0 && (
                  <div className={`mt-3 text-xs rounded px-2 py-1 ${expSoon ? 'bg-clay-50 text-clay-600' : 'bg-sage-50 text-sage-700'}`}>
                    {expSoon ? `⚠ Certificate expires ${date(v.next_expiry)}` : v.next_expiry ? `Next renewal ${date(v.next_expiry)}` : 'No upcoming expiry'}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-line flex gap-2">
                  <Link to={`/vendors/${v.id}`} className="btn-outline !py-1.5 text-xs flex-1">Open</Link>
                  {canEdit && <button className="btn-ghost !py-1.5 text-xs" onClick={() => setEdit(v)}>Edit</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && <VendorModal vendor={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); toast.success('Vendor saved.'); }} />}
    </>
  );
}

function Kv({ k, v }) { return <div><div className="text-slate-400">{k}</div><div className="font-medium text-ink">{v}</div></div>; }

function VendorModal({ vendor, onClose, onDone }) {
  const toast = useToast();
  const editing = !!vendor.id;
  const [f, setF] = useState({
    name: vendor.name || '', contact_person: vendor.contact_person || '', email: vendor.email || '',
    phone: vendor.phone || '', address: vendor.address || '', gst_no: vendor.gst_no || '',
    rating: vendor.rating ?? 3, default_payment_terms: vendor.default_payment_terms || '',
    default_lead_time: vendor.default_lead_time ?? '', active: vendor.active ?? 1, notes: vendor.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.name.trim()) return toast.error('Vendor name is required.');
    setBusy(true);
    try {
      const payload = { ...f, default_lead_time: f.default_lead_time === '' ? null : Number(f.default_lead_time), rating: Number(f.rating), active: Number(f.active) ? 1 : 0 };
      if (editing) await api.put(`/vendors/${vendor.id}`, payload); else await api.post('/vendors', payload);
      onDone();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open title={editing ? `Edit ${vendor.name}` : 'Add vendor'} onClose={onClose} size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="label">Vendor name</label><input className="input" value={f.name} onChange={set('name')} /></div>
        <div><label className="label">Contact person</label><input className="input" value={f.contact_person} onChange={set('contact_person')} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={set('email')} /></div>
        <div><label className="label">Phone</label><input className="input" value={f.phone} onChange={set('phone')} /></div>
        <div><label className="label">GST no.</label><input className="input" value={f.gst_no} onChange={set('gst_no')} /></div>
        <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={f.address} onChange={set('address')} /></div>
        <div><label className="label">Rating (0–5)</label><input className="input tnum" type="number" min="0" max="5" step="0.1" value={f.rating} onChange={set('rating')} /></div>
        <div><label className="label">Default payment terms</label><input className="input" placeholder="30 Days" value={f.default_payment_terms} onChange={set('default_payment_terms')} /></div>
        <div><label className="label">Default lead time (days)</label><input className="input tnum" type="number" value={f.default_lead_time} onChange={set('default_lead_time')} /></div>
        <div><label className="label">Status</label><select className="input" value={f.active} onChange={set('active')}><option value={1}>Active</option><option value={0}>Inactive</option></select></div>
        <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input min-h-[60px]" value={f.notes} onChange={set('notes')} /></div>
      </div>
      <div className="flex gap-2 mt-5">
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner className="text-white" /> : 'Save vendor'}</button>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
