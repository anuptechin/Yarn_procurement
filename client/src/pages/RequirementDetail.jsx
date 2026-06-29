import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Modal, Spinner, useToast } from '../components/ui.jsx';
import Stepper from '../components/Stepper.jsx';
import { STATUS, PRIORITY, inr, kg, num, date } from '../lib/format.js';

const RFQ_TONE = { sent: 'slate', viewed: 'indigo', responded: 'sage', declined: 'clay' };
const CATS = { yarn: { label: 'Yarn', unit: 'Kg' }, bedding_fabric: { label: 'Bedding Fabric', unit: 'Mtr' }, lining_fabric: { label: 'Lining Fabric', unit: 'Mtr' } };

export default function RequirementDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null); // {type, rfq}
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/requirements/${id}`).then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (err) return <div className="text-clay-600">{err}</div>;
  if (!data) return <Loading />;
  const { requirement: r, items, rfqs } = data;
  const cat = CATS[r.category] || CATS.yarn;
  const isYarn = r.category === 'yarn';
  const showExtra = isYarn ? can.procure(user.role) : true; // Yarn Type hidden from requisitioner; TC always shown (fabric is procurement-only)
  const extraLabel = isYarn ? 'Yarn Type' : 'TC';
  const qtyFmt = (n) => `${num(n, Number(n) % 1 === 0 ? 0 : 2)} ${cat.unit}`;

  const isProc = can.procure(user.role);
  const isHead = can.approve(user.role);
  const hasQuotes = rfqs.some((q) => Number(q.has_quote) > 0);
  const canSendRfq = isProc && ['approved', 'rfq_sent', 'quoting', 'comparison_ready'].includes(r.status);

  async function act(path, body, msg) {
    setBusy(true);
    try { await api.post(`/requirements/${id}/${path}`, body || {}); toast.success(msg); load(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  const isPending = (q) => !Number(q.has_quote) && !['responded', 'declined'].includes(q.status);
  const pendingCount = rfqs.filter(isPending).length;

  async function remindOne(q) {
    setBusy(true);
    try {
      const r = await api.post(`/rfqs/${q.id}/remind`);
      r.data.sent ? toast.success(r.data.message) : toast.warn(r.data.message);
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function remindAll() {
    setBusy(true);
    try {
      const r = await api.post(`/rfqs/requirement/${id}/remind-pending`);
      if (r.data.sent > 0) toast.success(`Reminder sent to ${r.data.sent} vendor(s).`);
      else if (!r.data.mail_enabled) toast.warn('Email is OFF — set MAIL_ENABLED=true to auto-send reminders.');
      else toast.info('No pending vendors to remind (or none have an email on file).');
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/requirements" className="hover:underline">← Requirements</Link>}
        title={r.title}
        sub={<span><span className="font-mono text-indigo-600">{r.ref_no}</span> · {cat.label}</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            {r.status === 'pending_approval' && isHead && (
              <>
                <button className="btn-primary" disabled={busy} onClick={() => act('approve', null, 'Requirement approved.')}>Approve</button>
                <button className="btn-danger" disabled={busy} onClick={() => { const reason = prompt('Reason for rejection?'); if (reason !== null) act('reject', { reason }, 'Requirement rejected.'); }}>Reject</button>
              </>
            )}
            {['draft', 'pending_approval', 'rejected'].includes(r.status) && can.raise(user.role) && (
              <Link to={`/requirements/${id}/edit`} className="btn-outline">Edit</Link>
            )}
            {canSendRfq && <button className="btn-accent" onClick={() => setModal({ type: 'dispatch' })}>Send / add RFQ</button>}
            {hasQuotes && <Link to={`/requirements/${id}/compare`} className="btn-primary">View comparison →</Link>}
          </div>
        }
      />

      {/* meta strip */}
      <div className="card p-5 mb-6">
        <Stepper status={r.status} />
        <div className="grid sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-line text-sm">
          <Meta label="Status"><Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</Badge></Meta>
          <Meta label="Priority"><Badge tone={PRIORITY[r.priority]?.tone}>{PRIORITY[r.priority]?.label}</Badge></Meta>
          <Meta label="Raised by">{r.raised_by_name}</Meta>
          <Meta label="Needed by">{date(r.needed_by)}</Meta>
        </div>
        {r.rejected_reason && r.status === 'rejected' && (
          <div className="mt-4 text-sm bg-clay-50 text-clay-600 rounded-lg px-3 py-2">Rejected: {r.rejected_reason}</div>
        )}
        {r.remarks && <div className="mt-4 text-sm text-slate-600"><span className="label inline">Remarks</span> {r.remarks}</div>}
      </div>

      {/* Items */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-line"><h2 className="font-display font-semibold text-ink">Line items</h2></div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[640px]">
            <thead className="bg-paper border-b border-line"><tr>
              <th className="th w-10">#</th><th className="th">SAP Code</th><th className="th">{isYarn ? 'Yarn Description' : 'Description'}</th>
              {showExtra && <th className="th">{extraLabel}</th>}
              <th className="th text-right">Req Qty</th><th className="th text-right">Last PO</th><th className="th">Last Supplier</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((it, i) => (
                <tr key={it.id}>
                  <td className="td font-mono text-slate-400">{i + 1}</td>
                  <td className="td font-mono text-indigo-600 text-xs">{it.mat_code || '—'}</td>
                  <td className="td font-medium text-ink">{it.description}</td>
                  {showExtra && <td className="td">{(isYarn ? it.yarn_type : it.thread_count) || <span className="text-clay-600">—</span>}</td>}
                  <td className="td text-right tnum">{qtyFmt(it.required_qty_kg)}</td>
                  <td className="td text-right tnum">{it.last_po_price ? inr(it.last_po_price) : '—'}</td>
                  <td className="td text-slate-500">{it.last_supplier_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendors / RFQ */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink">Vendors & quotes</h2>
          <div className="flex items-center gap-2">
            {isProc && pendingCount > 0 && (
              <button className="btn-outline !py-1.5 text-xs" disabled={busy} onClick={remindAll}>
                Nudge pending ({pendingCount})
              </button>
            )}
            {canSendRfq && <button className="btn-ghost" onClick={() => setModal({ type: 'dispatch' })}>+ Invite vendors</button>}
          </div>
        </div>
        {rfqs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            {r.status === 'approved' ? 'Approved — send the RFQ to vendors to start collecting quotes.' :
             ['pending_approval', 'draft'].includes(r.status) ? 'Vendors can be invited once this requirement is approved.' : 'No vendors invited yet.'}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {rfqs.map((q) => (
              <div key={q.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <Link to={`/vendors/${q.vendor_id}`} className="font-medium text-ink hover:text-indigo-700">{q.vendor_name}</Link>
                  <div className="text-xs text-slate-400">
                    RFQ #{q.id}{q.responded_at ? ` · responded ${date(q.responded_at)}` : ''}
                    {Number(q.reminder_count) > 0 && ` · reminded ${q.reminder_count}× (${date(q.last_reminded_at)})`}
                  </div>
                </div>
                <Badge tone={Number(q.has_quote) ? 'sage' : RFQ_TONE[q.status]}>
                  {Number(q.has_quote) ? 'Quote received' : (q.status[0].toUpperCase() + q.status.slice(1))}
                </Badge>
                {isProc && (
                  <div className="flex flex-wrap gap-1.5">
                    <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => setModal({ type: 'email', rfq: q })}>Email draft</button>
                    {isPending(q) && <button className="btn-outline !py-1.5 !px-3 text-xs" disabled={busy} onClick={() => remindOne(q)}>Remind</button>}
                    <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => copyLink(q, toast)}>Copy link</button>
                    <a className="btn-outline !py-1.5 !px-3 text-xs" href={`/api/rfqs/${q.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                    <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setModal({ type: 'quote', rfq: q })}>{Number(q.has_quote) ? 'Edit quote' : 'Enter quote'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal?.type === 'dispatch' && <DispatchModal reqId={id} existing={rfqs} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal?.type === 'email' && <EmailModal rfq={modal.rfq} onClose={() => setModal(null)} />}
      {modal?.type === 'quote' && <QuoteModal rfq={modal.rfq} items={items} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </>
  );
}

