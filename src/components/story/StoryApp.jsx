import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { Map as MapIcon, Smartphone, Lightbulb, Menu, Moon, ChevronRight, Wallet, PiggyBank, Target, Sparkles, X } from 'lucide-react';
import { useStory } from '../../lifemode/story/useStory.js';
import {
  beginWeek, travel, endDay, rewind, markRead, currentEvent, balances, goalPct, unreadCount,
} from '../../lifemode/story/engine.js';
import { DAYS, EVENT_BY_ID, INTERESTS, GOAL_COST } from '../../lifemode/story/content.js';
import { makeT } from '../../lifemode/story/text.js';
import { HomeScene, HangoutScene, MarketScene, HOTSPOTS } from './art/scenes.jsx';
import { playerLook } from './art/Person.jsx';
import EventDialog, { ShopItems } from './EventDialog.jsx';
import { MapPanel, PhonePanel, CalendarPanel, GoalPanel, WalletPanel, SettingsPanel, PausePanel, HintPanel, InspectBubble } from './Panels.jsx';
import Title from './Title.jsx';
import Ending from './Ending.jsx';
import { useSettings } from './settings.js';
import { play } from './sound.js';
import { Modal, btn, focusRing, money } from './ui.jsx';

const FONT = { n: '', l: '112.5%', xl: '125%' };

function baseMood(m) {
  if (m >= 72) return 'happy';
  if (m < 40) return 'worried';
  return 'neutral';
}

/**
 * PaisaPath's main experience: a week of a teenager's life in a small illustrated world.
 * All rules and money live in src/lifemode/story (engine) on top of the Life Mode ledger;
 * this component renders the authoritative state and turns taps into engine calls.
 */
