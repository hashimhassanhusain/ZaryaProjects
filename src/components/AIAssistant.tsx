import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AIAssistantProps {
  compact?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ compact }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const ballControls = useAnimation();
  const handControls = useAnimation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    return () => setIsReady(false);
  }, []);

  const [isMouseNear, setIsMouseNear] = useState(false);

  return (
    <motion.div 
      ref={containerRef}
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-3xl bg-transparent transition-all duration-300 z-[9999]",
        compact ? "p-6 w-[32rem] h-64" : "p-8 md:p-12 w-full",
        isMouseNear ? "cursor-grab" : "cursor-default"
      )}
    >
      {/* Background Accent Removed */}
      
      <div className={cn("relative z-10 flex flex-col items-center text-center", compact ? "space-y-4" : "space-y-6")}>
        {/* Avatar Playground */}
        <div className={cn("relative flex items-center justify-center w-full", compact ? "h-24" : "h-32")}>
          {/* Waving Hand Animation */}
          <motion.div
            animate={isInteracting ? handControls : { 
              x: [-30, 0, 0, -30],
              rotate: [0, 0, 15, -15, 15, -15, 0, 0],
              opacity: [0, 1, 1, 0]
            }}
            transition={isInteracting ? {} : { 
              duration: 5, 
              repeat: Infinity, 
              repeatDelay: 8,
              times: [0, 0.2, 0.8, 1]
            }}
            className={cn("absolute left-1/2 z-20 pointer-events-none select-none flex flex-col items-center", compact ? "-ml-24 top-0" : "-ml-32 top-4")}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={isInteracting ? { scale: 1.2, opacity: 1 } : { scale: [0, 1, 1, 0] }}
              className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-full mb-1 shadow-lg border border-slate-700 whitespace-nowrap"
            >
              {"Hi Zarya!"}
            </motion.div>
            <span className={compact ? "text-3xl" : "text-4xl"}>{"👋"}</span>
          </motion.div>

          <motion.div 
            ref={ballRef}
            animate={ballControls}
            className={cn("rounded-full overflow-hidden border border-slate-200 shadow-xl bg-slate-50/80 flex items-center justify-center relative group", compact ? "w-20 h-20" : "w-24 h-24")}
          >
            {/* The White Ball */}
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                y: [0, -2, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={cn("bg-white rounded-full shadow-[inset_0_-4px_10px_rgba(0,0,0,0.1),0_10px_25px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center overflow-hidden relative pt-1", compact ? "w-14 h-14" : "w-16 h-16")}
            >
              {/* Eyes */}
              <div className={cn("flex mb-1", compact ? "gap-3" : "gap-4")}>
                <motion.div
                  animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 1] }}
                  className={cn("bg-slate-900 rounded-full", compact ? "w-2 h-2" : "w-2.5 h-2.5")}
                />
                <motion.div
                  animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 1] }}
                  className={cn("bg-slate-900 rounded-full", compact ? "w-2 h-2" : "w-2.5 h-2.5")}
                />
              </div>

              {/* Smiling Mouth */}
              <div className="relative flex flex-col items-center">
                <svg width={compact ? "30" : "40"} height={compact ? "15" : "20"} viewBox="0 0 40 20" className="mb-0.5">
                  <motion.path
                    d="M5,2 Q20,12 35,2"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              
              {/* Glossy effect */}
              <div className={cn("absolute bg-white/80 rounded-full blur-[2px] rotate-[-25deg]", compact ? "top-1.5 left-3 w-4 h-2.5" : "top-2 left-4 w-5 h-3")} />
            </motion.div>
          </motion.div>
          <div className={cn("absolute bg-emerald-500 border-white rounded-full shadow-sm z-30", compact ? "bottom-3 left-1/2 -ml-10 w-5 h-5 border-2" : "bottom-4 left-1/2 -ml-12 w-6 h-6 border-4")} />
        </div>

        {/* Text Content */}
        <div className="space-y-1 relative">
          <h2 className={cn("font-black text-slate-900 tracking-tight relative z-10 uppercase text-xs tracking-[0.2em] opacity-40 mb-2", compact ? "" : "")}>
            Zarya AI Assistant
          </h2>
          <h2 className={cn("font-black text-slate-900 tracking-tight relative z-10", compact ? "text-lg" : "text-3xl md:text-4xl")}>
            Good morning, Director.
          </h2>
          {!compact && (
            <p className="text-slate-500 text-sm md:text-base font-bold max-w-xl mx-auto">
              Zarya AI has analyzed 14 active workstreams. Schedule health is at <span className="text-emerald-500 font-black tracking-widest text-lg">94%</span>.
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className={cn("w-full relative group", compact ? "max-w-sm" : "max-w-2xl")}>
          <div className={cn("relative flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm", compact ? "p-1" : "p-1.5")}>
            <div className={cn("pr-2", compact ? "pl-3" : "pl-4")}>
              <Search className={cn("text-slate-400", compact ? "w-4 h-4" : "w-5 h-5")} />
            </div>
            <input 
              type="text" 
              placeholder={compact ? "Ask Zarya AI..." : "Ask Zarya AI about project risks or financial forecasts..."}
              className="flex-1 bg-transparent border-none text-slate-900 placeholder:text-slate-300 focus:ring-0 text-sm py-2 font-medium"
            />
            <button className={cn("bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10", compact ? "px-3 py-2 text-[10px]" : "px-6 py-3 text-xs md:text-sm")}>
              <Sparkles className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
              {compact ? "Ask" : "Consult AI"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
