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
import Mascot from './components/brand/Mascot';
import translations from './data/translations';
import { checkAiAvailable } from './services/llm';
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
  const [state, setState] = useState('HOME');
  const [lastLearn, setLastLearn] = useState('ONBOARDING');
  // True only when the server proxy has a Gemini key. Until then every mode runs offline.
  const [aiEnabled, setAiEnabled] = useState(false);
  const [profile, setProfile] = useState(null);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [isNgoMode, setIsNgoMode] = useState(false);
  const [lang, setLang] = useState('en');

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
    let cancelled = false;
    checkAiAvailable().then((on) => { if (!cancelled) setAiEnabled(on); });
    return () => { cancelled = true; };
  }, []);

  if (isNgoMode) {
    return <NgoDashboard t={t} onBack={() => setIsNgoMode(false)} />;
  }

  if (state === 'BLIND_MODE') {
    return <BlindMode aiEnabled={aiEnabled} lang={lang} t={t} onExit={() => go('HOME')} />;
  }

  return (
    <LangContext.Provider value={t}>
    <MotionConfig reducedMotion="user">
      <div className="app-bg min-h-screen overflow-x-clip pb-16">
        <a href="#main" className="sr-only z-[60] rounded-xl bg-ink-900 px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {t.skipToContent}
        </a>
        <p className="sr-only">{t.srAudioHint}</p>

        <AppHeader t={t} state={state} lang={lang} setLang={setLang} onNavigate={go} onNgo={() => setIsNgoMode(true)} />
        <JourneyBar state={state} t={t} />

        <main id="main" className="relative">
          {state === 'HOME' && (
            <Home
              t={t}
              profile={profile}
              onLearn={() => go('LEARN')}
              onLife={() => go('LIFE')}
              on3d={() => go('NEIGHBORHOOD')}
              onMentor={() => go('VOICE')}
              onAudio={() => go('BLIND_MODE')}
            />
          )}
          {state === 'ONBOARDING' && <Onboarding onComplete={handleOnboardingComplete} t={t} />}
          {state === 'ASSESSMENT' && <Assessment aiEnabled={aiEnabled} onComplete={handleAssessmentComplete} t={t} />}
          {state === 'GAME' && <Game aiEnabled={aiEnabled} profile={profile} assessmentScore={assessmentScore} onComplete={handleGameComplete} t={t} />}
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
          {state === 'VOICE' && <VoiceCompanion aiEnabled={aiEnabled} lang={lang} t={t} onComplete={() => go('HOME')} />}
        </main>
      </div>
    </MotionConfig>
    </LangContext.Provider>
  );
}

export default App;
