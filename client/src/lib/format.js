// Indian-format number / currency helpers

export function inr(n, opts = {}) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: opts.dp ?? 2,
    minimumFractionDigits: opts.dp ?? 2,
  }).format(Number(n));
}

export function num(n, dp = 0) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: dp }).format(Number(n));
}

export function kg(n) {
  return n == null ? '—' : `${num(n, n % 1 === 0 ? 0 : 2)} Kg`;
}

export function date(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(d) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.round(ms / 86400000);
}

// Requirement lifecycle metadata
export const STATUS = {
  draft:            { label: 'Draft',            tone: 'slate' },
  pending_approval: { label: 'Pending Approval', tone: 'marigold' },
  approved:         { label: 'Approved',         tone: 'indigo' },
  rejected:         { label: 'Rejected',         tone: 'clay' },
  rfq_sent:         { label: 'RFQ Sent',         tone: 'indigo' },
  quoting:          { label: 'Collecting Quotes',tone: 'indigo' },
  comparison_ready: { label: 'Ready to Award',   tone: 'sage' },
  awarded:          { label: 'Awarded',          tone: 'sage' },
  closed:           { label: 'Closed',           tone: 'slate' },
  cancelled:        { label: 'Cancelled',        tone: 'slate' },
};

export const PRIORITY = {
  low: { label: 'Low', tone: 'slate' },
  normal: { label: 'Normal', tone: 'indigo' },
  high: { label: 'High', tone: 'marigold' },
  urgent: { label: 'Urgent', tone: 'clay' },
};

// ordered lifecycle for the stepper
export const LIFECYCLE = ['pending_approval', 'approved', 'rfq_sent', 'quoting', 'comparison_ready', 'awarded'];
