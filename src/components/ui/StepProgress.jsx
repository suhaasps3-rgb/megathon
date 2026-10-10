import React from 'react';
import { Check } from 'lucide-react';
import { fill } from '../../data/translations';

/**
 * Shows where the player is in a short flow. The current step is named in words and the
 * bar is decorative, so the position never depends on colour alone.
 */
export default function StepProgress({ steps, current, template }) {
  const total = steps.length;
  const text = fill(template, { n: current, total });
  return (
    <nav aria-label={text}>
      <p className="text-sm font-bold text-slate-600" aria-live="polite">
        {text}: <span className="text-ink-900">{steps[current - 1]}</span>
      </p>
      <ol className="mt-3 flex items-center gap-2" role="list">
        {steps.map((name, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={name} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors duration-200 ${
                  done ? 'bg-teal-500 text-white' : active ? 'bg-purple-600 text-white shadow-glow' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {done ? <Check size={16} aria-hidden="true" /> : n}
                <span className="sr-only">{name}</span>
              </span>
              {n < total && <span className={`h-1 flex-1 rounded-full transition-colors duration-300 ${done ? 'bg-teal-500' : 'bg-slate-200'}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
