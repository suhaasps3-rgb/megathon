import React from 'react';
import { RotateCcw, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import Person, { CAST } from './art/Person.jsx';
import { GoalGlyph, Polaroid, Sky, Skyline, StringLights } from './art/props.jsx';
import { btn, focusRing, money } from './ui.jsx';
import { moneyStory, timeline, pillarProgress } from '../../lifemode/story/engine.js';
import { DAYS, EVENT_BY_ID, INTERESTS, MEMORIES } from '../../lifemode/story/content.js';

/**
 * The end of the week, calculated from the recorded run: the headline, the money story,
 * each day's choice, the memories and what was practised. Then: rewind or start over.
 */
export default function Ending({ t, gs, look, onRewind, onNewWeek, onSeason, onLearn, calm }) {
  const run = gs.run;
  const e = run.ending;
  const kind = INTERESTS[run.player.interest].goal;
  const ms = moneyStory(run);
  const log = timeline(run);
  const pillars = pillarProgress(gs.profile);
  const kept = ms.balances.cash + ms.balances.savings + ms.balances.goal;
  const segs = [
    ['end.m.needs', ms.needs, '#f59e0b'],
    ['end.m.wants', ms.wants, '#f472b6'],
    ['end.m.goal', ms.goalSpent, '#8b5cf6'],
    ['end.m.lost', ms.lost, '#ef4444'],
    ['end.m.repaid', ms.repaid, '#94a3b8'],
    ['end.m.kept', kept, '#14b8a6'],
  ].filter(([, v]) => v > 0);
  const total = segs.reduce((n, [, v]) => n + v, 0) || 1;
  const left = Math.max(0, e.shortfall);

  return (
    <div className="pp-world min-h-screen bg-[#140d2b] pb-16 text-white">
      <header className="relative overflow-hidden">
        <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <Sky id="endSky" day={5} h={600} />
          <Skyline x={60} y={600} s={2} color="#3b2a63" opacity={0.6} />
          <StringLights x1={0} x2={1600} y={40} sag={30} n={22} calm={calm} />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#140d2b]" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-6 pt-10 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-amber-200 drop-shadow">{t('end.kicker')}</p>
          <svg viewBox="-260 -340 520 360" className="mt-2 h-48 w-auto md:h-60" aria-hidden="true">
            <Person x={-130} y={0} s={0.85} look={CAST.akka} mood={e.id === 'goal' ? 'excited' : 'happy'} idle={!calm} />
            <Person x={60} y={0} s={1} look={look} mood={e.id === 'goal' ? 'excited' : e.id === 'close' ? 'happy' : 'smug'} idle={!calm} />
            {e.goalBought && <g className="pp-pop"><GoalGlyph kind={kind} x={200} y={-140} s={0.9} /></g>}
          </svg>
          <h1 className="pp-font-display text-4xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(20,13,43,0.9)] md:text-6xl">{t(`end.${e.id}`)}</h1>
          <p className="mt-2 max-w-xl rounded-2xl bg-[#140d2b]/70 px-3 py-1 text-lg font-semibold text-white">{t(`end.${e.id}.sub`, { left, weeks: e.weeksToGoal })}</p>
          {e.traits.length > 0 && (
            <div className="mt-4">
              <p className="sr-only">{t('end.traits')}</p>
              <ul className="flex flex-wrap justify-center gap-2">
                {e.traits.map((tr) => <li key={tr} className="rounded-full bg-[#140d2b]/85 px-3 py-1.5 text-sm font-bold text-amber-200">{t(`trait.${tr}`)}</li>)}
              </ul>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto mt-4 grid max-w-4xl gap-4 px-4">
        <section className="rounded-3xl bg-[#1d1538] p-4 ring-1 ring-white/10 md:p-5" aria-labelledby="end-money">
          <h2 id="end-money" className="pp-font-display text-xl font-extrabold">{t('end.money')}</h2>
          <div className="mt-3 flex h-6 overflow-hidden rounded-full" role="img" aria-label={segs.map(([k, v]) => `${t(k)} ${money(v)}`).join(', ')}>
            {segs.map(([k, v, c]) => <div key={k} style={{ width: `${(v / total) * 100}%`, background: c }} />)}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {segs.map(([k, v, c]) => (
              <li key={k} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c }} aria-hidden="true" /><span className="min-w-0 flex-1">{t(k)}</span><b className="tabular-nums">{money(v)}</b></li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-white/70">{t('end.balances', { cash: ms.balances.cash, savings: ms.balances.savings, goal: ms.balances.goal })}</p>
          {ms.balances.debt > 0 && <p className="mt-1 text-sm font-bold text-rose-300">{t('end.owed', { debt: ms.balances.debt })}</p>}
        </section>

        <section className="rounded-3xl bg-[#1d1538] p-4 ring-1 ring-white/10 md:p-5" aria-labelledby="end-story">
          <h2 id="end-story" className="pp-font-display text-xl font-extrabold">{t('end.story')}</h2>
          <ol className="mt-3 space-y-2">
            {log.map((x) => {
              const ev = EVENT_BY_ID.get(x.eventId);
              const c = ev.choices.find((cc) => cc.id === x.choiceId);
              return (
                <li key={x.eventId} className="flex items-start gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="w-12 shrink-0 text-xs font-extrabold uppercase text-teal-300">{t(`day.short.${DAYS[x.day]}`)}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <b className="block">{t(`evt.${ev.id}`)}</b>
                    <span className="text-white/80">{ev.kind === 'budget' ? t('cal.mon.plan') : t(c.label)}</span>
                  </span>
                  {x.change !== 0 && <span className={`shrink-0 text-sm font-extrabold tabular-nums ${x.change < 0 ? 'text-rose-300' : 'text-teal-300'}`}>{x.change < 0 ? '−' : '+'}{money(Math.abs(x.change))}</span>}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl bg-[#1d1538] p-4 ring-1 ring-white/10 md:p-5" aria-labelledby="end-mem">
            <h2 id="end-mem" className="pp-font-display text-xl font-extrabold">{t('end.memories')}</h2>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {run.memories.map((m) => (
                <li key={m} className="flex flex-col items-center text-center">
                  <svg viewBox="-40 -45 80 85" className="h-16 w-16" aria-hidden="true"><Polaroid id={m} x={0} y={0} /></svg>
                  <span className="text-xs font-bold">{t(`mem.${m}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-white/60">{t('end.collection', { n: gs.profile.memories.length, total: MEMORIES.length })} · {t('end.endings', { n: gs.profile.endings.length })}</p>
          </section>
          <section className="rounded-3xl bg-[#1d1538] p-4 ring-1 ring-white/10 md:p-5" aria-labelledby="end-pillars">
            <h2 id="end-pillars" className="pp-font-display text-xl font-extrabold">{t('end.pillars')}</h2>
            <ul className="mt-2 space-y-2">
              {Object.entries(pillars).map(([p, lvl]) => {
                const rank = { new: 0, learning: 1, practicing: 2, confident: 3 }[lvl];
                return (
                  <li key={p}>
                    <div className="flex justify-between text-sm"><span className="font-bold">{t(`end.pillar.${p}`)}</span><span className="text-white/70">{t(`level.${lvl}`)}</span></div>
                    <div className="mt-1 flex gap-1" aria-hidden="true">{[1, 2, 3].map((k) => <span key={k} className={`h-2 flex-1 rounded-full ${k <= rank ? 'bg-teal-300' : 'bg-white/10'}`} />)}</div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-800 p-4 md:p-5" aria-labelledby="end-whatif">
          <h2 id="end-whatif" className="pp-font-display text-2xl font-extrabold">{t('end.whatIf')}</h2>
          <p className="text-violet-100">{t('end.whatIf.sub')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DAYS.map((d, idx) => run.snapshots[idx] && (
              <button key={d} type="button" onClick={() => onRewind(idx)} className={`${focusRing} inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-3 py-2.5 text-sm font-bold hover:bg-white/25`}>
                <RotateCcw size={16} aria-hidden="true" /> {t('end.rewind', { day: t(`day.${d}`) })}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onNewWeek} className={`${btn.mint} flex-1`}><Sparkles size={18} aria-hidden="true" /> {t('end.newWeek')}</button>
            <button type="button" onClick={onLearn} className={`${btn.ghost} flex-1`}><BookOpen size={18} aria-hidden="true" /> {t('title.learn')}</button>
          </div>
        </section>

        {gs.profile.seasonUnlocked && (
          <button type="button" onClick={onSeason} className={`${focusRing} flex items-center justify-between gap-3 rounded-3xl bg-amber-300 p-4 text-left text-amber-950 hover:bg-amber-200`}>
            <span><b className="pp-font-display block text-lg">{t('end.season')}</b><span className="text-sm">{t('end.season.sub')}</span></span>
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        )}
      </main>
    </div>
  );
}