function Meta({ label, children }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</div><div className="text-ink">{children}</div></div>;
}

async function copyLink(rfq, toast) {
  try {
    const r = await api.get(`/rfqs/${rfq.id}/email`);
    await navigator.clipboard.writeText(r.data.link);
    toast.success('Vendor quote link copied to clipboard.');
  } catch (e) { toast.error(e.message); }
}

// ---- Dispatch modal ------------------------------------------------------
function DispatchModal({ reqId, existing, onClose, onDone }) {
  const toast = useToast();
  const [vendors, setVendors] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const invited = new Set(existing.map((e) => e.vendor_id));

  useEffect(() => { api.get('/vendors').then((r) => setVendors(r.data.vendors)); }, []);
  function toggle(id) { setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function go() {
    if (picked.size === 0) return toast.error('Pick at least one vendor.');
    setBusy(true);
    try {
      await api.post(`/rfqs/requirement/${reqId}/dispatch`, { vendor_ids: [...picked], due_date: due || null });
      toast.success(`RFQ created for ${picked.size} vendor(s). Open each to grab the email draft / link.`);
      onDone();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open title="Invite vendors to quote" onClose={onClose} size="md">
      <p className="text-sm text-slate-500 mb-4">Select vendors to send this requirement to. Each gets a unique quote link; you can email the draft or let them submit online.</p>
      <div className="mb-4"><label className="label">Quote due by (optional)</label>
        <input type="date" className="input max-w-[200px]" value={due} onChange={(e) => setDue(e.target.value)} /></div>
      {!vendors ? <Loading /> : (
        <div className="space-y-2 max-h-72 overflow-auto scroll-thin">
          {vendors.map((v) => {
            const already = invited.has(v.id);
            return (
              <label key={v.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${picked.has(v.id) ? 'border-indigo-600 bg-indigo-50' : 'border-line hover:border-indigo-300'} ${already ? 'opacity-60' : ''}`}>
                <input type="checkbox" disabled={already} checked={picked.has(v.id) || already} onChange={() => toggle(v.id)} className="accent-indigo-700" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{v.name}</div>
                  <div className="text-xs text-slate-400">{v.email || 'no email'} · {v.default_payment_terms || '—'} · lead {v.default_lead_time || '?'}d</div>
                </div>
                {already && <span className="text-xs text-sage-700">Invited</span>}
              </label>
            );
          })}
        </div>
      )}
      <div className="flex gap-2 mt-5">
        <button className="btn-accent" disabled={busy} onClick={go}>{busy ? <Spinner className="text-white" /> : `Create RFQ (${picked.size})`}</button>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ---- Email draft modal ---------------------------------------------------
function EmailModal({ rfq, onClose }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/rfqs/${rfq.id}/email`).then((r) => setD(r.data)).catch((e) => toast.error(e.message)); }, [rfq.id]);
  return (
    <Modal open title={`RFQ email — ${rfq.vendor_name}`} onClose={onClose} size="lg">
      {!d ? <Loading /> : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="label">To</span>{d.to || <span className="text-slate-400">no email on file</span>}</div>
            <div><span className="label">Subject</span>{d.subject}</div>
          </div>
          <div><span className="label">Body</span>
            <pre className="bg-paper rounded-lg p-3 text-xs whitespace-pre-wrap font-sans text-slate-700 max-h-64 overflow-auto scroll-thin">{d.text}</pre>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="label">Vendor self-service link</div>
            <div className="font-mono text-xs text-indigo-700 break-all">{d.link}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(d.text); toast.success('Email body copied.'); }}>Copy email text</button>
            <button className="btn-outline" onClick={() => { navigator.clipboard.writeText(d.link); toast.success('Link copied.'); }}>Copy link</button>
            {d.to && <a className="btn-outline" href={d.mail?.mailto}>Open in Outlook</a>}
            <a className="btn-outline" href={d.pdf_url} target="_blank" rel="noreferrer">Download RFQ PDF</a>
          </div>
          <p className="text-xs text-slate-400">Draft mode: send from your own Outlook, or share the link / PDF directly. SMTP auto-send can be switched on later.</p>
        </div>
      )}
    </Modal>
  );
}

// ---- Manual quote entry modal --------------------------------------------
function QuoteModal({ rfq, items, onClose, onDone }) {
  const toast = useToast();
  const [lines, setLines] = useState(null);
  const [meta, setMeta] = useState({ submitted_by: '', valid_until: '', notes: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/quotes/rfq/${rfq.id}`).then((r) => {
      const existing = {}; (r.data.lines || []).forEach((l) => { existing[l.requirement_item_id] = l; });
      setLines(items.map((it) => {
        const l = existing[it.id] || {};
        return { requirement_item_id: it.id, mat_code: it.mat_code, description: it.description, required_qty_kg: it.required_qty_kg,
          price_per_kg: l.price_per_kg ?? '', gst_pct: l.gst_pct ?? 5, lead_time_days: l.lead_time_days ?? '',
          payment_terms: l.payment_terms ?? '', remarks: l.remarks ?? '', no_quote: !!l.no_quote };
      }));
      if (r.data.quote) setMeta({ submitted_by: r.data.quote.submitted_by || '', valid_until: r.data.quote.valid_until || '', notes: r.data.quote.notes || '' });
    });
  }, [rfq.id]);

  function setLine(i, patch) { setLines((a) => a.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); }

  async function save() {
    setBusy(true);
    try {
      await api.post(`/quotes/rfq/${rfq.id}`, { ...meta, valid_until: meta.valid_until || null, lines: lines.map((l) => ({
        requirement_item_id: l.requirement_item_id, no_quote: l.no_quote,
        price_per_kg: l.no_quote ? null : (l.price_per_kg === '' ? null : Number(l.price_per_kg)),
        gst_pct: Number(l.gst_pct) || 0, lead_time_days: l.lead_time_days === '' ? null : Number(l.lead_time_days),
        payment_terms: l.payment_terms || null, remarks: l.remarks || null,
      })) });
      toast.success(`Quote saved for ${rfq.vendor_name}.`);
      onDone();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open title={`Enter quote — ${rfq.vendor_name}`} onClose={onClose} size="xl">
      {!lines ? <Loading /> : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Capture what the vendor quoted. Tick "Can't supply" for any item they declined.</p>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-line">
                <th className="th">Item</th><th className="th text-right">Price/Kg</th><th className="th text-right">GST %</th>
                <th className="th text-right">Lead (d)</th><th className="th">Payment</th><th className="th">Remarks</th><th className="th text-center">No quote</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {lines.map((l, i) => (
                  <tr key={l.requirement_item_id} className={l.no_quote ? 'opacity-50' : ''}>
                    <td className="td"><div className="font-mono text-xs text-indigo-600">{l.mat_code}</div><div className="text-xs text-slate-500 max-w-[180px] truncate">{l.description}</div></td>
                    <td className="td"><input className="input tnum text-right !py-1.5 w-24" type="number" step="any" disabled={l.no_quote} value={l.price_per_kg} onChange={(e) => setLine(i, { price_per_kg: e.target.value })} /></td>
                    <td className="td"><input className="input tnum text-right !py-1.5 w-16" type="number" step="any" disabled={l.no_quote} value={l.gst_pct} onChange={(e) => setLine(i, { gst_pct: e.target.value })} /></td>
                    <td className="td"><input className="input tnum text-right !py-1.5 w-16" type="number" disabled={l.no_quote} value={l.lead_time_days} onChange={(e) => setLine(i, { lead_time_days: e.target.value })} /></td>
                    <td className="td"><input className="input !py-1.5 w-28" placeholder="30 Days" disabled={l.no_quote} value={l.payment_terms} onChange={(e) => setLine(i, { payment_terms: e.target.value })} /></td>
                    <td className="td"><input className="input !py-1.5 w-32" disabled={l.no_quote} value={l.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} /></td>
                    <td className="td text-center"><input type="checkbox" className="accent-clay-500" checked={l.no_quote} onChange={(e) => setLine(i, { no_quote: e.target.checked })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><label className="label">Contact / quoted by</label><input className="input" value={meta.submitted_by} onChange={(e) => setMeta({ ...meta, submitted_by: e.target.value })} placeholder="Vendor contact name" /></div>
            <div><label className="label">Quote valid until</label><input className="input" type="date" value={meta.valid_until} onChange={(e) => setMeta({ ...meta, valid_until: e.target.value })} /></div>
            <div><label className="label">Notes</label><input className="input" value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner className="text-white" /> : 'Save quote'}</button>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
