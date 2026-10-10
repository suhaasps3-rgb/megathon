import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Lock, Lightbulb, Sparkles, Plus, Minus, Coins, Check, X as XIcon, FlaskConical, AlertTriangle } from 'lucide-react';
import { CAST, Portrait } from './art/Person.jsx';
import { GoalGlyph } from './art/props.jsx';
import { presentChoices, balances, choose, answerCheck } from '../../lifemode/story/engine.js';
import { INTERESTS, STEP, GOAL_COST, DEAL_PRICE, DEAL_WAS, ALT_PRICE } from '../../lifemode/story/content.js';
import { simulate } from '../../lifemode/domain/futureLab.js';
import { btn, focusRing, Delta, money } from './ui.jsx';

/**
 * The core gameplay panel for one story event: the scene's dialogue, the interaction
 * (choices, jars, shop, scam message, Future Lab), and then the outcome and takeaway.
 * Everything shown after a choice comes from the engine's recorded result, never from
 * this component's guesses.
 */
export default function EventDialog({ event, run, profile, t, dispatch, settings, look, onClose, onLine, onSound }) {
  const done = run.done[event.id];
  // Memoised: a fresh array every render would re-announce the line to the scene in a loop.
  const lines = useMemo(() => (settings.shortDialogue ? [{ who: 'narrator', key: event.short }] : event.lines), [settings.shortDialogue, event]);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState(done ? 'outcome' : 'lines');
  const [outI, setOutI] = useState(0);
  const [marked, setMarked] = useState([]);
  const [showHint, setShowHint] = useState(settings.autoHints);
  const phase = done ? 'outcome' : stage;

  const current = phase === 'lines' ? lines[i] : phase === 'outcome' ? done.outcome[Math.min(outI, done.outcome.length - 1)] : null;
  useEffect(() => { if (current) onLine?.(current); }, [current, onLine]);

  const next = () => {
    if (i < lines.length - 1) setI(i + 1);
    else setStage('choose');
  };

  const pick = (choiceId, extra) => {
    dispatch(choose, event.id, choiceId, extra);
  };

  // Number keys pick choices; Enter advances lines.
  const choices = useMemo(() => presentChoices(run, event.id), [run, event.id]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (phase === 'choose' && /^[1-5]$/.test(e.key) && ['choice', 'goal', 'shop', 'scam', 'snowball'].includes(event.kind)) {
        const c = choices[Number(e.key) - 1];
        if (c?.available) { e.preventDefault(); pick(c.choice.id, event.kind === 'scam' ? { marked } : undefined); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const b = balances(run);
  return (
    <div data-event={event.id} className="relative z-20 flex justify-center px-0 pb-6 pt-3 sm:px-4" role="region" aria-label={t(`chapter.${['mon', 'tue', 'wed', 'thu', 'fri', 'wkd'][event.day]}`)}>
      <div className="pp-rise w-full max-w-3xl rounded-[28px] border border-white/20 bg-[#fffaf2] text-slate-900 shadow-[0_-12px_60px_rgba(20,13,43,0.55)]">
        <div className="p-4 sm:p-5">
          {current && <Bubble line={current} t={t} look={look} params={phase === 'outcome' ? done.params : b} />}

          {phase === 'lines' && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" className={`${focusRing} rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:text-slate-800`} onClick={() => setStage('choose')}>{t('ui.skipLines')}</button>
              <button type="button" autoFocus className={btn.primary} onClick={next}>{t('ui.next')} <ChevronRight size={18} aria-hidden="true" /></button>
            </div>
          )}

          {phase === 'choose' && (
            <div className="mt-3">
              {event.kind === 'budget' && <BudgetJars t={t} cash={b.cash} goal={b.goal} interest={run.player.interest} onLock={(plan) => pick('plan', plan)} />}
              {event.kind === 'shop' && <ShopItems t={t} run={run} />}
              {event.kind === 'scam' && <ScamInspector t={t} event={event} marked={marked} setMarked={setMarked} name={run.player.name} />}
              {event.kind === 'snowball' && <LabSim t={t} />}
              {event.kind === 'goal' && <GoalMeter t={t} run={run} />}

              {event.kind !== 'budget' && (
                <>
                  <p className="mb-2 mt-3 text-xs font-extrabold uppercase tracking-widest text-violet-700">
                    {event.kind === 'snowball' ? t('wkd_future.ask') : t('ui.whatNow')}
                  </p>
                  <ul className="grid gap-2">
                    {choices.map((c, idx) => (
                      <li key={c.choice.id}>
                        <button
                          type="button"
                          data-choice={c.choice.id}
                          disabled={!c.available}
                          onClick={() => pick(c.choice.id, event.kind === 'scam' ? { marked } : undefined)}
                          className={`${focusRing} group flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${c.available ? 'border-violet-200 bg-white hover:-translate-y-0.5 hover:border-violet-500 hover:shadow-md' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}
                        >
                          <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${c.available ? 'bg-violet-600 text-white' : 'bg-slate-300 text-white'}`} aria-hidden="true">{idx + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold leading-snug">{t(c.choice.label)}</span>
                            {c.available ? (
                              <span className="mt-1.5 flex flex-wrap gap-1.5">
                                {c.delta ? <MoneyChips t={t} delta={c.delta} /> : event.kind === 'scam' && c.choice.id === 'pay' ? <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-extrabold text-slate-600">{t('ui.preview')} {t('ui.previewHidden')}</span> : null}
                              </span>
                            ) : (
                              <span className="mt-1 block text-xs font-bold">{t(c.reason, { cash: b.cash, left: Math.max(0, GOAL_COST - b.goal) })}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-3">
                {showHint ? (
                  <p className="flex items-start gap-2 rounded-2xl bg-violet-50 p-3 text-sm text-violet-950"><Lightbulb size={18} className="mt-0.5 shrink-0 text-violet-600" aria-hidden="true" /><span><b>{t('who.akka')}:</b> {t(event.hint)}</span></p>
                ) : (
                  <button type="button" onClick={() => setShowHint(true)} className={`${focusRing} inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50`}><Lightbulb size={16} aria-hidden="true" /> {t('hud.hint')}</button>
                )}
              </div>
            </div>
          )}

          {phase === 'outcome' && (
            <Outcome event={event} run={run} profile={profile} done={done} t={t} outI={outI} setOutI={setOutI} dispatch={dispatch} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ line, t, look, params }) {
  const who = line.who;
  const text = t(line.key, params);
  if (who === 'narrator') {
    return <p className="pp-rise rounded-2xl bg-[#1d1538] px-4 py-3 text-[15px] font-semibold leading-relaxed text-violet-50" aria-live="polite">{text}</p>;
  }
  const lk = who === 'you' ? look : CAST[who];
  return (
    <div className="pp-rise flex items-end gap-3" aria-live="polite">
      <div className={`shrink-0 overflow-hidden rounded-2xl ${who === 'you' ? 'bg-violet-200' : 'bg-teal-100'}`}>
        <Portrait look={lk} mood={line.mood ?? 'neutral'} size={58} />
      </div>
      <div className="relative min-w-0 flex-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-extrabold uppercase tracking-wider text-violet-700">{t(`who.${who}`)}</p>
        <p className="mt-0.5 text-[15px] font-medium leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function MoneyChips({ t, delta }) {
  const parts = [
    ['hud.wallet', delta.cash], ['hud.safety', delta.savings], ['hud.goal', delta.goal], ['hud.owe', delta.debt],
  ].filter(([, v]) => v);
  if (!parts.length) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{t('ui.noMoney')}</span>;
  return parts.map(([k, v]) => <Delta key={k} label={t(k)} value={k === 'hud.owe' ? -v : v} />);
}

function Outcome({ event, run, profile, done, t, outI, setOutI, dispatch, onClose }) {
  const lastLine = outI >= done.outcome.length - 1;
  const txs = run.ledger.transactions.filter((x) => x.seq >= done.seqStart && x.seq < done.seqEnd);
  const check = event.check;
  const answered = run.checks[event.id];
  const choice = event.choices.find((c) => c.id === done.choiceId);
  const memories = [...(choice?.memory ? [choice.memory] : []), ...(event.kind === 'budget' ? ['first_plan'] : []), ...(done.inspection?.correct ? ['scam_radar'] : [])];
  if (!lastLine) {
    return (
      <div className="mt-3 flex justify-end">
        <button type="button" autoFocus className={btn.primary} onClick={() => setOutI(outI + 1)}>{t('ui.next')} <ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      {txs.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3" aria-label={t('ui.receipt')}>
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{t('ui.receipt')}</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {txs.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="font-semibold">{t(x.description)}</span>
                <TxAmount tx={x} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {done.inspection && (
        <div className="rounded-2xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
          <p className="font-extrabold text-amber-900">{t('fri_scam.found', { found: done.inspection.found, total: done.inspection.total })}</p>
          <ul className="mt-2 space-y-1.5">
            {event.segments.map((sg) => (
              <li key={sg.id} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${sg.flag ? 'bg-rose-500 text-white' : 'bg-teal-500 text-white'}`} aria-hidden="true">{sg.flag ? '!' : '✓'}</span>
                <span><span className="font-bold">{done.inspection.marked.includes(sg.id) ? '◉ ' : ''}</span>{t(`fri_scam.why.${sg.id}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {done.lesson && (
        <p className="flex items-start gap-2 rounded-2xl bg-teal-50 p-3 text-sm font-semibold text-teal-950 ring-1 ring-teal-200">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
          <span><span className="font-extrabold">{t('ui.takeaway')}: </span>{t(done.lesson, done.params)}</span>
        </p>
      )}
      {memories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {memories.map((m) => (
            <span key={m} className="pp-pop inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold text-violet-900">📸 {t('ui.memory')}: {t(`mem.${m}`)}</span>
          ))}
        </div>
      )}
      {check && (
        <details className="rounded-2xl bg-white p-3 ring-1 ring-slate-200" open={!!answered}>
          <summary className={`${focusRing} cursor-pointer rounded-lg text-sm font-extrabold text-violet-800`}>{t('ui.quickQ')}</summary>
          <p className="mt-2 text-sm font-semibold">{t(check.key)}</p>
          <div className="mt-2 grid gap-1.5">
            {check.options.map((o, idx) => {
              const chosen = answered?.answer === idx;
              const right = idx === check.answer;
              return (
                <button key={o} type="button" disabled={!!answered} onClick={() => dispatch(answerCheck, event.id, idx)}
                  className={`${focusRing} rounded-xl border-2 px-3 py-2 text-left text-sm font-bold ${answered ? (right ? 'border-teal-500 bg-teal-50' : chosen ? 'border-rose-400 bg-rose-50' : 'border-slate-200 opacity-60') : 'border-slate-200 hover:border-violet-400'}`}>
                  {t(o)} {answered && right && <Check size={14} className="inline" aria-label="correct" />}{answered && chosen && !right && <XIcon size={14} className="inline" aria-label="incorrect" />}
                </button>
              );
            })}
          </div>
          {answered && <p className="mt-2 text-sm"><b>{answered.correct ? t('ui.right') : t('ui.notQuite')}</b> {t(check.explain)}</p>}
        </details>
      )}
      <div className="flex justify-end">
        <button type="button" data-continue autoFocus className={btn.primary} onClick={onClose}>{t('ui.continue')} <ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

function TxAmount({ tx }) {
  const out = tx.type === 'expense' || tx.type === 'loss' || tx.type === 'repay';
  const inn = tx.type === 'income' || tx.type === 'borrow';
  if (tx.type === 'transfer') {
    return <span className="whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-xs font-extrabold tabular-nums text-violet-900">⇄ {money(tx.amount)}</span>;
  }
  return <span className={`whitespace-nowrap font-extrabold tabular-nums ${out ? 'text-rose-700' : inn ? 'text-teal-700' : ''}`}>{out ? '−' : '+'}{money(tx.amount)}</span>;
}

/* ───────── Monday: give your money jobs ───────── */
function BudgetJars({ t, cash, goal, interest, onLock }) {
  const [plan, setPlan] = useState({ goal: 0, savings: 0 });
  const left = cash - plan.goal - plan.savings;
  const add = (jar, dir) => setPlan((p) => {
    const nextVal = p[jar] + dir * STEP;
    if (nextVal < 0) return p;
    if (dir > 0 && cash - p.goal - p.savings < STEP) return p;
    return { ...p, [jar]: nextVal };
  });
  const presets = [
    ['budget.p.flex', { goal: 0, savings: 0 }],
    ['budget.p.balanced', { goal: 45000, savings: 35000 }],
    ['budget.p.goal', { goal: 80000, savings: 10000 }],
  ].filter(([, p]) => p.goal + p.savings <= cash);
  const onDrop = (jar) => (e) => { e.preventDefault(); add(jar, 1); };
  const jars = [
    { id: 'savings', name: t('budget.safety'), why: t('budget.safetyWhy'), value: plan.savings, color: 'bg-teal-400', ring: 'ring-teal-300', max: 50000 },
    { id: 'goal', name: t('budget.goal'), why: t('budget.goalWhy'), value: plan.goal, color: 'bg-violet-500', ring: 'ring-violet-300', max: GOAL_COST, base: goal },
  ];
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">{t('budget.planned')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-950 p-3 text-emerald-50">
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">{t('budget.wallet')}</p>
          <p className="pp-font-display mt-1 text-3xl font-extrabold tabular-nums" aria-live="polite">{money(left)}</p>
          <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
            {Array.from({ length: Math.min(20, Math.floor(left / STEP)) }, (_, k) => (
              <span key={k} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', 'coin')} className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-amber-300 text-[10px] font-black text-amber-900 ring-2 ring-amber-500 active:cursor-grabbing">₹</span>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-emerald-200/80">{t('budget.drag')}</p>
        </div>
        {jars.map((j) => {
          const fill = j.id === 'goal' ? Math.min(1, ((j.base ?? 0) + j.value) / GOAL_COST) : Math.min(1, j.value / j.max);
          return (
            <div key={j.id} onDragOver={(e) => e.preventDefault()} onDrop={onDrop(j.id)} className={`rounded-2xl bg-white p-3 ring-2 ${j.ring}`}>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{j.name}</p>
              <p className="text-[11px] font-semibold text-slate-500">{j.why}</p>
              <div className="mt-2 flex items-end gap-3">
                <div className="relative h-20 w-14 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-slate-300 bg-slate-50" aria-hidden="true">
                  <div className={`absolute inset-x-0 bottom-0 ${j.color} transition-all duration-300`} style={{ height: `${fill * 100}%` }} />
                </div>
                <div>
                  <p className="pp-font-display text-2xl font-extrabold tabular-nums">+{money(j.value)}</p>
                  {j.id === 'goal' && <p className="text-xs font-bold text-slate-500">{t('hud.goalOf', { have: (j.base ?? 0) + j.value, cost: GOAL_COST })}</p>}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => add(j.id, -1)} disabled={j.value <= 0} className={`${btn.light} flex-1 px-2`} aria-label={t('budget.remove', { step: STEP, jar: j.name })}><Minus size={18} aria-hidden="true" /></button>
                <button type="button" onClick={() => add(j.id, 1)} disabled={left < STEP} className={`${btn.light} flex-1 px-2`} aria-label={t('budget.add', { step: STEP, jar: j.name })}><Plus size={18} aria-hidden="true" /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{t('budget.presets')}</span>
        {presets.map(([k, p]) => (
          <button key={k} type="button" onClick={() => setPlan(p)} className={`${focusRing} rounded-full border-2 border-violet-200 bg-white px-3 py-1.5 text-sm font-bold text-violet-900 hover:border-violet-500`}>{t(k)}</button>
        ))}
      </div>
      <p className="mt-3 text-sm font-bold" role="status">{t('budget.left', { cash: left })}{left < 15000 && <span className="ml-1 text-amber-700"> {t('budget.warnLow')}</span>}</p>
      <div className="mt-3 flex justify-end">
        <button type="button" data-lock className={btn.primary} onClick={() => onLock(plan)}><Lock size={18} aria-hidden="true" /> {t('mon_plan.lock')}</button>
      </div>
    </div>
  );
}

/* ───────── Wednesday: the shop ───────── */
export function ShopItems({ t, run }) {
  const i = INTERESTS[run.player.interest];
  const b = balances(run);
  const [open, setOpen] = useState(null);
  const items = [
    { id: i.deal, tag: t('shop.saleTag'), tagCls: 'bg-rose-500 text-white', price: DEAL_PRICE, was: DEAL_WAS, glyph: i.dealEmoji, bg: 'from-pink-400 to-rose-500' },
    { id: i.alt, tag: t('shop.valueTag'), tagCls: 'bg-teal-500 text-white', price: ALT_PRICE, glyph: i.altEmoji, bg: 'from-teal-300 to-teal-500' },
    { id: i.goal, tag: t('shop.goalTag'), tagCls: 'bg-violet-600 text-white', price: GOAL_COST, goal: true, bg: 'from-violet-500 to-indigo-700' },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <button key={it.id} type="button" aria-expanded={open === it.id} onClick={() => setOpen(open === it.id ? null : it.id)}
            className={`${focusRing} rounded-2xl bg-white p-2 text-left ring-1 transition hover:-translate-y-0.5 ${open === it.id ? 'ring-2 ring-violet-500' : 'ring-slate-200'}`}>
            <span className={`flex h-16 items-center justify-center rounded-xl bg-gradient-to-br ${it.bg} text-3xl`}>
              {it.goal ? <svg viewBox="-70 -70 140 140" className="h-14 w-14" aria-hidden="true"><GoalGlyph kind={it.id === 'headphones' ? 'headphones' : it.id} x={0} y={0} s={0.9} /></svg> : <span aria-hidden="true">{it.glyph}</span>}
            </span>
            <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${it.tagCls}`}>{it.tag}</span>
            <span className="mt-1 block text-xs font-bold leading-tight sm:text-sm">{t(`item.${it.id}`)}</span>
            <span className="block text-sm font-extrabold tabular-nums">{money(it.price)} {it.was && <s className="text-xs font-bold text-slate-400">{money(it.was)}</s>}</span>
          </button>
        ))}
      </div>
      {open && (() => {
        const it = items.find((x) => x.id === open);
        return (
          <div className="pp-rise mt-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-200">
            <p className="font-bold">{t(`itemnote.${it.id}`)}</p>
            {it.goal ? (
              <p className="mt-1 text-slate-600">{t('shop.goalNote', { goal: b.goal })}</p>
            ) : (
              <p className="mt-1 text-slate-600">
                {t('hud.wallet')}: {money(b.cash)} → <b className={b.cash - it.price < 0 ? 'text-rose-700' : ''}>{money(b.cash - it.price)}</b>
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ───────── Friday: inspect the message ───────── */
function ScamInspector({ t, event, marked, setMarked, name }) {
  const toggle = (id) => setMarked(marked.includes(id) ? marked.filter((m) => m !== id) : [...marked, id]);
  return (
    <div className="rounded-3xl bg-slate-900 p-3 text-slate-50">
      <p className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-amber-300">
        <span>{t('fri_scam.inspect')}</span><span className="rounded-full bg-white/10 px-2 py-0.5 normal-case tracking-normal">{t('fri_scam.marked', { n: marked.length })}</span>
      </p>
      <div className="rounded-2xl rounded-tl-md bg-slate-800 p-3 leading-loose">
        {event.segments.map((sg) => {
          const on = marked.includes(sg.id);
          const key = sg.id === 'name' && !name ? 'fri_scam.seg.nameAnon' : `fri_scam.seg.${sg.id}`;
          return (
            <button key={sg.id} type="button" aria-pressed={on} onClick={() => toggle(sg.id)}
              className={`${focusRing} mr-1 rounded-md px-1 text-left text-[15px] transition ${on ? 'bg-amber-300 text-slate-900 ring-2 ring-amber-500' : 'hover:bg-white/10'}`}>
              {t(key, { name })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Weekend: goal meter ───────── */
function GoalMeter({ t, run }) {
  const b = balances(run);
  const pct = Math.min(100, Math.round((b.goal / GOAL_COST) * 100));
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-800 p-3 text-white">
      <svg viewBox="-70 -70 140 140" className="h-16 w-16 shrink-0" aria-hidden="true"><GoalGlyph kind={INTERESTS[run.player.interest].goal} x={0} y={0} s={0.9} /></svg>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{t('hud.goalOf', { have: b.goal, cost: GOAL_COST })}</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('hud.goal')}>
          <div className="h-full rounded-full bg-teal-300 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs font-semibold text-violet-100">{t('hud.wallet')} {money(b.cash)} · {t('hud.safety')} {money(b.savings)}</p>
      </div>
    </div>
  );
}

/* ───────── Weekend: Future Lab (hypothetical) ───────── */
const MIXES = [
  { id: 'savings', pct: { savings: 100, index: 0, single: 0 } },
  { id: 'index', pct: { savings: 0, index: 100, single: 0 } },
  { id: 'single', pct: { savings: 0, index: 0, single: 100 } },
];
const YEARS = [1, 3, 5, 10];

export function LabSim({ t }) {
  const [mix, setMix] = useState('index');
  const [years, setYears] = useState(5);
  const m = MIXES.find((x) => x.id === mix);
  const r = useMemo(() => simulate(m.pct, years, 6000), [m, years]);
  const W = 300, H = 110;
  const max = Math.max(...r.sample.flat(), r.best) * 1.05;
  const x = (k) => (k / r.years) * W;
  const y = (v) => H - (v / max) * H;
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  return (
    <div className="rounded-3xl bg-[#0f2a2a] p-3 text-teal-50">
      <p className="flex items-center gap-2 font-extrabold"><FlaskConical size={18} aria-hidden="true" /> {t('lab.title')}</p>
      <p className="mt-1 flex items-start gap-1.5 text-xs font-bold text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{t('lab.disclaimer')}</p>
      <fieldset className="mt-2">
        <legend className="text-[11px] font-extrabold uppercase tracking-widest text-teal-300">{t('lab.where')}</legend>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {MIXES.map((mm) => (
            <button key={mm.id} type="button" aria-pressed={mix === mm.id} onClick={() => setMix(mm.id)}
              className={`${focusRing} min-h-[40px] rounded-xl px-2 text-xs font-bold sm:text-sm ${mix === mm.id ? 'bg-teal-300 text-teal-950' : 'bg-white/10 hover:bg-white/15'}`}>{t(`lab.${mm.id}`)}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-2">
        <legend className="text-[11px] font-extrabold uppercase tracking-widest text-teal-300">{t('lab.how')}</legend>
        <div className="mt-1 flex gap-1.5">
          {YEARS.map((yv) => (
            <button key={yv} type="button" aria-pressed={years === yv} onClick={() => setYears(yv)}
              className={`${focusRing} min-h-[40px] flex-1 rounded-xl text-sm font-bold ${years === yv ? 'bg-teal-300 text-teal-950' : 'bg-white/10 hover:bg-white/15'}`}>{t(yv > 1 ? 'lab.yearsPlural' : 'lab.years', { n: yv })}</button>
          ))}
        </div>
      </fieldset>
      <svg viewBox={`0 0 ${W} ${H + 4}`} className="mt-3 h-auto w-full" role="img" aria-label={`${t('lab.typical')} ${inr(r.typical)}, ${t('lab.unlucky')} ${inr(r.worst)}, ${t('lab.lucky')} ${inr(r.best)}`}>
        <line x1="0" x2={W} y1={y(r.start)} y2={y(r.start)} stroke="#94a3b8" strokeDasharray="4 4" />
        {r.sample.map((p, k) => (
          <polyline key={k} fill="none" stroke="#5eead4" strokeOpacity={0.35 + k * 0.12} strokeWidth="2.5" points={p.map((v, tt) => `${x(tt)},${y(v)}`).join(' ')} />
        ))}
      </svg>
      <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        {[['lab.unlucky', r.worst], ['lab.typical', r.typical], ['lab.lucky', r.best]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/10 p-1.5"><dt className="text-[10px] font-extrabold uppercase text-teal-200">{t(k)}</dt><dd className="font-extrabold tabular-nums">{inr(v)}</dd></div>
        ))}
      </dl>
      <p className="mt-2 text-xs font-semibold">{t('lab.put')} ₹6,000 · {t('lab.lossChance', { pct: r.lossChance })}</p>
      <p className="mt-1 text-[11px] text-teal-200/80">{t('lab.assume')}</p>
    </div>
  );
}

