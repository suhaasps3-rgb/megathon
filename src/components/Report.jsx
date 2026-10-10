import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, RotateCcw, Share2, Sparkles, Flame, Snowflake, TrendingUp } from 'lucide-react';

export default function Report({ data, onRestart }) {
  const { wallet, history, futureWealth } = data;
  const initialWallet = 1000;
  const spent = initialWallet - wallet;
  
  const [persona, setPersona] = useState(null);

  useEffect(() => {
    // Calculate Aura Points based on gameplay choices
    let score = 1000; // Base aura
    if (history && history.length > 0) {
      history.forEach(item => {
        if (item.choice && item.choice.isGood) score += 500;
        else score -= 300;
      });
    }
    if (wallet >= (data.profile?.goal?.cost || 0)) score += 2000;
    if (futureWealth > 1000) score += 1500;
    
    // Logic to determine the Gen Z "Aura"
    if (spent > 600) {
      setPersona({
        title: "The Delusional Spender 💸",
        aura: "from-pink-500 to-rose-500",
        icon: Flame,
        score: score - 1000, // Penalize for spending too much
        roast: "Bro really dropped most of their net worth on temporary vibes. Have fun eating plain Maggi next week! 💀"
      });
    } else if (spent === 0 && (!futureWealth || futureWealth < 200)) {
      setPersona({
        title: "The Mattress Stuffer 🛏️",
        aura: "from-slate-400 to-slate-600",
        icon: Snowflake,
        score: score,
        roast: "You saved everything, but you're just letting inflation eat your cash. Wasted potential tbh. Do something with it!"
      });
    } else if (futureWealth && futureWealth > 500) {
      setPersona({
        title: "The Stealth Millionaire 🚀",
        aura: "from-teal-400 to-emerald-600",
        icon: TrendingUp,
        score: score + 1000,
        roast: "Quietly compounding while your friends buy dumb skins. Massive W. We see you, future CEO. 📈"
      });
    } else {
      setPersona({
        title: "The Balanced Vibez ⚖️",
        aura: "from-purple-500 to-indigo-500",
        icon: Sparkles,
        score: score,
        roast: "Not too broke, not too greedy. You lived a little and saved a little. Massive respect for the balanced flex. ✨"
      });
    }
  }, [spent, futureWealth, history, wallet, data.profile]);

  return (
    <div className="max-w-4xl mx-auto p-4 pt-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">Your Run is Complete</h1>
        <p className="text-slate-500 text-lg font-medium">Here is your official financial diagnosis.</p>
      </div>

      {/* Goal Outcome Banner */}
      {data.profile?.goal && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-12 rounded-3xl p-8 border-2 shadow-xl flex flex-col md:flex-row items-center gap-6 justify-center text-center md:text-left ${
            wallet >= data.profile.goal.cost 
              ? 'bg-emerald-50 border-emerald-200 shadow-emerald-500/20'
              : 'bg-red-50 border-red-200 shadow-red-500/20'
          }`}
        >
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl bg-white shadow-inner ${
            wallet >= data.profile.goal.cost ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {data.profile.goal.icon}
          </div>
          <div>
            <h2 className={`text-3xl font-black mb-2 ${
              wallet >= data.profile.goal.cost ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {wallet >= data.profile.goal.cost ? 'Goal Unlocked! 🏆' : 'Goal Failed ❌'}
            </h2>
            <p className={`text-lg font-medium ${
              wallet >= data.profile.goal.cost ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {wallet >= data.profile.goal.cost 
                ? `You successfully saved ₹${data.profile.goal.cost} for your ${data.profile.goal.label}!`
                : `You needed ₹${data.profile.goal.cost} for your ${data.profile.goal.label}, but you only had ₹${wallet} left.`}
            </p>
          </div>
        </motion.div>
      )}

      {persona && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="max-w-md mx-auto mb-12 perspective-1000"
        >
          {/* The Holographic Aura Card */}
          <div className={`relative rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden bg-gradient-to-br ${persona.aura}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md mb-6">
                Your Financial Aura
              </span>
              
              <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/20">
                <persona.icon size={48} className="text-white drop-shadow-md" />
              </div>
              
              <h2 className="text-3xl font-black mb-1 leading-tight">{persona.title}</h2>
              <div className="text-xl font-bold text-white/90 mb-6 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-300" /> 
                {persona.score.toLocaleString()} Aura Points
              </div>
              
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/10 w-full">
                <p className="font-medium text-white/90 italic">"{persona.roast}"</p>
              </div>

              <div className="flex justify-between w-full text-sm font-bold bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-left">
                  <span className="block text-white/60 text-xs uppercase">Spent</span>
                  ₹{spent}
                </div>
                <div className="text-right">
                  <span className="block text-white/60 text-xs uppercase">Age 30 Vault</span>
                  ₹{futureWealth?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
            <Share2 size={20} /> Share to Insta Story
          </button>
        </motion.div>
      )}

      {/* Decision Log Below */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <h3 className="font-black text-slate-800 text-xl mb-6">The Receipts (Decision History)</h3>
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <p className="text-slate-600 font-medium text-sm mb-3">{item.decision}</p>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <p className="font-bold text-slate-800">{item.choice.text}</p>
              </div>
              <p className={`text-sm font-bold ${item.choice.isGood ? 'text-teal-600' : 'text-amber-600'}`}>
                ↳ {item.choice.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 text-center">
        <button 
          onClick={onRestart}
          className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-2 shadow-xl hover:shadow-purple-500/20"
        >
          <RotateCcw size={20} /> Play Another Run
        </button>
      </div>
    </div>
  );
}


