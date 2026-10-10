import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Loader2, Sparkles, ShoppingBag, Pizza, PiggyBank, Rocket } from 'lucide-react';
import { assessUnderstanding } from '../services/llm';

export default function Assessment({ aiEnabled, onComplete, t }) {
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const T = t || {
    assmSync: "Initial Sync",
    assmQuestion: "Imagine you suddenly received ₹1000 today.",
    assmSub: "Be honest. What's your immediate instinct?",
    assmTreatTitle: "Treat Myself! 🛍️",
    assmTreatDesc: "Buy that thing I've been eyeing.",
    assmSquadTitle: "Squad Time 🍕",
    assmSquadDesc: "Go out and grab food with friends.",
    assmSaveTitle: "Lock it Away 🏦",
    assmSaveDesc: "Save it. You never know when you need it.",
    assmGrowTitle: "Grow It 🚀",
    assmGrowDesc: "Try to invest or start a side hustle.",
    assmAnalyzed: "Instinct Analyzed",
    assmStartSim: "Start The Simulation"
  };

  const QUICK_OPTIONS = [
    {
      id: 'treat',
      title: T.assmTreatTitle,
      desc: T.assmTreatDesc,
      icon: ShoppingBag,
      color: 'from-pink-500 to-rose-400'
    },
    {
      id: 'friends',
      title: T.assmSquadTitle,
      desc: T.assmSquadDesc,
      icon: Pizza,
      color: 'from-orange-400 to-amber-500'
    },
    {
      id: 'save',
      title: T.assmSaveTitle,
      desc: T.assmSaveDesc,
      icon: PiggyBank,
      color: 'from-teal-400 to-emerald-500'
    },
    {
      id: 'grow',
      title: T.assmGrowTitle,
      desc: T.assmGrowDesc,
      icon: Rocket,
      color: 'from-purple-500 to-indigo-500'
    }
  ];

  const handleSelect = async (option) => {
    setSelected(option.id);
    setIsSubmitting(true);
    
    const contextStr = `The user chose to: ${option.title} - ${option.desc}`;
    
    try {
      if (!aiEnabled) throw new Error('AI not available');
      const assessment = await assessUnderstanding(contextStr);
      setResult(assessment);
    } catch (err) {
      console.error(err);
      setResult({
        level: option.id === 'save' || option.id === 'grow' ? 6 : 3,
        analysis: "Got it! Let's see how that instinct plays out in the real world."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pt-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="text-purple-500" size={24} />
            <h2 className="text-sm font-bold text-purple-600 uppercase tracking-widest">{T.assmSync}</h2>
          </div>
          
          <h3 className="text-3xl font-black text-slate-800 mb-4 leading-tight">
            {T.assmQuestion}
          </h3>
          <p className="text-slate-500 text-lg mb-8 font-medium">
            {T.assmSub}
          </p>

          {!result ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUICK_OPTIONS.map((opt) => (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  disabled={isSubmitting}
                  className={`relative p-6 rounded-2xl border-2 text-left overflow-hidden transition-all ${
                    selected === opt.id 
                      ? 'border-purple-500 ring-4 ring-purple-500/20' 
                      : 'border-slate-100 hover:border-slate-300'
                  } bg-white shadow-sm disabled:opacity-70`}
                >
                  <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${opt.color}`}></div>
                  
                  <div className="flex items-center gap-4">
                    {isSubmitting && selected === opt.id ? (
                      <Loader2 className="animate-spin text-purple-500" size={32} />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center text-white shadow-lg`}>
                        <opt.icon size={24} />
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-lg text-slate-800">{opt.title}</h4>
                      <p className="text-sm text-slate-500 font-medium mt-1">{opt.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200 rounded-2xl p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-teal-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/30">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-teal-900 mb-2">{T.assmAnalyzed}</h4>
                  <p className="text-teal-800 text-lg leading-relaxed">{result.analysis}</p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-teal-200/50 flex justify-end">
                <button 
                  onClick={() => onComplete(result.level)}
                  className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl hover:shadow-purple-500/20"
                >
                  {T.assmStartSim}
                  <ChevronRight size={20} className="text-teal-400" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
