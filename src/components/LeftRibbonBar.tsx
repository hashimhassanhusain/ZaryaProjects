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
      initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "fixed top-[20%] z-40 flex flex-col gap-0.5",
        "left-0"
      )}
    >
      {inputs.map((input, idx) => {
        const isActive = activeInputId === input.id;
        
        return (
          <div key={input.id} className="group relative">
            <button
              onClick={() => openInput(input.id)}
              className={cn(
                "page-divider-tab-left transition-all duration-300 flex items-center gap-2",
                isActive 
                  ? "bg-slate-700 text-[#ff6d00] shadow-lg z-10" 
                  : "bg-slate-300 text-slate-600 hover:bg-slate-400 hover:text-slate-900"
              )}
              style={{ 
                marginTop: idx > 0 ? '-8px' : '0',
                zIndex: isActive ? 20 : 10 - idx
              }}
            >
              {input.icon && <input.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-[#ff6d00]" : "text-slate-500 opacity-60")} />}
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {language === 'ar' ? input.nameAr : input.name}
              </span>
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
