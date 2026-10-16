import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { parseVoiceAllocation } from '../services/llm';
import { parseOffline, offlineReply } from '../services/offlineLedger';

// Phones and tablets have no Spacebar, so they get instructions for the on-screen button instead.
const isTouchOnly = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

export default function BlindMode({ aiEnabled, lang, t, onExit }) {
  const [wallet, setWallet] = useState(1000);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState(() => (isTouchOnly() ? t.blindWelcomeTouch : t.blindWelcome));

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const messageRef = useRef(message);
  messageRef.current = message;

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Small delay to let the browser fully flush the previous utterance before starting new one
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  const say = (text) => {
    setMessage(text);
    speak(text);
  };

  const startListening = () => {
    if (isListeningRef.current || isProcessingRef.current) return;
    window.speechSynthesis?.cancel();
    if (!recognitionRef.current) {
      say(t.blindNoVoice);
      return;
    }
    try { recognitionRef.current.start(); } catch { /* already started */ }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      speak(messageRef.current);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        // Guard: only process once per recording session
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        const transcript = event.results[0][0].transcript;
        processRef.current(transcript);
      };

      recognition.onerror = (e) => {
        isListeningRef.current = false;
        setIsListening(false);
        if (e?.error === 'aborted') return;
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') say(t.blindMicDenied);
        else if (e?.error === 'no-speech') say(t.blindNoSpeech);
        else say(t.blindMicError);
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      say(t.blindNoVoice);
    }

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) startListening();
      }
      if (e.code === 'KeyR' && !e.repeat) {
        // R key = Repeat last message
        speak(messageRef.current);
      }
      if (e.code === 'Escape') {
        window.speechSynthesis?.cancel();
        onExit();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.speechSynthesis?.cancel();
      try { recognitionRef.current?.abort(); } catch { /* already stopped */ }
    };
  }, []);

  const processInput = async (transcript) => {
    setMessage(t.processing);

    // Without AI, or when the AI cannot be reached, Audio Mode still answers locally.
    // API error text is never spoken or shown; the offline reply replaces it.
    let result;
    let fellBack = false;
    if (!aiEnabled) {
      result = parseOffline(transcript);
    } else {
      try {
        result = await parseVoiceAllocation(transcript, lang);
      } catch {
        result = { failed: true };
      }
      if (!result || result.failed) {
        result = parseOffline(transcript);
        fellBack = true;
      }
    }
    const offline = !aiEnabled || fellBack;

    let netChange = 0;
    if (result.actions && Array.isArray(result.actions)) {
      result.actions.forEach(action => {
        const amt = Number(action.amount);
        if (!isNaN(amt) && amt > 0) {
          if (action.type === 'expense') netChange -= amt;
          if (action.type === 'income') netChange += amt;
        }
      });
    }

    setWallet(prev => {
      const newWallet = prev + netChange;
      let reply = result.companionResponse || offlineReply(result.actions || [], newWallet, transcript);
      if (offline) {
        reply = offlineReply(result.actions || [], newWallet, transcript);
        if (fellBack && t.mentorFellBack) reply = `${t.mentorFellBack} ${reply}`;
      } else if (netChange !== 0) {
        reply += ` Your new balance is ${newWallet} rupees.`;
      }
      setMessage(reply);
      speak(reply);
      isProcessingRef.current = false; // Ready for next input
      return newWallet;
    });
  };
  // Speech results arrive in a callback created once, so it calls the latest handler through a ref.
  const processRef = useRef(processInput);
  processRef.current = processInput;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black">
      <div className="flex min-h-full flex-col items-center px-4 pb-10 pt-4 text-center sm:p-8">
        <button
          onClick={() => {
            window.speechSynthesis?.cancel();
            onExit();
          }}
          className="self-end rounded-xl border-2 border-yellow-400 px-5 py-2 text-lg font-bold text-yellow-400 transition-colors hover:bg-yellow-400 hover:text-black sm:px-6 sm:py-3 sm:text-xl"
          aria-label={t.exitBtn}
        >
          {t.blindExit} <span className="hidden [@media(hover:hover)]:inline">(Esc)</span>
        </button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <button
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerCancel={stopListening}
            onContextMenu={(e) => e.preventDefault()}
            className={`mt-6 touch-none select-none rounded-full p-10 transition-colors sm:p-16 ${isListening ? 'bg-red-600 scale-110 animate-pulse' : 'bg-yellow-400 hover:bg-yellow-300'}`}
            aria-label="Hold to record your voice"
          >
            {isListening ? (
              <MicOff size={140} className="h-24 w-24 text-white sm:h-36 sm:w-36" />
            ) : (
              <Mic size={140} className="h-24 w-24 text-black sm:h-36 sm:w-36" />
            )}
          </button>

          <h1 className="mt-10 max-w-5xl text-2xl font-black leading-relaxed tracking-wide text-yellow-400 sm:mt-16 sm:text-4xl md:text-5xl" aria-live="polite">
            {message}
          </h1>

          <p className="mt-8 hidden text-xl font-bold tracking-widest text-white/60 sm:mt-10 sm:text-2xl [@media(hover:hover)]:block">
            {t.holdSpacebar} <span className="mx-2 rounded-lg bg-white/20 px-4 py-2 text-white">{t.spacebar}</span> {t.toSpeak}
          </p>
          <p className="mt-8 text-xl font-bold text-white/70 [@media(hover:hover)]:hidden">{t.blindTouchHint}</p>

          <button
            onClick={() => speak(message)}
            className="mt-6 rounded-xl border-2 border-yellow-400 px-8 py-4 text-xl font-bold text-yellow-400 transition-colors hover:bg-yellow-400 hover:text-black"
            aria-label="Repeat last message"
          >
            🔁 {t.blindRepeat} <span className="hidden [@media(hover:hover)]:inline">(R)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
