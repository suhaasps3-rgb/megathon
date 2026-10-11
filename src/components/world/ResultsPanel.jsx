import React from 'react';
import { useT } from '../../i18n/context';
import { RotateCcw, MapPin, Lightbulb, Sparkles } from 'lucide-react';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const LEVEL = {
  strong: { label: 'Strong', bar: 'bg-teal-500', text: 'text-teal-700', width: '100%' },
  partial: { label: 'Partly', bar: 'bg-saffron-400', text: 'text-amber-700', width: '55%' },
  weak: { label: 'Needs work', bar: 'bg-rose-400', text: 'text-rose-700', width: '20%' },
};

/**
 * Results shown once when the mission completes. Every figure comes from the recorded run;
 * when no record exists, it says so instead of showing an invented analysis.
 */
export default function ResultsPanel({ analysis, onExplore, onReplay }) {
  const T = useT();
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="results-title"
      className="absolute inset-3 z-10 flex flex-col overflow-y-auto rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur md:inset-x-auto md:left-1/2 md:top-6 md:w-[36rem] md:-translate-x-1/2 md:p-6"
    >
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-700">
        <Sparkles size={14} aria-hidden="true" /> Mission complete
      </p>
      <h2 id="results-title" className="mt-1 text-2xl font-black text-ink-900">{T.rsTitle}</h2>

      {!analysis.available ? (
        <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">{analysis.reason}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">{analysis.objective}</p>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Cell label={T.rsStart} value={inr(analysis.cashflow.startCash)} />
            <Cell label={T.rsEarned} value={`+${inr(analysis.cashflow.income)}`} tone="text-teal-700" />
            <Cell label={T.rsSpent} value={`−${inr(analysis.cashflow.bikeSpend + analysis.cashflow.repairSpend)}`} tone="text-rose-600" />
            <Cell label={T.rsEnded} value={inr(analysis.cashflow.endCash)} />
            <Cell label={T.lmSavings} value={inr(analysis.cashflow.endSavings)} />
            {analysis.cashflow.endDebt > 0 && <Cell label={T.lmDebt} value={inr(analysis.cashflow.endDebt)} tone="text-rose-600" />}
          </dl>

          <section aria-labelledby="dims-title" className="mt-5">
            <h3 id="dims-title" className="text-sm font-black text-ink-900">{T.rsDims}</h3>
            <ul className="mt-2 grid gap-3">
              {analysis.dimensions.map((d) => (
                <li key={d.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{d.label}</span>
                    <span className={`text-xs font-black ${LEVEL[d.level].text}`}>{LEVEL[d.level].label}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className={`h-full rounded-full ${LEVEL[d.level].bar} transition-all duration-700`} style={{ width: LEVEL[d.level].width }} />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{d.explain}</p>
                  <p className="mt-1 text-xs text-slate-500">{d.evidence}</p>
                </li>
              ))}
            </ul>
          </section>

          {analysis.counterfactual && (
            <section className="mt-5 rounded-2xl bg-purple-50 p-4">
              <h3 className="text-sm font-black text-purple-900">{analysis.counterfactual.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{analysis.counterfactual.text}</p>
            </section>
          )}

          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            {analysis.strength && (
              <div className="rounded-2xl bg-teal-50 p-4">
                <p className="text-xs font-black uppercase text-teal-800">{T.rsDidWell}</p>
                <p className="mt-1 text-sm text-slate-800">{analysis.strength.explain}</p>
              </div>
            )}
            {analysis.improvement && (
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-xs font-black uppercase text-rose-800">{T.rsImprove}</p>
                <p className="mt-1 text-sm text-slate-800">{analysis.improvement.label}: {analysis.improvement.explain}</p>
              </div>
            )}
          </section>

          <p className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-slate-800">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
            <span><strong>{T.rsPrinciple}</strong> {analysis.principle} <strong>{T.rsNext}</strong> {analysis.recommendation}</span>
          </p>
          <p className="mt-3 text-xs text-slate-500">{T.rsDisclaimer}</p>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onExplore} className="btn-primary">
          <MapPin size={16} aria-hidden="true" /> {T.rsExplore}
        </button>
        <button type="button" onClick={onReplay} className="btn-secondary">
          <RotateCcw size={16} aria-hidden="true" /> {T.rsPlayAgain}
        </button>
      </div>
    </div>
  );
}

function Cell({ label, value, tone = 'text-slate-900' }) {
  const T = useT();
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`font-black tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
