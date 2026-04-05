import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const AIAssistant: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 md:p-12 shadow-2xl border border-white/10"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-lg shadow-blue-500/20">
            <img 
              src="https://images.unsplash.com/photo-1675435466821-4675989500d1?w=400&h=400&fit=crop" 
              alt="Zarya AI" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Good morning, Director.
          </h2>
          <p className="text-blue-200/70 text-sm md:text-base font-medium max-w-xl mx-auto">
            Zarya AI has analyzed 14 active workstreams. Schedule health is at <span className="text-emerald-400 font-bold">94%</span>.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl group-hover:bg-blue-500/30 transition-all rounded-2xl" />
          <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 shadow-inner">
            <div className="pl-4 pr-2">
              <Search className="w-5 h-5 text-blue-300" />
            </div>
            <input 
              type="text" 
              placeholder="Ask Zarya AI about project risks or financial forecasts..."
              className="flex-1 bg-transparent border-none text-white placeholder:text-blue-200/40 focus:ring-0 text-sm md:text-base py-3"
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
              <Sparkles className="w-4 h-4" />
              Consult AI
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
