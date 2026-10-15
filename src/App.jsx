import React, { useState, useEffect, Suspense, lazy } from 'react';
import { MotionConfig } from 'framer-motion';
import Home from './components/Home';
import Onboarding from './components/Onboarding';
import Assessment from './components/Assessment';
import Game from './components/Game';
import { LangContext } from './i18n/context';
import Report from './components/Report';
import NgoDashboard from './components/NgoDashboard';
import VoiceCompanion from './components/VoiceCompanion';
import BlindMode from './components/BlindMode';
import AppHeader, { LEARN_STATES } from './components/shell/AppHeader';
import JourneyBar from './components/shell/JourneyBar';
import AppFooter from './components/shell/AppFooter';
import Mascot from './components/brand/Mascot';
import translations from './data/translations';
const LifeMode = lazy(() => import('./components/life/LifeMode'));
const NeighborhoodGame = lazy(() => import('./components/world/NeighborhoodGame'));

function Loading({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-16 text-center" role="status">
      <Mascot size={64} mood="think" />
      <p className="font-bold text-slate-600">{label}</p>
    </div>
  );
}

function App() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('paisapath_gemini_key') : null;

  const [state, setState] = useState('HOME');
  const [lastLearn, setLastLearn] = useState('ONBOARDING');
  const [apiKey, setApiKey] = useState(envKey || savedKey || '');
  const [profile, setProfile] = useState(null);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [isNgoMode, setIsNgoMode] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    if (envKey) {
      localStorage.setItem('paisapath_gemini_key', envKey);
      setApiKey(envKey);
    }
  }, [envKey]);

  const handleSetApiKey = (key) => {
    setApiKey(key);
    if (typeof window !== 'undefined') {
      if (key) localStorage.setItem('paisapath_gemini_key', key);
      else localStorage.removeItem('paisapath_gemini_key');
    }
  };

  const t = translations[lang];

  const go = (next) => {
    const target = next === 'LEARN' ? lastLearn : next;
    if (LEARN_STATES.includes(target)) setLastLearn(target);
    setState(target);
    window.scrollTo?.(0, 0);
  };

  const handleOnboardingComplete = (data) => {
    setProfile(data);
    go('ASSESSMENT');
  };

  const handleAssessmentComplete = (score) => {
    setAssessmentScore(score);
    go('GAME');
  };

  const handleGameComplete = (data) => {
    setGameData(data);
    go('REPORT');
  };

  const resetToStart = () => {
    setProfile(null);
    setAssessmentScore(0);
    setGameData(null);
    go('ONBOARDING');
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
      if (e.target.isContentEditable) return;

      if (e.code === 'Space' && !e.repeat && !['BLIND_MODE', 'LIFE', 'NEIGHBORHOOD'].includes(state)) {
        e.preventDefault();
        setState('BLIND_MODE');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  if (isNgoMode) {
    return (
      <>
        <NgoDashboard t={t} onBack={() => setIsNgoMode(false)} />
        <AppFooter dark />
      </>
    );
  }

  if (state === 'BLIND_MODE') {
    return (
      <>
        <BlindMode apiKey={apiKey} onSetKey={handleSetApiKey} lang={lang} t={t} onExit={() => go('HOME')} />
        <AppFooter dark />
      </>
    );
  }

  return (
    <LangContext.Provider value={t}>
    <MotionConfig reducedMotion="user">
      <div className="app-bg min-h-screen overflow-x-clip pb-16">
        <a href="#main" className="sr-only z-[60] rounded-xl bg-ink-900 px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {t.skipToContent}
        </a>
        <div className="sr-only" role="alert" aria-live="assertive">
          {t.blindWelcome}
        </div>

        <AppHeader t={t} state={state} lang={lang} setLang={setLang} onNavigate={go} onNgo={() => setIsNgoMode(true)} />
        <JourneyBar state={state} t={t} />

        <main id="main" className="relative">
          {state === 'HOME' && (
            <Home
              t={t}
              profile={profile}
              hasAi={Boolean(apiKey)}
              canEditKey={true}
              onSetKey={handleSetApiKey}
              onLearn={() => go('LEARN')}
              onLife={() => go('LIFE')}
              on3d={() => go('NEIGHBORHOOD')}
              onMentor={() => go('VOICE')}
              onAudio={() => go('BLIND_MODE')}
            />
          )}
          {state === 'ONBOARDING' && <Onboarding onComplete={handleOnboardingComplete} t={t} />}
          {state === 'ASSESSMENT' && <Assessment apiKey={apiKey} onComplete={handleAssessmentComplete} t={t} />}
          {state === 'GAME' && <Game apiKey={apiKey} profile={profile} assessmentScore={assessmentScore} onComplete={handleGameComplete} t={t} />}
          {state === 'REPORT' && <Report data={gameData} onRestart={resetToStart} t={t} />}
          {state === 'LIFE' && (
            <Suspense fallback={<Loading label={t.lifeMode} />}>
              <LifeMode onExit={() => go('HOME')} onLearn={() => go('LEARN')} />
            </Suspense>
          )}
          {state === 'NEIGHBORHOOD' && (
            <Suspense fallback={<Loading label={t.nav3d} />}>
              <NeighborhoodGame onExit={() => go('HOME')} />
            </Suspense>
          )}
          {state === 'VOICE' && <VoiceCompanion apiKey={apiKey} onSetKey={handleSetApiKey} lang={lang} t={t} onComplete={() => go('HOME')} />}
        </main>
        <AppFooter />
      </div>
    </MotionConfig>
    </LangContext.Provider>
  );
}

export default App;
