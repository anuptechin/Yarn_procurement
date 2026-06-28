import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Spinner } from '../components/ui.jsx';

const DEMO = [
  { role: 'Requisitioner', email: 'requisitioner@ddecor.com', pw: 'pass123', desc: 'Raise yarn requirements' },
  { role: 'Procurement', email: 'procurement@ddecor.com', pw: 'pass123', desc: 'RFQ · quotes · comparison' },
  { role: 'Dept Head', email: 'depthead@ddecor.com', pw: 'pass123', desc: 'Approve & award' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e, creds) {
    e?.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(creds?.email ?? email, creds?.pw ?? password);
      navigate('/');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-indigo-800 text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 14px)' }} />
        <div className="relative">
          <img src="/logo-light.png" alt="D'Decor" className="h-10 w-auto" />
        </div>
        <div className="relative">
          <div className="text-marigold-300 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Yarn Sourcing Desk</div>
          <h1 className="font-display text-4xl font-bold leading-[1.1] mb-4">From requirement<br />to the right vendor —<br />one clear thread.</h1>
          <p className="text-indigo-200 max-w-md text-sm leading-relaxed">
            Raise a yarn requirement, send it to every vendor at once, and let the comparison
            put price, delivery, payment terms and ratings side by side — so the call is obvious.
          </p>
        </div>
        <div className="relative text-indigo-300 text-xs">Procurement workflow · approvals · live price intelligence</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-paper">
        <div className="w-full max-w-sm">
          <img src="/logo-dark.png" alt="D'Decor" className="h-8 w-auto mb-8 lg:hidden" />
          <h2 className="font-display text-2xl font-bold text-ink">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Welcome back to the procurement portal.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@ddecor.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {err && <div className="text-sm text-clay-600 bg-clay-50 rounded-lg px-3 py-2">{err}</div>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="text-white" /> : 'Sign in'}</button>
          </form>

          <div className="mt-8">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Quick sign-in (demo)</div>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button key={d.email} onClick={(e) => submit(e, d)} disabled={busy}
                  className="card w-full px-3 py-2.5 flex items-center justify-between hover:shadow-pop transition text-left">
                  <div>
                    <div className="text-sm font-semibold text-ink">{d.role}</div>
                    <div className="text-xs text-slate-500">{d.desc}</div>
                  </div>
                  <span className="text-indigo-400 text-sm">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
