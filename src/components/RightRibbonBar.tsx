import React from 'react';
import { useProjectTools, TOOLS_LIBRARY, OUTPUT_TOOL_MAPPINGS } from '../context/ToolsContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const RightRibbonBar: React.FC = () => {
  const { activeOutput, openTool, activeToolId } = useProjectTools();
  const { isRtl, language } = useLanguage();

  if (!activeOutput || !OUTPUT_TOOL_MAPPINGS[activeOutput]) {
    return null;
  }

  const toolIds = OUTPUT_TOOL_MAPPINGS[activeOutput];
  const tools = toolIds.map(id => TOOLS_LIBRARY[id]).filter(Boolean);

  return (
    <motion.div 
      initial={{ opacity: 0, x: isRtl ? 20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl",
        "right-4"
      )}
    >
      <div className="absolute -top-6 left-0 right-0 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-900 dark:text-neutral-200 whitespace-nowrap">
          {language === 'ar' ? 'الأدوات والأساليب' : 'Tools & Techniques'}
        </span>
      </div>
      
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeToolId === tool.id;
        
        return (
          <div key={tool.id} className="group relative">
            <button
              onClick={() => openTool(tool.id)}
              className={cn(
                "w-22 h-22 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden p-1.5",
                isActive 
                  ? "bg-brand text-white shadow-lg shadow-brand/20 scale-105" 
                  : "bg-neutral-50 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 hover:bg-brand/10 hover:text-brand hover:scale-105"
              )}
            >
              <Icon className="w-6 h-6 mb-1.5" strokeWidth={2.5} />
              <span className={cn(
                "text-[11px] font-black uppercase text-center leading-[1.1] px-0.5 line-clamp-2 transition-colors",
                isActive ? "text-white" : "text-neutral-900 dark:text-neutral-200 group-hover:text-brand"
              )}>
                {language === 'ar' ? tool.nameAr : tool.name}
              </span>
              
              {isActive && (
                <motion.div 
                  layoutId="active-tool-glow"
                  className="absolute inset-0 bg-white/20 blur-md pointer-events-none"
                />
              )}
            </button>

            {/* Tooltip */}
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50",
              "right-full mr-4"
            )}>
              <div className="bg-neutral-900 text-white p-3 rounded-2xl shadow-2xl min-w-[200px] border border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-1">
                  {language === 'ar' ? tool.nameAr : tool.name}
                </div>
                <div className="text-[11px] font-medium leading-relaxed text-neutral-300">
                  {language === 'ar' ? tool.descriptionAr : tool.description}
                </div>
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-neutral-900 border-t border-r border-white/10 rotate-45",
                  "-right-1"
                )} />
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};