export default function StoryApp({ lang, setLang, onLearn, onSeason, onAudioMode, onVoice, onNgo }) {
  const game = useStory();
  const { gs, dispatch } = game;
  const run = gs.run;
  const [settings, updateSettings] = useSettings();
  const [atTitle, setAtTitle] = useState(true);
  const [panel, setPanel] = useState(null);
  const [openEvent, setOpenEvent] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dayCard, setDayCard] = useState(null);
  const [live, setLive] = useState('');
  const [sceneLine, setSceneLine] = useState(null);
  const calm = settings.focus || settings.reduceMotion;

  const b = run ? balances(run) : null;
  const t = useMemo(
    () => makeT(lang, run ? { interest: run.player.interest, name: run.player.name, ...b, left: Math.max(0, GOAL_COST - b.goal) } : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, run?.player.interest, run?.player.name, b?.cash, b?.savings, b?.goal, b?.debt],
  );

  // Text size applies to the whole page while the world is open.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.fontSize;
    el.style.fontSize = FONT[settings.textSize];
    return () => { el.style.fontSize = prev; };
  }, [settings.textSize]);


  const toast = useCallback((item) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts.slice(-3), { id, ...item }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3200);
  }, []);

  const sound = useCallback((name) => {
    if (settings.sound) play(name, settings.volume);
    if (settings.captions && settings.sound) toast({ kind: 'caption', text: t(`snd.${name}`) });
  }, [settings.sound, settings.volume, settings.captions, toast, t]);

  // Turn engine events into sound, captions, toasts and announcements.
  useEffect(() => {
    if (!game.events.length) return;
    let sfx = null;
    let aura = 0;
    for (const ev of game.events) {
      if (ev.type === 'tx') {
        const k = ev.tx.type;
        sfx = k === 'loss' ? 'oops' : k === 'expense' || k === 'repay' ? sfx ?? 'spend' : sfx ?? 'coin';
      }
      if (ev.type === 'memory') { toast({ kind: 'memory', text: `${t('ui.memory')}: ${t(`mem.${ev.id}`)}` }); sfx = sfx === 'oops' ? sfx : 'win'; }
      if (ev.type === 'aura') aura += ev.amount;
      if (ev.type === 'unlock') toast({ kind: 'unlock', text: t('ui.newPlace', { place: t(`loc.${ev.location}`) }) });
      if (ev.type === 'day') setDayCard(ev.day);
    }
    if (aura > 0) toast({ kind: 'aura', text: t('ui.aura', { n: aura }) });
    if (sfx) sound(sfx);
    if (run) {
      const bb = balances(run);
      setLive(t('live.money', { cash: bb.cash, savings: bb.savings, goal: bb.goal }));
    }
    game.consumeEvents();
  }, [game.events]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dayCard === null) return undefined;
    const id = setTimeout(() => setDayCard(null), settings.reduceMotion ? 1400 : 2200);
    return () => clearTimeout(id);
  }, [dayCard, settings.reduceMotion]);

  const event = run ? currentEvent(run) : null;
  const shownEvent = openEvent ? EVENT_BY_ID.get(openEvent) : null;

  const openStory = useCallback((e) => {
    if (!e) return;
    if (e.hotspot !== 'phone' && run.location !== e.location) {
      dispatch(travel, e.location);
      sound('step');
    }
    setPanel(null);
    setInspect(null);
    setOpenEvent(e.id);
  }, [run, dispatch, sound]);

  const closeEvent = useCallback(() => { setOpenEvent(null); setSceneLine(null); }, []);

  const goTo = (loc) => {
    dispatch(travel, loc);
    setPanel(null);
    if (run.location !== loc) sound('step');
  };

  const sleep = () => {
    setInspect(null);
    dispatch(endDay);
  };

  const onHotspot = (id) => {
    setInspect(null);
    if (event && event.location === run.location && event.hotspot === id) return openStory(event);
    if (event && event.hotspot === 'phone' && id === 'phone') return openStory(event);
    const day = run.day;
    const f = run.flags;
    switch (id) {
      case 'phone': return setPanel('phone');
      case 'calendar': return setPanel('calendar');
      case 'goal': return setPanel('goal');
      case 'jars': case 'desk': return setPanel('wallet');
      case 'laptop': return setInspect({ text: t('obj.laptop.idle') });
      case 'hobby': return setInspect({ text: t(`obj.hobby.${run.player.interest}`) });
      case 'bed': return event ? setInspect({ text: t('obj.bed.early') }) : sleep();
      case 'cycle': return setInspect({ text: t(f.cycleBroken ? 'obj.cycle.broken' : f.repair && f.repair !== 'later' ? 'obj.cycle.fixed' : 'obj.cycle.ok') });
      case 'akka': return setInspect({ who: 'akka', text: t(`idle.akka.${day}`) });
      case 'zoya': return setInspect({ who: 'zoya', text: t(f.outing === 'skip' && day >= 2 ? 'idle.zoya.skip' : 'idle.zoya') });
      case 'arjun': return setInspect({ who: 'arjun', text: t('idle.arjun') });
      case 'notice': return setInspect({ text: t('obj.notice') });
      case 'chai': return setInspect({ text: t('obj.chai') });
      case 'banner': return setInspect({ text: t('obj.banner') });
      case 'shop': return day < 2 ? setInspect({ who: 'raju', text: t('obj.shop.closed') }) : setPanel('shop');
      case 'aunty': return setInspect({ who: 'aunty', text: t('obj.aunty.idle') });
      default: return undefined;
    }
  };

  // Keyboard: Esc pauses (or closes), M map, P phone.
  useEffect(() => {
    if (atTitle || !run || run.status !== 'playing') return undefined;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (inspect) setInspect(null);
        else if (openEvent) closeEvent();
        else if (!panel) setPanel('pause');
      }
      if (panel || openEvent) return;
      if (e.key === 'm' || e.key === 'M') setPanel('map');
      if (e.key === 'p' || e.key === 'P') setPanel('phone');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atTitle, run, panel, openEvent, inspect, closeEvent]);

  const startWeek = (player) => {
    dispatch((s) => beginWeek(s, player));
    setAtTitle(false);
    setPanel(null);
    setOpenEvent(null);
    setDayCard(0);
  };

  const rootCls = `pp-world ${settings.reduceMotion ? 'pp-reduce' : ''} ${panel === 'pause' ? 'pp-paused' : ''}`;
  const motionMode = settings.reduceMotion ? 'always' : 'user';
  const notice = game.notice || (game.error && !game.error.includes(' ') ? game.error : null);

  if (atTitle || !run) {
    return (
      <MotionConfig reducedMotion={motionMode}>
        <div className={rootCls}>
          <SrIntro />
          <Title t={t} gs={gs} lang={lang} setLang={setLang} calm={calm}
            onStart={startWeek} onContinue={() => setAtTitle(false)} onLearn={onLearn} onSeason={onSeason} />
          {notice && <Notice text={t(notice)} closeLabel={t('ui.close')} onClose={game.dismiss} />}
        </div>
      </MotionConfig>
    );
  }

  const look = playerLook(run.player.look);

  if (run.status === 'ended') {
    return (
      <MotionConfig reducedMotion={motionMode}>
        <div className={rootCls}>
          <Ending t={t} gs={gs} look={look} calm={calm}
            onRewind={(day) => { dispatch(rewind, day); setDayCard(day); }}
            onNewWeek={() => startWeek(run.player)} onSeason={onSeason} onLearn={onLearn} />
          <Toasts toasts={toasts} />
        </div>
      </MotionConfig>
    );
  }

  const i = INTERESTS[run.player.interest];
  const speaking = sceneLine;
  const moodFor = (who, fallback) => (speaking && speaking.who === who ? speaking.mood ?? fallback : fallback);
  const sceneProps = {
    day: run.day, look, calm,
    mood: moodFor('you', baseMood(run.mood)),
    memories: run.memories,
    jarFill: Math.min(1, b.goal / GOAL_COST),
    safetyFill: Math.min(1, b.savings / 50000),
    goalKind: i.goal, goalPct: goalPct(run), goalBought: run.flags.goalBought === true,
    dealBought: run.flags.bought === 'deal', soldDeal: run.flags.bought === 'deal',
    cycle: run.flags.cycleBroken ? 'broken' : 'ok',
    unread: unreadCount(run),
    akkaMood: moodFor('akka', 'happy'), zoyaMood: moodFor('zoya', 'happy'), arjunMood: moodFor('arjun', 'neutral'),
    rajuMood: moodFor('raju', 'happy'), auntyMood: moodFor('aunty', 'happy'),
    plantHappy: run.mood >= 50,
    showFriends: true,
    dealGlyph: i.dealEmoji, altGlyph: i.altEmoji,
    dayIndexLabel: t(`day.short.${DAYS[run.day]}`).toUpperCase(),
  };
  const Scene = { home: HomeScene, hangout: HangoutScene, market: MarketScene }[run.location];
  const storyHere = event && event.hotspot !== 'phone' && event.location === run.location ? event.hotspot : event?.hotspot === 'phone' && run.location === 'home' ? 'phone' : null;

  return (
    <MotionConfig reducedMotion={motionMode}>
      <div className={`${rootCls} min-h-screen bg-[#140d2b] text-white`}>
        <SrIntro />
        <Hud t={t} run={run} b={b} aura={gs.profile.aura} onPanel={setPanel} calm={settings.focus} />

        <main className="mx-auto w-full max-w-[1280px] md:px-4">
          <div className="relative mx-auto overflow-hidden shadow-2xl shadow-black/40 md:rounded-[28px] md:ring-1 md:ring-white/10" style={{ maxWidth: shownEvent ? 'calc(40vh * 16 / 9)' : 'calc((100vh - 220px) * 16 / 9)', transition: calm ? undefined : 'max-width 0.35s ease' }}>
            <div className="pp-stage">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={run.location} className="pp-stage-inner" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                  <Scene s={sceneProps} />
                  {HOTSPOTS[run.location].map((h) => (
                    <Hotspot key={h.id} h={h} label={t(`hs.${h.id}`)} story={storyHere === h.id} onClick={() => onHotspot(h.id)} disabled={!!openEvent} />
                  ))}
                </motion.div>
              </AnimatePresence>
              <div className="pointer-events-none absolute left-3 top-3 rounded-2xl bg-[#140d2b]/75 px-3 py-1.5 backdrop-blur" aria-live="polite">
                <p className="pp-font-display text-sm font-extrabold leading-tight md:text-base">{t(`loc.${run.location}`)}</p>
                <p className="text-[11px] font-semibold text-white/70">{t(`loc.${run.location}.sub`)}</p>
              </div>
              {settings.focus && openEvent && <div className="absolute inset-0 bg-[#140d2b]/45" aria-hidden="true" />}
            </div>
          </div>

          {shownEvent ? (
            <EventDialog key={shownEvent.id} event={shownEvent} run={run} profile={gs.profile} t={t} dispatch={dispatch} settings={settings}
              look={look} onClose={closeEvent} onLine={setSceneLine} onSound={sound} />
          ) : (
            <NextBar t={t} run={run} event={event} onNext={() => openStory(event)} onSleep={sleep} onMap={() => setPanel('map')} />
          )}
        </main>

        <p className="sr-only" aria-live="polite">{live}</p>

        {inspect && <InspectBubble text={inspect.text} who={inspect.who} t={t} onClose={() => setInspect(null)} />}

        {panel === 'map' && <MapPanel t={t} run={run} onGo={goTo} onClose={() => setPanel(null)} />}
        {panel === 'phone' && <PhonePanel t={t} run={run} onClose={() => setPanel(null)} onRead={(ids) => dispatch(markRead, ids)} onRespond={(id) => openStory(EVENT_BY_ID.get(id))} />}
        {panel === 'calendar' && <CalendarPanel t={t} run={run} onClose={() => setPanel(null)} />}
        {panel === 'goal' && <GoalPanel t={t} run={run} onClose={() => setPanel(null)} />}
        {panel === 'wallet' && <WalletPanel t={t} run={run} onClose={() => setPanel(null)} />}
        {panel === 'hint' && <HintPanel t={t} run={run} onClose={() => setPanel(null)} onVoice={onVoice} />}
        {panel === 'settings' && <SettingsPanel t={t} settings={settings} update={updateSettings} onClose={() => setPanel(null)} onReset={() => { game.resetAll(); setPanel(null); setAtTitle(true); }} />}
        {panel === 'shop' && (
          <Modal title={t('shop.title')} onClose={() => setPanel(null)} closeLabel={t('shop.close')}>
            <p className="mb-3 text-sm font-semibold text-slate-600">{t('obj.shop.browse')}</p>
            <ShopItems t={t} run={run} />
          </Modal>
        )}
        {panel === 'pause' && (
          <PausePanel t={t} lang={lang} setLang={setLang}
            onResume={() => setPanel(null)} onSettings={() => setPanel('settings')}
            onRestart={() => startWeek(run.player)} onTitle={() => { setPanel(null); setAtTitle(true); }}
            onLearn={onLearn} onVoice={onVoice} onAudioMode={onAudioMode} onNgo={onNgo} />
        )}

        <AnimatePresence>
          {dayCard !== null && (
            <motion.button type="button" key={`day-${dayCard}`} onClick={() => setDayCard(null)}
              className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#140d2b]/92 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <span className="text-sm font-extrabold uppercase tracking-[0.35em] text-teal-300">{t(`day.${DAYS[dayCard]}`)}</span>
              <span className="pp-font-display mt-2 text-5xl font-extrabold md:text-7xl">{t(`chapter.${DAYS[dayCard]}`)}</span>
              <span className="mt-6 flex gap-1.5" aria-hidden="true">{DAYS.map((d, k) => <span key={d} className={`h-1.5 w-8 rounded-full ${k <= dayCard ? 'bg-teal-300' : 'bg-white/15'}`} />)}</span>
            </motion.button>
          )}
        </AnimatePresence>

        <Toasts toasts={toasts} />
        {notice && <Notice text={t(notice)} closeLabel={t('ui.close')} onClose={game.dismiss} />}
      </div>
    </MotionConfig>
  );
}

