import React, { useEffect, useRef, useState } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowLeft, ArrowRight, ShieldCheck, Trash2, X, Lock } from 'lucide-react';
import { useLifeGame } from '../../lifemode/useLifeGame.js';
import { startRun, advance, goalById } from '../../lifemode/domain/game.js';
import { balancesOf } from '../../lifemode/domain/ledger.js';
import { levelOf, ACHIEVEMENTS } from '../../lifemode/domain/progression.js';
import { CHAPTERS, SCENARIO_BY_ID } from '../../lifemode/content/scenarios.js';
import { WORLDS } from '../../lifemode/content/concepts.js';
import { formatINR } from '../../lifemode/domain/money.js';
import Hud from './Hud.jsx';
import ScenarioView from './ScenarioView.jsx';
import LifeReport from './LifeReport.jsx';
import { btn, focusRing, Card, WorldBadge } from './ui.jsx';

const AVATARS = ['🧑‍🎓', '👩‍🎓', '👨‍🎓', '🧑‍💻', '👩‍🎨', '🧑‍🔧'];

/**
 * PaisaPath: Life Mode. All game rules live in src/lifemode/domain; this component only
 * renders the authoritative state and sends player intents to the engine.
 */
export default function LifeMode({ onExit, onLearn }) {
  const game = useLifeGame();
  const { gs, dispatch } = game;
  const [screen, setScreen] = useState('home');
  const run = gs.run;

  const begin = (character) => {
    dispatch((s) => startRun(s, character));
    setScreen('play');
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button type="button" onClick={screen === 'play' ? () => setScreen('home') : onExit} className={`${btn.ghost} ${focusRing}`}>
            <ArrowLeft size={16} aria-hidden="true" /> {screen === 'play' ? 'Life Mode home' : 'Back to PaisaPath'}
          </button>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-purple-800">Life Mode · simulated money</span>
        </div>

        {(game.notice || game.error) && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">
            <span>{game.error ?? game.notice}</span>
            <button type="button" onClick={game.dismissNotice} className={`${focusRing} rounded`} aria-label="Dismiss"><X size={16} aria-hidden="true" /></button>
          </div>
        )}

        {screen === 'home' || !run ? (
          <LifeHome gs={gs} onStart={begin} onContinue={() => setScreen('play')} onReset={game.resetAll} />
        ) : run.phase === 'complete' ? (
          <LifeReport gs={gs} onNewRun={() => begin(run.character)} onLearn={onLearn} onHome={() => setScreen('home')} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <MobileMoneyBar gs={gs} />
              {run.phase === 'intro' && <ChapterIntro run={run} onBegin={() => dispatch(advance)} />}
              {run.phase === 'chapter-complete' && <ChapterDone run={run} onNext={() => dispatch(advance)} />}
              {(run.phase === 'deciding' || run.phase === 'feedback') && <ScenarioView gs={gs} dispatch={dispatch} onLearn={onLearn} />}
            </div>
            <div className="min-w-0"><Hud gs={gs} /></div>
          </div>
        )}
      </div>
      <Toasts events={game.events} consume={game.consumeEvents} />
    </MotionConfig>
  );
}

function MobileMoneyBar({ gs }) {
  const b = balancesOf(gs.run.ledger);
  return (
    <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-2 text-center shadow-sm backdrop-blur lg:hidden" aria-label="Balances">
      {[['Cash', b.cash], ['Savings', b.savings], ['Goal', b.goal], ['Owe', b.debt]].map(([l, v]) => (
        <div key={l}><div className="text-[10px] font-bold uppercase text-slate-500">{l}</div><div className="text-sm font-black tabular-nums text-slate-800">{formatINR(v)}</div></div>
      ))}
    </div>
  );
}

