import React from 'react';

const TONES = {
  idle: { dot: 'bg-slate-400', box: 'border-slate-200 bg-white text-slate-700' },
  listening: { dot: 'bg-rose-500', box: 'border-rose-200 bg-rose-50 text-rose-800', pulse: true },
  thinking: { dot: 'bg-purple-500', box: 'border-purple-200 bg-purple-50 text-purple-800', pulse: true },
  speaking: { dot: 'bg-teal-500', box: 'border-teal-200 bg-teal-50 text-teal-800', pulse: true },
  error: { dot: 'bg-rose-600', box: 'border-rose-300 bg-rose-50 text-rose-900' },
};

/**
 * A small status indicator that never relies on colour or motion alone: the label always
 * says the state in words, and it is announced politely to screen readers when it changes.
 */
export default function StatusPill({ state = 'idle', label }) {
  const tone = TONES[state] || TONES.idle;
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${tone.box}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot} ${tone.pulse ? 'animate-pulse' : ''}`} aria-hidden="true" />
      {label}
    </span>
  );
}
