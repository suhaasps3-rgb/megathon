import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Gamepad2, Trophy, Clapperboard, Music, Monitor, Palette, BookOpen, BarChart3, Image as ImageIcon, Target, User } from 'lucide-react';

const AVATARS = ['😎', '👩‍💻', '🥷', '🧑‍🎨', '🕵️', '🧑‍🚀'];

const INTERESTS = [
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'movies', label: 'Movies', icon: Clapperboard },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'tech', label: 'Tech', icon: Monitor },
  { id: 'art', label: 'Art', icon: Palette }
];

const LEARNING_STYLES = [
  { id: 'story', label: 'Stories & Narratives', desc: 'Learn through engaging characters', icon: BookOpen },
  { id: 'analytical', label: 'Facts & Numbers', desc: 'Direct, clear percentages & math', icon: BarChart3 },
  { id: 'visual', label: 'Visual & Simple', desc: 'Less text, quick impact choices', icon: ImageIcon }
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [learningStyle, setLearningStyle] = useState(null);

  const toggleInterest = (id) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const GOALS = [
    { id: 'concert', label: 'Concert Tickets', cost: 400, icon: '🎵' },
    { id: 'sneakers', label: 'Limited Sneakers', cost: 700, icon: '👟' },
    { id: 'setup', label: 'Gaming/Study Setup', cost: 600, icon: '💻' },
    { id: 'emergency', label: 'Safety Net', cost: 500, icon: '🏦' }
  ];

  const [selectedGoal, setSelectedGoal] = useState(null);

  const handleStart = () => {
    if (learningStyle && selectedInterests.length > 0 && selectedGoal) {
      onComplete({ 
        name, 
        avatar, 
        interests: selectedInterests, 
        learningStyle,
        goal: selectedGoal
      });
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pt-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-teal-500 mb-4">
          Create Your Character
        </h1>
        <p className="text-xl text-slate-600 font-medium">Welcome to your new virtual life. Every choice changes your story.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-lg mx-auto bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <User className="text-purple-500" /> Identity
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Your Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none text-lg font-bold"
              />
            </div>
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Choose Avatar</label>
              <div className="flex justify-between gap-2">
                {AVATARS.map(a => (
                  <button 
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-4xl p-3 rounded-2xl transition-all ${avatar === a ? 'bg-purple-100 ring-4 ring-purple-500/30 scale-110' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              Continue <Play size={18} className="text-teal-400" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                What are your vibes? <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Pick 1 or more</span>
              </h2>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {INTERESTS.map(interest => {
                  const Icon = interest.icon;
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <motion.button
                      variants={item}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-700 shadow-purple-500/20 shadow-lg'
                          : 'border-slate-200 bg-white hover:border-purple-300 text-slate-600'
                      }`}
                    >
                      <Icon size={32} className={isSelected ? 'text-purple-600' : 'text-slate-400'} />
                      <span className="font-bold text-lg">{interest.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">How do you process information?</h2>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {LEARNING_STYLES.map(style => {
                  const Icon = style.icon;
                  const isSelected = learningStyle === style.id;
                  return (
                    <motion.button
                      variants={item}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={style.id}
                      onClick={() => setLearningStyle(style.id)}
                      className={`p-6 rounded-3xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-teal-100/50 text-teal-900 shadow-teal-500/20 shadow-lg'
                          : 'border-slate-200 bg-white hover:border-teal-300 text-slate-600'
                      }`}
                    >
                      <Icon size={28} className={`mb-3 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                      <h3 className="font-bold text-lg mb-1">{style.label}</h3>
                      <p className={`text-sm ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>{style.desc}</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: (learningStyle && selectedInterests.length > 0) ? 1 : 0 }}
              className="flex justify-center pb-12"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(3)}
                className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl hover:shadow-purple-500/30 transition-all"
              >
                Choose Your Goal <Play size={24} className="text-teal-400" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-center text-slate-800 mb-8">
              What are you saving for?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {GOALS.map(goal => (
                <motion.button
                  key={goal.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedGoal(goal)}
                  className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-4 ${
                    selectedGoal?.id === goal.id
                      ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-purple-200'
                  }`}
                >
                  <div className="text-4xl">{goal.icon}</div>
                  <div>
                    <h3 className="font-bold text-lg">{goal.label}</h3>
                    <p className="text-purple-600 font-black text-sm uppercase tracking-wide">Target: ₹{goal.cost}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: selectedGoal ? 1 : 0 }}
              className="flex justify-center pb-12"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl hover:shadow-purple-500/30 transition-all"
              >
                <Target size={24} className="text-teal-400" />
                Start My Simulation
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
