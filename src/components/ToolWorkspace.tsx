import React from 'react';
import { useProjectTools, TOOLS_LIBRARY, INPUTS_LIBRARY } from '../context/ToolsContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export const ToolWorkspace: React.FC = () => {
  const { activeToolId, activeInputId, closeTool, closeInput } = useProjectTools();
  const { isRtl, language } = useLanguage();
  
  const toolOrInput = activeToolId 
    ? TOOLS_LIBRARY[activeToolId] 
    : activeInputId 
      ? INPUTS_LIBRARY[activeInputId] 
      : null;

  const handleClose = () => {
    if (activeToolId) closeTool();
    if (activeInputId) closeInput();
  };

  return (
    <AnimatePresence>
      {toolOrInput && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100]"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: activeToolId ? (isRtl ? -600 : 600) : (isRtl ? 600 : -600), opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: activeToolId ? (isRtl ? -600 : 700) : (isRtl ? 700 : -600), opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-4 bottom-4 w-full max-w-2xl bg-white dark:bg-[#0f1115] shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[101] overflow-hidden flex flex-col border border-slate-200 dark:border-white/10 rounded-[2.5rem]",
              activeToolId 
                ? (isRtl ? "left-4" : "right-4")
                : (isRtl ? "right-4" : "left-4")
            )}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  activeToolId ? "bg-brand/10" : "bg-rose-500/10"
                )}>
                  <toolOrInput.icon className={cn("w-6 h-6", activeToolId ? "text-brand" : "text-rose-600")} />
                </div>
                <div>
                  <h3 className={cn(
                    "text-lg font-black tracking-tight uppercase italic underline underline-offset-4 decoration-2",
                    activeToolId ? "text-slate-900 dark:text-white decoration-brand" : "text-slate-900 dark:text-white decoration-rose-600"
                  )}>
                    {language === 'ar' ? toolOrInput.nameAr : toolOrInput.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    PMBOK 8rd Edition Compliant {activeToolId ? 'Tool' : 'Input'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleClose}
                  className="p-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
              <div className="space-y-8">
                {/* Placeholder for real widget logic */}
                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] p-8 text-center bg-slate-50/30 dark:bg-white/2">
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-6",
                    activeToolId ? "bg-brand/5" : "bg-rose-500/5"
                  )}>
                    <ShieldAlert className={cn("w-10 h-10", activeToolId ? "text-brand/20" : "text-rose-600/20")} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {language === 'ar' ? 'بيئة العمل قيد التجهيز' : 'Workspace Under Construction'}
                  </h4>
                  <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    {language === 'ar' 
                      ? `${activeToolId ? 'أداة' : 'مدخل'} ${toolOrInput.nameAr} يتم برمجتها حالياً لتكون مرتبطة بقاعدة البيانات وتحليل البيانات في الوقت الفعلي.`
                      : `The ${activeToolId ? 'tool' : 'input'} module "${toolOrInput.name}" is being connected to the project database and real-time analytics engine.`}
                  </p>
                  
                  <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-24 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                </div>

                <div className={cn(
                  "p-8 rounded-[2rem] text-white",
                  activeToolId ? "bg-slate-900" : "bg-rose-950"
                )}>
                  <h5 className={cn(
                    "text-xs font-bold uppercase tracking-widest mb-4",
                    activeToolId ? "text-brand" : "text-rose-400"
                  )}>{activeToolId ? 'Educational Tip' : 'Input Definition'}</h5>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    {activeToolId 
                      ? '"Tools and techniques are used to process inputs to produce the desired outputs. Expert judgment is often the most critical tool in the Project Manager\'s arsenal."'
                      : '"Inputs are the raw data, documents, or information required to perform a project management process. High quality inputs lead to high quality outcomes."'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {language === 'ar' ? 'البيانات مؤمنة بنظام التشفير' : 'Data Encrypted & Secured'}
              </span>
              <button 
                className={cn(
                  "px-8 py-3 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all",
                  activeToolId ? "bg-brand shadow-brand/20" : "bg-rose-600 shadow-rose-600/20"
                )}
              >
                {language === 'ar' ? 'تصدير البيانات' : 'Export Data'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
