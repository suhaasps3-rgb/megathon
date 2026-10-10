import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Copy, Sparkles, Flame, Snowflake, TrendingUp, Scale, CheckCircle2, Lightbulb, Trophy, Target } from 'lucide-react';
import translations, { fill } from '../data/translations';
import { personaOf } from '../services/persona';
import AnimatedNumber from './ui/AnimatedNumber';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const STYLES = {
  spender: { icon: Flame, aura: 'from-rose-500 to-rose-700', title: 'rpSpender', text: 'rpSpenderText' },
  mattress: { icon: Snowflake, aura: 'from-slate-500 to-slate-700', title: 'rpMattress', text: 'rpMattressText' },
  stealth: { icon: TrendingUp, aura: 'from-teal-500 to-teal-700', title: 'rpStealth', text: 'rpStealthText' },
  balanced: { icon: Scale, aura: 'from-purple-600 to-purple-800', title: 'rpBalanced', text: 'rpBalancedText' },
};

export default function Report({ data, onRestart, t }) {
  const T = { ...translations.en, ...(t || {}) };
  const { wallet, history = [], futureWealth = 0, profile } = data;
  const goal = profile?.goal;
  const p = useMemo(() => personaOf({ wallet, history, futureWealth, goalCost: goal?.cost || 0 }), [wallet, history, futureWealth, goal]);
  const style = STYLES[p.id];
  const [copy, setCopy] = useState(null); // null | 'ok' | 'fail'

  const shareText = fill(T.rpShareText, { title: T[style.title], n: p.score.toLocaleString('en-IN'), vault: Math.round(futureWealth).toLocaleString('en-IN') });

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">{T.rpTitle}</h1>
        <p className="mt-2 text-lg text-slate-600">{T.rpSub}</p>
      </header>

      {goal && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label={goal.label}
          className={`mt-8 flex flex-col items-center gap-4 rounded-3xl border p-6 text-center sm:flex-row sm:text-left ${p.goalReached ? 'border-teal-200 bg-teal-50' : 'border-saffron-200 bg-saffron-50'}`}
        >
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-4xl shadow-card" aria-hidden="true">{goal.icon}</span>
          <div>
            <h2 className={`flex items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start ${p.goalReached ? 'text-teal-900' : 'text-saffron-900'}`}>
              {p.goalReached ? <Trophy size={24} aria-hidden="true" /> : <Target size={24} aria-hidden="true" />}
              {p.goalReached ? T.rpGoalWon : T.rpGoalMissed}
            </h2>
            <p className={`mt-1 text-lg ${p.goalReached ? 'text-teal-900' : 'text-saffron-900'}`}>
              {p.goalReached
                ? fill(T.rpGoalWonText, { wallet, goal: goal.label, cost: goal.cost })
                : fill(T.rpGoalMissedText, { wallet, goal: goal.label, cost: goal.cost, gap: goal.cost - wallet })}
            </p>
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 140 }}
        aria-label={T.rpAura}
        className={`relative mx-auto mt-8 max-w-md overflow-hidden rounded-[2rem] bg-gradient-to-br p-8 text-center text-white shadow-lift ${style.aura}`}
      >
        <p className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest">{T.rpAura}</p>
        <span className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
          <style.icon size={40} />
        </span>
        <h2 className="mt-4 text-3xl font-extrabold leading-tight">{T[style.title]}</h2>
        <p className="mt-2 flex items-center justify-center gap-2 text-lg font-bold">
          <Sparkles size={18} aria-hidden="true" />
          <span><AnimatedNumber value={p.score} format={(n) => fill(T.rpPoints, { n: Math.round(n).toLocaleString('en-IN') })} duration={0.8} /></span>
        </p>
        <p className="mt-4 rounded-2xl bg-black/25 p-4 leading-relaxed">{T[style.text]}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/15 p-3 text-left text-sm">
          <div><dt className="text-xs font-bold uppercase text-white/80">{T.rpSpent}</dt><dd className="text-lg font-extrabold">{inr(p.spent)}</dd></div>
          <div className="text-right"><dt className="text-xs font-bold uppercase text-white/80">{T.rpVault}</dt><dd className="text-lg font-extrabold">{inr(futureWealth)}</dd></div>
        </dl>
      </motion.section>

      <div className="mx-auto mt-4 max-w-md">
        <button type="button" onClick={share} className="btn-secondary w-full justify-center">
          <Copy size={18} aria-hidden="true" /> {T.rpShare}
        </button>
        <p role="status" aria-live="polite" className="mt-2 min-h-[1.5rem] text-center text-sm font-bold text-slate-700">
          {copy === 'ok' ? T.rpCopied : copy === 'fail' ? T.rpCopyFail : ''}
        </p>
        {copy === 'fail' && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800 select-all">{shareText}</p>}
      </div>

      <section className="card mt-8 p-5 sm:p-8">
        <h2 className="text-xl font-extrabold text-ink-900">{T.rpReceipts}</h2>
        <ol className="mt-4 space-y-3">
          {history.map((item, i) => (
            <li key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">{item.decision}</p>
              <p className="mt-2 font-bold text-ink-900">{item.choice.text}</p>
              <p className={`mt-2 flex items-start gap-2 text-sm font-semibold ${item.choice.isGood ? 'text-teal-800' : 'text-saffron-900'}`}>
                {item.choice.isGood ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <span><span className="sr-only">{item.choice.isGood ? T.rpGood : T.rpTryAgain}: </span>{item.choice.feedback}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 text-center">
        <button type="button" onClick={onRestart} className="btn-primary">
          <RotateCcw size={20} aria-hidden="true" /> {T.rpAgain}
        </button>
      </div>
    </div>
  );
}
