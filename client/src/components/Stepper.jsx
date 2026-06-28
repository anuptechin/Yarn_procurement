import { LIFECYCLE, STATUS } from '../lib/format.js';

// Horizontal lifecycle stepper for a requirement.
export default function Stepper({ status }) {
  // rejected / cancelled are terminal off-path states
  const offPath = ['rejected', 'cancelled'].includes(status);
  const currentIdx = LIFECYCLE.indexOf(status);

  const steps = [
    { key: 'pending_approval', label: 'Requested' },
    { key: 'approved', label: 'Approved' },
    { key: 'rfq_sent', label: 'RFQ Sent' },
    { key: 'quoting', label: 'Quotes' },
    { key: 'comparison_ready', label: 'Compare' },
    { key: 'awarded', label: 'Awarded' },
  ];

  if (offPath) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="pill bg-clay-50 text-clay-600">{STATUS[status]?.label}</span>
        <span className="text-slate-400">— this requirement is off the active pipeline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full overflow-x-auto scroll-thin">
      {steps.map((s, i) => {
        const idx = LIFECYCLE.indexOf(s.key);
        const done = currentIdx > idx;
        const active = currentIdx === idx;
        return (
          <div key={s.key} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-bold border-2 transition
                ${done ? 'bg-sage-500 border-sage-500 text-white'
                  : active ? 'bg-marigold-500 border-marigold-500 text-white shadow-pop'
                  : 'bg-white border-line text-slate-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <div className={`mt-1.5 text-[11px] font-semibold whitespace-nowrap ${active ? 'text-marigold-700' : done ? 'text-sage-700' : 'text-slate-400'}`}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-14 mx-1 mb-5 rounded ${currentIdx > idx ? 'bg-sage-500' : 'bg-line'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
