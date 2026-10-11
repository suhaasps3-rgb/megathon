import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle, Lightbulb, RotateCcw, Lock, MessageSquareWarning, Info } from 'lucide-react';
import { choose, advance, answerCheck, presentChoices, viewOf, supportFor, recordExplanation, recordLabRun, currentScenario, diff } from '../../lifemode/domain/game.js';
import { balancesOf } from '../../lifemode/domain/ledger.js';
import { replayChoice } from '../../lifemode/domain/replay.js';
import { CHAPTERS } from '../../lifemode/content/scenarios.js';
import { CONCEPTS } from '../../lifemode/content/concepts.js';
import { formatINR } from '../../lifemode/domain/money.js';
import FutureLab from './FutureLab.jsx';
import { TxRow } from './Hud.jsx';
import { btn, focusRing, Card, Delta, WorldBadge, ConceptExplainer } from './ui.jsx';

export default function ScenarioView({ gs, dispatch, onLearn }) {
  const run = gs.run;
  const s = currentScenario(run);
  const reduce = useReducedMotion();
  const headingRef = useRef(null);
  const [marked, setMarked] = useState([]);

  useEffect(() => { setMarked([]); headingRef.current?.focus(); }, [s?.id]);
  const onExperiment = useCallback((sig) => dispatch(recordLabRun, sig), [dispatch]);

  if (!s) return null;
  const view = viewOf(gs.profile, run);
  const narrative = typeof s.narrative === 'function' ? s.narrative(view) : s.narrative;
  const decision = run.decisions.find((d) => d.scenarioId === s.id);
  const chapter = CHAPTERS.find((c) => c.n === s.chapter);
  const needsRefresher = s.concepts.filter((c) => supportFor(gs.profile, c) === 'extra');
  const onDeeper = () => dispatch(recordExplanation);

  return (
    <motion.div key={s.id} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-purple-700">Chapter {s.chapter} · {chapter?.title}</span>
          <WorldBadge world={s.world} />
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-black text-slate-900 outline-none md:text-3xl">{s.title}</h2>
        <p className="mt-1 text-sm font-bold text-slate-500"><span className="sr-only">Objective: </span>🎯 {s.objective}</p>

        {run.entryNotes[s.id] && (
          <motion.p initial={reduce ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-3 text-sm font-bold text-teal-900" role="status">
            💸 {run.entryNotes[s.id]}
          </motion.p>
        )}
        <p className="mt-4 text-lg leading-relaxed text-slate-700">{narrative}</p>
      </Card>

      {needsRefresher.length > 0 && !decision && (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="flex items-center gap-2 font-black text-amber-900"><Lightbulb size={18} aria-hidden="true" /> Quick refresher before you choose</p>
          <p className="mt-1 text-sm text-amber-900/80">Based on your last answer, here’s a simpler way to think about it.</p>
          <div className="mt-3 space-y-2">
            {needsRefresher.map((c) => (
              <div key={c} className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                <p className="font-bold text-slate-800">{CONCEPTS[c]?.name}</p>
                <p className="mt-1">{CONCEPTS[c]?.example}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {s.inspect && (
        <MessageInspector inspect={s.inspect} marked={decision?.inspection?.marked ?? marked} setMarked={setMarked} revealed={!!decision} result={decision?.inspection} />
      )}

      {s.lab && <FutureLab onExperiment={onExperiment} />}

      {!decision ? (
        <Choices gs={gs} onChoose={(id) => dispatch(choose, s.id, id, { marked })} />
      ) : (
        <Feedback gs={gs} s={s} decision={decision} dispatch={dispatch} onDeeper={onDeeper} onLearn={onLearn} />
      )}
    </motion.div>
  );
}

function Choices({ gs, onChoose }) {
  const opts = presentChoices(gs);
  return (
    <section aria-label="Your options" className="space-y-3">
      <h3 className="px-1 text-sm font-black uppercase tracking-widest text-slate-500">What do you do?</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {opts.map(({ choice: c, detail, available, reason, preview }) => (
          <button
            key={c.id}
            type="button"
            disabled={!available}
            onClick={() => onChoose(c.id)}
            aria-describedby={`why-${c.id}`}
            className={`${focusRing} group flex h-full flex-col rounded-2xl border-2 bg-white p-4 text-left transition duration-200 ease-out ${available ? 'border-slate-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-purple-400 hover:shadow-md active:scale-[0.99]' : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 opacity-75'}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-base font-black text-slate-800">{c.label}</span>
              {!available && <Lock size={16} className="mt-1 shrink-0 text-slate-400" aria-hidden="true" />}
            </span>
            {detail && <span className="mt-1 text-sm text-slate-600">{detail}</span>}
            {c.tags && (
              <span className="mt-3 flex flex-wrap gap-1.5">
                {c.tags.cost && <Tag tone="bg-slate-100 text-slate-700" label="Cost">{c.tags.cost}</Tag>}
                {c.tags.benefit && <Tag tone="bg-teal-50 text-teal-800" label="Benefit">{c.tags.benefit}</Tag>}
                {c.tags.goal && <Tag tone="bg-purple-50 text-purple-800" label="Goal">{c.tags.goal}</Tag>}
                {c.tags.risk && <Tag tone="bg-amber-50 text-amber-900" label="Risk">{c.tags.risk}</Tag>}
              </span>
            )}
            <span id={`why-${c.id}`} className="mt-3 text-xs font-bold text-slate-500">
              {!available ? <>Unavailable: {reason}</> : preview ? <PreviewLine p={preview} /> : <>Outcome revealed after you choose</>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Tag({ tone, label, children }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}><span className="sr-only">{label}: </span>{children}</span>;
}

function PreviewLine({ p }) {
  const parts = [];
  if (p.cash) parts.push(`Cash ${p.cash > 0 ? '+' : '−'}${formatINR(Math.abs(p.cash))}`);
  if (p.savings) parts.push(`Savings ${p.savings > 0 ? '+' : '−'}${formatINR(Math.abs(p.savings))}`);
  if (p.goal) parts.push(`Goal ${p.goal > 0 ? '+' : '−'}${formatINR(Math.abs(p.goal))}`);
  if (p.debt) parts.push(`Owed ${p.debt > 0 ? '+' : '−'}${formatINR(Math.abs(p.debt))}`);
  if (parts.length === 0) return <>No money moves</>;
  return <>{parts.join(' · ')} · Total {p.assets === 0 ? 'unchanged' : `${p.assets > 0 ? '+' : '−'}${formatINR(Math.abs(p.assets))}`}</>;
}

function MessageInspector({ inspect, marked, setMarked, revealed, result }) {
  const toggle = (id) => setMarked((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  return (
    <Card className="bg-slate-50">
      <p className="flex items-center gap-2 font-black text-slate-800"><MessageSquareWarning size={18} aria-hidden="true" /> Inspect the message</p>
      <p className="mt-1 text-sm text-slate-600">{revealed ? 'Here’s what each part tells you.' : 'Tap every part you think is a warning sign. You can change your mind before choosing.'}</p>
      <div className="mx-auto mt-4 max-w-md rounded-[2rem] border-8 border-slate-800 bg-white p-4 shadow-inner">
        <p className="text-center text-xs font-bold text-slate-500">{inspect.channel} from {inspect.sender}</p>
        <div className="mt-3 rounded-2xl rounded-tl-sm bg-slate-100 p-3 text-[15px] leading-8 text-slate-800">
          {inspect.segments.map((seg) => {
            const on = marked.includes(seg.id);
            const tone = revealed
              ? seg.flag ? 'bg-rose-100 ring-2 ring-rose-400' : 'bg-white ring-1 ring-slate-300'
              : on ? 'bg-amber-200 ring-2 ring-amber-500' : 'hover:bg-white';
            return (
              <React.Fragment key={seg.id}>
                <button type="button" disabled={revealed} aria-pressed={on} onClick={() => toggle(seg.id)}
                  className={`${focusRing} rounded-md px-1 text-left transition ${tone}`}>
                  {seg.text}
                  {revealed && <span className="sr-only">{seg.flag ? ' (warning sign)' : ' (not a warning sign)'}{on ? ', you marked this' : ''}</span>}
                </button>{' '}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {!revealed && <p className="mt-3 text-center text-sm font-bold text-slate-600" aria-live="polite">{marked.length} marked as suspicious</p>}
      {revealed && result && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-2 font-bold text-slate-800" role="status">
            {result.correct ? <CheckCircle2 className="text-teal-600" size={18} aria-hidden="true" /> : <Info className="text-amber-600" size={18} aria-hidden="true" />}
            You found {result.found} of {result.total} warning signs{result.falsePositives ? ` and marked ${result.falsePositives} harmless detail` : ''}.
          </p>
          <ul className="space-y-1.5">
            {inspect.segments.map((seg) => (
              <li key={seg.id} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden="true">{seg.flag ? '🚩' : '✅'}</span>
                <span><span className="font-bold">“{seg.text}”</span> {seg.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Feedback({ gs, s, decision, dispatch, onDeeper, onLearn }) {
  const run = gs.run;
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const choice = s.choices.find((c) => c.id === decision.choiceId);
  const txs = run.ledger.transactions.filter((t) => t.seq >= decision.seqStart && t.seq < decision.seqEnd);
  const d = diff(balancesOf(run.ledger, decision.seqStart), balancesOf(run.ledger, decision.seqEnd));
  const brief = s.concepts.every((c) => supportFor(gs.profile, c) === 'brief');
  const [showWhy, setShowWhy] = useState(!brief);
  const [showReplay, setShowReplay] = useState(false);
  const check = s.check;
  const checkState = run.checks[s.id];
  const o = decision.outcome;

  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <motion.section initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" aria-labelledby="fb-title">
      <Card className="border-purple-200">
        <p className="text-xs font-black uppercase tracking-widest text-purple-700">You chose: {choice?.label}</p>
        <h3 id="fb-title" ref={ref} tabIndex={-1} className="mt-1 text-2xl font-black text-slate-900 outline-none">{o.title}</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">1 · What changed</p>
            {txs.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No money moved.</p>
            ) : (
              <ol className="mt-1 divide-y divide-slate-100">{txs.map((t) => <TxRow key={t.id} tx={t} />)}</ol>
            )}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {d.cash !== 0 && <><dt className="text-slate-500">Cash</dt><dd><Delta value={d.cash} /></dd></>}
              {d.savings !== 0 && <><dt className="text-slate-500">Savings</dt><dd><Delta value={d.savings} /></dd></>}
              {d.goal !== 0 && <><dt className="text-slate-500">Goal fund</dt><dd><Delta value={d.goal} /></dd></>}
              {d.debt !== 0 && <><dt className="text-slate-500">You owe</dt><dd><Delta value={d.debt} /></dd></>}
              <dt className="font-bold text-slate-700">Total owned</dt><dd><Delta value={d.assets} /></dd>
              {decision.wellbeingDelta !== 0 && <><dt className="text-slate-500">Wellbeing</dt><dd className="font-bold text-slate-700">{decision.wellbeingDelta > 0 ? '▲ +' : '▼ '}{decision.wellbeingDelta}</dd></>}
            </dl>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">2 · Why</p>
              <p className="mt-1 text-slate-700">{o.why}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">3 · What it teaches</p>
              {showWhy ? (
                <p className="mt-1 text-slate-700">{o.learned}</p>
              ) : (
                <button type="button" className={`${btn.ghost} ${focusRing} -ml-2`} onClick={() => setShowWhy(true)} aria-expanded="false">
                  You know this one. Show anyway
                </button>
              )}
            </div>
            {o.next && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">4 · What’s next</p>
                <p className="mt-1 text-slate-700">{o.next}</p>
              </div>
            )}
          </div>
        </div>
        {decision.xp > 0 && <p className="mt-3 text-sm font-bold text-purple-700">+{decision.xp} Aura Points</p>}
      </Card>

      {check && (
        <KnowledgeCheck check={check} state={checkState} onAnswer={(i) => dispatch(answerCheck, s.id, i)} />
      )}

      <details className="group rounded-3xl border border-slate-200 bg-white p-5" onToggle={(e) => { if (e.currentTarget.open) onDeeper(); }}>
        <summary className={`${focusRing} cursor-pointer list-none rounded-lg font-black text-slate-800`}>
          <span className="inline-flex items-center gap-2"><Lightbulb size={18} className="text-purple-600" aria-hidden="true" /> Concepts in this moment</span>
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {s.concepts.map((c) => <ConceptExplainer key={c} conceptId={c} onOpenDeeper={onDeeper} onLearn={onLearn} compact />)}
        </div>
      </details>

      {s.choices.length > 1 && (
        <div>
          <button type="button" className={`${btn.secondary} ${focusRing}`} onClick={() => setShowReplay(!showReplay)} aria-expanded={showReplay}>
            <RotateCcw size={18} aria-hidden="true" /> {showReplay ? 'Hide Choice Replay' : 'Choice Replay: what if I’d chosen differently?'}
          </button>
          {showReplay && <ReplayPanel gs={gs} scenario={s} decision={decision} />}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" className={`${btn.primary} ${focusRing}`} onClick={() => dispatch(advance)}>
          {s.endsRun ? 'See my report' : 'Continue'} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </motion.section>
  );
}

function KnowledgeCheck({ check, state, onAnswer }) {
  const attempts = state?.attempts ?? [];
  const last = attempts.at(-1);
  const lastCorrect = last !== undefined && check.options[last]?.correct === true;
  const done = state?.done ?? false;
  return (
    <Card>
      <fieldset>
        <legend className="font-black text-slate-800">Quick check <span className="font-normal text-slate-500">(optional)</span></legend>
        <p className="mt-1 text-slate-700">{check.question}</p>
        <div className="mt-3 grid gap-2">
          {check.options.map((opt, i) => {
            const picked = attempts.includes(i);
            const showRight = done && opt.correct;
            return (
              <button key={i} type="button" disabled={done || picked} onClick={() => onAnswer(i)}
                className={`${focusRing} flex min-h-[44px] items-center justify-between gap-2 rounded-xl border-2 px-4 py-2 text-left font-bold transition duration-200 ease-out hover:scale-[1.01] active:scale-[0.99] ${
                  showRight ? 'border-teal-500 bg-teal-50 text-teal-900' : picked ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'}`}>
                {opt.text}
                {showRight && <span className="flex items-center gap-1 text-sm"><CheckCircle2 size={18} aria-hidden="true" /> Correct</span>}
                {picked && !opt.correct && <span className="flex items-center gap-1 text-sm"><XCircle size={18} aria-hidden="true" /> Not quite</span>}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div aria-live="polite">
        {last !== undefined && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {lastCorrect ? (attempts.length > 1 ? 'You got it on the second try. That’s learning in action. ' : 'Spot on. ') : done ? 'Here’s the idea: ' : 'Not quite, and that’s fine. Have another go. '}
            {(lastCorrect || done) && check.explain}
          </p>
        )}
      </div>
    </Card>
  );
}

function ReplayPanel({ gs, scenario, decision }) {
  const alts = scenario.choices.filter((c) => c.id !== decision.choiceId);
  const [altId, setAltId] = useState(alts[0]?.id);
  // Pure, isolated computation: nothing here is dispatched or saved.
  const r = useMemo(() => (altId ? replayChoice(gs, scenario.id, altId) : null), [gs, scenario.id, altId]);
  return (
    <div className="mt-3 rounded-3xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-4 md:p-5">
      <p className="text-sm font-black text-purple-900">Hypothetical only. Exploring this never changes your game, Aura Points or badges.</p>
      <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-600" htmlFor="replay-alt">Compare with</label>
      <select id="replay-alt" value={altId} onChange={(e) => setAltId(e.target.value)}
        className={`${focusRing} mt-1 min-h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 font-bold text-slate-800`}>
        {alts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      {r && !r.ok && <p className="mt-3 text-sm font-bold text-slate-700">{r.error}</p>}
      {r && r.ok && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[300px] text-sm">
            <caption className="sr-only">Your actual result compared with the hypothetical choice</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-1 font-bold">After this moment</th>
                <th scope="col" className="py-1 font-bold">What you did</th>
                <th scope="col" className="py-1 font-bold">What if</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[['Cash', 'cash'], ['Savings', 'savings'], ['Goal fund', 'goal'], ['You owe', 'debt']].map(([label, k]) => (
                <tr key={k} className="border-t border-purple-100">
                  <th scope="row" className="py-1.5 text-left font-bold text-slate-600">{label}</th>
                  <td>{formatINR(r.actual.balances[k])}</td>
                  <td className={r.hypothetical.balances[k] !== r.actual.balances[k] ? 'font-black text-purple-900' : ''}>{formatINR(r.hypothetical.balances[k])}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-purple-200">
                <th scope="row" className="py-1.5 text-left font-black text-slate-800">Total owned</th>
                <td className="font-black">{formatINR(r.actual.assets)}</td>
                <td className="font-black text-purple-900">{formatINR(r.hypothetical.assets)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-slate-700"><span className="font-bold">{r.hypothetical.title}.</span> {r.hypothetical.learned}</p>
        </div>
      )}
    </div>
  );
}
