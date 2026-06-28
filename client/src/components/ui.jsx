import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ---- Tone maps -----------------------------------------------------------
const TONES = {
  slate: 'bg-slate-100 text-slate-600',
  indigo: 'bg-indigo-50 text-indigo-700',
  marigold: 'bg-marigold-50 text-marigold-700',
  sage: 'bg-sage-50 text-sage-700',
  clay: 'bg-clay-50 text-clay-600',
};

export function Badge({ tone = 'slate', children, className = '' }) {
  return <span className={`pill ${TONES[tone] || TONES.slate} ${className}`}>{children}</span>;
}

export function StatusDot({ tone = 'indigo' }) {
  const c = { indigo: 'bg-indigo-600', marigold: 'bg-marigold-500', sage: 'bg-sage-500', clay: 'bg-clay-500', slate: 'bg-slate-400' };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c[tone] || c.indigo}`} />;
}

// ---- Page header ---------------------------------------------------------
export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-marigold-600 mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Loading / empty -----------------------------------------------------
export function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin h-5 w-5 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 text-slate-500 py-16 justify-center">
      <Spinner className="text-indigo-600" /><span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="text-center py-16 px-4">
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <h3 className="font-display font-semibold text-ink">{title}</h3>
      {sub && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---- Star rating ---------------------------------------------------------
export function Stars({ value = 0, size = 'sm' }) {
  const full = Math.round(Number(value) * 2) / 2;
  const px = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className={`inline-flex items-center gap-0.5 ${px}`} title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'text-marigold-500' : 'text-slate-300'}>
          {i - 0.5 === full ? '⯨' : '★'}
        </span>
      ))}
      <span className="ml-1 tnum text-slate-500 font-mono">{Number(value).toFixed(1)}</span>
    </span>
  );
}

// ---- Score bar (0..100) --------------------------------------------------
export function ScoreBar({ value, highlight = false }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${highlight ? 'bg-marigold-500' : 'bg-indigo-500'}`} style={{ width: `${v}%` }} />
      </div>
      <span className="tnum font-mono text-xs font-semibold text-ink w-9 text-right">{v.toFixed(0)}</span>
    </div>
  );
}

// ---- Modal ---------------------------------------------------------------
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-4 sm:p-8">
      <div className={`card w-full ${w} my-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-display font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Toasts --------------------------------------------------------------
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, tone = 'indigo') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const toast = {
    info: (m) => push(m, 'indigo'), success: (m) => push(m, 'sage'),
    error: (m) => push(m, 'clay'), warn: (m) => push(m, 'marigold'),
  };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div key={t.id} className={`card px-4 py-3 text-sm shadow-pop border-l-4 ${
            t.tone === 'sage' ? 'border-l-sage-500' : t.tone === 'clay' ? 'border-l-clay-500' : t.tone === 'marigold' ? 'border-l-marigold-500' : 'border-l-indigo-600'
          }`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---- KPI stat tile -------------------------------------------------------
export function Stat({ label, value, tone = 'indigo', hint, onClick }) {
  const ring = { indigo: 'before:bg-indigo-600', marigold: 'before:bg-marigold-500', sage: 'before:bg-sage-500', clay: 'before:bg-clay-500' }[tone];
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`card relative overflow-hidden p-4 text-left w-full ${onClick ? 'hover:shadow-pop transition cursor-pointer' : 'cursor-default'}
        before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${ring}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-bold font-display text-ink tnum">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </button>
  );
}
