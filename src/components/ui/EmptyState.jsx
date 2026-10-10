import React from 'react';

/** An informative empty state: says what is missing and offers a next step, never a blank area. */
export default function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
      {Icon && <Icon size={22} className="text-slate-400" aria-hidden="true" />}
      <p className="font-bold text-slate-700">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}