function SrIntro() {
  return <div className="sr-only" role="note">PaisaPath. If you are visually impaired, press the Spacebar on the page background, or open the menu, to enter the fully accessible Audio Mode.</div>;
}

function Hotspot({ h, label, story, onClick, disabled }) {
  const style = { left: `${(h.x / 1600) * 100}%`, top: `${(h.y / 900) * 100}%`, width: `${(h.w / 1600) * 100}%`, height: `${(h.h / 900) * 100}%` };
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} style={style}
      className={`group absolute rounded-2xl outline-none transition ${story ? 'ring-4 ring-amber-300/80' : 'hover:bg-white/10 hover:ring-4 hover:ring-white/60'} focus-visible:bg-white/10 focus-visible:ring-4 focus-visible:ring-amber-300`}>
      {story && (
        <span className="pp-marker pointer-events-none absolute -top-9 left-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-lg font-black text-amber-950 shadow-lg md:-top-11 md:h-10 md:w-10" aria-hidden="true">!</span>
      )}
      <span className="pointer-events-none absolute -bottom-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[#140d2b]/85 px-2.5 py-1 text-xs font-bold text-white group-hover:inline-block group-focus-visible:inline-block">{label}</span>
    </button>
  );
}

function Pill({ icon: Icon, label, value, onClick, tone, sub }) {
  const prev = useRef(value);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    if (prev.current !== value) { setDelta(value - prev.current); prev.current = value; const id = setTimeout(() => setDelta(0), 1600); return () => clearTimeout(id); }
    return undefined;
  }, [value]);
  return (
    <button type="button" onClick={onClick} className={`${focusRing} relative flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl px-3 py-1.5 text-left ${tone}`} aria-label={`${label}: ${money(value)}${sub ? `, ${sub}` : ''}`}>
      <Icon size={18} aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80">{label}</span>
        <span className="pp-font-display block text-base font-extrabold tabular-nums">{money(value)}</span>
      </span>
      <AnimatePresence>
        {delta !== 0 && (
          <motion.span key={delta} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: -2 }} exit={{ opacity: 0, y: -14 }}
            className={`absolute -top-3 right-1 rounded-full px-1.5 text-[11px] font-black ${delta > 0 ? 'bg-teal-300 text-teal-950' : 'bg-rose-400 text-rose-950'}`} aria-hidden="true">
            {delta > 0 ? '+' : '−'}{money(Math.abs(delta))}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function Hud({ t, run, b, aura, onPanel, calm }) {
  const pct = goalPct(run);
  const unread = unreadCount(run);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#140d2b]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-3 py-2 md:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.2em] text-teal-300">{t(`day.${DAYS[run.day]}`)}</p>
          <p className="pp-font-display truncate text-sm font-extrabold md:text-lg">{t(`chapter.${DAYS[run.day]}`)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <Pill icon={Wallet} label={t('hud.wallet')} value={b.cash} onClick={() => onPanel('wallet')} tone="bg-emerald-900/80 text-emerald-50 hover:bg-emerald-800" />
          <span className="hidden sm:contents">
            <Pill icon={PiggyBank} label={t('hud.safety')} value={b.savings} onClick={() => onPanel('wallet')} tone="bg-teal-500/20 text-teal-100 hover:bg-teal-500/30" />
          </span>
          <button type="button" onClick={() => onPanel('goal')} className={`${focusRing} flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl bg-violet-600/30 px-2.5 py-1.5 hover:bg-violet-600/45`} aria-label={`${t('hud.goal')}: ${t('hud.goalOf', { have: b.goal, cost: GOAL_COST })}`}>
            <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#5eead4" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 94.2} 94.2`} style={{ transition: 'stroke-dasharray .6s' }} />
            </svg>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-violet-200">{t('hud.goal')}</span>
              <span className="pp-font-display block text-sm font-extrabold tabular-nums">{money(b.goal)}</span>
            </span>
          </button>
          {b.debt > 0 && <Pill icon={Target} label={t('hud.owe')} value={b.debt} onClick={() => onPanel('wallet')} tone="bg-rose-500/25 text-rose-100" />}
          {!calm && <span className="hidden items-center gap-1 rounded-2xl bg-amber-300/15 px-2.5 py-2 text-sm font-extrabold text-amber-200 lg:flex" title={t('hud.aura')}><Sparkles size={16} aria-hidden="true" /> <span className="tabular-nums">{aura}</span><span className="sr-only"> {t('hud.aura')}</span></span>}
        </div>
        <nav className="flex shrink-0 items-center gap-1" aria-label={t('hud.menu')}>
          <button type="button" onClick={() => onPanel('map')} className={btn.icon} aria-label={t('hud.map')} title={t('hud.map')}><MapIcon size={20} aria-hidden="true" /></button>
          <button type="button" onClick={() => onPanel('phone')} className={`${btn.icon} relative`} aria-label={`${t('hud.phone')}${unread ? `, ${t('hud.unread', { n: unread })}` : ''}`} title={t('hud.phone')}>
            <Smartphone size={20} aria-hidden="true" />
            {unread > 0 && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-black" aria-hidden="true">{unread}</span>}
          </button>
          <button type="button" onClick={() => onPanel('hint')} className={`${btn.icon} hidden sm:inline-flex`} aria-label={t('hud.hint')} title={t('hud.hint')}><Lightbulb size={20} aria-hidden="true" /></button>
          <button type="button" onClick={() => onPanel('pause')} className={btn.icon} aria-label={t('hud.menu')} title={t('hud.menu')}><Menu size={20} aria-hidden="true" /></button>
        </nav>
      </div>
    </header>
  );
}

function NextBar({ t, run, event, onNext, onSleep, onMap }) {
  const last = run.day === DAYS.length - 1;
  return (
    <div className="mx-auto mt-3 flex max-w-3xl flex-col items-stretch gap-2 px-3 pb-6 sm:flex-row sm:items-center md:px-0">
      {event ? (
        <button type="button" data-next onClick={onNext} className={`${focusRing} group flex flex-1 items-center gap-3 rounded-2xl bg-amber-300 px-4 py-3 text-left text-amber-950 shadow-lg shadow-amber-900/20 hover:bg-amber-200`}>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-950 font-black text-amber-300" aria-hidden="true">!</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-widest opacity-70">{event.hotspot === 'phone' ? t('hud.phone') : t(`loc.${event.location}`)}</span>
            <span className="block font-bold leading-snug">{t(event.short)}</span>
          </span>
          <ChevronRight size={22} className="shrink-0 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      ) : (
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <Moon size={20} className="shrink-0 text-violet-300" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm font-semibold text-white/85">{t('hud.dayDone')}</span>
          <button type="button" data-sleep onClick={onSleep} className={btn.primary}>{last ? t('hud.finish') : t('hud.sleep', { day: t(`day.${DAYS[run.day + 1]}`) })}</button>
        </div>
      )}
      <button type="button" onClick={onMap} className={`${btn.ghost} sm:w-auto`}><MapIcon size={18} aria-hidden="true" /> {t('hud.map')}</button>
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[90] flex w-64 flex-col items-end gap-2" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={`pp-rise rounded-2xl px-3 py-2 text-sm font-bold shadow-lg ${x.kind === 'caption' ? 'bg-black/75 text-white/90 italic' : x.kind === 'aura' ? 'bg-amber-300 text-amber-950' : x.kind === 'unlock' ? 'bg-teal-300 text-teal-950' : 'bg-violet-200 text-violet-950'}`}>
          {x.kind === 'memory' ? '📸 ' : x.kind === 'aura' ? '✨ ' : x.kind === 'unlock' ? '🗺️ ' : ''}{x.text}
        </div>
      ))}
    </div>
  );
}

function Notice({ text, closeLabel, onClose }) {
  return (
    <div role="alert" className="fixed inset-x-3 top-20 z-[95] mx-auto flex max-w-md items-start justify-between gap-3 rounded-2xl bg-amber-100 p-3 text-sm font-bold text-amber-950 shadow-xl">
      <span>{text}</span>
      <button type="button" onClick={onClose} className={`${focusRing} rounded`} aria-label={closeLabel}><X size={16} aria-hidden="true" /></button>
    </div>
  );
}
