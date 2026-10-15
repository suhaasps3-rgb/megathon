import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, KeyRound, Sparkles, Check, X } from 'lucide-react';
import { parseVoiceAllocation } from '../services/llm';
import { parseOffline, offlineReply } from '../services/offlineLedger';

export default function BlindMode({ apiKey, onSetKey, lang, t, onExit }) {
  const [wallet, setWallet] = useState(1000);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState(t.blindWelcome);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey || '');
  
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const langRef = useRef(lang);
  const isHeldRef = useRef(false);
  const currentTranscriptRef = useRef('');
  const [lastHeard, setLastHeard] = useState('');

  useEffect(() => {
    langRef.current = lang;
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
    }
  }, [lang]);

  useEffect(() => {
    speak(message);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
      
      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let full = '';
        for (let i = 0; i < event.results.length; ++i) {
          full += event.results[i][0].transcript + ' ';
        }
        const trimmed = full.trim();
        currentTranscriptRef.current = trimmed;
        setMessage(trimmed ? `"${trimmed}"` : "Listening...");
      };

      recognition.onerror = () => {
        if (!isHeldRef.current) {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // If user is STILL holding the spacebar or mouse, keep listening!
        if (isHeldRef.current) {
          try { recognition.start(); } catch(e) {}
          return;
        }
        isListeningRef.current = false;
        setIsListening(false);
        const textToProcess = currentTranscriptRef.current.trim();
        currentTranscriptRef.current = '';
        if (textToProcess && !isProcessingRef.current) {
          isProcessingRef.current = true;
          setLastHeard(textToProcess);
          processInput(textToProcess);
        } else {
          isProcessingRef.current = false;
        }
      };
      
      recognitionRef.current = recognition;
    }

    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !isHeldRef.current && !isProcessingRef.current) {
          isHeldRef.current = true;
          window.speechSynthesis.cancel();
          currentTranscriptRef.current = '';
          try {
            if (recognitionRef.current) {
              const curLang = langRef.current || lang;
              recognitionRef.current.lang = curLang === 'hi' ? 'hi-IN' : curLang === 'te' ? 'te-IN' : 'en-IN';
            }
            recognitionRef.current?.start();
          } catch(err) {}
        }
      }
      if (e.code === 'KeyR' && !e.repeat) {
        // R key = Repeat last message
        speak(message);
      }
      if (e.code === 'Escape') {
        window.speechSynthesis.cancel();
        onExit();
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space' && isHeldRef.current) {
        e.preventDefault();
        isHeldRef.current = false;
        // Small delay to capture the final word spoken right as space was released
        setTimeout(() => {
          try { recognitionRef.current?.stop(); } catch(err) {}
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      isHeldRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    // Small delay to let the browser fully flush the previous utterance before starting new one
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const curLang = langRef.current || lang;
      utterance.lang = curLang === 'hi' ? 'hi-IN' : curLang === 'te' ? 'te-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  const processInput = async (transcript) => {
    if (!apiKey) {
      const missingMsg = "Gemini API key is required for AI Audio Mode. Please click Connect Key above to enter your API key.";
      setMessage(missingMsg);
      speak(missingMsg);
      setShowKeyModal(true);
      isProcessingRef.current = false;
      return;
    }

    setMessage(t.processing || "Processing your response...");

    let result = null;
    let offline = false;

    try {
      result = await parseVoiceAllocation(apiKey, transcript, langRef.current || lang);
    } catch (err) {
      console.warn("Gemini voice error, falling back:", err);
      offline = true;
      result = parseOffline(transcript);
    }

    // Without a key, or when the AI cannot be reached, Audio Mode still answers locally.
    // API error text is never spoken or shown; the offline reply replaces it.
    let result;
    let fellBack = false;
    if (!apiKey) {
      result = parseOffline(transcript);
    } else {
      try {
        result = await parseVoiceAllocation(apiKey, transcript, lang);
      } catch {
        result = { failed: true };
      }
      if (!result || result.failed) {
        result = parseOffline(transcript);
        fellBack = true;
      }
    }
    const offline = !apiKey || fellBack;

    if (!result) {
      result = parseOffline(transcript);
      offline = true;
    }
    
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

  // For users who use screen readers but still want to click
  const handleMousePress = () => {
    isHeldRef.current = true;
    window.speechSynthesis.cancel();
    currentTranscriptRef.current = '';
    if (recognitionRef.current) {
      const curLang = langRef.current || lang;
      recognitionRef.current.lang = curLang === 'hi' ? 'hi-IN' : curLang === 'te' ? 'te-IN' : 'en-IN';
    }
    try { recognitionRef.current?.start(); } catch(e) {}
  };

  const handleMouseRelease = () => {
    if (isHeldRef.current) {
      isHeldRef.current = false;
      setTimeout(() => {
        try { recognitionRef.current?.stop(); } catch(err) {}
      }, 300);
    }
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (keyInput.trim()) {
      onSetKey?.(keyInput.trim());
      setShowKeyModal(false);
      const conf = "Gemini API key connected! AI Audio Mode is active. Hold the spacebar to speak.";
      setMessage(conf);
      speak(conf);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
      
      {/* Top Bar: API Key status / button + Exit Button */}
      <div className="absolute top-6 inset-x-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {apiKey ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/60 px-4 py-2 text-sm font-black text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini AI Connected
              </span>
              <button
                type="button"
                onClick={() => {
                  setKeyInput(apiKey);
                  setShowKeyModal(true);
                }}
                className="rounded-xl border border-yellow-400/60 px-3 py-2 text-xs font-bold text-yellow-300 hover:bg-yellow-400 hover:text-black transition"
              >
                Change Key
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setKeyInput('');
                setShowKeyModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500/20 border-2 border-amber-400 px-4 py-2 font-black text-sm text-amber-300 hover:bg-amber-400 hover:text-black transition animate-bounce"
            >
              <KeyRound size={16} /> Connect Gemini API Key
            </button>
          )}
        </div>

        <button 
          onClick={() => {
            window.speechSynthesis.cancel();
            onExit();
          }}
          className="text-yellow-400 border-2 border-yellow-400 px-6 py-3 rounded-xl font-bold text-xl hover:bg-yellow-400 hover:text-black transition-colors"
        >
          {t.exitBtn}
        </button>
      </div>

      <button 
        onMouseDown={handleMousePress}
        onMouseUp={handleMouseRelease}
        onTouchStart={handleMousePress}
        onTouchEnd={handleMouseRelease}
        className={`p-16 rounded-full transition-colors ${isListening ? 'bg-red-600 scale-110 animate-pulse' : 'bg-yellow-400 hover:bg-yellow-300'}`}
        aria-label="Hold to record your voice"
      >
        {isListening ? (
          <MicOff size={140} className="text-white" />
        ) : (
          <Mic size={140} className="text-black" />
        )}
      </button>

      {lastHeard && (
        <div className="mt-8 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-bold text-xl md:text-2xl px-6 py-2.5 rounded-2xl max-w-4xl shadow-lg">
          🎤 You said: &ldquo;{lastHeard}&rdquo;
        </div>
      )}

      <h1 className="text-yellow-400 text-3xl md:text-5xl font-black mt-6 max-w-5xl leading-relaxed tracking-wide" aria-live="polite">
        {message}
      </h1>

      <p className="text-white/60 mt-10 text-2xl font-bold tracking-widest">
        {t.holdSpacebar} <span className="text-white bg-white/20 px-4 py-2 rounded-lg mx-2">{t.spacebar}</span> {t.toSpeak}
      </p>

      <button
        onClick={() => speak(message)}
        className="mt-6 text-yellow-400 border-2 border-yellow-400 px-8 py-4 rounded-xl font-bold text-xl hover:bg-yellow-400 hover:text-black transition-colors"
        aria-label="Repeat last message"
      >
        🔁 {t.repeatBtn}
      </button>

      {/* Modal for setting API key inside Audio Mode */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-yellow-400 rounded-3xl p-6 text-left shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
                <KeyRound size={22} /> Gemini API Key
              </h2>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-300 font-medium">
              Enter or paste your Google Gemini API key below to activate live voice AI for your demo.
            </p>
            <form onSubmit={handleSaveKey} className="mt-5 space-y-4">
              <input
                type="password"
                autoFocus
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste Gemini API key here..."
                className="w-full rounded-xl border-2 border-yellow-400/60 bg-black px-4 py-3 font-mono text-sm text-yellow-300 outline-none focus:border-yellow-400 placeholder:text-slate-600"
              />
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!keyInput.trim()}
                  className="rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-black text-black hover:bg-yellow-300 disabled:opacity-50"
                >
                  Save & Connect AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
