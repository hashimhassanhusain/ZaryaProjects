import React from 'react';
import { useProjectTools, INPUTS_LIBRARY, OUTPUT_INPUT_MAPPINGS } from '../context/ToolsContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const LeftRibbonBar: React.FC = () => {
  const { activeOutput, openInput, activeInputId } = useProjectTools();
  const { isRtl, language } = useLanguage();

  if (!activeOutput || !OUTPUT_INPUT_MAPPINGS[activeOutput]) {
    return null;
  }

  const inputIds = OUTPUT_INPUT_MAPPINGS[activeOutput];
  const inputs = inputIds.map(id => INPUTS_LIBRARY[id]).filter(Boolean);

  return (
    <motion.div 
      initial={{ opacity: 0, x: isRtl ? -20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl",
        "left-4"
      )}
    >
      <div className="absolute -top-7 left-0 right-0 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-primary dark:text-neutral-200 whitespace-nowrap bg-white/60 px-3 py-0.5 rounded-full backdrop-blur-sm border border-white/40 shadow-sm">
          {language === 'ar' ? 'المدخلات التشغيلية' : 'OPERATIONAL INPUTS'}
        </span>
      </div>
      
      {inputs.map((input) => {
        const Icon = input.icon;
        const isActive = activeInputId === input.id;
        
        return (
          <div key={input.id} className="group relative">
            <button
              onClick={() => openInput(input.id)}
              className={cn(
                "w-18 h-18 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden p-1 border-b-2",
                isActive 
                  ? "bg-brand text-white shadow-xl shadow-brand/30 scale-105 border-brand-secondary" 
                  : "bg-app-bg dark:bg-white/5 text-text-secondary dark:text-neutral-400 hover:bg-brand/5 hover:text-brand hover:scale-105 border-transparent hover:border-brand/30"
              )}
            >
              <Icon className="w-5 h-5 mb-1" strokeWidth={2.5} />
              <span className={cn(
                "text-[9px] font-black uppercase text-center leading-[1.1] px-0.5 line-clamp-2 transition-colors",
                isActive ? "text-white" : "text-text-primary dark:text-neutral-200 group-hover:text-brand"
              )}>
                {language === 'ar' ? input.nameAr : input.name}
              </span>
              
              {isActive && (
                <motion.div 
                  layoutId="active-input-glow"
                  className="absolute inset-0 bg-white/20 blur-md pointer-events-none"
                />
              )}
            </button>

            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50",
              "left-full ml-4"
            )}>
              <div className="bg-text-primary text-white p-6 rounded-[2rem] shadow-2xl min-w-[240px] border border-white/10">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-brand mb-2 italic">
                  {language === 'ar' ? input.nameAr : input.name}
                </div>
                <div className="text-xs font-medium leading-relaxed text-slate-300">
                  {language === 'ar' ? input.descriptionAr : input.description}
                </div>
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-primary border-t border-r border-white/10 rotate-45",
                  isRtl ? "right-[-0.375rem]" : "-left-1"
                )} />
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};
