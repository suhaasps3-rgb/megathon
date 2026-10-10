import React from 'react';
import { Check } from 'lucide-react';
import { fill } from '../../data/translations.js';

const STEPS = ['ONBOARDING', 'ASSESSMENT', 'GAME', 'REPORT'];

/** "Where am I" for the guided Learn flow: profile, check-in, story, report. */
export default function JourneyBar({ state, t }) {
  const current = STEPS.indexOf(state);
  if (current < 0) return null;
  const labels = [t.stepProfile, t.stepCheckin, t.stepStory, t.stepReport];
  return (
    <nav aria-label={fill(t.stepOf, { n: current + 1, total: STEPS.length })} className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
      <ol className="flex items-center gap-2">
        {labels.map((label, i) => {
          const done = i < current;
          const here = i === current;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={here ? 'step' : undefined}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  done ? 'bg-teal-500 text-white' : here ? 'bg-ink-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                }`}
              >
                {done ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`truncate text-sm font-bold ${here ? 'text-ink-900' : 'text-slate-500'} ${here ? '' : 'hidden sm:inline'}`}>{label}</span>
              {i < labels.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${done ? 'bg-teal-400' : 'bg-slate-200'}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
