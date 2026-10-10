import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, X, ShieldAlert, Sparkles, Send, Calculator, Volume2, VolumeX } from 'lucide-react';
import { parseVoiceAllocation } from '../services/llm';
import { parseOffline, offlineReply } from '../services/offlineLedger';

export default function VoiceCompanion({ apiKey, onComplete }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const [wallet, setWallet] = useState(1000); // Dynamic wallet
  const [ledger, setLedger] = useState([]);
  
  const [processing, setProcessing] = useState(false);
  const [companionReply, setCompanionReply] = useState("Hey! I'm your PaisaPath Mentor. Ask me any financial question, or tell me what you spent your pocket money on today so I can track your ledger.");

  const recognitionRef = useRef(null);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setHasVoiceSupport(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            setTranscript(finalTranscript);
            handleInputSubmit(finalTranscript);
          } else {
            interim += event.results[i][0].transcript;
            setTranscript(interim);
          }
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []); // Removed phase dependency

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  const handleInputSubmit = async (input) => {
    if (!input.trim()) return;
    setProcessing(true);
    setTranscript(input);
    
    // Without a key the mentor still logs simple sentences locally.
    const offline = !apiKey;
    const result = offline ? parseOffline(input) : await parseVoiceAllocation(apiKey, input);
    
    let netChange = 0;
    const newLedgerItems = [];
    
    if (result.actions && Array.isArray(result.actions)) {
      result.actions.forEach(action => {
        const amt = Number(action.amount);
        if (isNaN(amt) || amt <= 0) return;
        
        if (action.type === 'expense') {
           netChange -= amt;
           newLedgerItems.push({ label: action.label || 'Expense', cost: amt, type: 'expense' });
        } else if (action.type === 'income') {
           netChange += amt;
           newLedgerItems.push({ label: action.label || 'Income', cost: amt, type: 'income' });
        }
      });
    }

    setLedger([...ledger, ...newLedgerItems]);
    setWallet(prev => prev + netChange);

    const reply = offline ? offlineReply(result.actions, wallet + netChange) : result.companionResponse;
    setCompanionReply(reply);
    setProcessing(false);
    setTextInput('');

    // Text-to-Speech
    if (!isMuted && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop current speech if any
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly friendly tone
      window.speechSynthesis.speak(utterance);
    }
  };

  // Stop talking if they exit the module
  const handleExit = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-[80vh] flex flex-col justify-center">
      
      <div className="flex justify-between items-end mb-8 border-b-2 border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Mic className="text-purple-500" size={32} /> PaisaPath Mentor
          </h2>
          <p className="text-slate-500 font-medium mt-1">Open-ended financial sandbox.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (!isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
              setIsMuted(!isMuted);
            }}
            className={`px-4 py-3 font-bold rounded-xl transition-colors flex items-center gap-2 ${isMuted ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
            title="Toggle Voice Output"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button 
            onClick={handleExit}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Check size={18} /> Return to Game
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Companion Chat Panel */}
        <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col border border-slate-700 h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full"></div>
          
          <div className="flex-1 flex flex-col justify-end space-y-6 z-10 mb-8 overflow-y-auto pr-2 pb-4">
            {transcript && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-700 p-4 rounded-2xl rounded-tr-sm w-[85%] self-end"
              >
                <p className="text-slate-200 font-medium">
                  {transcript}
                </p>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={companionReply}
              className="bg-indigo-500/20 border border-indigo-500/30 p-4 rounded-2xl rounded-tl-sm w-[85%]"
            >
              <p className="text-indigo-100 font-medium leading-relaxed">
                {companionReply}
              </p>
            </motion.div>

            {processing && (
              <div className="flex gap-2 items-center text-purple-400 font-bold text-sm">
                <Sparkles size={16} className="animate-pulse" /> Processing intent...
              </div>
            )}
          </div>

          <div className="z-10 bg-slate-800 p-2 rounded-2xl flex items-center gap-2 border border-slate-700">
            {hasVoiceSupport ? (
              <button 
                onClick={toggleListen}
                className={`p-4 rounded-xl transition-all flex items-center justify-center ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'}`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            ) : null}
            <input 
              type="text" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(textInput)}
              placeholder={isListening ? "Listening..." : "Or type your response here..."}
              className="flex-1 bg-transparent text-white px-4 outline-none font-medium"
              disabled={isListening || processing}
            />
            <button 
              onClick={() => handleInputSubmit(textInput)}
              disabled={!textInput.trim() || processing}
              className="p-4 bg-slate-700 text-teal-400 rounded-xl hover:bg-slate-600 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Ledger Panel */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden h-[500px]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Calculator size={120} />
          </div>
          
          <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tight relative z-10 border-b-2 border-slate-100 pb-4">
            Live Ledger
          </h3>
          
          <div className="flex-1 flex flex-col justify-start relative z-10 space-y-4 overflow-y-auto pr-2 pb-4">
            <div className="flex justify-between items-center text-lg font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span>Starting Balance</span>
              <span className="text-slate-800">₹1000</span>
            </div>
            
            <AnimatePresence>
              {ledger.map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex justify-between items-center text-lg font-bold p-3 rounded-xl border ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}
                >
                  <span>{item.label}</span>
                  <span>{item.type === 'income' ? '+' : '-'}₹{item.cost}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <div className="mt-4 pt-6 border-t-4 border-slate-800 relative z-10 flex justify-between items-end bg-white">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-sm">Remaining Balance</span>
            <span className={`text-4xl font-black ${wallet > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ₹{wallet}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
