import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Gamepad2, Trophy, Clapperboard, Music, Monitor, Palette, BookOpen, BarChart3, Image as ImageIcon, Target, Check } from 'lucide-react';
import Mascot from './brand/Mascot';
import StepProgress from './ui/StepProgress';
import translations, { fill } from '../data/translations';

const AVATARS = ['😎', '👩‍💻', '🥷', '🧑‍🎨', '🕵️', '🧑‍🚀'];

// `key` is the translation key for the visible label. The profile still stores the stable `id`.
const INTERESTS = [
  { id: 'gaming', key: 'intGaming', icon: Gamepad2 },
  { id: 'sports', key: 'intSports', icon: Trophy },
  { id: 'movies', key: 'intMovies', icon: Clapperboard },
  { id: 'music', key: 'intMusic', icon: Music },
  { id: 'tech', key: 'intTech', icon: Monitor },
  { id: 'art', key: 'intArt', icon: Palette },
];

const LEARNING_STYLES = [
  { id: 'story', key: 'styStory', descKey: 'styStoryDesc', icon: BookOpen },
  { id: 'analytical', key: 'styAnalytical', descKey: 'styAnalyticalDesc', icon: BarChart3 },
  { id: 'visual', key: 'styVisual', descKey: 'styVisualDesc', icon: ImageIcon },
];

// `label` stays English because later screens use it as the goal's stored name.
const GOALS = [
  { id: 'concert', key: 'goalConcert', label: 'Concert Tickets', cost: 400, icon: '🎵' },
  { id: 'sneakers', key: 'goalSneakers', label: 'Limited Sneakers', cost: 700, icon: '👟' },
  { id: 'setup', key: 'goalSetup', label: 'Gaming/Study Setup', cost: 600, icon: '💻' },
  { id: 'emergency', key: 'goalEmergency', label: 'Safety Net', cost: 500, icon: '🏦' },
];

const NAME_MAX = 30;

