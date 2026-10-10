import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatINR } from '../../lifemode/domain/money.js';

export const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/80';

export const btn = {
  primary: `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-extrabold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`,
  mint: `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-teal-400 px-5 py-3 font-extrabold text-teal-950 shadow-lg shadow-teal-900/20 transition hover:bg-teal-300 active:translate-y-px ${focusRing}`,
  ghost: `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-2.5 font-bold text-white transition hover:bg-white/10 ${focusRing}`,
  light: `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 ${focusRing}`,
  icon: `inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 ${focusRing}`,
};

/** Signed money change, with a word for screen readers (never colour alone). */
export function Delta({ value, label, className = '' }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums ${up ? 'bg-teal-100 text-teal-900' : 'bg-rose-100 text-rose-900'} ${className}`}>
      {label && <span>{label}</span>}
      <span aria-hidden="true">{up ? '+' : '−'}</span>
      <span className="sr-only">{up ? 'plus' : 'minus'}</span>
      {formatINR(Math.abs(value))}
    </span>
  );
}

/**
 * Accessible modal: labelled, Escape closes, focus moves in and returns on close.
 */
export function Modal({ title, onClose, children, className = '', dark = false, wide = false, hideTitle = false, closeLabel = 'Close' }) {
  const ref = useRef(null);
  const prev = useRef(null);
  useEffect(() => {
    prev.current = document.activeElement;
    const el = ref.current;
    const first = el?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (first ?? el)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!items.length) return;
        const a = items[0], z = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => { el?.removeEventListener('keydown', onKey); prev.current?.focus?.(); };
  }, [onClose]);
  const id = `m-${title?.replace(/\W+/g, '-')}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0b0718]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={`pp-rise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-5 shadow-2xl outline-none sm:rounded-3xl md:p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} ${dark ? 'bg-[#1d1538] text-white' : 'bg-[#fffaf2] text-slate-900'} ${className}`}
      >
        <div className={`mb-3 flex items-center justify-between gap-3 ${hideTitle ? 'sr-only' : ''}`}>
          <h2 id={id} className="pp-font-display text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className={`${focusRing} inline-flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-200/60'}`} aria-label={closeLabel}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function money(p) {
  return formatINR(p);
}
