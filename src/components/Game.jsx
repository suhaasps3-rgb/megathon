import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Info, ChevronRight, Sparkles, AlertTriangle, Target, BookOpen, ChevronDown, Activity, Lightbulb, CheckCircle2 } from 'lucide-react';
import { scenarios as staticScenarios } from '../data/scenarios';
import { generateDynamicScenario } from '../services/llm';
import translations, { fill } from '../data/translations';
import AnimatedNumber from './ui/AnimatedNumber';
import Mascot from './brand/Mascot';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function builtIn(profile) {
  const interest = profile?.interests?.[0] || 'default';
  return staticScenarios[interest] || staticScenarios.default;
}

export default function Game({ apiKey, profile, assessmentScore, onComplete, t }) {
  const T = { ...translations.en, ...(t || {}) };
  const [scenario, setScenario] = useState(null);
  const [notice, setNotice] = useState(null); // 'builtin' | 'failed'
  const [wallet, setWallet] = useState(1000);
  const [futureWealth, setFutureWealth] = useState(0);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const feedbackRef = useRef(null);
  const questionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // Without a key there is nothing to call, so go straight to the built-in scenario.
    if (!apiKey) {
      setScenario(builtIn(profile));
      setNotice('builtin');
      return undefined;
    }
    generateDynamicScenario(apiKey, profile, assessmentScore)
      .then((s) => { if (!cancelled) setScenario(s); })
      .catch((err) => {
        console.error('Scenario generation failed, using built-in:', err);
        if (cancelled) return;
        setScenario(builtIn(profile));
        setNotice('failed');
      });
    return () => { cancelled = true; };
  }, [apiKey, profile, assessmentScore]);

  useEffect(() => { if (scenario) questionRef.current?.focus({ preventScroll: true }); }, [decisionIndex, scenario]);

  if (!scenario) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <Mascot size={96} mood="think" />
        <h1 className="mt-6 text-2xl font-extrabold text-ink-900">{T.gmLoadingTitle}</h1>
        <p className="mt-2 max-w-sm text-slate-600">{fill(T.gmLoadingSub, { style: profile?.learningStyle || '' })}</p>
      </div>
    );
  }

  const total = scenario.decisions.length;
  const decision = scenario.decisions[decisionIndex];
  const last = decisionIndex === total - 1;
  const goal = profile?.goal;
  const goalPct = goal ? Math.min(100, Math.max(0, (wallet / goal.cost) * 100)) : 0;
  const affordable = (c) => (Number(c.cost) || 0) <= wallet;
  const someAffordable = decision.choices.some(affordable);

  const choose = (choice) => {
    if (feedback) return;
    setWallet((w) => w - (Number(choice.cost) || 0));
    setFutureWealth((f) => f + (Number(choice.futureImpact) || 0));
    setFeedback(choice);
    setExpanded(false);
    setHistory((h) => [...h, { decision: decision.text, choice }]);
  };

  const next = () => {
    setFeedback(null);
    if (!last) setDecisionIndex((i) => i + 1);
    else onComplete({ wallet, history, futureWealth, profile });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6">
      {/* Always-visible HUD: money in, money out, and progress toward the goal. */}
      <section aria-label={T.gmWallet} className="sticky top-2 z-20 mb-6 rounded-3xl bg-ink-900 p-4 text-white shadow-lift sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-3xl" aria-hidden="true">{profile?.avatar || '😎'}</span>
            <div>
              <p className="text-lg font-extrabold leading-tight">{profile?.name}</p>
              <p className="text-sm font-bold text-teal-300">{fill(T.gmChapter, { n: decisionIndex + 1, total })}</p>
            </div>
          </div>

          {goal ? (
            <div>
              <div className="flex items-end justify-between gap-2 text-sm">
                <span className="flex items-center gap-1 font-bold text-slate-200"><Target size={14} aria-hidden="true" /> {fill(T.gmGoal, { goal: goal.label })}</span>
                <span className="font-extrabold">{inr(wallet)} / {inr(goal.cost)}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goalPct)} aria-label={fill(T.gmGoal, { goal: goal.label })}>
                <motion.div className={`h-full ${wallet >= goal.cost ? 'bg-teal-400' : 'bg-saffron-400'}`} animate={{ width: `${goalPct}%` }} transition={{ duration: 0.4 }} />
              </div>
              {history.length > 0 && wallet >= goal.cost && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-teal-300"><CheckCircle2 size={14} aria-hidden="true" /> {T.gmGoalReached}</p>}
            </div>
          ) : <span />}

          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-3 text-center sm:text-left">
            <div>
              <dt className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-300 sm:justify-start"><Wallet size={12} aria-hidden="true" /> {T.gmWallet}</dt>
              <dd className="text-xl font-extrabold text-teal-300">₹<AnimatedNumber value={wallet} /></dd>
            </div>
            <div>
              <dt className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-300 sm:justify-start"><Sparkles size={12} aria-hidden="true" /> {T.gmVault}</dt>
              <dd className="text-xl font-extrabold text-purple-300">₹<AnimatedNumber value={futureWealth} /></dd>
              <dd className="sr-only">{T.gmVaultNote}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-2 hidden text-xs text-slate-300 sm:block">{T.gmVaultNote}</p>
      </section>

      {notice && (
        <p role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm text-saffron-900">
          {notice === 'failed' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {notice === 'failed' ? T.gmAiFailed : T.gmBuiltIn}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-6 py-5">
              <p className="eyebrow !text-purple-100">{scenario.theme}</p>
              <p className="mt-2 text-base leading-relaxed text-white/95">{scenario.setup}</p>
            </div>
            <div className="p-6 sm:p-8">
              <h1 ref={questionRef} tabIndex={-1} className="text-2xl font-extrabold leading-snug text-ink-900 outline-none sm:text-3xl">{decision.text}</h1>

              <AnimatePresence mode="wait" initial={false}>
                {!feedback ? (
                  <motion.fieldset key={`c${decisionIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-6 space-y-3">
                    <legend className="sr-only">{T.gmChoose}</legend>
                    {decision.choices.map((choice, i) => {
                      const cost = Number(choice.cost) || 0;
                      const blocked = someAffordable && !affordable(choice);
                      return (
                        <button key={i} type="button" onClick={() => choose(choice)} disabled={blocked} className="choice flex w-full items-center justify-between gap-4 p-4 text-left disabled:cursor-not-allowed disabled:opacity-50">
                          <span>
                            <span className="block text-lg font-bold text-ink-900">{choice.text}</span>
                            {blocked && <span className="mt-1 block text-sm text-slate-600">{T.gmCantAfford}</span>}
                          </span>
                          <span className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-extrabold ${cost > 0 ? 'bg-rose-50 text-rose-700' : 'bg-teal-50 text-teal-700'}`}>
                            {cost > 0 ? fill(T.gmCost, { n: cost }) : T.gmFree}
                          </span>
                        </button>
                      );
                    })}
                  </motion.fieldset>
                ) : (
                  <motion.div key="fb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} onAnimationComplete={() => feedbackRef.current?.focus()} className="mt-6">
                    <div role="status" aria-live="polite" className={`rounded-3xl border p-5 sm:p-6 ${feedback.isGood ? 'border-teal-200 bg-teal-50' : 'border-saffron-200 bg-saffron-50'}`}>
                      <div className="flex gap-4">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${feedback.isGood ? 'bg-teal-500 text-white' : 'bg-saffron-500 text-white'}`}>
                          {feedback.isGood ? <CheckCircle2 size={24} aria-hidden="true" /> : <Lightbulb size={24} aria-hidden="true" />}
                        </span>
                        <div>
                          <h2 ref={feedbackRef} tabIndex={-1} className={`text-xl font-extrabold outline-none ${feedback.isGood ? 'text-teal-900' : 'text-saffron-900'}`}>
                            {feedback.isGood ? T.gmSmart : T.gmThink}
                          </h2>
                          <p className={`mt-1 text-lg leading-relaxed ${feedback.isGood ? 'text-teal-900' : 'text-saffron-900'}`}>{feedback.feedback}</p>
                        </div>
                      </div>

                      {feedback.concept && (
                        <div className="mt-5">
                          <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="btn-brand w-full justify-between">
                            <span className="flex items-center gap-2"><Sparkles size={18} aria-hidden="true" /> {fill(T.gmConcept, { name: feedback.concept.name })}</span>
                            <ChevronDown size={20} aria-hidden="true" className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {expanded && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="mt-3 rounded-2xl bg-ink-900 p-5 text-white">
                                  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-200"><BookOpen size={14} aria-hidden="true" /> {T.gmDeepDive}</h3>
                                  <p className="mt-2 leading-relaxed text-slate-100">{feedback.concept.description}</p>
                                  <div className="mt-4 rounded-xl bg-white/10 p-4">
                                    <p className="text-xs font-extrabold uppercase tracking-wider text-purple-200">{T.gmExample}</p>
                                    <p className="mt-1 text-slate-100">{feedback.concept.example}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={next} className="btn-primary mt-5 w-full justify-center py-4 text-lg">
                      {last ? T.gmSeeResults : T.gmNext} <ChevronRight size={22} aria-hidden="true" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <aside aria-label={T.gmLog} className="card h-fit p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-600"><Activity size={16} aria-hidden="true" /> {T.gmLog}</h2>
            <ol className="mt-3 space-y-3">
              {history.map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${h.choice.isGood ? 'bg-teal-100 text-teal-700' : 'bg-saffron-100 text-saffron-800'}`}>{i + 1}</span>
                  <span className="text-slate-700">{h.choice.text}</span>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
