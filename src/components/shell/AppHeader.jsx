import React, { useEffect, useState } from 'react';
import { BookOpen, Gamepad2, Box, Mic, Eye, Menu, X, Building2 } from 'lucide-react';
import { Logo } from '../brand/Mascot.jsx';

export const LEARN_STATES = ['ONBOARDING', 'ASSESSMENT', 'GAME', 'REPORT'];

const LANGS = [
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'hi', short: 'हि', name: 'हिन्दी' },
  { code: 'te', short: 'తె', name: 'తెలుగు' },
];

/**
 * Top navigation. Desktop shows every destination; phones get a menu sheet so nothing is
 * squeezed. `onNavigate` receives LEARN, LIFE, NEIGHBORHOOD, VOICE, HOME or BLIND_MODE.
 */
export default function AppHeader({ t, state, lang, setLang, onNavigate, onNgo }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (to) => {
    setOpen(false);
    onNavigate(to);
  };

  const items = [
    { to: 'LEARN', label: t.navLearn, icon: BookOpen, active: LEARN_STATES.includes(state) },
    { to: 'LIFE', label: t.lifeMode, icon: Gamepad2, active: state === 'LIFE' },
    { to: 'NEIGHBORHOOD', label: t.nav3d, icon: Box, active: state === 'NEIGHBORHOOD' },
    { to: 'VOICE', label: t.navMentor, icon: Mic, active: state === 'VOICE' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => go('HOME')}
          aria-label={`${t.appName}, ${t.navHome}`}
          aria-current={state === 'HOME' ? 'page' : undefined}
          className="-ml-1 rounded-xl px-1 py-1"
        >
          <Logo name={t.appName} />
        </button>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {items.map(({ to, label, icon: Icon, active }) => (
            <button
              key={to}
              type="button"
              onClick={() => go(to)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                active ? 'bg-ink-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-ink-900'
              }`}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch t={t} lang={lang} setLang={setLang} className="hidden md:flex" />
          <button
            type="button"
            onClick={() => go('BLIND_MODE')}
            aria-label={t.audioMode}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-saffron-300 px-3 text-sm font-bold text-ink-900 transition hover:bg-saffron-400"
          >
            <Eye size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{t.audioShort}</span>
          </button>
          <button
            type="button"
            onClick={onNgo}
            className="hidden min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 lg:inline-flex"
          >
            <Building2 size={16} aria-hidden="true" /> {t.navNgo}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.navClose : t.navMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-900 hover:bg-slate-100 lg:hidden"
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-slate-200/70 bg-white px-4 pb-5 pt-3 shadow-lift lg:hidden">
          <nav aria-label="Main" className="grid gap-1">
            {items.map(({ to, label, icon: Icon, active }) => (
              <button
                key={to}
                type="button"
                onClick={() => go(to)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-left font-bold ${
                  active ? 'bg-ink-900 text-white' : 'text-ink-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} aria-hidden="true" /> {label}
              </button>
            ))}
            <button type="button" onClick={() => { setOpen(false); onNgo(); }} className="flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-left font-bold text-slate-600 hover:bg-slate-100">
              <Building2 size={20} aria-hidden="true" /> {t.navNgo}
            </button>
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="text-sm font-bold text-slate-600">{t.navLanguage}</span>
            <LanguageSwitch t={t} lang={lang} setLang={setLang} />
          </div>
        </div>
      )}
    </header>
  );
}

function LanguageSwitch({ t, lang, setLang, className = 'flex' }) {
  return (
    <div role="group" aria-label={t.navLanguage} className={`${className} rounded-xl bg-slate-100 p-1`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          aria-label={l.name}
          className={`min-h-[36px] min-w-[40px] rounded-lg px-2 text-sm font-bold transition ${
            lang === l.code ? 'bg-white text-ink-900 shadow-sm' : 'text-slate-600 hover:text-ink-900'
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
