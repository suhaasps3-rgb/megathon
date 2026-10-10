import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, WifiOff, Loader2 } from 'lucide-react';

// Welcome screen. Students never handle an API key: the AI runs through the
// server proxy when it is configured, and the offline lessons run otherwise.
// aiAvailable is null while the server is being checked.
export default function Setup({ aiAvailable, onComplete, onLifeMode, t }) {
  const T = t || {};

  const status =
    aiAvailable === null
      ? { icon: Loader2, text: T.setupChecking || 'Getting your lessons ready…', className: 'text-slate-500', spin: true }
      : aiAvailable
        ? { icon: Sparkles, text: T.setupAiReady || 'AI-personalised lessons are on', className: 'text-purple-700' }
        : { icon: WifiOff, text: T.setupOfflineReady || 'Offline lessons are ready', className: 'text-teal-700' };
  const StatusIcon = status.icon;

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
        <h2 className="text-3xl font-black text-center text-slate-800 mb-2">{T.setupTitle || 'Welcome to PaisaPath'}</h2>
        <p className="text-center text-slate-500 mb-6 font-medium">
          {T.setupSubtitle || 'Learn to budget, save, invest and stay safe by making real money choices.'}
        </p>

        <p role="status" className={`flex items-center justify-center gap-2 text-sm font-bold mb-6 ${status.className}`}>
          <StatusIcon size={16} className={status.spin ? 'animate-spin' : undefined} aria-hidden="true" />
          {status.text}
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => onComplete(true)}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
          >
            {T.setupStart || 'Start learning'}
          </button>
          {aiAvailable && (
            <button
              onClick={() => onComplete(false)}
              className="w-full text-sm font-bold text-slate-600 py-2 rounded-xl hover:bg-slate-100 transition-all"
            >
              {T.setupSkip || 'Continue without AI (offline lessons)'}
            </button>
          )}
          {onLifeMode && (
            <button
              onClick={onLifeMode}
              className="w-full text-sm font-bold text-teal-700 py-2 rounded-xl hover:bg-teal-50 transition-all"
            >
              {T.lifeModeCta || 'Play Life Mode'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
