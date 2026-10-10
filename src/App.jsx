import React, { useState, useEffect, Suspense, lazy } from 'react';
import Setup from './components/Setup';
import Onboarding from './components/Onboarding';
import Assessment from './components/Assessment';
import Game from './components/Game';
import Report from './components/Report';
import NgoDashboard from './components/NgoDashboard';
import VoiceCompanion from './components/VoiceCompanion';
import BlindMode from './components/BlindMode';
const LifeMode = lazy(() => import('./components/life/LifeMode'));
import translations from './data/translations';
import { Mic, Eye, Gamepad2, ArrowRight } from 'lucide-react';

function App() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  const [state, setState] = useState(envKey ? 'ONBOARDING' : 'SETUP'); 
  const [apiKey, setApiKey] = useState(envKey || '');
  const [profile, setProfile] = useState(null);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [isNgoMode, setIsNgoMode] = useState(false);
  const [lang, setLang] = useState('en');

  const t = translations[lang];

  const langLabels = { en: 'EN', hi: 'हि', te: 'తె' };

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
    setState('ONBOARDING');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
      if (e.target.isContentEditable) return;

      if (e.code === 'Space' && !e.repeat && state !== 'BLIND_MODE' && state !== 'LIFE') {
        e.preventDefault();
        setState('BLIND_MODE');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  if (isNgoMode) {
    return <NgoDashboard onBack={() => setIsNgoMode(false)} />;
  }

  if (state === 'BLIND_MODE') {
    return <BlindMode apiKey={apiKey} lang={lang} t={t} onExit={() => setState('ONBOARDING')} />;
  }

  return (
    <div className="min-h-screen pb-12 font-sans selection:bg-purple-500/30">
      
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
            {t.appName}
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={() => setState('LIFE')}
              aria-current={state === 'LIFE' ? 'page' : undefined}
              className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${state === 'LIFE' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'}`}
            >
              <Gamepad2 size={16} aria-hidden="true" /> <span className="sr-only sm:not-sr-only">{t.lifeMode}</span>
            </button>
            {/* Language Selector */}
            <div className="flex bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              {Object.entries(langLabels).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`px-3 py-1.5 text-sm font-bold transition-colors ${lang === code ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setState('BLIND_MODE')}
              className="flex items-center gap-2 text-sm font-bold bg-yellow-400 text-black px-4 py-1.5 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
            >
              <Eye size={16} /> {t.audioMode}
            </button>
            <button 
              onClick={() => setState('VOICE')}
              className="hidden md:flex items-center gap-2 text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Mic size={16} /> {t.voiceLevel}
            </button>
            <button 
              onClick={() => setIsNgoMode(true)}
              className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {t.ngoLogin}
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
        {state === 'SETUP' && <Setup onComplete={handleSetupComplete} onLifeMode={() => setState('LIFE')} t={t} />}
        {state === 'ONBOARDING' && (
          <div className="max-w-4xl mx-auto px-6 pt-6">
            <button
              onClick={() => setState('LIFE')}
              className="w-full flex items-center justify-between gap-4 text-left rounded-2xl border-2 border-teal-200 bg-teal-50 px-5 py-4 hover:border-teal-400 transition-colors"
            >
              <span>
                <span className="block font-black text-teal-900">{t.lifeModeTitle}</span>
                <span className="block text-sm text-teal-800">{t.lifeModeDesc}</span>
              </span>
              <span className="shrink-0 flex items-center gap-1 font-bold text-teal-800">{t.lifeModeCta} <ArrowRight size={18} /></span>
            </button>
          </div>
        )}
        {state === 'ONBOARDING' && <Onboarding onComplete={handleOnboardingComplete} t={t} />}
        {state === 'ASSESSMENT' && <Assessment apiKey={apiKey} onComplete={handleAssessmentComplete} t={t} />}
        {state === 'GAME' && <Game apiKey={apiKey} profile={profile} assessmentScore={assessmentScore} onComplete={handleGameComplete} />}
        {state === 'REPORT' && <Report data={gameData} onRestart={resetToStart} t={t} />}
        {state === 'LIFE' && (
          <Suspense fallback={<p className="p-12 text-center font-bold text-slate-500" role="status">Loading Life Mode…</p>}>
            <LifeMode onExit={() => setState(apiKey ? 'ONBOARDING' : 'SETUP')} onLearn={() => setState('ONBOARDING')} />
          </Suspense>
        )}
        {state === 'VOICE' && <VoiceCompanion apiKey={apiKey} lang={lang} t={t} onComplete={() => setState('ONBOARDING')} />}
      </main>
    </div>
  );
}

export default App;
