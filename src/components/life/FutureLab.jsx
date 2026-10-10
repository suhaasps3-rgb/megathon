import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, AlertTriangle } from 'lucide-react';
import { simulate } from '../../lifemode/domain/futureLab.js';
import { focusRing } from './ui.jsx';

const MIXES = [
  { id: 'save', label: 'All in savings', pct: { savings: 100, index: 0, single: 0 } },
  { id: 'index', label: 'Diversified fund', pct: { savings: 0, index: 100, single: 0 } },
  { id: 'single', label: 'One company', pct: { savings: 0, index: 0, single: 100 } },
  { id: 'mix', label: 'Half savings, half fund', pct: { savings: 50, index: 50, single: 0 } },
];
const YEARS = [1, 3, 5, 10];
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

/**
 * Hypothetical sandbox. Never touches the player's money; each distinct experiment is
 * reported up via onExperiment (for the Lab Explorer badge).
 */
export default function FutureLab({ onExperiment }) {
  const [mix, setMix] = useState('index');
  const [years, setYears] = useState(5);
  const m = MIXES.find((x) => x.id === mix);
  const r = useMemo(() => simulate(m.pct, years), [m, years]);

  useEffect(() => { onExperiment?.(`${mix}:${years}`); }, [mix, years, onExperiment]);

  const max = Math.max(r.best, r.inflationTarget) * 1.05;
  const W = 300, H = 120;
  const x = (i) => (i / r.years) * W;
  const y = (v) => H - (v / max) * H;

  return (
    <div className="rounded-3xl border-2 border-teal-200 bg-teal-50/60 p-4 md:p-5">
      <div className="flex items-center gap-2 font-black text-teal-900"><FlaskConical size={20} aria-hidden="true" /> Future Lab: hypothetical ₹10,000</div>
      <p className="mt-1 flex items-start gap-1.5 text-xs font-bold text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Simulated with simple assumptions. Not a prediction, not advice, and none of your game money is used.
      </p>

      <fieldset className="mt-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-slate-600">Where the money goes</legend>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MIXES.map((x2) => (
            <button key={x2.id} type="button" aria-pressed={mix === x2.id} onClick={() => setMix(x2.id)}
              className={`${focusRing} min-h-[44px] rounded-xl border-2 px-2 py-2 text-sm font-bold ${mix === x2.id ? 'border-teal-600 bg-white text-teal-900' : 'border-transparent bg-white/70 text-slate-600 hover:bg-white'}`}>
              {x2.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-slate-600">For how long</legend>
        <div className="mt-1 flex gap-2">
          {YEARS.map((yv) => (
            <button key={yv} type="button" aria-pressed={years === yv} onClick={() => setYears(yv)}
              className={`${focusRing} min-h-[44px] flex-1 rounded-xl border-2 px-2 py-2 text-sm font-bold ${years === yv ? 'border-teal-600 bg-white text-teal-900' : 'border-transparent bg-white/70 text-slate-600 hover:bg-white'}`}>
              {yv} yr{yv > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </fieldset>

      <svg viewBox={`0 0 ${W} ${H + 4}`} className="mt-4 h-auto w-full" role="img"
        aria-label={`Five sample simulated paths over ${r.years} years. Typical ending ${inr(r.typical)}, unlucky ${inr(r.worst)}, lucky ${inr(r.best)}.`}>
        <line x1="0" x2={W} y1={y(r.start)} y2={y(r.start)} stroke="#94a3b8" strokeDasharray="4 4" />
        <line x1="0" x2={W} y1={y(r.inflationTarget)} y2={y(r.inflationTarget)} stroke="#f59e0b" strokeDasharray="2 3" />
        {r.sample.map((p, i) => (
          <polyline key={i} fill="none" stroke="#0d9488" strokeOpacity={0.35 + i * 0.12} strokeWidth="2"
            points={p.map((v, t) => `${x(t)},${y(v)}`).join(' ')} />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
        <span>— — start ₹10,000</span><span className="text-amber-700">··· needed to keep up with 5% inflation: {inr(r.inflationTarget)}</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-2"><dt className="text-[11px] font-bold uppercase text-slate-500">Unlucky (1 in 20)</dt><dd className="font-black tabular-nums text-slate-800">{inr(r.worst)}</dd></div>
        <div className="rounded-xl bg-white p-2"><dt className="text-[11px] font-bold uppercase text-slate-500">Typical</dt><dd className="font-black tabular-nums text-slate-800">{inr(r.typical)}</dd></div>
        <div className="rounded-xl bg-white p-2"><dt className="text-[11px] font-bold uppercase text-slate-500">Lucky (1 in 20)</dt><dd className="font-black tabular-nums text-slate-800">{inr(r.best)}</dd></div>
      </dl>
      <p className="mt-2 text-sm text-slate-700">
        In {r.lossChance}% of simulated paths this mix ended below ₹10,000 after {r.years} year{r.years > 1 ? 's' : ''}.
        {mix === 'single' && ' One company swings the most: that’s concentrated risk.'}
        {mix === 'save' && ' No swings, but slow growth may not beat inflation.'}
        {mix === 'index' && years <= 1 && ' Over a short time even a diversified fund can fall.'}
      </p>
    </div>
  );
}
