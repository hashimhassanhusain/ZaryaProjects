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
      <div className="absolute -top-6 left-0 right-0 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-900 dark:text-neutral-200 whitespace-nowrap">
          {language === 'ar' ? 'المدخلات الوظيفية' : 'Functional Inputs'}
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
                "w-22 h-22 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden p-1.5",
                isActive 
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20 scale-105" 
                  : "bg-neutral-50 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 hover:bg-rose-500/10 hover:text-rose-600 hover:scale-105"
              )}
            >
              <Icon className="w-6 h-6 mb-1.5" strokeWidth={2.5} />
              <span className={cn(
                "text-[11px] font-black uppercase text-center leading-[1.1] px-0.5 line-clamp-2 transition-colors",
                isActive ? "text-white" : "text-neutral-900 dark:text-neutral-200 group-hover:text-rose-600"
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

            {/* Tooltip */}
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50",
              "left-full ml-4"
            )}>
              <div className="bg-neutral-900 text-white p-3 rounded-2xl shadow-2xl min-w-[200px] border border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">
                  {language === 'ar' ? input.nameAr : input.name}
                </div>
                <div className="text-[11px] font-medium leading-relaxed text-neutral-300">
                  {language === 'ar' ? input.descriptionAr : input.description}
                </div>
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-neutral-900 border-t border-r border-white/10 rotate-45",
                  "-left-1"
                )} />
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};
