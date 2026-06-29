import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Modal, Stars, Spinner, useToast } from '../components/ui.jsx';
import { date, daysUntil } from '../lib/format.js';

export default function VendorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const canEdit = can.procure(user.role);
  const isAdmin = can.admin(user.role);

  const load = useCallback(() => { api.get(`/vendors/${id}`).then((r) => setData(r.data)); }, [id]);
  useEffect(load, [load]);

  if (!data) return <Loading />;
  const { vendor: v, certificates } = data;

  async function removeCert(cid) {
    if (!confirm('Remove this certificate?')) return;
    await api.delete(`/vendors/${id}/certificates/${cid}`); toast.success('Certificate removed.'); load();
  }

  async function uploadCert(cid, file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try { await api.post(`/vendors/${id}/certificates/${cid}/file`, fd); toast.success('Document uploaded.'); load(); }
    catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/vendors" className="hover:underline">← Vendor master</Link>} title={v.name}
        sub={v.address} actions={!v.active && <Badge tone="slate">Inactive</Badge>} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <Stars value={v.rating} size="md" />
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row k="Contact" v={v.contact_person} /><Row k="Email" v={v.email} /><Row k="Phone" v={v.phone} />
            <Row k="GST" v={v.gst_no} /><Row k="Payment terms" v={v.default_payment_terms} />
            <Row k="Lead time" v={v.default_lead_time ? `${v.default_lead_time} days` : null} />
          </dl>
          {v.notes && <p className="mt-4 text-sm text-slate-500 border-t border-line pt-3">{v.notes}</p>}
        </div>

        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink">Certificates</h2>
            {canEdit && <button className="btn-ghost text-sm" onClick={() => setAdding(true)}>+ Add certificate</button>}
          </div>
          {certificates.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">No certificates on file (Oeko-Tex, GOTS, GRS…).</div>
          ) : (
            <div className="divide-y divide-line">
              {certificates.map((c) => {
                const d = daysUntil(c.expiry_date);
                const expired = c.expiry_date && d < 0;
                const soon = !expired && d != null && d <= 60;
                return (
                  <div key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <div className="font-medium text-ink">{c.cert_type}</div>
                      <div className="text-xs text-slate-400">
                        {c.issued_by ? `${c.issued_by} · ` : ''}{c.issue_date ? `issued ${date(c.issue_date)}` : ''}{c.expiry_date ? ` · expires ${date(c.expiry_date)}` : ''}
                        {c.has_file && <span className="text-sage-700"> · 📎 {c.file_name}</span>}
                      </div>
                    </div>
                    {c.expiry_date && <Badge tone={expired ? 'clay' : soon ? 'marigold' : 'sage'}>{expired ? 'Expired' : `${d}d left`}</Badge>}
                    {c.has_file && <a className="btn-outline !py-1.5 !px-3 text-xs" href={`/api/vendors/${id}/certificates/${c.id}/file`}>Download</a>}
                    {isAdmin && (
                      <label className="btn-ghost !py-1.5 !px-3 text-xs cursor-pointer">
                        {c.has_file ? 'Replace' : 'Upload'}
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={(e) => { uploadCert(c.id, e.target.files[0]); e.target.value = ''; }} />
                      </label>
                    )}
                    {canEdit && <button onClick={() => removeCert(c.id)} className="text-slate-300 hover:text-clay-500" title="Remove certificate">×</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {adding && <CertModal vendorId={id} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); toast.success('Certificate added.'); }} />}
    </>
  );
}

function Row({ k, v }) { return <div className="flex justify-between gap-4"><dt className="text-slate-400">{k}</dt><dd className="font-medium text-ink text-right">{v || '—'}</dd></div>; }

function CertModal({ vendorId, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ cert_type: 'Oeko-Tex', issued_by: '', issue_date: '', expiry_date: '', remark: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true);
    try { await api.post(`/vendors/${vendorId}/certificates`, f); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal open title="Add certificate" onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">Type</label>
          <select className="input" value={f.cert_type} onChange={set('cert_type')}>
            {['Oeko-Tex', 'GOTS', 'GRS Scope', 'OCS', 'RCS', 'BCI', 'Other'].map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <div><label className="label">Issued by</label><input className="input" value={f.issued_by} onChange={set('issued_by')} /></div>
        <div><label className="label">Issue date</label><input className="input" type="date" value={f.issue_date} onChange={set('issue_date')} /></div>
        <div><label className="label">Expiry date</label><input className="input" type="date" value={f.expiry_date} onChange={set('expiry_date')} /></div>
        <div className="sm:col-span-2"><label className="label">Remark</label><input className="input" value={f.remark} onChange={set('remark')} /></div>
      </div>
      <div className="flex gap-2 mt-5"><button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner className="text-white" /> : 'Add'}</button>
        <button className="btn-outline" onClick={onClose}>Cancel</button></div>
    </Modal>
  );
}
