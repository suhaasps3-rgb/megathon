import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Gamepad2, Box, Mic, Eye, Sparkles, KeyRound } from 'lucide-react';
import Mascot from './brand/Mascot.jsx';
import { fill } from '../data/translations.js';
import { readProgress } from '../services/progress.js';
import { projectSavings, BIKE_PRICE, SAVE_AMOUNT } from '../neighborhood/economy.js';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function greetingFor(t, hour = new Date().getHours()) {
  if (hour < 12) return t.greetMorning;
  if (hour < 17) return t.greetAfternoon;
  return t.greetEvening;
}

/**
 * Landing page. Shows the core idea (a choice and its future), the three ways to play with
 * real saved progress, and the optional AI connection.
 */
export default function Home({ t, profile, hasAi, canEditKey, onSetKey, onLearn, onLife, on3d, onMentor, onAudio }) {
  const progress = useMemo(() => readProgress(), []);
  const greeting = greetingFor(t);

  const lifeStatus = progress.life
    ? [fill(t.progressLevel, { n: progress.life.level }), progress.life.runsCompleted ? fill(t.progressRuns, { n: progress.life.runsCompleted }) : null].filter(Boolean).join(' · ')
    : null;
  const worldStatus = progress.world.started
    ? [progress.world.done ? t.progressMissionDone : fill(t.progressMission, { n: progress.world.step }), fill(t.progressCash, { v: inr(progress.world.cash) })].join(' · ')
    : null;

  const modes = [
    {
      key: 'learn', title: t.modeLearnTitle, desc: t.modeLearnDesc, icon: BookOpen, tone: 'bg-purple-100 text-purple-700',
      status: profile ? profile.name : null, resume: Boolean(profile), onClick: onLearn,
    },
    {
      key: 'life', title: t.lifeMode, desc: t.modeLifeDesc, icon: Gamepad2, tone: 'bg-teal-100 text-teal-700',
      status: lifeStatus, resume: Boolean(progress.life?.inProgress), onClick: onLife,
    },
    {
      key: 'world', title: t.nav3d, desc: t.mode3dDesc, icon: Box, tone: 'bg-saffron-100 text-saffron-800',
      status: worldStatus, resume: progress.world.started && !progress.world.done, onClick: on3d,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <p className="eyebrow">{profile?.name ? `${greeting}, ${profile.name}` : greeting}</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">{t.homeTitle}</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">{t.homeSub}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onLearn} className="btn-brand px-6 text-base">
              {profile ? t.homeContinue : t.homeStart} <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={on3d} className="btn-secondary">
              <Box size={18} aria-hidden="true" /> {t.homeExplore}
            </button>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2">
            {[t.pillarBudget, t.pillarSave, t.pillarInvest, t.pillarSafe].map((p, i) => (
              <li key={p} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700">
                <span className={`h-2 w-2 rounded-full ${['bg-purple-500', 'bg-teal-500', 'bg-saffron-400', 'bg-rose-400'][i]}`} aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </motion.div>

        <HeroChoice t={t} />
      </section>

      <section aria-labelledby="modes-heading" className="mt-14">
        <h2 id="modes-heading" className="text-xl font-extrabold text-ink-900">{t.homeModes}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {modes.map((m) => (
            <button key={m.key} type="button" onClick={m.onClick} className="card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${m.tone}`}>
                <m.icon size={22} aria-hidden="true" />
              </span>
              <span className="mt-4 font-display text-lg font-extrabold text-ink-900">{m.title}</span>
              <span className="mt-1 text-sm leading-relaxed text-slate-600">{m.desc}</span>
              {m.status && <span className="mt-3 text-xs font-bold text-teal-700">{m.status}</span>}
              <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-bold text-purple-700">
                {m.resume ? t.modeResume : t.modeNew}
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="more-heading" className="mt-8">
        <h2 id="more-heading" className="sr-only">{t.homeMore}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" onClick={onMentor} className="card group flex items-center gap-4 p-5 text-left transition hover:shadow-lift">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white"><Mic size={22} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block font-display font-extrabold text-ink-900">{t.mentorCta}</span>
              <span className="block text-sm text-slate-600">{t.mentorCtaDesc}</span>
            </span>
            <ArrowRight size={18} className="ml-auto shrink-0 text-purple-700 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onAudio} className="card group flex items-center gap-4 p-5 text-left transition hover:shadow-lift">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-saffron-300 text-ink-900"><Eye size={22} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block font-display font-extrabold text-ink-900">{t.audioMode}</span>
              <span className="block text-sm text-slate-600">{t.audioCtaDesc}</span>
            </span>
            <ArrowRight size={18} className="ml-auto shrink-0 text-purple-700 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>
        {canEditKey && <AiConnection t={t} hasAi={hasAi} onSetKey={onSetKey} />}
      </section>
    </div>
  );
}

/** The core mechanic in one picture: a choice now, and what it becomes later. */
function HeroChoice({ t }) {
  const years = Array.from({ length: 11 }, (_, i) => projectSavings(SAVE_AMOUNT, i));
  const max = years[years.length - 1];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative mx-auto w-full max-w-md"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-purple-300/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-teal-300/40 blur-3xl" aria-hidden="true" />
      <figure className="card relative p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Mascot size={56} mood="think" />
          <div>
            <figcaption className="font-display text-lg font-extrabold text-ink-900">{t.heroQ}</figcaption>
            <span className="tag-sim mt-1">{t.simulated}</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="font-bold text-slate-700">{t.heroBuy}</span>
            <span className="font-extrabold tabular-nums text-rose-600">−{inr(BIKE_PRICE)}</span>
          </div>
          <div className="rounded-2xl border-2 border-teal-500 bg-teal-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-teal-900">{t.heroSave}</span>
              <span className="font-extrabold tabular-nums text-teal-700">{fill(t.heroAt30, { v: inr(max) })}</span>
            </div>
            <div className="mt-3 flex h-16 items-end gap-1" aria-hidden="true">
              {years.map((v, i) => (
                <motion.span
                  key={i}
                  className="flex-1 rounded-t-md bg-teal-500"
                  style={{ opacity: 0.45 + (0.55 * i) / years.length }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(v / max) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.04 }}
                />
              ))}
            </div>
          </div>
        </div>
      </figure>
    </motion.div>
  );
}

function AiConnection({ t, hasAi, onSetKey }) {
  const [key, setKey] = useState('');
  return (
    <div className="card mt-4 flex flex-col gap-4 p-5 md:flex-row md:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700"><Sparkles size={22} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-display font-extrabold text-ink-900">
          {t.aiTitle}
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${hasAi ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>{hasAi ? t.aiOn : t.aiOff}</span>
        </p>
        <p className="text-sm text-slate-600">{t.aiDesc}</p>
      </div>
      {hasAi ? (
        <button type="button" onClick={() => onSetKey('')} className="btn-secondary">{t.aiDisconnect}</button>
      ) : (
        <form
          className="flex w-full flex-col gap-2 sm:flex-row md:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) onSetKey(key.trim());
            setKey('');
          }}
        >
          <label className="relative block">
            <span className="sr-only">{t.setupKeyLabel}</span>
            <KeyRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              placeholder={t.setupKeyLabel}
              aria-describedby="ai-key-help"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 font-mono text-sm outline-none transition focus:border-purple-500 focus:bg-white sm:w-64"
            />
          </label>
          <button type="submit" disabled={!key.trim()} className="btn-primary">{t.aiConnect}</button>
          <span id="ai-key-help" className="sr-only">{t.aiKeyHelp}</span>
        </form>
      )}
    </div>
  );
}
