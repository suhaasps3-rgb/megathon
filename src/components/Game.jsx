import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Info, ChevronRight, Sparkles, AlertTriangle, Clock, Activity, Target, BookOpen, ChevronDown } from 'lucide-react';
import { scenarios as staticScenarios } from '../data/scenarios';
import { generateDynamicScenario } from '../services/llm';

export default function Game({ aiEnabled, profile, assessmentScore, onComplete }) {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [wallet, setWallet] = useState(1000);
  const [futureWealth, setFutureWealth] = useState(0);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [expandedConcept, setExpandedConcept] = useState(false);

  useEffect(() => {
    async function loadScenario() {
      try {
        if (!aiEnabled) throw new Error('AI not available');
        const dynamicScenario = await generateDynamicScenario(profile, assessmentScore);
        setScenario(dynamicScenario);
      } catch (err) {
        console.error("LLM Generation failed, using fallback:", err);
        setError(true);
        const interest = profile.interests[0] || 'default';
        setScenario(staticScenarios[interest] || staticScenarios['default']);
      } finally {
        setLoading(false);
      }
    }
    loadScenario();
  }, [aiEnabled, profile, assessmentScore]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="mb-8"
        >
          <div className="w-24 h-24 border-4 border-slate-200 border-t-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-purple-600 animate-pulse" size={32} />
          </div>
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Generating Your Universe...</h2>
        <p className="text-slate-500 font-medium max-w-sm text-center">
          Building a unique {profile.learningStyle} life simulation.
        </p>
      </div>
    );
  }

  const currentDecision = scenario.decisions[decisionIndex];
  const chapters = ["Chapter 1: Everyday Choices", "Chapter 2: Looking Ahead", "Chapter 3: The Unexpected"];
  const currentChapter = chapters[decisionIndex] || `Chapter ${decisionIndex + 1}`;

  const handleChoice = (choice) => {
    const cost = Number(choice.cost) || 0;
    const impact = Number(choice.futureImpact) || 0;
    
    setWallet(wallet - cost);
    setFutureWealth(futureWealth + impact);
    setFeedback(choice);
    setExpandedConcept(false);
    setHistory([...history, { decision: currentDecision.text, choice }]);
  };

  const nextStep = () => {
    setFeedback(null);
    if (decisionIndex < scenario.decisions.length - 1) {
      setDecisionIndex(i => i + 1);
    } else {
      onComplete({ wallet, history, futureWealth, profile });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      
      {/* PERSISTENT HUD */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 md:p-6 mb-8 shadow-2xl border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-slate-700/50 shrink-0">
              {profile?.avatar || '😎'}
            </div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-400">
                {profile?.name || 'Player'}
              </h2>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mt-1">
                <Clock size={14} className="text-teal-400" /> {currentChapter}
              </div>
            </div>
          </div>

          <div className="flex-1 w-full md:px-8">
            {profile?.goal && (
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Target size={12} className="text-amber-400" /> Goal: {profile.goal.label}
                  </span>
                  <span className="text-sm font-black text-amber-400">
                    ₹{wallet} / ₹{profile.goal.cost}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, (wallet / profile.goal.cost) * 100))}%` }}
                    className={`h-full ${wallet >= profile.goal.cost ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 md:gap-8 bg-slate-800/80 p-3 md:p-4 rounded-2xl border border-slate-700/50 w-full md:w-auto justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Wallet size={12} /> Wallet
              </p>
              <p className="text-2xl font-black text-emerald-400">₹{wallet}</p>
            </div>
            <div className="w-px bg-slate-700"></div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Sparkles size={12} /> Age 30 Vault
              </p>
              <p className="text-2xl font-black text-purple-400">₹{futureWealth.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0 text-amber-600" />
          <p className="text-sm font-medium">Using pre-built scenarios (AI generation failed or timed out).</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Panel: Scene / Context */}
        <div className="md:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
          >
            <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden flex items-end p-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full"></div>
              <h2 className="text-white text-3xl font-black relative z-10 drop-shadow-md">
                {scenario.theme}
              </h2>
            </div>
            <div className="p-6 md:p-8">
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                {scenario.setup}
              </p>
            </div>
          </motion.div>
          
          {history.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden md:block bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm"
            >
              <h3 className="font-bold text-slate-700 mb-4 uppercase tracking-wide text-sm flex items-center gap-2">
                <Activity size={16} /> Life Log
              </h3>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="font-black text-slate-300">0{i+1}</span>
                    <span className="text-slate-600 font-medium">{h.choice.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel: Story & Choices */}
        <div className="md:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10 min-h-[500px] flex flex-col"
          >
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                  {decisionIndex + 1}
                </span>
                <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-teal-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${((decisionIndex + 1) / scenario.decisions.length) * 100}%` }}
                  />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-800 leading-tight">
                {currentDecision.text}
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {!feedback ? (
                <motion.div 
                  key="choices"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 mt-auto"
                >
                  {currentDecision.choices.map((choice, i) => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={i}
                      onClick={() => handleChoice(choice)}
                      className="w-full text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-purple-400 hover:bg-purple-50 transition-all flex justify-between items-center group shadow-sm hover:shadow-md"
                    >
                      <span className="font-semibold text-slate-800 text-lg pr-4">{choice.text}</span>
                      {Number(choice.cost) > 0 && (
                        <span className="shrink-0 text-red-500 font-black bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm">
                          -₹{choice.cost}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="feedback"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-auto"
                >
                  <div className={`p-8 rounded-3xl border-2 ${feedback.isGood ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'} mb-6`}>
                    <div className="flex gap-4">
                      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${feedback.isGood ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'}`}>
                        <Info size={24} />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold mb-2 ${feedback.isGood ? 'text-teal-900' : 'text-amber-900'}`}>
                          {feedback.isGood ? 'Smart Move!' : 'Think About It...'}
                        </h3>
                        <p className={`font-medium text-lg leading-relaxed ${feedback.isGood ? 'text-teal-800' : 'text-amber-800'}`}>
                          {feedback.feedback}
                        </p>
                        
                        {feedback.concept && (
                          <div className="mt-6">
                            <button
                              onClick={() => setExpandedConcept(!expandedConcept)}
                              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex justify-between items-center group"
                            >
                              <span className="flex items-center gap-2">
                                <Sparkles size={18} className={expandedConcept ? "animate-pulse" : ""} /> 
                                Concept Unlocked: {feedback.concept.name}
                              </span>
                              <ChevronDown size={20} className={`transition-transform duration-300 ${expandedConcept ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                              {expandedConcept && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                  className="bg-indigo-950 rounded-2xl p-6 border border-indigo-500/30 overflow-hidden relative"
                                >
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none"></div>
                                  <div className="relative z-10">
                                    <h4 className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3">
                                      <BookOpen size={14} /> Deep Dive
                                    </h4>
                                    <p className="text-indigo-100/90 font-medium text-sm leading-relaxed mb-4">
                                      {feedback.concept.description}
                                    </p>
                                    
                                    <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/20">
                                      <span className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-1 block">
                                        Real World Example
                                      </span>
                                      <p className="text-white/80 text-sm italic">
                                        "{feedback.concept.example}"
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={nextStep}
                    className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex justify-center items-center gap-3 shadow-xl"
                  >
                    {decisionIndex < scenario.decisions.length - 1 ? 'Next Chapter' : 'See Results'}
                    <ChevronRight size={24} className="text-teal-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
