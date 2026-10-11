import React, { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { formatINR } from '../../lifemode/domain/money.js';
import { CONCEPTS, WORLDS } from '../../lifemode/content/concepts.js';

export const btn = {
  primary: 'btn-primary min-h-[44px] transition duration-200 ease-out hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 min-h-[44px]',
  ghost: 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-purple-700 hover:bg-purple-50 min-h-[36px]',
};

export const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-500/40';

/** Money with an explicit sign word for screen readers, never colour alone. */
export function Delta({ value, className = '' }) {
  if (!value) return <span className={`text-slate-500 ${className}`}>no change</span>;
  const up = value > 0;
  return (
    <span className={`font-bold tabular-nums ${up ? 'text-teal-700' : 'text-rose-700'} ${className}`}>
      <span aria-hidden="true">{up ? '▲ ' : '▼ '}</span>
      <span className="sr-only">{up ? 'up ' : 'down '}</span>
      {formatINR(Math.abs(value))}
    </span>
  );
}

export function Money({ value, className = '' }) {
  return <span className={`tabular-nums ${className}`}>{formatINR(value)}</span>;
}

export function WorldBadge({ world }) {
  const w = WORLDS[world];
  if (!w) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
      <span aria-hidden="true">{w.emoji}</span> {w.name}
    </span>
  );
}

/**
 * A concept explanation with progressive disclosure. Opening the deeper read is counted
 * (Curious Mind badge) but is never treated as evidence of understanding.
 */
export function ConceptExplainer({ conceptId, onOpenDeeper, onLearn, compact = false }) {
  const [open, setOpen] = useState(false);
  const c = CONCEPTS[conceptId];
  if (!c) return null;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-sm font-black text-slate-800">{c.name}</p>
      <p className="mt-1 text-sm text-slate-600">{c.idea}</p>
      <button
        type="button"
        className={`${btn.ghost} ${focusRing} mt-1 -ml-2`}
        aria-expanded={open}
        onClick={() => { if (!open) onOpenDeeper?.(); setOpen(!open); }}
      >
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        {open ? 'Hide example' : 'Show a worked example'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p className="rounded-xl bg-purple-50 p-3"><span className="font-bold">Example: </span>{c.example}</p>
          <p>{c.deeper}</p>
          {onLearn && (
            <button type="button" className={`${btn.ghost} ${focusRing} -ml-2`} onClick={onLearn}>
              <BookOpen size={16} aria-hidden="true" /> Practise more in Learn Mode
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className = '', as: Tag = 'section', ...rest }) {
  return <Tag className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6 ${className}`} {...rest}>{children}</Tag>;
}
