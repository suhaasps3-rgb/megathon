import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, BookOpen, Home, Trophy, TrendingUp, Sparkles } from 'lucide-react';
import { buildReport } from '../../lifemode/domain/report.js';
import { replayChoice } from '../../lifemode/domain/replay.js';
import { SCENARIO_BY_ID } from '../../lifemode/content/scenarios.js';
import { conceptName } from '../../lifemode/content/concepts.js';
import { formatINR } from '../../lifemode/domain/money.js';
import { btn, focusRing, Card, Delta } from './ui.jsx';

export default function LifeReport({ gs, onNewRun, onLearn, onHome }) {
  const r = useMemo(() => buildReport(gs), [gs]);
  const ref = useRef(null);
  const [replayFor, setReplayFor] = useState(null);
  useEffect(() => { ref.current?.focus(); }, []);
  if (!r) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 via-white to-teal-50">
        <p className="text-xs font-black uppercase tracking-widest text-purple-700">Run {r.runNumber} complete</p>
        <h2 ref={ref} tabIndex={-1} className="mt-1 text-3xl font-black text-slate-900 outline-none">{r.character.name}’s financial story</h2>
        <ul className="mt-4 space-y-2 text-slate-700">
          {r.reflection.map((line, i) => <li key={i} className="flex gap-2"><Sparkles size={16} className="mt-1 shrink-0 text-purple-500" aria-hidden="true" />{line}</li>)}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-black text-slate-800"><TrendingUp size={18} aria-hidden="true" /> Start → finish</h3>
          <table className="mt-3 w-full text-sm tabular-nums">
            <caption className="sr-only">Balances at the start and end of the run</caption>
            <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th scope="col" className="font-bold" /><th scope="col" className="font-bold">Start</th><th scope="col" className="font-bold">Finish</th></tr></thead>
            <tbody>
              {[['Cash', 'cash'], ['Savings', 'savings'], ['Goal fund', 'goal'], ['You owe', 'debt']].map(([label, k]) => (
                <tr key={k} className="border-t border-slate-100">
                  <th scope="row" className="py-1.5 text-left font-bold text-slate-600">{label}</th>
                  <td>{formatINR(r.start[k])}</td><td className="font-bold">{formatINR(r.end[k])}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200">
                <th scope="row" className="py-1.5 text-left font-black text-slate-800">Net worth</th>
                <td className="font-black">{formatINR(r.startNet)}</td><td className="font-black">{formatINR(r.endNet)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 className="font-black text-slate-800">Money in and out</h3>
          <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm tabular-nums">
            <dt className="text-slate-600">Income</dt><dd className="font-bold">{formatINR(r.totals.income)}</dd>
            <dt className="text-slate-600">Spent on needs</dt><dd className="font-bold">{formatINR(r.totals.byCategory.need)}</dd>
            <dt className="text-slate-600">Spent on wants</dt><dd className="font-bold">{formatINR(r.totals.byCategory.want)}</dd>
            <dt className="text-slate-600">Family</dt><dd className="font-bold">{formatINR(r.totals.byCategory.family)}</dd>
            <dt className="text-slate-600">Goal purchase</dt><dd className="font-bold">{formatINR(r.totals.byCategory.goal)}</dd>
            <dt className="text-slate-600">Lost to scams</dt><dd className="font-bold">{formatINR(r.totals.losses)}</dd>
            <dt className="text-slate-600">Moved to savings/goal</dt><dd className="font-bold">{formatINR(r.totals.toSavings + r.totals.toGoal)}</dd>
            <dt className="text-slate-600">Borrowed / repaid</dt><dd className="font-bold">{formatINR(r.totals.borrowed)} / {formatINR(r.totals.repaid)}</dd>
          </dl>
          {r.goal && (
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-700"><span aria-hidden="true">{r.goal.emoji}</span> {r.goal.label}: {r.goal.bought ? 'reached' : r.goal.alternative ? 'cheaper route chosen' : `${r.goal.pct}% funded`}</p>
              <div className="mt-1 h-3 rounded-full bg-slate-100" role="progressbar" aria-valuenow={r.goal.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Goal progress">
                <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-teal-500" style={{ width: `${r.goal.pct}%` }} />
              </div>
            </div>
          )}
          <p className="mt-3 text-sm text-slate-600">Wellbeing finished at <span className="font-bold">{r.wellbeing}</span> / 100.</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-black text-slate-800">Concepts you showed</h3>
          {r.demonstrated.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">{r.demonstrated.map((c) => <li key={c} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">✓ {conceptName(c)}</li>)}</ul>
          ) : <p className="mt-2 text-sm text-slate-600">Answer the quick checks next run to show what you know.</p>}
          <h3 className="mt-4 font-black text-slate-800">Worth more practice</h3>
          {r.recommendations.length ? (
            <ul className="mt-2 space-y-2">
              {r.recommendations.map((rec) => (
                <li key={rec.concept} className="rounded-2xl bg-amber-50 p-3 text-sm">
                  <p className="font-bold text-amber-900">↻ {rec.name} <span className="font-normal">· {rec.world}</span></p>
                  <p className="mt-0.5 text-amber-900/80">{rec.idea}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-600">Nothing flagged this run.</p>}
        </Card>
        <Card>
          <h3 className="flex items-center gap-2 font-black text-slate-800"><Trophy size={18} aria-hidden="true" /> Earned this run</h3>
          <p className="mt-1 text-sm text-slate-600">+{r.xpGained} XP · Level {r.level.level} {r.level.title}</p>
          {r.badges.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {r.badges.map((b) => <li key={b.id} className="rounded-2xl border border-slate-200 p-3 text-sm"><span className="text-2xl" aria-hidden="true">{b.emoji}</span><p className="font-bold text-slate-800">{b.name}</p><p className="text-xs text-slate-500">{b.rule}</p></li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-600">No new badges this run. Badges are earned once, so replays focus on learning.</p>}
        </Card>
      </div>

      <Card>
        <h3 className="font-black text-slate-800">Your decisions</h3>
        <ol className="mt-3 space-y-2">
          {r.decisions.map((d) => (
            <li key={d.scenarioId} className="rounded-2xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ch {d.chapter} · {d.scenario}</p>
                  <p className="font-bold text-slate-800">{d.choice}</p>
                  <p className="text-sm text-slate-600">{d.title}</p>
                </div>
                <div className="text-right text-sm"><span className="sr-only">Total owned </span><Delta value={d.assetsChange} /></div>
              </div>
              {d.replayable && (
                <button type="button" className={`${btn.ghost} ${focusRing} -ml-2 mt-1`} aria-expanded={replayFor === d.scenarioId}
                  onClick={() => setReplayFor(replayFor === d.scenarioId ? null : d.scenarioId)}>
                  <RotateCcw size={14} aria-hidden="true" /> What if?
                </button>
              )}
              {replayFor === d.scenarioId && <MiniReplay gs={gs} scenarioId={d.scenarioId} />}
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={`${btn.secondary} ${focusRing}`} onClick={onHome}><Home size={18} aria-hidden="true" /> Life Mode home</button>
        <button type="button" className={`${btn.secondary} ${focusRing}`} onClick={onLearn}><BookOpen size={18} aria-hidden="true" /> Practise in Learn Mode</button>
        <button type="button" className={`${btn.primary} ${focusRing}`} onClick={onNewRun}><RotateCcw size={18} aria-hidden="true" /> Play a new run</button>
      </div>
    </div>
  );
}

function MiniReplay({ gs, scenarioId }) {
  const s = SCENARIO_BY_ID.get(scenarioId);
  const d = gs.run.decisions.find((x) => x.scenarioId === scenarioId);
  const alts = s.choices.filter((c) => c.id !== d.choiceId);
  return (
    <ul className="mt-2 space-y-1.5 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-3 text-sm">
      <li className="text-xs font-bold text-purple-900">Hypothetical totals right after this moment (your run is not changed):</li>
      {alts.map((c) => {
        const r = replayChoice(gs, scenarioId, c.id);
        return (
          <li key={c.id} className="flex flex-wrap justify-between gap-2">
            <span className="text-slate-700">{c.label}</span>
            <span className="font-bold tabular-nums text-slate-800">{r.ok ? `${formatINR(r.hypothetical.assets)} owned (you: ${formatINR(r.actual.assets)})` : 'Wasn’t available then'}</span>
          </li>
        );
      })}
    </ul>
  );
}
