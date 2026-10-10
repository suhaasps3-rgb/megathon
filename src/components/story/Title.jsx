import React, { useState } from 'react';
import { Music, Gamepad2, Trophy, Palette, Cpu, Play, ArrowRight, BookOpen, Lock, Sparkles } from 'lucide-react';
import Person, { SKINS, TOPS, HAIRS, playerLook, CAST } from './art/Person.jsx';
import { Sky, Skyline, Cloud, StringLights } from './art/props.jsx';
import { btn, focusRing } from './ui.jsx';
import { INTEREST_IDS, DAYS } from '../../lifemode/story/content.js';

const INTEREST_ICON = { music: Music, gaming: Gamepad2, sports: Trophy, art: Palette, tech: Cpu };

/** Title screen and the quick, skippable character setup. */
export default function Title({ t, gs, lang, setLang, onStart, onContinue, onLearn, onSeason, calm }) {
  const run = gs.run;
  const [step, setStep] = useState('title');
  const [name, setName] = useState('');
  const [look, setLook] = useState({ skin: 1, hair: 0, outfit: 0 });
  const [interest, setInterest] = useState('music');
  const canContinue = run && run.status === 'playing';
  const langs = [['en', 'EN'], ['hi', 'हि'], ['te', 'తె']];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#140d2b] text-white">
      {/* backdrop: the city at golden hour */}
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <Sky id="titleSky" day={4} />
        {!calm && <><Cloud x={300} y={160} s={1.2} className="pp-drift" /><Cloud x={1200} y={110} className="pp-drift pp-d2" /></>}
        <circle cx="800" cy="560" r="150" fill="#fb923c" opacity="0.9" />
        <Skyline x={140} y={720} s={2.2} color="#2e1f5e" opacity={0.85} />
        <rect y="700" width="1600" height="200" fill="#140d2b" />
        <StringLights x1={0} x2={1600} y={60} sag={40} n={24} calm={calm} />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-[#140d2b]/10 via-[#140d2b]/30 to-[#140d2b]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-5 md:px-8">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-extrabold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-teal-400 text-lg">₹</span>
            PaisaPath
          </span>
          <div className="flex overflow-hidden rounded-xl bg-white/10" role="group" aria-label={t('ui.language')}>
            {langs.map(([code, label]) => (
              <button key={code} type="button" lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}
                className={`${focusRing} px-3 py-2 text-sm font-bold ${lang === code ? 'bg-violet-500' : 'hover:bg-white/10'}`}>{label}</button>
            ))}
          </div>
        </div>

        {step === 'title' ? (
          <div className="flex flex-1 flex-col items-center justify-end pb-6 text-center md:justify-center">
            <svg viewBox="-260 -330 520 350" className="h-48 w-auto md:h-64" aria-hidden="true">
              <Person x={-150} y={0} s={0.8} look={CAST.zoya} mood="excited" idle={!calm} />
              <Person x={0} y={0} s={0.95} look={playerLook(look)} mood="happy" idle={!calm} />
              <Person x={150} y={0} s={0.8} look={CAST.arjun} mood="smug" flip idle={!calm} />
            </svg>
            <h1 className="pp-font-display mt-2 text-5xl font-extrabold tracking-tight md:text-7xl">
              Paisa<span className="bg-gradient-to-r from-teal-300 to-violet-300 bg-clip-text text-transparent">Path</span>
            </h1>
            <p className="pp-font-display mt-1 text-xl font-semibold text-amber-200 md:text-2xl">{t('title.tagline')}</p>
            <p className="mt-3 max-w-md text-white/80">{t('title.blurb')}</p>
            <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
              {canContinue && (
                <button type="button" onClick={onContinue} className={`${btn.mint} text-lg`}>
                  <Play size={20} aria-hidden="true" /> {t('title.continue', { day: t(`day.${DAYS[run.day]}`) })}
                </button>
              )}
              <button type="button" data-start onClick={() => setStep('setup')} className={`${canContinue ? btn.ghost : `${btn.primary} text-lg`}`}>
                <Sparkles size={20} aria-hidden="true" /> {canContinue || run ? t('title.newWeek') : t('title.start')}
              </button>
              {run && run.status === 'ended' && (
                <button type="button" onClick={onContinue} className={btn.ghost}>{t('end.story')}</button>
              )}
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={onSeason} disabled={!gs.profile.seasonUnlocked} className={`${btn.ghost} text-sm`} title={gs.profile.seasonUnlocked ? undefined : t('title.seasonLocked')}>
                  {gs.profile.seasonUnlocked ? <Sparkles size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />} {gs.profile.seasonUnlocked ? t('title.season') : t('title.seasonLocked')}
                </button>
                <button type="button" onClick={onLearn} className={`${btn.ghost} text-sm`}><BookOpen size={16} aria-hidden="true" /> {t('title.learn')}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-1 flex-col items-center">
            <h1 className="pp-font-display text-3xl font-extrabold md:text-4xl">{t('setup.who')}</h1>
            <div className="mt-4 grid w-full max-w-3xl gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex items-end justify-center rounded-3xl bg-white/5 p-3 ring-1 ring-white/10">
                <svg viewBox="-110 -330 220 340" className="h-56 w-auto" role="img" aria-label={t('setup.look')}>
                  <Person look={playerLook(look)} mood="happy" idle={!calm} />
                </svg>
              </div>
              <div className="space-y-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-white/70">{t('setup.name')}</span>
                  <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder={t('setup.namePh')} autoComplete="off"
                    className="mt-1 w-full rounded-xl border-2 border-white/15 bg-white/10 px-3 py-2.5 font-bold text-white placeholder:text-white/40 focus:border-teal-300 focus:outline-none" />
                </label>
                <Swatches label={t('setup.skin')} values={SKINS} value={look.skin} onPick={(v) => setLook({ ...look, skin: v })} round />
                <Swatches label={t('setup.hair')} values={HAIRS} value={look.hair} onPick={(v) => setLook({ ...look, hair: v })} text />
                <Swatches label={t('setup.outfit')} values={TOPS} value={look.outfit} onPick={(v) => setLook({ ...look, outfit: v })} />
                <fieldset>
                  <legend className="text-xs font-extrabold uppercase tracking-widest text-white/70">{t('setup.interest')}</legend>
                  <p className="text-xs text-white/60">{t('setup.interestWhy')}</p>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {INTEREST_IDS.map((id) => {
                      const Icon = INTEREST_ICON[id];
                      return (
                        <button key={id} type="button" aria-pressed={interest === id} onClick={() => setInterest(id)}
                          className={`${focusRing} flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold sm:text-xs ${interest === id ? 'bg-teal-400 text-teal-950' : 'bg-white/10 hover:bg-white/15'}`}>
                          <Icon size={20} aria-hidden="true" /> {t(`interest.${id}`)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </div>
            <div className="mt-5 flex w-full max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('title')} className={btn.ghost}>{t('setup.back')}</button>
                <button type="button" onClick={() => onStart({})} className={`${btn.ghost} flex-1`}>{t('title.skip')}</button>
              </div>
              <button type="button" data-go onClick={() => onStart({ name, look, interest })} className={`${btn.mint} text-lg`}>{t('setup.go')} <ArrowRight size={20} aria-hidden="true" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Swatches({ label, values, value, onPick, round, text }) {
  return (
    <fieldset>
      <legend className="text-xs font-extrabold uppercase tracking-widest text-white/70">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {values.map((v, k) => (
          <button key={v} type="button" aria-pressed={value === k} aria-label={`${label} ${k + 1}`} onClick={() => onPick(k)}
            className={`${focusRing} h-10 ${text ? 'min-w-[3.5rem] px-2 text-xs font-bold' : 'w-10'} ${round ? 'rounded-full' : 'rounded-xl'} ring-2 ${value === k ? 'ring-teal-300 ring-offset-2 ring-offset-[#1d1538]' : 'ring-white/20'}`}
            style={text ? { background: value === k ? '#5eead4' : 'rgba(255,255,255,0.1)', color: value === k ? '#042f2e' : '#fff' } : { background: v }}>
            {text ? ['✂︎', '➰', '〰', '●'][k] : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