export default function Onboarding({ onComplete, t }) {
  const T = { ...translations.en, ...(t || {}) };
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [learningStyle, setLearningStyle] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const headingRef = useRef(null);
  const firstShow = useRef(true);

  // Once a new step has finished appearing, move focus to its heading so keyboard and
  // screen-reader users land in the right place. The first step keeps focus where it is.
  const onStepShown = () => {
    if (firstShow.current) {
      firstShow.current = false;
      return;
    }
    headingRef.current?.focus();
  };

  const toggleInterest = (id) => {
    setSelectedInterests((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const trimmed = name.trim();
  const nameError = nameTouched && !trimmed ? T.onbNameRequired : null;
  const step2Ready = Boolean(learningStyle) && selectedInterests.length > 0;

  const submitName = (e) => {
    e.preventDefault();
    setNameTouched(true);
    if (trimmed) setStep(2);
  };

  const handleStart = () => {
    if (!learningStyle || selectedInterests.length === 0 || !selectedGoal || !trimmed) return;
    onComplete({ name: trimmed, avatar, interests: selectedInterests, learningStyle, goal: selectedGoal });
  };

  const stepNames = [T.onbStepIdentity, T.onbStepVibes, T.onbStepGoal];
  const styleLabel = LEARNING_STYLES.find((s) => s.id === learningStyle);
  const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2 } };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="flex items-center gap-4">
        <Mascot size={56} mood="cheer" />
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">{T.onbTitle}</h1>
          <p className="mt-1 text-slate-600">{T.onbSubtitle}</p>
        </div>
      </div>

      <div className="card mt-6 p-5 sm:p-8">
        <StepProgress steps={stepNames} current={step} template={T.onbStep} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form key="step1" {...enter} onAnimationComplete={onStepShown} onSubmit={submitName} noValidate className="mt-7">
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-ink-900 outline-none">{T.onbIdentity}</h2>

              <div className="mt-5">
                <label htmlFor="onb-name" className="eyebrow">{T.onbNameLabel}</label>
                <input
                  id="onb-name"
                  type="text"
                  value={name}
                  maxLength={NAME_MAX}
                  autoComplete="given-name"
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  placeholder={T.onbNamePlaceholder}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby="onb-name-help"
                  className={`mt-2 h-14 w-full rounded-2xl border-2 bg-slate-50 px-4 text-lg font-bold text-ink-900 outline-none transition focus:bg-white ${
                    nameError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-purple-500'
                  }`}
                />
                <p id="onb-name-help" role={nameError ? 'alert' : undefined} className={`mt-2 text-sm ${nameError ? 'font-bold text-rose-700' : 'text-slate-500'}`}>
                  {nameError || T.onbNameHelp}
                </p>
              </div>

              <fieldset className="mt-6">
                <legend className="eyebrow">{T.onbAvatarLabel}</legend>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {AVATARS.map((a, i) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      aria-pressed={avatar === a}
                      aria-label={fill(T.onbAvatarOption, { n: i + 1 })}
                      className={`flex h-16 items-center justify-center rounded-2xl text-4xl transition active:scale-95 ${
                        avatar === a ? 'bg-purple-100 ring-4 ring-purple-500/30' : 'bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span aria-hidden="true">{a}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-8 flex justify-end">
                <button type="submit" className="btn-brand">
                  {T.onbContinue} <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div key="step2" {...enter} onAnimationComplete={onStepShown} className="mt-7">
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-ink-900 outline-none">{T.onbVibesTitle}</h2>

              <fieldset className="mt-5">
                <legend className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  {T.onbPick1}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{selectedInterests.length}</span>
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {INTERESTS.map(({ id, key, icon: Icon }) => {
                    const on = selectedInterests.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleInterest(id)}
                        aria-pressed={on}
                        className={`choice flex min-h-[88px] flex-col items-center justify-center gap-2 p-4 ${on ? '' : 'text-slate-700'}`}
                      >
                        <Icon size={26} className={on ? 'text-purple-600' : 'text-slate-400'} aria-hidden="true" />
                        <span className="font-bold">{T[key]}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-7">
                <legend className="text-sm font-bold text-slate-700">{T.onbProcessInfo}</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {LEARNING_STYLES.map(({ id, key, descKey, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLearningStyle(id)}
                      aria-pressed={learningStyle === id}
                      className="choice flex flex-col items-start gap-1 p-4"
                    >
                      <Icon size={24} className={learningStyle === id ? 'text-purple-600' : 'text-slate-400'} aria-hidden="true" />
                      <span className="mt-1 font-extrabold text-ink-900">{T[key]}</span>
                      <span className="text-sm text-slate-600">{T[descKey]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  <ArrowLeft size={18} aria-hidden="true" /> {T.onbBack}
                </button>
                <div className="flex flex-col items-end gap-2">
                  <button type="button" onClick={() => setStep(3)} disabled={!step2Ready} className="btn-brand">
                    {T.onbChooseGoalBtn} <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  {!step2Ready && <p className="text-sm text-slate-600">{T.onbPickHelp}</p>}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" {...enter} onAnimationComplete={onStepShown} className="mt-7">
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-ink-900 outline-none">{T.onbGoalTitle}</h2>

              <fieldset className="mt-5">
                <legend className="sr-only">{T.onbGoalTitle}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedGoal(goal)}
                      aria-pressed={selectedGoal?.id === goal.id}
                      className="choice flex items-center gap-4 p-4"
                    >
                      <span className="text-4xl" aria-hidden="true">{goal.icon}</span>
                      <span>
                        <span className="block text-lg font-extrabold text-ink-900">{T[goal.key]}</span>
                        <span className="block text-sm font-bold text-purple-700">{T.onbTarget}: ₹{goal.cost}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <section aria-label={T.onbSummaryTitle} className="mt-6 rounded-2xl bg-slate-50 p-4">
                <h3 className="eyebrow">{T.onbSummaryTitle}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-bold text-ink-900 ring-1 ring-slate-200">
                    <span aria-hidden="true">{avatar}</span> {trimmed}
                  </span>
                  {selectedInterests.map((id) => {
                    const it = INTERESTS.find((i) => i.id === id);
                    return <span key={id} className="rounded-full bg-purple-100 px-3 py-1.5 text-sm font-bold text-purple-800">{T[it.key]}</span>;
                  })}
                  {styleLabel && <span className="rounded-full bg-teal-100 px-3 py-1.5 text-sm font-bold text-teal-800">{T[styleLabel.key]}</span>}
                  {selectedGoal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-saffron-100 px-3 py-1.5 text-sm font-bold text-saffron-800">
                      <Check size={14} aria-hidden="true" /> {T[selectedGoal.key]} · ₹{selectedGoal.cost}
                    </span>
                  )}
                </div>
              </section>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                  <ArrowLeft size={18} aria-hidden="true" /> {T.onbBack}
                </button>
                <div className="flex flex-col items-end gap-2">
                  <button type="button" onClick={handleStart} disabled={!selectedGoal} className="btn-brand">
                    <Target size={18} aria-hidden="true" /> {T.onbStartSim}
                  </button>
                  {!selectedGoal && <p className="text-sm text-slate-600">{T.onbGoalHelp}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
