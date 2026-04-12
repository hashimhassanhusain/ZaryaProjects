import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AIAssistantProps {
  compact?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ compact }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const [isLaughing, setIsLaughing] = useState(false);
  const [isFleeing, setIsFleeing] = useState(false);
  const [isCrying, setIsCrying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const ballRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const ballControls = useAnimation();
  const handControls = useAnimation();
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Physics state
  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ vx: 0, vy: 0 });
  const lastTime = useRef(Date.now());

  const handleHit = async () => {
    if (isCrying) return;
    
    setIsCrying(true);
    setIsLaughing(false);
    setIsFleeing(false);
    setCombo(0);
    setScore(prev => Math.max(0, prev - 50));

    // Stop velocity
    vel.current = { vx: 0, vy: 0 };

    // Reaction to hit: Shake and squash
    await ballControls.start({
      x: pos.current.x,
      y: pos.current.y,
      scale: [1, 0.8, 1.2, 1],
      transition: { duration: 0.5 }
    });

    // Cry and return to origin
    await ballControls.start({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: { duration: 2, ease: "easeInOut" }
    });

    pos.current = { x: 0, y: 0 };
    setTimeout(() => setIsCrying(false), 2000);
    setIsInteracting(false);
  };

  useEffect(() => {
    let animationFrame: number;

    const updatePhysics = () => {
      if (!isCrying) {
        const now = Date.now();
        const dt = (now - lastTime.current) / 16; // Normalized to ~60fps
        lastTime.current = now;

        // Apply velocity
        pos.current.x += vel.current.vx * dt;
        pos.current.y += vel.current.vy * dt;

        // Bouncing logic
        if (containerRef.current && ballRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const ballRect = ballRef.current.getBoundingClientRect();
          
          // Calculate boundaries relative to center
          const halfW = (containerRect.width - ballRect.width) / 2;
          const halfH = (containerRect.height - ballRect.height) / 2;

          // Horizontal bounce
          if (pos.current.x < -halfW) {
            pos.current.x = -halfW;
            vel.current.vx *= -0.8; // Bounce with some energy loss
          } else if (pos.current.x > halfW) {
            pos.current.x = halfW;
            vel.current.vx *= -0.8;
          }

          // Vertical bounce
          if (pos.current.y < -halfH) {
            pos.current.y = -halfH;
            vel.current.vy *= -0.8;
          } else if (pos.current.y > halfH) {
            pos.current.y = halfH;
            vel.current.vy *= -0.8;
          }
        }

        // Friction/Damping
        vel.current.vx *= 0.98;
        vel.current.vy *= 0.98;

        // Stop if very slow
        if (Math.abs(vel.current.vx) < 0.01) vel.current.vx = 0;
        if (Math.abs(vel.current.vy) < 0.01) vel.current.vy = 0;

        // Update visual position
        if (isMounted.current) {
          ballControls.set({ x: pos.current.x, y: pos.current.y, rotate: pos.current.x * 2 });
        }
        
        if (Math.abs(vel.current.vx) > 0.5 || Math.abs(vel.current.vy) > 0.5) {
          setIsFleeing(true);
          setIsLaughing(true);
        } else {
          setIsFleeing(false);
          setIsLaughing(false);
        }
      } else {
        lastTime.current = Date.now();
      }
      animationFrame = requestAnimationFrame(updatePhysics);
    };

    animationFrame = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrame);
  }, [isCrying, ballControls]);

  const [isMouseNear, setIsMouseNear] = useState(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!ballRef.current || isCrying) {
        setIsMouseNear(false);
        return;
      }

      const rect = ballRef.current.getBoundingClientRect();
      const ballCenterX = rect.left + rect.width / 2;
      const ballCenterY = rect.top + rect.height / 2;

      const dx = ballCenterX - e.clientX;
      const dy = ballCenterY - e.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Flee detection: If mouse gets close, push the ball away
      const fleeRadius = compact ? 120 : 250;
      if (distance < fleeRadius) {
        setIsMouseNear(true);
        setIsInteracting(true);
        const force = (fleeRadius - distance) / fleeRadius;
        const pushMagnitude = force * (compact ? 1.5 : 2); // Speed of escape
        
        // Add to velocity
        vel.current.vx += (dx / distance) * pushMagnitude;
        vel.current.vy += (dy / distance) * pushMagnitude;
        
        if (distance < (compact ? 50 : 100)) {
          setCombo(prev => prev + 1);
          setScore(prev => prev + 1);
        }
      } else {
        setIsMouseNear(false);
        setIsInteracting(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [isCrying, compact]);

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 shadow-2xl border border-white/10 transition-all duration-300",
        compact ? "p-6 w-[32rem] h-64" : "p-8 md:p-12 w-full",
        isMouseNear ? "cursor-[url('https://cdn-icons-png.flaticon.com/32/1067/1067561.png'),_pointer]" : "cursor-default"
      )}
    >
      {/* Background Decorative Elements */}
      <div className={cn("absolute top-0 right-0 bg-blue-500/10 rounded-full blur-3xl -mr-48 -mt-48", compact ? "w-64 h-64" : "w-96 h-96")} />
      <div className={cn("absolute bottom-0 left-0 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32", compact ? "w-48 h-48" : "w-64 h-64")} />
      
      {/* Game Score UI */}
      <AnimatePresence>
        {score > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "absolute flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full z-20",
              compact ? "top-4 right-4 px-3 py-1.5" : "top-6 right-8 px-4 py-2"
            )}
          >
            <Trophy className={cn("text-yellow-400", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-300 font-bold uppercase tracking-tighter">Play Score</span>
              <span className={cn("font-mono font-bold text-white leading-none", compact ? "text-sm" : "text-sm")}>{score}</span>
            </div>
            {combo > 1 && (
              <motion.div 
                key={combo}
                initial={{ scale: 1.5, color: '#f43f5e' }}
                animate={{ scale: 1, color: '#fff' }}
                className={cn("font-black italic", compact ? "text-xs" : "text-xs")}
              >
                x{combo}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("relative z-10 flex flex-col items-center text-center", compact ? "space-y-4" : "space-y-6")}>
        {/* Avatar Playground */}
        <div className={cn("relative flex items-center justify-center w-full", compact ? "h-24" : "h-32")}>
          {/* Waving/Pushing Hand Animation */}
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
              className="bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded-full mb-1 shadow-lg border border-slate-200 whitespace-nowrap"
            >
              {isCrying ? "Waaaaa! 😭" : isLaughing ? (combo > 3 ? "WEEEEEE! 🚀" : "Hehehe! 😄") : "Hi Zarya!"}
            </motion.div>
            <span className={compact ? "text-3xl" : "text-4xl"}>{isCrying ? "🥺" : "👋"}</span>
          </motion.div>

          <motion.div 
            ref={ballRef}
            animate={ballControls}
            onMouseDown={handleHit}
            className={cn("rounded-full overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-800/80 flex items-center justify-center relative group", compact ? "w-20 h-20" : "w-24 h-24")}
          >
            {/* The White Ball */}
            <motion.div 
              animate={isInteracting ? {} : { 
                scale: [1, 1.05, 1],
                y: [0, -2, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={cn("bg-white rounded-full shadow-[inset_0_-4px_10px_rgba(0,0,0,0.1),0_10px_25px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center overflow-hidden relative pt-1", compact ? "w-14 h-14" : "w-16 h-16")}
            >
              {/* Eyes */}
              <div className={cn("flex mb-1", compact ? "gap-3" : "gap-4")}>
                <motion.div
                  animate={isCrying ? { 
                    scaleY: [0.2, 0.2, 0.2],
                    y: [2, 2, 2]
                  } : isLaughing ? { 
                    scaleY: [1, 0.2, 1],
                    y: [0, -2, 0]
                  } : { scaleY: [1, 1, 0.1, 1, 1] }}
                  transition={isLaughing || isCrying ? { duration: 0.15, repeat: Infinity } : { duration: 4, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 1] }}
                  className={cn("bg-slate-900 rounded-full", compact ? "w-2 h-2" : "w-2.5 h-2.5")}
                />
                <motion.div
                  animate={isCrying ? { 
                    scaleY: [0.2, 0.2, 0.2],
                    y: [2, 2, 2]
                  } : isLaughing ? { 
                    scaleY: [1, 0.2, 1],
                    y: [0, -2, 0]
                  } : { scaleY: [1, 1, 0.1, 1, 1] }}
                  transition={isLaughing || isCrying ? { duration: 0.15, repeat: Infinity } : { duration: 4, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 1] }}
                  className={cn("bg-slate-900 rounded-full", compact ? "w-2 h-2" : "w-2.5 h-2.5")}
                />
              </div>

              {/* Smiling/Laughing/Crying Mouth */}
              <div className="relative flex flex-col items-center">
                <svg width={compact ? "30" : "40"} height={compact ? "15" : "20"} viewBox="0 0 40 20" className="mb-0.5">
                  <motion.path
                    d={isCrying ? "M5,15 Q20,5 35,15" : isLaughing ? "M5,5 Q20,25 35,5" : "M5,2 Q20,12 35,2"}
                    fill={isCrying ? "none" : isLaughing ? "#f43f5e" : "none"}
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    animate={isCrying ? {
                      d: ["M5,15 Q20,5 35,15", "M5,12 Q20,2 35,12", "M5,15 Q20,5 35,15"]
                    } : isLaughing ? {
                      d: ["M5,5 Q20,20 35,5", "M5,5 Q20,25 35,5", "M5,5 Q20,20 35,5"]
                    } : {
                      d: [
                        "M5,2 Q20,12 35,2",
                        "M5,5 Q20,15 35,5",
                        "M5,2 Q20,12 35,2"
                      ]
                    }}
                    transition={{ duration: isLaughing || isCrying ? 0.15 : 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>
              
              {/* Glossy effect on ball */}
              <div className={cn("absolute bg-white/80 rounded-full blur-[2px] rotate-[-25deg]", compact ? "top-1.5 left-3 w-4 h-2.5" : "top-2 left-4 w-5 h-3")} />
              
              {/* Inner shadow/depth */}
              <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.05)] pointer-events-none" />
            </motion.div>
            
            {/* Subtle background pulse */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.05, 0.15, 0.05] 
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute inset-0 bg-white rounded-full"
            />
          </motion.div>
          <div className={cn("absolute bg-emerald-500 border-slate-900 rounded-full shadow-sm z-30", compact ? "bottom-3 left-1/2 -ml-10 w-5 h-5 border-2" : "bottom-4 left-1/2 -ml-12 w-6 h-6 border-4")} />
        </div>

        {/* Text Content */}
        <div className="space-y-1 relative">
          <h2 className={cn("font-bold text-white tracking-tight relative z-10", compact ? "text-lg" : "text-3xl md:text-4xl")}>
            Good morning, Director.
          </h2>
          {!compact && (
            <p className="text-blue-200/70 text-sm md:text-base font-medium max-w-xl mx-auto">
              Zarya AI has analyzed 14 active workstreams. Schedule health is at <span className="text-emerald-400 font-bold">94%</span>.
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className={cn("w-full relative group", compact ? "max-w-sm" : "max-w-2xl")}>
          <div className="absolute inset-0 bg-blue-500/20 blur-xl group-hover:bg-blue-500/30 transition-all rounded-2xl" />
          <div className={cn("relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-inner", compact ? "p-1" : "p-1.5")}>
            <div className={cn("pr-2", compact ? "pl-3" : "pl-4")}>
              <Search className={cn("text-blue-300", compact ? "w-4 h-4" : "w-5 h-5")} />
            </div>
            <input 
              type="text" 
              placeholder={compact ? "Ask Zarya AI..." : "Ask Zarya AI about project risks or financial forecasts..."}
              className="flex-1 bg-transparent border-none text-white placeholder:text-blue-200/40 focus:ring-0 text-sm py-2"
            />
            <button className={cn("bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20", compact ? "px-3 py-2 text-[10px]" : "px-6 py-3 text-xs md:text-sm")}>
              <Sparkles className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
              {compact ? "Ask" : "Consult AI"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
