import React, { useMemo, useState } from 'react';
import { Lock, MapPin, Home, Store, Coffee, MessageCircle, ChevronRight, Play, Settings as SettingsIcon, RotateCcw, LogOut, Mic, Eye, Users, BookOpen, Volume2 } from 'lucide-react';
import { Modal, btn, focusRing, money } from './ui.jsx';
import { Portrait, CAST } from './art/Person.jsx';
import { GoalGlyph } from './art/props.jsx';
import { inbox, balances, isUnlocked, currentEvent, dayEvents, timeline, computeEnding } from '../../lifemode/story/engine.js';
import { DAYS, LOCATIONS, INTERESTS, GOAL_COST, EVENT_BY_ID } from '../../lifemode/story/content.js';

const LOC_ICON = { home: Home, hangout: Coffee, market: Store };
const LOC_POS = { home: [70, 150], hangout: [210, 70], market: [330, 160] };

/* ───────── Map ───────── */
export function MapPanel({ t, run, onGo, onClose }) {
  const ev = currentEvent(run);
  return (
    <Modal title={t('map.title')} onClose={onClose} dark closeLabel={t('ui.close')}>
      <div className="relative overflow-hidden rounded-2xl bg-[#2b1f4f]">
        <svg viewBox="0 0 400 230" className="block h-auto w-full" aria-hidden="true">
          <rect width="400" height="230" fill="#2b1f4f" />
          <path d="M0,190 Q120,150 200,200 T400,170 L400,230 L0,230 Z" fill="#1e7a74" opacity="0.6" />
          <ellipse cx="300" cy="60" rx="70" ry="28" fill="#38bdf8" opacity="0.35" />
          <path d="M70,150 C120,120 160,90 210,70 M210,70 C260,90 300,120 330,160 M70,150 C160,190 260,190 330,160" fill="none" stroke="#fde68a" strokeWidth="6" strokeDasharray="2 12" strokeLinecap="round" />
          {[...Array(12)].map((_, k) => <circle key={k} cx={20 + k * 34} cy={20 + (k % 3) * 8} r="1.6" fill="#fff" opacity="0.6" />)}
        </svg>
        {Object.keys(LOCATIONS).map((loc) => {
          const [x, y] = LOC_POS[loc];
          const open = isUnlocked(run, loc);
          const here = run.location === loc;
          const story = ev && ev.location === loc && ev.hotspot !== 'phone';
          const Icon = open ? LOC_ICON[loc] : Lock;
          return (
            <button key={loc} type="button" disabled={!open} onClick={() => onGo(loc)}
              style={{ left: `${(x / 400) * 100}%`, top: `${(y / 230) * 100}%` }}
              className={`${focusRing} absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-center ${open ? 'text-white' : 'cursor-not-allowed text-white/50'}`}
              aria-label={`${t(`loc.${loc}`)}${here ? `, ${t('map.here')}` : ''}${story ? `, ${t('map.story')}` : ''}${open ? '' : `, ${t('loc.locked', { day: t(`day.${DAYS[LOCATIONS[loc].unlockDay]}`) })}`}`}>
              <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${here ? 'bg-teal-400 text-teal-950' : open ? 'bg-violet-600' : 'bg-slate-600'} ${story ? 'pp-ringpulse' : ''}`}>
                <Icon size={22} aria-hidden="true" />
                {story && <span className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-amber-950">!</span>}
              </span>
              <span className="whitespace-nowrap rounded-full bg-black/40 px-2 text-xs font-extrabold">{t(`loc.${loc}`)}</span>
            </button>
          );
        })}
      </div>
      <ul className="mt-3 grid gap-2">
        {Object.keys(LOCATIONS).map((loc) => {
          const open = isUnlocked(run, loc);
          return (
            <li key={loc} className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm">
              <span><b>{t(`loc.${loc}`)}</b> <span className="text-white/60">· {t(`loc.${loc}.sub`)}</span></span>
              <span className="text-xs font-bold text-white/70">{run.location === loc ? t('map.here') : open ? '' : t('loc.locked', { day: t(`day.${DAYS[LOCATIONS[loc].unlockDay]}`) })}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/* ───────── Phone / message centre ───────── */
const THREAD_LOOK = { zoya: CAST.zoya, arjun: CAST.arjun, akka: CAST.akka, raju: CAST.raju };
const THREAD_EMOJI = { mom: '💛', class: '📚', unknown: '❓' };

export function PhonePanel({ t, run, onRespond, onClose, onRead }) {
  const msgs = inbox(run);
  const threads = useMemo(() => {
    const m = new Map();
    for (const x of msgs) m.set(x.thread, [...(m.get(x.thread) ?? []), x]);
    return [...m.entries()].sort((a, b) => b[1][b[1].length - 1].day - a[1][a[1].length - 1].day);
  }, [msgs]);
  const [open, setOpen] = useState(null);
  const ev = currentEvent(run);
  const view = (thread) => {
    setOpen(thread);
    onRead(msgs.filter((m) => m.thread === thread).map((m) => m.id));
  };
  const name = (th) => t(`who.${th === 'raju' ? 'raju' : th}`);
  return (
    <Modal title={t('phone.title')} onClose={onClose} closeLabel={t('ui.close.phone')} className="!bg-[#0f0b1e] !text-white" dark>
      <div className="mx-auto max-w-sm rounded-[32px] border-4 border-slate-700 bg-gradient-to-b from-[#1b1437] to-[#120c26] p-3">
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-slate-700" aria-hidden="true" />
        {!open ? (
          threads.length ? (
            <ul className="space-y-1.5">
              {threads.map(([th, list]) => {
                const last = list[list.length - 1];
                const unread = list.some((m) => !run.read.includes(m.id));
                return (
                  <li key={th}>
                    <button type="button" onClick={() => view(th)} className={`${focusRing} flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/5`}>
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-900/60 text-xl">
                        {THREAD_LOOK[th] ? <Portrait look={THREAD_LOOK[th]} mood="happy" size={42} /> : <span aria-hidden="true">{THREAD_EMOJI[th]}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><b className="truncate">{name(th)}</b><span className="text-[11px] text-white/50">{t(`day.short.${DAYS[last.day]}`)}</span></span>
                        <span className={`block truncate text-sm ${unread ? 'font-bold text-white' : 'text-white/60'}`}>{t(last.key)}</span>
                      </span>
                      {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal-400" aria-label={t('hud.unread', { n: 1 })} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="p-4 text-center text-sm text-white/60">{t('phone.empty')}</p>
        ) : (
          <div>
            <button type="button" onClick={() => setOpen(null)} className={`${focusRing} mb-2 rounded-lg px-2 py-1 text-sm font-bold text-teal-300`}>← {t('ui.back')}</button>
            <p className="mb-2 text-center font-extrabold">{name(open)}</p>
            <ul className="space-y-2">
              {msgs.filter((m) => m.thread === open).map((m) => {
                const live = m.event && ev?.id === m.event;
                return (
                  <li key={m.id} className="max-w-[85%]">
                    <p className="text-[10px] font-bold uppercase text-white/40">{t(`day.${DAYS[m.day]}`)}</p>
                    <div className={`rounded-2xl rounded-tl-md px-3 py-2 text-sm ${open === 'unknown' ? 'bg-amber-900/60' : 'bg-white/10'}`}>{t(m.key)}</div>
                    {live && (
                      <button type="button" onClick={() => onRespond(m.event)} className={`${btn.mint} mt-2 w-full`}>
                        <MessageCircle size={18} aria-hidden="true" /> {m.thread === 'unknown' ? t('phone.inspect') : t('phone.event')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ───────── Calendar: the week so far ───────── */
export function CalendarPanel({ t, run, onClose }) {
  const log = timeline(run);
  return (
    <Modal title={t('cal.title')} onClose={onClose} wide closeLabel={t('ui.close')}>
      <ol className="grid gap-2 sm:grid-cols-3">
        {DAYS.map((d, idx) => {
          const items = log.filter((x) => x.day === idx);
          const today = idx === run.day && run.status === 'playing';
          return (
            <li key={d} className={`rounded-2xl p-3 ring-1 ${today ? 'bg-amber-50 ring-amber-300' : idx < run.day ? 'bg-white ring-slate-200' : 'bg-violet-50/60 ring-violet-100'}`}>
              <p className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-slate-500">
                <span>{t(`day.${d}`)}</span>{today && <span className="rounded-full bg-amber-400 px-2 text-amber-950">{t('cal.today')}</span>}
              </p>
              <p className="pp-font-display font-extrabold">{t(`chapter.${d}`)}</p>
              {items.length ? (
                <ul className="mt-1 space-y-1 text-sm">
                  {items.map((x) => {
                    const e = EVENT_BY_ID.get(x.eventId);
                    const c = e.choices.find((cc) => cc.id === x.choiceId);
                    return (
                      <li key={x.eventId} className="flex items-start justify-between gap-2">
                        <span className="min-w-0">{e.kind === 'budget' ? t('cal.mon.plan') : t(c.label)}</span>
                        {x.change !== 0 && <span className={`shrink-0 text-xs font-extrabold tabular-nums ${x.change < 0 ? 'text-rose-700' : 'text-teal-700'}`}>{x.change < 0 ? '−' : '+'}{money(Math.abs(x.change))}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">{idx === 0 ? t('budget.planned') : t(`cal.${d}.plan`)}</p>
              )}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}

/* ───────── Goal ───────── */
export function GoalPanel({ t, run, onClose }) {
  const b = balances(run);
  const bought = run.flags.goalBought === true;
  const pct = bought ? 100 : Math.min(100, Math.round((b.goal / GOAL_COST) * 100));
  const left = Math.max(0, GOAL_COST - b.goal);
  const ending = computeEnding(run);
  const kind = INTERESTS[run.player.interest].goal;
  return (
    <Modal title={t('goal.title')} onClose={onClose} closeLabel={t('ui.close')}>
      <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-900 p-4 text-white">
        <svg viewBox="-70 -70 140 140" className="h-24 w-24 shrink-0" aria-hidden="true"><GoalGlyph kind={kind} x={0} y={0} s={1} /></svg>
        <div>
          <p className="pp-font-display text-xl font-extrabold">{t(`item.${kind}`)}</p>
          <p className="text-violet-100">{money(GOAL_COST)}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-4 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('hud.goal')}>
          <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 font-extrabold">{bought ? t('goal.done') : `${t('hud.goalOf', { have: b.goal, cost: GOAL_COST })} · ${t('goal.left', { left })}`}</p>
        {!bought && <p className="mt-1 text-sm text-slate-600">{ending.weeksToGoal && b.goal > 0 ? t('goal.jarSays', { weeks: ending.weeksToGoal }) : t('goal.unknownPace')}</p>}
      </div>
    </Modal>
  );
}

/* ───────── Wallet + receipt ───────── */
export function WalletPanel({ t, run, onClose }) {
  const b = balances(run);
  const txs = [...run.ledger.transactions].reverse();
  const cards = [
    ['hud.wallet', b.cash, 'bg-emerald-900 text-emerald-50'],
    ['hud.safety', b.savings, 'bg-teal-500 text-teal-950'],
    ['hud.goal', b.goal, 'bg-violet-600 text-white'],
  ];
  return (
    <Modal title={t('hud.wallet')} onClose={onClose} closeLabel={t('ui.close')}>
      <div className="grid grid-cols-3 gap-2">
        {cards.map(([k, v, c]) => (
          <div key={k} className={`rounded-2xl p-3 ${c}`}><p className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">{t(k)}</p><p className="pp-font-display text-lg font-extrabold tabular-nums sm:text-xl">{money(v)}</p></div>
        ))}
      </div>
      {b.debt > 0 && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">{t('hud.owe')}: {money(b.debt)}</p>}
      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">{t('ui.receipt')}</h3>
      {txs.length ? (
        <ul className="mt-1 divide-y divide-slate-200">
          {txs.map((x) => {
            const out = x.type === 'expense' || x.type === 'loss' || x.type === 'repay';
            return (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">{t(x.description)}<span className="ml-1 text-xs text-slate-400">· {x.type === 'transfer' ? '⇄' : ''}</span></span>
                <span className={`shrink-0 font-extrabold tabular-nums ${x.type === 'transfer' ? 'text-violet-700' : out ? 'text-rose-700' : 'text-teal-700'}`}>{x.type === 'transfer' ? '' : out ? '−' : '+'}{money(x.amount)}</span>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-slate-500">{t('ui.noTx')}</p>}
    </Modal>
  );
}

/* ───────── Settings ───────── */
export function SettingsPanel({ t, settings, update, onClose, onReset }) {
  const [confirm, setConfirm] = useState(false);
  const Toggle = ({ k, label, desc }) => (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <span><span className="block font-bold">{label}</span>{desc && <span className="block text-sm text-slate-600">{desc}</span>}</span>
      <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-violet-600" checked={settings[k]} onChange={(e) => update({ [k]: e.target.checked })} />
    </label>
  );
  return (
    <Modal title={t('set.title')} onClose={onClose} closeLabel={t('ui.close')}>
      <div className="space-y-2">
        <Toggle k="focus" label={t('set.focus')} desc={t('set.focus.d')} />
        <Toggle k="reduceMotion" label={t('set.motion')} desc={t('set.motion.d')} />
        <Toggle k="shortDialogue" label={t('set.short')} desc={t('set.short.d')} />
        <Toggle k="autoHints" label={t('set.hints')} desc={t('set.hints.d')} />
        <Toggle k="sound" label={t('set.sound')} />
        <label className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <Volume2 size={18} aria-hidden="true" />
          <span className="font-bold">{t('set.volume')}</span>
          <input type="range" min="0" max="100" step="5" value={Math.round(settings.volume * 100)} disabled={!settings.sound}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })} className="flex-1 accent-violet-600" aria-valuetext={`${Math.round(settings.volume * 100)}%`} />
        </label>
        <Toggle k="captions" label={t('set.captions')} desc={t('set.captions.d')} />
        <fieldset className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <legend className="sr-only">{t('set.text')}</legend>
          <p className="font-bold">{t('set.text')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {['n', 'l', 'xl'].map((s) => (
              <button key={s} type="button" aria-pressed={settings.textSize === s} onClick={() => update({ textSize: s })}
                className={`${focusRing} rounded-xl border-2 py-2 font-bold ${settings.textSize === s ? 'border-violet-600 bg-violet-50' : 'border-slate-200'}`}
                style={{ fontSize: s === 'n' ? 14 : s === 'l' ? 16 : 18 }}>{t(`set.text.${s}`)}</button>
            ))}
          </div>
        </fieldset>
        <p className="rounded-2xl bg-violet-50 p-3 text-sm text-violet-950">{t('set.keys')}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => (confirm ? onReset() : setConfirm(true))} className={`${focusRing} rounded-xl px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50`}>{confirm ? t('set.resetConfirm') : t('set.reset')}</button>
        <button type="button" onClick={onClose} className={btn.primary}>{t('set.done')}</button>
      </div>
    </Modal>
  );
}

/* ───────── Pause menu ───────── */
export function PausePanel({ t, lang, setLang, onResume, onSettings, onRestart, onTitle, onLearn, onVoice, onAudioMode, onNgo }) {
  const langs = [['en', 'English'], ['hi', 'हिन्दी'], ['te', 'తెలుగు']];
  return (
    <Modal title={t('ui.paused')} onClose={onResume} dark closeLabel={t('ui.resume')}>
      <div className="grid gap-2">
        <button type="button" onClick={onResume} className={btn.mint}><Play size={18} aria-hidden="true" /> {t('ui.resume')}</button>
        <button type="button" onClick={onSettings} className={btn.ghost}><SettingsIcon size={18} aria-hidden="true" /> {t('ui.settings')}</button>
      </div>
      <fieldset className="mt-4">
        <legend className="text-xs font-extrabold uppercase tracking-widest text-white/60">{t('ui.language')}</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {langs.map(([code, label]) => (
            <button key={code} type="button" lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}
              className={`${focusRing} rounded-xl py-2 font-bold ${lang === code ? 'bg-violet-500 text-white' : 'bg-white/10 hover:bg-white/15'}`}>{label}</button>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-white/60">{t('ui.otherModes')}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onLearn} className={btn.ghost}><BookOpen size={18} aria-hidden="true" /> {t('title.learn')}</button>
        <button type="button" onClick={onVoice} className={btn.ghost}><Mic size={18} aria-hidden="true" /> {t('ui.voice')}</button>
        <button type="button" onClick={onAudioMode} className={btn.ghost}><Eye size={18} aria-hidden="true" /> {t('ui.audioMode')}</button>
        <button type="button" onClick={onNgo} className={btn.ghost}><Users size={18} aria-hidden="true" /> {t('ui.ngo')}</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button type="button" onClick={onRestart} className={`${focusRing} inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10`}><RotateCcw size={16} aria-hidden="true" /> {t('ui.restartWeek')}</button>
        <button type="button" onClick={onTitle} className={`${focusRing} inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10`}><LogOut size={16} aria-hidden="true" /> {t('ui.quit')}</button>
      </div>
    </Modal>
  );
}

/* ───────── Ask Akka ───────── */
export function HintPanel({ t, run, onClose, onVoice }) {
  const ev = currentEvent(run);
  const text = ev ? t(ev.hint) : t(`idle.akka.${run.day}`);
  return (
    <Modal title={t('ui.hintTitle')} onClose={onClose} closeLabel={t('ui.close')}>
      <div className="flex items-end gap-3">
        <div className="shrink-0 overflow-hidden rounded-2xl bg-teal-100"><Portrait look={CAST.akka} mood="happy" size={70} /></div>
        <p className="rounded-2xl rounded-bl-md bg-white p-3 font-medium shadow-sm ring-1 ring-slate-200">{text}</p>
      </div>
      {ev && <p className="mt-3 text-sm text-slate-600">{t('hud.next', { what: t(ev.short) })}</p>}
      <div className="mt-4 rounded-2xl bg-violet-50 p-3">
        <button type="button" onClick={onVoice} className={`${btn.light} w-full`}><Mic size={18} aria-hidden="true" /> {t('ui.voice')}</button>
        <p className="mt-1.5 text-xs text-violet-900">{t('ui.voiceNote')}</p>
      </div>
    </Modal>
  );
}

/* ───────── Something you looked at ───────── */
export function InspectBubble({ text, who, t, onClose }) {
  const look = who ? CAST[who] : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 sm:p-4" role="status">
      <div className="pp-rise flex w-full max-w-xl items-end gap-3 rounded-3xl bg-[#fffaf2] p-3 text-slate-900 shadow-2xl ring-1 ring-black/5">
        {look && <div className="shrink-0 overflow-hidden rounded-2xl bg-teal-100"><Portrait look={look} mood="happy" size={52} /></div>}
        <p className="min-w-0 flex-1 py-1 text-[15px] font-medium leading-relaxed">{text}</p>
        <button type="button" autoFocus onClick={onClose} className={`${btn.light} shrink-0 px-3`}>{t('ui.close')}</button>
      </div>
    </div>
  );
}

