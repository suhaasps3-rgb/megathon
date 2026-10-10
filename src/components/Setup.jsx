import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Sparkles } from 'lucide-react';

export default function Setup({ onComplete, t }) {
  const [key, setKey] = useState('');

  const T = t || {
    setupTitle: "Welcome to PaisaPath",
    setupSubtitle: "To power the dynamic AI engine, please provide a Gemini API Key.",
    setupKeyLabel: "Gemini API Key",
    setupLaunch: "Launch Engine"
  };
  
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-400 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
          <Sparkles className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-black text-center text-slate-800 mb-2">{T.setupTitle}</h2>
        <p className="text-center text-slate-500 mb-8 font-medium">{T.setupSubtitle}</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">{T.setupKeyLabel}</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all font-mono"
                placeholder="AIzaSy..."
              />
            </div>
          </div>
          <button 
            onClick={() => onComplete(key)}
            disabled={!key}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {T.setupLaunch}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