function LifeHome({ gs, onStart, onContinue, onReset }) {
  const run = gs.run;
  const active = run && run.status === 'active';
  const [name, setName] = useState(run?.character.name && run.character.name !== 'You' ? run.character.name : '');
  const [avatar, setAvatar] = useState(run?.character.avatar ?? AVATARS[0]);
  const [confirm, setConfirm] = useState(null);
  const lvl = levelOf(gs.profile.xp);
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const chapterTitle = active ? CHAPTERS[run.chapterIndex]?.title : '';
  const start = () => (active ? setConfirm('restart') : onStart({ name, avatar }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl md:p-10">
        <p className="text-sm font-black uppercase tracking-widest text-teal-300">PaisaPath</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-4xl font-black outline-none md:text-5xl">Life Mode</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-300">
          Live a few months of a Hyderabad student’s financial life. Earn, spend, save, dodge scams and chase a goal.
          Every rupee is fictional, every consequence is explained, and every mistake is recoverable.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {Object.values(WORLDS).map((w) => (
            <li key={w.id} className="rounded-2xl bg-white/10 p-3">
              <span className="text-2xl" aria-hidden="true">{w.emoji}</span>
              <p className="mt-1 font-black">{w.name}</p>
              <p className="text-xs text-slate-300">{w.tagline}</p>
            </li>
          ))}
        </ul>
        {active && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black">{run.character.avatar} {run.character.name}’s run is in progress</p>
              <p className="text-sm text-slate-300">Chapter {run.chapterIndex + 1} of 6: {chapterTitle} · {formatINR(balancesOf(run.ledger).cash)} cash</p>
            </div>
            <button type="button" onClick={onContinue} className={`${focusRing} inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-3 font-black text-slate-900 hover:bg-teal-300`}>
              Continue <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {run && run.status === 'complete' && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-black">Your last run is complete.</p>
            <button type="button" onClick={onContinue} className={`${focusRing} inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-slate-900`}>See the report</button>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <h2 className="text-xl font-black text-slate-800">{active ? 'Or start a fresh run' : 'Create your character'}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" /> A nickname is enough. Life Mode never asks for real bank details, family income or any other personal information, and progress is stored only in this browser.</p>
          <label htmlFor="lm-name" className="mt-4 block text-sm font-bold text-slate-700">Nickname (optional)</label>
          <input id="lm-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sai"
            className={`${focusRing} mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-bold`} />
          <fieldset className="mt-4">
            <legend className="text-sm font-bold text-slate-700">Avatar</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button key={a} type="button" onClick={() => setAvatar(a)} aria-pressed={avatar === a} aria-label={`Avatar ${a}`}
                  className={`${focusRing} h-14 w-14 rounded-2xl text-3xl transition ${avatar === a ? 'bg-purple-100 ring-4 ring-purple-400' : 'bg-slate-50 hover:bg-slate-100'}`}>{a}</button>
              ))}
            </div>
          </fieldset>
          <button type="button" onClick={start} className={`${btn.primary} ${focusRing} mt-6 w-full sm:w-auto`}>
            {active ? <RotateCcw size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />} {active ? 'Start a new run' : 'Start my life'}
          </button>
          {confirm === 'restart' && (
            <div role="alertdialog" aria-labelledby="restart-q" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p id="restart-q" className="font-bold text-amber-900">Start over? Your current run’s money and decisions will be cleared. XP, badges and what you’ve learned are kept, and first-time rewards aren’t paid twice.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className={`${btn.primary} ${focusRing}`} onClick={() => { setConfirm(null); onStart({ name, avatar }); }}>Yes, start over</button>
                <button type="button" className={`${btn.secondary} ${focusRing}`} onClick={() => setConfirm(null)}>Keep my run</button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-black text-slate-800">Your progress</h2>
          <p className="mt-1 text-sm font-bold text-purple-700">Level {lvl.level} · {lvl.title} · {gs.profile.xp} XP</p>
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const got = !!gs.profile.achievements[a.id];
              return (
                <li key={a.id} className={`rounded-2xl border p-2 text-center ${got ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`} title={a.rule}>
                  <span className={`text-2xl ${got ? '' : 'opacity-30 grayscale'}`} aria-hidden="true">{a.emoji}</span>
                  <p className="text-[11px] font-bold leading-tight text-slate-700">{a.name}</p>
                  <p className="sr-only">{got ? 'Unlocked' : 'Locked'}. {a.rule}</p>
                  {!got && <Lock size={10} className="mx-auto mt-0.5 text-slate-400" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
          {gs.profile.pastRuns.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-black text-slate-700">Past runs</h3>
              <ul className="mt-1 space-y-1 text-sm text-slate-600">
                {[...gs.profile.pastRuns].reverse().map((p) => (
                  <li key={p.number}>Run {p.number}: {goalById(p.goalId)?.emoji ?? '🎯'} goal {p.goalPct}% · net worth {formatINR(p.netWorth)} · wellbeing {p.wellbeing}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 border-t border-slate-100 pt-3">
            {confirm === 'reset' ? (
              <div role="alertdialog" aria-labelledby="reset-q" className="space-y-2">
                <p id="reset-q" className="text-sm font-bold text-rose-800">Erase all Life Mode progress, XP and badges from this browser?</p>
                <div className="flex gap-2">
                  <button type="button" className={`${btn.secondary} ${focusRing} border-rose-300 text-rose-800`} onClick={() => { setConfirm(null); onReset(); }}>Erase everything</button>
                  <button type="button" className={`${btn.secondary} ${focusRing}`} onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" className={`${btn.ghost} ${focusRing} text-slate-500`} onClick={() => setConfirm('reset')}><Trash2 size={14} aria-hidden="true" /> Reset all progress</button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChapterIntro({ run, onBegin }) {
  const c = CHAPTERS[run.chapterIndex];
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, [run.chapterIndex]);
  return (
    <motion.section key={c.n} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl bg-gradient-to-br from-purple-600 to-teal-600 p-6 text-white shadow-xl md:p-10" aria-labelledby="ch-title">
      <p className="text-sm font-black uppercase tracking-widest text-white/80">Chapter {c.n} of {CHAPTERS.length}</p>
      <h2 id="ch-title" ref={ref} tabIndex={-1} className="mt-1 text-3xl font-black outline-none md:text-4xl">{c.title}</h2>
      <p className="mt-2 text-lg text-white/90">{c.blurb}</p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold"><span aria-hidden="true">{WORLDS[c.world].emoji}</span> {WORLDS[c.world].name}</p>
      {c.n === 1 && <p className="mt-4 max-w-xl text-sm text-white/85">This is a simulation with fictional money. Choices change your balances, your room and what happens next. There are trade-offs, not trick questions.</p>}
      <div className="mt-6">
        <button type="button" onClick={onBegin} className={`${focusRing} inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-6 py-3 font-black text-slate-900 hover:bg-slate-100`}>
          Begin <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </motion.section>
  );
}

function ChapterDone({ run, onNext }) {
  const c = CHAPTERS[run.chapterIndex];
  const next = CHAPTERS[run.chapterIndex + 1];
  const ds = run.decisions.filter((d) => d.chapter === c.n);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const unlock = { 1: 'A desk lamp now lights your room.', 4: 'A wall planner appeared: time to plan the future.' }[c.n];
  return (
    <Card aria-labelledby="done-title">
      <p className="text-xs font-black uppercase tracking-widest text-teal-700">Chapter {c.n} complete</p>
      <h2 id="done-title" ref={ref} tabIndex={-1} className="mt-1 text-3xl font-black text-slate-900 outline-none">{c.title} ✓</h2>
      <ul className="mt-4 space-y-2">
        {ds.map((d) => (
          <li key={d.scenarioId} className="rounded-2xl bg-slate-50 p-3 text-sm">
            <p className="font-bold text-slate-800">{SCENARIO_BY_ID.get(d.scenarioId)?.title}: {d.outcome.title}</p>
            <p className="text-slate-600">{d.outcome.learned}</p>
          </li>
        ))}
      </ul>
      {unlock && <p className="mt-4 rounded-2xl bg-purple-50 p-3 text-sm font-bold text-purple-900" role="status">🔓 {unlock}</p>}
      {next && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Next: <span className="font-bold">Chapter {next.n} · {next.title}</span> <WorldBadge world={next.world} /></p>
          <button type="button" onClick={onNext} className={`${btn.primary} ${focusRing}`}>Next chapter <ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      )}
    </Card>
  );
}

function Toasts({ events, consume }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!events.length) return;
    // One XP toast per batch (summed), plus one per badge, so toasts never bury the HUD.
    const stamp = Date.now();
    const xp = events.filter((e) => e.type === 'xp').reduce((n, e) => n + e.amount, 0);
    const ch = events.find((e) => e.type === 'chapter-complete');
    const fresh = [
      ...(xp ? [{ type: 'xp', amount: xp, reason: ch ? `Chapter ${ch.chapter} complete` : 'Progress', key: `${stamp}-xp` }] : []),
      ...events.filter((e) => e.type === 'badge').map((e, i) => ({ ...e, key: `${stamp}-b${i}` })),
    ];
    consume();
    if (!fresh.length) return;
    setItems((cur) => [...cur, ...fresh].slice(-3));
    // Not cleared on re-run: consume() changes `events`, which must not cancel this timer.
    setTimeout(() => setItems((cur) => cur.filter((x) => !fresh.includes(x))), 3500);
  }, [events, consume]);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,320px)] flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((e) => (
          <motion.div key={e.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl">
            {e.type === 'xp' && <>⭐ +{e.amount} XP · {e.reason}</>}
            {e.type === 'badge' && <>{e.emoji} Badge unlocked: {e.name}</>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
