import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, can, ROLE_LABELS } from '../lib/auth.jsx';
import { Badge, Loading, PageHeader, Modal, Spinner, useToast, EmptyState } from '../components/ui.jsx';
import { dateTime } from '../lib/format.js';

const ROLE_OPTIONS = ['requisitioner', 'procurement', 'depthead', 'admin'];
const ROLE_TONE = { admin: 'indigo', depthead: 'marigold', procurement: 'sage', requisitioner: 'slate' };

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null); // user object, or {} for new

  if (!can.admin(user.role)) return <Navigate to="/" replace />;

  function load() { api.get('/users').then((r) => setRows(r.data.users)); }
  useEffect(load, []);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Users"
        sub="Create accounts and manage roles. Deactivate to revoke access without deleting history."
        actions={<button className="btn-accent" onClick={() => setEdit({})}>+ Add user</button>} />

      {!rows ? <Loading /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon="👤" title="No users yet" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.name}
                    {u.is_super && <Badge tone="indigo" className="ml-2">Super Admin</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role] || u.role}</Badge></td>
                  <td className="px-4 py-3">{u.active ? <Badge tone="sage">Active</Badge> : <Badge tone="slate">Inactive</Badge>}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{dateTime(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost !py-1.5 text-xs" onClick={() => setEdit(u)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && <UserModal subject={edit} currentUserId={user.id}
        onClose={() => setEdit(null)}
        onDone={(msg) => { setEdit(null); load(); toast.success(msg); }} />}
    </>
  );
}

function UserModal({ subject, currentUserId, onClose, onDone }) {
  const toast = useToast();
  const editing = !!subject.id;
  const isSuper = !!subject.is_super;
  const isSelf = subject.id === currentUserId;
  const lockRoleActive = isSuper || isSelf; // can't demote/lock the super admin or yourself

  const [f, setF] = useState({
    name: subject.name || '',
    email: subject.email || '',
    role: subject.role || 'requisitioner',
    active: subject.active ?? 1,
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.name.trim()) return toast.error('Name is required.');
    setBusy(true);
    try {
      if (editing) {
        const payload = { name: f.name, role: f.role, active: Number(f.active) ? true : false };
        if (f.password) payload.password = f.password;
        await api.put(`/users/${subject.id}`, payload);
        onDone('User updated.');
      } else {
        if (!f.email.trim()) return toast.error('Email is required.');
        if (f.password.length < 6) return toast.error('Password must be at least 6 characters.');
        await api.post('/users', { name: f.name, email: f.email, role: f.role, password: f.password });
        onDone('User created.');
      }
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal open title={editing ? `Edit ${subject.name}` : 'Add user'} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="label">Full name</label><input className="input" value={f.name} onChange={set('name')} /></div>
        <div className="sm:col-span-2">
          <label className="label">Email</label>
          <input className="input" type="email" value={f.email} onChange={set('email')} disabled={editing}
            placeholder="name@ddecor.com" />
          {editing && <p className="text-xs text-slate-400 mt-1">Email is the login identity and can't be changed.</p>}
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={f.role} onChange={set('role')} disabled={lockRoleActive}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={f.active} onChange={set('active')} disabled={lockRoleActive}>
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">{editing ? 'Reset password (optional)' : 'Password'}</label>
          <input className="input" type="text" value={f.password} onChange={set('password')}
            placeholder={editing ? 'Leave blank to keep current password' : 'Min 6 characters'} />
        </div>
      </div>
      {lockRoleActive && (
        <p className="text-xs text-slate-500 mt-3">
          {isSuper ? 'The Super Admin role/status is protected and cannot be changed here.'
                   : 'You cannot change your own role or deactivate yourself.'}
        </p>
      )}
      <div className="flex gap-2 mt-5">
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner className="text-white" /> : (editing ? 'Save changes' : 'Create user')}</button>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
