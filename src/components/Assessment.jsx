import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Loader2, ShoppingBag, Pizza, PiggyBank, Rocket, RotateCcw, Info } from 'lucide-react';
import { assessUnderstanding } from '../services/llm';
import { offlineAssessment } from '../services/offlineAssessment';
import translations from '../data/translations';
import Mascot from './brand/Mascot';

export default function Assessment({ apiKey, onComplete, t }) {
  const T = { ...translations.en, ...(t || {}) };
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [fellBack, setFellBack] = useState(false);
  // Ignores a late answer if the player already changed their mind or left.
  const runId = useRef(0);
  const resultRef = useRef(null);

  useEffect(() => () => { runId.current += 1; }, []);
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  const OPTIONS = [
    { id: 'treat', title: T.assmTreatTitle, desc: T.assmTreatDesc, icon: ShoppingBag, tone: 'bg-saffron-100 text-saffron-800' },
    { id: 'friends', title: T.assmSquadTitle, desc: T.assmSquadDesc, icon: Pizza, tone: 'bg-rose-100 text-rose-700' },
    { id: 'save', title: T.assmSaveTitle, desc: T.assmSaveDesc, icon: PiggyBank, tone: 'bg-teal-100 text-teal-700' },
    { id: 'grow', title: T.assmGrowTitle, desc: T.assmGrowDesc, icon: Rocket, tone: 'bg-purple-100 text-purple-700' },
  ];

  const handleSelect = async (option) => {
    if (isSubmitting) return;
    const id = ++runId.current;
    setSelected(option.id);
    setIsSubmitting(true);
    setFellBack(false);

    // Without a key, the read is local and expected, so no failure notice is shown.
    if (!apiKey) {
      setResult(offlineAssessment(option.id, T.assmFallbackText));
      setIsSubmitting(false);
      return;
    }
    try {
      const assessment = await assessUnderstanding(apiKey, `The user chose to: ${option.title} - ${option.desc}`);
      if (id !== runId.current) return;
      setResult(assessment);
    } catch (err) {
      console.error(err);
      if (id !== runId.current) return;
      setResult(offlineAssessment(option.id, T.assmFallbackText));
      setFellBack(true);
    } finally {
      if (id === runId.current) setIsSubmitting(false);
    }
  };

  const changeAnswer = () => {
    runId.current += 1;
    setResult(null);
    setSelected(null);
    setFellBack(false);
    setIsSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="card p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <Mascot size={48} mood={result ? 'cheer' : isSubmitting ? 'think' : 'happy'} />
          <p className="eyebrow">{T.assmSync}</p>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">{T.assmQuestion}</h1>
        <p className="mt-2 text-lg text-slate-600">{T.assmSub}</p>

        {!result ? (
          <fieldset className="mt-7">
            <legend className="sr-only">{T.assmPick}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPTIONS.map((opt) => {
                const loading = isSubmitting && selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    disabled={isSubmitting}
                    aria-pressed={selected === opt.id}
                    className="choice flex items-center gap-4 p-4 disabled:opacity-60"
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${opt.tone}`}>
                      {loading ? <Loader2 className="animate-spin" size={24} aria-hidden="true" /> : <opt.icon size={24} aria-hidden="true" />}
                    </span>
                    <span>
                      <span className="block text-lg font-extrabold text-ink-900">{opt.title}</span>
                      <span className="block text-sm text-slate-600">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p role="status" aria-live="polite" className="mt-4 min-h-[1.5rem] text-sm font-bold text-purple-700">
              {isSubmitting ? T.assmReading : ''}
            </p>
          </fieldset>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-7 rounded-3xl border border-teal-200 bg-teal-50 p-6"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white">
                <CheckCircle2 size={26} aria-hidden="true" />
              </span>
              <div role="status" aria-live="polite">
                <h2 ref={resultRef} tabIndex={-1} className="text-xl font-extrabold text-teal-900 outline-none">{T.assmAnalyzed}</h2>
                <p className="mt-2 text-lg leading-relaxed text-teal-900">{result.analysis}</p>
                {fellBack && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-saffron-50 px-3 py-2 text-sm text-saffron-900">
                    <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {T.assmFallback}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-teal-200 pt-5">
              <button type="button" onClick={changeAnswer} className="btn-secondary">
                <RotateCcw size={16} aria-hidden="true" /> {T.assmChange}
              </button>
              <button type="button" onClick={() => onComplete(result.level)} className="btn-brand">
                {T.assmStartSim} <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
