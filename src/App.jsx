import React, { useState, useEffect } from 'react';
import Setup from './components/Setup';
import Onboarding from './components/Onboarding';
import Assessment from './components/Assessment';
import Game from './components/Game';
import Report from './components/Report';
import NgoDashboard from './components/NgoDashboard';
import VoiceCompanion from './components/VoiceCompanion';
import BlindMode from './components/BlindMode';
import { Mic, Eye } from 'lucide-react';

function App() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  // States: SETUP, ONBOARDING, ASSESSMENT, GAME, REPORT, VOICE, BLIND_MODE
  const [state, setState] = useState(envKey ? 'ONBOARDING' : 'SETUP'); 
  const [apiKey, setApiKey] = useState(envKey || '');
  const [profile, setProfile] = useState(null);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [isNgoMode, setIsNgoMode] = useState(false);

  const handleSetupComplete = (key) => {
    setApiKey(key);
    setState('ONBOARDING');
  };

  const handleOnboardingComplete = (data) => {
    setProfile(data);
    setState('ASSESSMENT');
  };

  const handleAssessmentComplete = (score) => {
    setAssessmentScore(score);
    setState('GAME');
  };

  const handleGameComplete = (data) => {
    setGameData(data);
    setState('REPORT');
  };

  const resetToStart = () => {
    setProfile(null);
    setAssessmentScore(0);
    setGameData(null);
    setState('ONBOARDING'); // Skip SETUP if they already provided key
  };

  if (isNgoMode) {
    return <NgoDashboard onBack={() => setIsNgoMode(false)} />;
  }

  // If in Blind Mode, return the full-screen overlay directly
  if (state === 'BLIND_MODE') {
    return <BlindMode apiKey={apiKey} onExit={() => setState('ONBOARDING')} />;
  }

  return (
    <div className="min-h-screen pb-12 font-sans selection:bg-purple-500/30">
      
      {/* Screen Reader Only - Automatically read by screen readers on page load */}
      <div className="sr-only" role="alert" aria-live="assertive">
        Welcome to PaisaPath. If you are visually impaired, please press the Spacebar now to enter the fully accessible Audio Mode.
      </div>

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setState('ONBOARDING')}
            className="flex items-center gap-3 text-slate-800 font-black text-2xl tracking-tight hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-teal-500 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/30">
              ₹
            </div>
            PaisaPath
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setState('BLIND_MODE')}
              className="flex items-center gap-2 text-sm font-bold bg-yellow-400 text-black px-4 py-1.5 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
              title="Visually Impaired Mode (Pure Audio)"
            >
              <Eye size={16} /> Accessible Audio Mode
            </button>
            <button 
              onClick={() => setState('VOICE')}
              className="hidden md:flex items-center gap-2 text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Mic size={16} /> Voice Level
            </button>
            <button 
              onClick={() => setIsNgoMode(true)}
              className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              NGO Login
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
        {state === 'SETUP' && <Setup onComplete={handleSetupComplete} />}
        {state === 'ONBOARDING' && <Onboarding onComplete={handleOnboardingComplete} />}
        {state === 'ASSESSMENT' && <Assessment apiKey={apiKey} onComplete={handleAssessmentComplete} />}
        {state === 'GAME' && <Game apiKey={apiKey} profile={profile} assessmentScore={assessmentScore} onComplete={handleGameComplete} />}
        {state === 'REPORT' && <Report data={gameData} onRestart={resetToStart} />}
        {state === 'VOICE' && <VoiceCompanion apiKey={apiKey} onComplete={() => setState('ONBOARDING')} />}
      </main>
    </div>
  );
}

export default App;
