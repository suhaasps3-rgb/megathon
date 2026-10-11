import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, MicOff, Send, Calculator, Volume2, VolumeX, Square, ArrowLeft, AlertTriangle, Info, KeyRound, Sparkles, X } from 'lucide-react';
import { parseVoiceAllocation } from '../services/llm';
import { parseOffline, offlineReply } from '../services/offlineLedger';
import { voiceState } from '../services/voiceState';
import translations from '../data/translations';
import Mascot from './brand/Mascot';
import StatusPill from './ui/StatusPill';
import EmptyState from './ui/EmptyState';
import AnimatedNumber from './ui/AnimatedNumber';

const START_BALANCE = 1000;
const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
// Example sentences the offline parser understands, so they work with or without AI.
const TRY_CHIPS = ['I spent 120 on lunch', 'I got 500 from my aunt', 'Should I buy a cycle or start a SIP?'];

export default function VoiceCompanion({ apiKey, onSetKey, lang = 'en', t, onComplete }) {
  const tt = t || translations[lang] || translations.en;
  const reduceMotion = useReducedMotion();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey || '');

  const [wallet, setWallet] = useState(START_BALANCE);
  const [ledger, setLedger] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState(() => [{ role: 'mentor', text: tt.mentorGreeting }]);

  const recognitionRef = useRef(null);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  // Speech results arrive in a callback created once, so it reads the latest handler and
  // balance through refs. Without this, a spoken message used stale state.
  const submitRef = useRef(null);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  // Blocks a second submit while one is running (for example a spoken result plus Enter).
  const busyRef = useRef(false);
  const mutedRef = useRef(isMuted);
  mutedRef.current = isMuted;
  const logEndRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;
    setHasVoiceSupport(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          setTranscript('');
          submitRef.current?.(finalTranscript);
        } else {
          interim += event.results[i][0].transcript;
          setTranscript(interim);
        }
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setTranscript('');
      setError('mic');
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    // Stop the mic and any speech when leaving, so nothing keeps running in the background.
    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try { recognition.abort(); } catch { /* already stopped */ }
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView?.({ block: 'end', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, processing, reduceMotion]);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const speak = (text) => {
    if (mutedRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // never overlap two voices
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      stopSpeaking();
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current?.start();
      } catch {
        setError('mic');
      }
    }
  };

  const toggleMute = () => {
    if (!isMuted) stopSpeaking();
    setIsMuted((m) => !m);
  };

  const handleInputSubmit = async (input) => {
    const text = (input || '').trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    setError(null);
    setNotice(null);
    setMessages((m) => [...m, { role: 'user', text }]);

    // Check for API key to enable live AI responses
    let result;
    let fellBack = false;
    if (!apiKey) {
      const askKey = "Please connect your Gemini API key using the button above to activate the live AI mentor.";
      setMessages((m) => [...m, { role: 'mentor', text: askKey }]);
      setShowKeyModal(true);
      setProcessing(false);
      setTextInput('');
      busyRef.current = false;
      speak(askKey);
      return;
    }

    try {
      result = await parseVoiceAllocation(apiKey, text, lang);
    } catch (err) {
      console.error("Gemini parse error:", err);
      result = { failed: true };
    }
    if (!result || result.failed) {
      result = parseOffline(text);
      fellBack = true;
    }
    const offline = fellBack;

    let netChange = 0;
    const newItems = [];
    if (Array.isArray(result.actions)) {
      result.actions.forEach((action) => {
        const amt = Number(action.amount);
        if (Number.isNaN(amt) || amt <= 0) return;
        if (action.type === 'expense') {
          netChange -= amt;
          newItems.push({ label: action.label || 'Expense', cost: amt, type: 'expense' });
        } else if (action.type === 'income') {
          netChange += amt;
          newItems.push({ label: action.label || 'Income', cost: amt, type: 'income' });
        }
      });
    }

    const newBalance = walletRef.current + netChange;
    setLedger((prev) => [...prev, ...newItems]);
    setWallet((prev) => prev + netChange);

    const reply = offline
      ? offlineReply(result.actions || [], newBalance, text)
      : result.companionResponse || offlineReply(result.actions || [], newBalance, text);
    setMessages((m) => [...m, { role: 'mentor', text: reply }]);
    if (fellBack) setNotice(tt.mentorFellBack);
    setProcessing(false);
    setTextInput('');
    busyRef.current = false;
    speak(reply);
  };
  submitRef.current = handleInputSubmit;

  const handleExit = () => {
    stopSpeaking();
    onComplete();
  };

  const state = voiceState({ listening: isListening, processing, speaking, error });
  const stateLabel = {
    idle: tt.mentorStateIdle,
    listening: tt.mentorStateListening,
    thinking: tt.mentorStateThinking,
    speaking: tt.mentorStateSpeaking,
    error: tt.mentorStateError,
  }[state];

  const spent = ledger.filter((i) => i.type === 'expense').reduce((n, i) => n + i.cost, 0);
  const received = ledger.filter((i) => i.type === 'income').reduce((n, i) => n + i.cost, 0);
  const flowTotal = spent + received;
  const balanceTone = wallet <= 0 ? 'text-rose-600' : wallet < START_BALANCE * 0.2 ? 'text-saffron-600' : 'text-teal-600';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Mascot size={56} mood={state === 'thinking' ? 'think' : 'happy'} talking={state === 'speaking'} />
          <div>
            <h1 className="text-3xl font-extrabold text-ink-900">{tt.mentorTitle}</h1>
            <p className="text-slate-600">{tt.mentorSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {apiKey ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Gemini AI Active
              <button
                type="button"
                onClick={() => {
                  setKeyInput(apiKey);
                  setShowKeyModal(true);
                }}
                className="ml-1 text-[11px] underline text-emerald-700 hover:text-emerald-950"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setKeyInput('');
                setShowKeyModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border-2 border-purple-400 bg-purple-100 px-3.5 py-2 text-xs font-black text-purple-900 transition hover:bg-purple-200 animate-pulse"
            >
              <KeyRound size={14} /> Connect Gemini API Key
            </button>
          )}

          <StatusPill state={state} label={stateLabel} />
          {speaking && (
            <button type="button" onClick={stopSpeaking} className="btn-secondary min-h-[44px] px-4 text-sm">
              <Square size={14} aria-hidden="true" /> {tt.mentorStop}
            </button>
          )}
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? tt.mentorUnmute : tt.mentorMute}
            title={isMuted ? tt.mentorUnmute : tt.mentorMute}
            className="btn-secondary min-h-[44px] px-3"
          >
            {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          </button>
          <button type="button" onClick={handleExit} className="btn-primary min-h-[44px] px-4 text-sm">
            <ArrowLeft size={16} aria-hidden="true" /> {tt.mentorBack}
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section aria-label={tt.mentorChat} className="card flex flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5" style={{ minHeight: '20rem', maxHeight: 'min(60vh, 32rem)' }} role="log" aria-live="polite">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    m.role === 'user' ? 'rounded-tr-md bg-ink-900 text-white' : 'rounded-tl-md border border-purple-100 bg-purple-50 text-ink-900'
                  }`}
                >
                  <span className="sr-only">{m.role === 'user' ? `${tt.mentorYou}: ` : 'PaisaPath: '}</span>
                  {m.text}
                </p>
              </motion.div>
            ))}

            {isListening && (
              <div className="flex justify-end">
                <p className="max-w-[88%] rounded-2xl rounded-tr-md border-2 border-dashed border-rose-300 px-4 py-3 text-[15px] text-rose-800">
                  {transcript || tt.mentorStateListening}
                </p>
              </div>
            )}

            {processing && (
              <div className="flex items-center gap-1.5 px-2" aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            )}
            <div ref={logEndRef} />
          </div>

          {notice && (
            <p className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-saffron-50 px-3 py-2 text-sm text-saffron-900">
              <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {notice}
            </p>
          )}
          {error === 'mic' && (
            <p role="alert" className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {tt.mentorMicError}
            </p>
          )}

          <div className="border-t border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              {hasVoiceSupport && (
                <button
                  type="button"
                  onClick={toggleListen}
                  aria-pressed={isListening}
                  aria-label={isListening ? tt.mentorListenStop : tt.mentorListenStart}
                  title={isListening ? tt.mentorListenStop : tt.mentorListenStart}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white transition active:scale-95 ${
                    isListening ? 'bg-rose-600 shadow-lg shadow-rose-500/40' : 'bg-purple-600 shadow-glow hover:bg-purple-700'
                  }`}
                >
                  {isListening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
                </button>
              )}
              <label className="flex-1">
                <span className="sr-only">{tt.mentorPlaceholder}</span>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(textInput)}
                  placeholder={isListening ? tt.mentorStateListening : tt.mentorPlaceholder}
                  disabled={isListening}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-medium text-ink-900 outline-none transition focus:border-purple-500 disabled:bg-slate-100"
                />
              </label>
              <button
                type="button"
                onClick={() => handleInputSubmit(textInput)}
                disabled={!textInput.trim() || processing}
                aria-label={tt.mentorSend}
                title={tt.mentorSend}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white transition active:scale-95 hover:bg-ink-800 disabled:opacity-40"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
            {!hasVoiceSupport && <p className="mt-2 text-sm text-slate-600">{tt.mentorNoVoice}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{tt.mentorTry}</span>
              {TRY_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={processing}
                  onClick={() => handleInputSubmit(chip)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-700 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-label={tt.mentorLedger} className="card flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-ink-900">{tt.mentorLedger}</h2>
            <span className="tag-sim">{tt.simulated}</span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">
            <span className="font-bold">{tt.mentorStarting}</span>
            <span className="font-extrabold tabular-nums text-ink-900">{inr(START_BALANCE)}</span>
          </div>

          <div className="mt-3 flex-1 space-y-2 overflow-y-auto" style={{ minHeight: '8rem', maxHeight: '18rem' }}>
            {ledger.length === 0 ? (
              <EmptyState icon={Calculator} title={tt.mentorEmpty} />
            ) : (
              <AnimatePresence initial={false}>
                {ledger.map((item, i) => (
                  <motion.div
                    key={i}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 font-bold ${
                      item.type === 'income' ? 'border-teal-100 bg-teal-50 text-teal-800' : 'border-rose-100 bg-rose-50 text-rose-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="tabular-nums">{item.type === 'income' ? '+' : '−'}{inr(item.cost)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {flowTotal > 0 && (
            <div className="mt-4" role="img" aria-label={`${tt.mentorSpent} ${inr(spent)}, ${tt.mentorReceived} ${inr(received)}`}>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-rose-400 transition-all duration-500" style={{ width: `${(spent / flowTotal) * 100}%` }} />
                <div className="bg-teal-500 transition-all duration-500" style={{ width: `${(received / flowTotal) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs font-bold text-slate-600">
                <span>{tt.mentorSpent} {inr(spent)}</span>
                <span>{tt.mentorReceived} {inr(received)}</span>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-end justify-between border-t-2 border-ink-900 pt-4">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-600">{tt.mentorRemaining}</span>
            <span className={`font-display text-4xl font-extrabold tabular-nums ${balanceTone}`}>
              ₹<AnimatedNumber value={wallet} />
            </span>
          </div>
        </section>
      </div>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink-900">
                <KeyRound size={20} className="text-purple-600" /> Connect Gemini API
              </h2>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Paste your Gemini API key below to activate the live AI conversational mentor for your demo.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (keyInput.trim()) {
                  onSetKey?.(keyInput.trim());
                  setShowKeyModal(false);
                  const conf = "Gemini AI is now connected and ready! Ask me anything about money, budgeting, or investing.";
                  setMessages((m) => [...m, { role: 'mentor', text: conf }]);
                  speak(conf);
                }
              }}
              className="mt-4 space-y-4"
            >
              <input
                type="password"
                autoFocus
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter Gemini API Key..."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-purple-600 focus:bg-white"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!keyInput.trim()}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
