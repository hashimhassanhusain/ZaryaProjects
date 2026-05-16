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
      initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "fixed top-[30%] z-40 flex flex-col gap-0.5",
        "right-0"
      )}
    >
      {tools.map((tool, idx) => {
        const isActive = activeToolId === tool.id;
        
        return (
          <div key={tool.id} className="group relative">
            <button
              onClick={() => openTool(tool.id)}
              className={cn(
                "page-divider-tab-right transition-all duration-300 flex items-center gap-2",
                isActive 
                  ? "bg-slate-700 text-[#ff6d00] shadow-lg z-10" 
                  : "bg-slate-300 text-slate-600 hover:bg-slate-400 hover:text-slate-900"
              )}
              style={{ 
                marginTop: idx > 0 ? '-8px' : '0',
                zIndex: isActive ? 20 : 10 - idx
              }}
            >
              {tool.icon && <tool.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-[#ff6d00]" : "text-slate-500 opacity-60")} />}
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {language === 'ar' ? tool.nameAr : tool.name}
              </span>
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
