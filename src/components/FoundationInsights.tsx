import React, { useState, useEffect } from 'react';
import { 
  Database, 
  TrendingUp, 
  CheckCircle2, 
  Handshake, 
  Shield, 
  Library, 
  ChevronRight,
  Target,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const FoundationInsights: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'business' | 'agreements' | 'eefs' | 'opas'>('business');

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProject) return;
      try {
        const docRef = doc(db, 'projectFoundations', selectedProject.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data());
        }
      } catch (err) {
        console.error('Error fetching foundation data:', err);
      }
    };
    fetchData();
  }, [selectedProject]);

  if (!data || !selectedProject) return null;

  return (
    <div className="fixed bottom-10 left-10 z-[100] print:hidden" dir={isRtl ? 'rtl' : 'ltr'}>
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className={cn(
           "flex items-center gap-3 px-6 h-16 bg-slate-900 text-white rounded-[2rem] shadow-2xl transition-all group border-2",
           isOpen ? "border-blue-500 scale-110" : "border-white/10 hover:border-blue-400 hover:scale-105"
         )}
       >
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
             <Database className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col items-start leading-none gap-1">
             <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Context Hub</span>
             <span className="text-[11px] font-black uppercase tracking-widest">{t('foundation_insights') || 'Master Insights'}</span>
          </div>
          <div className="ml-2 w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
             4
          </div>
       </button>

       <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="absolute bottom-20 left-0 w-[400px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden flex flex-col max-h-[600px]"
            >
               <header className="p-8 bg-slate-900 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl -mr-16 -mt-16" />
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white italic font-black text-xl">Z</div>
                     <div>
                        <h3 className="text-sm font-black uppercase tracking-widest leading-none">Foundation context</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Smart Reading: {selectedProject.code}</p>
                     </div>
                  </div>
               </header>

               <div className="flex bg-slate-50 border-b border-slate-100">
                  {(['business', 'agreements', 'eefs', 'opas'] as const).map(seg => (
                    <button 
                      key={seg}
                      onClick={() => setActiveSegment(seg)}
                      className={cn(
                        "flex-1 py-4 text-[9px] font-black uppercase tracking-widest transition-all relative",
                        activeSegment === seg ? "text-blue-600 bg-white" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                       {seg}
                       {activeSegment === seg && <motion.div layoutId="seg-dot" className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />}
                    </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {activeSegment === 'business' && (
                    <div className="space-y-6">
                       <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-4">
                          <div className="flex items-center gap-3 text-blue-600">
                             <Target className="w-5 h-5" />
                             <span className="text-xs font-black uppercase tracking-widest italic">{t('justification')}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                             "{data.businessDocuments?.feasibilityStudy || 'No business justification defined.'}"
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-blue-100/50">
                             <span className="text-[10px] font-black text-blue-600 uppercase">Project ROI</span>
                             <span className="text-lg font-black text-slate-900">{data.businessDocuments?.roi}%</span>
                          </div>
                       </div>
                       
                       <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4">
                          <div className="flex items-center gap-3 text-emerald-600">
                             <Zap className="w-5 h-5" />
                             <span className="text-xs font-black uppercase tracking-widest italic">{t('benefits_realization')}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed">
                             {data.businessDocuments?.benefitsPlan || 'Define benefits in Foundation Center.'}
                          </p>
                          <div className="px-4 py-2 bg-white/50 rounded-xl text-[10px] font-black text-emerald-700 uppercase tracking-widest inline-block">
                             {data.businessDocuments?.benefitDuration}
                          </div>
                       </div>
                    </div>
                  )}

                  {activeSegment === 'agreements' && (
                    <div className="space-y-4">
                       {data.agreements?.map((a: any) => (
                         <div key={a.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  <Handshake className="w-4 h-4 text-amber-500" />
                                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{a.type}</span>
                               </div>
                               <ChevronRight className="w-3 h-3 text-slate-300" />
                            </div>
                            <div className="space-y-3">
                               <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mandatory Scope</div>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed">{a.initialScope}</p>
                               </div>
                               <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 italic">
                                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                  <div className="text-[10px] font-black text-slate-500 leading-normal uppercase">
                                     <span className="text-rose-500">Constraint:</span> {a.penalties}
                                  </div>
                               </div>
                            </div>
                         </div>
                       ))}
                       {data.agreements?.length === 0 && (
                         <p className="text-center text-[10px] font-bold text-slate-400 uppercase italic py-10">No agreements documented.</p>
                       )}
                    </div>
                  )}

                  {activeSegment === 'eefs' && (
                    <div className="space-y-8">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <div className="w-1 h-1 bg-slate-900 rounded-full" />
                             Internal Constraints
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                             {Object.entries(data.eefs?.internal || {}).filter(([k]) => k !== 'custom').map(([key, val]) => (
                               <div key={key} className={cn(
                                 "flex items-center justify-between p-3 rounded-xl border transition-all",
                                 val ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-300 border-slate-100"
                               )}>
                                  <span className="text-[10px] font-black uppercase tracking-widest">{key}</span>
                                  {val ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> : <div className="w-3.5 h-3.5" />}
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <div className="w-1 h-1 bg-blue-600 rounded-full" />
                             External Market Context
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                             {Object.entries(data.eefs?.external || {}).filter(([k]) => k !== 'custom').map(([key, val]) => (
                               <div key={key} className={cn(
                                 "flex items-center justify-between p-3 rounded-xl border transition-all",
                                 val ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white text-slate-300 border-slate-100"
                               )}>
                                  <span className="text-[10px] font-black uppercase tracking-widest">{key}</span>
                                  {val ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> : <div className="w-3.5 h-3.5" />}
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}

                  {activeSegment === 'opas' && (
                    <div className="space-y-6">
                       <div className="p-8 bg-indigo-900 rounded-[3rem] text-white space-y-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                          <div className="flex items-center gap-4 relative z-10">
                             <Library className="w-6 h-6 text-indigo-400" />
                             <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">OPA Assets</h4>
                                <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Connected Templates</p>
                             </div>
                          </div>
                          <div className="space-y-3 relative z-10">
                             <div className="p-3 bg-white/10 rounded-2xl flex items-center gap-3">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-bold tracking-tight uppercase">Risk Management Guideline-v3</span>
                             </div>
                             <div className="p-3 bg-white/10 rounded-2xl flex items-center gap-3 text-indigo-200/50">
                                <Library className="w-4 h-4" />
                                <span className="text-[10px] font-bold tracking-tight uppercase">Corporate Quality SOP</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
               </div>

               <footer className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic">Powering Smart Integration</p>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                     Close Insights
                  </button>
               </footer>
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
};
