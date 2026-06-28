import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, can } from '../lib/auth.jsx';

function Logo({ compact }) {
  if (compact) {
    return <img src="/logo-light.png" alt="D'Decor" className="h-7 w-auto" />;
  }
  return (
    <div>
      <img src="/logo-light.png" alt="D'Decor" className="h-9 w-auto" />
      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-indigo-200">Yarn Procurement Portal</div>
    </div>
  );
}

const ICONS = {
  dashboard: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
  req: 'M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3',
  vendors: 'M3 7h18M3 12h18M3 17h18',
  materials: 'M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4',
  awards: 'M12 3l2.5 5 5.5.8-4 4 1 5.5L12 21l-5-2.7 1-5.5-4-4 5.5-.8z',
};

function Icon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true, show: true },
    { to: '/requirements', label: 'Requirements', icon: 'req', show: true },
    { to: '/vendors', label: 'Vendor Master', icon: 'vendors', show: true },
    { to: '/materials', label: 'Yarn & Prices', icon: 'materials', show: true },
    { to: '/awards', label: 'Awards & Savings', icon: 'awards', show: true },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-indigo-800 text-indigo-100">
        <div className="px-5 py-5"><Logo /></div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white shadow-inner' : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}>
              <Icon d={ICONS[n.icon]} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4">
          {can.raise(user?.role) && (
            <NavLink to="/requirements/new" className="btn-accent w-full mb-3">+ New Requirement</NavLink>
          )}
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[11px] text-indigo-200 mb-2">{ROLE_LABELS[user?.role] || user?.role}</div>
            <button onClick={() => logout().then(() => navigate('/login'))}
              className="text-xs text-indigo-200 hover:text-white underline underline-offset-2">Sign out</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden bg-indigo-800 px-4 py-3 flex items-center justify-between">
          <Logo compact />
          <button onClick={() => logout().then(() => navigate('/login'))} className="text-indigo-100 text-xs underline">Sign out</button>
        </header>
        <main className="flex-1 px-5 sm:px-8 py-7 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
