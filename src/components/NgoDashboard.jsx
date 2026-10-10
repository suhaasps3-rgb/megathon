import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, ShieldAlert, Target, Activity, MapPin, ChevronLeft } from 'lucide-react';

export default function NgoDashboard({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <button onClick={onBack} className="flex items-center gap-2 text-teal-400 hover:text-teal-300 mb-4 font-bold transition-colors">
              <ChevronLeft size={20} /> Back to Student App
            </button>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-400 tracking-tight">
              Facilitator Command Center
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Real-time telemetry for the Hyderabad Vanguard Pilot (~1,500 students)</p>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Active Region</p>
              <p className="text-xl font-black">Hyderabad, TS</p>
            </div>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Active Students", value: "1,492", icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Avg. Assessment Score", value: "7.2/10", icon: Activity, color: "text-purple-400", bg: "bg-purple-400/10" },
            { label: "Total Scenarios Played", value: "8,405", icon: Target, color: "text-pink-400", bg: "bg-pink-400/10" },
            { label: "Scams Successfully Avoided", value: "94%", icon: ShieldAlert, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl"
            >
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon size={24} />
              </div>
              <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider">{stat.label}</h3>
              <p className="text-3xl font-black mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* 4 Pillars Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-8 rounded-3xl"
          >
            <h2 className="text-2xl font-black mb-6">The 4 Learning Pillars Mastery</h2>
            <div className="space-y-6">
              {[
                { name: "1. Plan & Budget", score: 85, color: "bg-purple-500" },
                { name: "2. Save & Manage", score: 72, color: "bg-blue-500" },
                { name: "3. Understand Investing", score: 45, color: "bg-amber-500", alert: true },
                { name: "4. Stay Financially Safe", score: 92, color: "bg-emerald-500" },
              ].map((pillar, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-slate-300">{pillar.name}</span>
                    <span className="font-black text-xl">{pillar.score}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pillar.score}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      className={`h-full ${pillar.color}`}
                    />
                  </div>
                  {pillar.alert && (
                    <p className="text-amber-400 text-sm mt-2 font-medium flex items-center gap-1">
                      <ShieldAlert size={14} /> Requires facilitator intervention this week.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-teal-900/40 to-slate-800/50 backdrop-blur-md border border-teal-500/20 p-8 rounded-3xl flex flex-col justify-center relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-teal-500/10 blur-3xl rounded-full"></div>
            <TrendingUp size={48} className="text-teal-400 mb-6" />
            <h2 className="text-3xl font-black mb-4">The "Butterfly Effect" Impact</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              By translating abstract investing concepts into immediate "Future Self" visualizations, 
              students in the pilot are showing a <span className="text-teal-400 font-bold text-2xl">314% increase</span> in choosing to save over immediate gratification.
            </p>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-teal-500/20 inline-block">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-wider block mb-1">Total Simulated Wealth Created</span>
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
                ₹ 14,250,000
              </span>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
