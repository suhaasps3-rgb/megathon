import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { parseVoiceAllocation } from '../services/llm';

export default function BlindMode({ apiKey, lang, t, onExit }) {
  const [wallet, setWallet] = useState(1000);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState(t.blindWelcome);
  
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    speak(message);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
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
        processInput(transcript);
      };

      recognition.onerror = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !isListeningRef.current && !isProcessingRef.current) {
          window.speechSynthesis.cancel();
          try { recognitionRef.current?.start(); } catch(err) {}
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
      if (e.code === 'Space') {
        e.preventDefault();
        recognitionRef.current?.stop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
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
      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  const processInput = async (transcript) => {
    if (!apiKey) {
      const errorMsg = "API Key is missing. Please press Escape to exit and enter your key in the setup screen.";
      setMessage(errorMsg);
      speak(errorMsg);
      return;
    }

    setMessage(t.processing);
    
    const result = await parseVoiceAllocation(apiKey, transcript, lang);
    
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
      let reply = result.companionResponse;
      if (netChange !== 0) {
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
    window.speechSynthesis.cancel();
    recognitionRef.current?.start();
  };

  const handleMouseRelease = () => {
    recognitionRef.current?.stop();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-8 text-center">
      
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

      <h1 className="text-yellow-400 text-4xl md:text-5xl font-black mt-16 max-w-5xl leading-relaxed tracking-wide" aria-live="polite">
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
      
      <button 
        onClick={() => {
          window.speechSynthesis.cancel();
          onExit();
        }}
        className="absolute top-8 right-8 text-yellow-400 border-2 border-yellow-400 px-6 py-3 rounded-xl font-bold text-xl hover:bg-yellow-400 hover:text-black transition-colors"
      >
        {t.exitBtn}
      </button>
    </div>
  );
}
