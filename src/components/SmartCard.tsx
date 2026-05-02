import React, { useState, useEffect } from 'react';
import { Shield, Library, Info, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SmartCardProps {
  type: 'eef' | 'opa';
  className?: string;
}

export const SmartCard: React.FC<SmartCardProps> = ({ type, className }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && selectedProject && !data) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'projectFoundations', selectedProject.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setData(docSnap.data());
          }
        } catch (err) {
          console.error('Error fetching smart card data:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, selectedProject, data]);

  const Icon = type === 'eef' ? Shield : Library;
  const label = type === 'eef' ? 'EEFs' : 'OPAs';

  return (
    <div className={cn("relative inline-block", className)}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "p-2 rounded-full transition-all shadow-lg group cursor-pointer active:scale-95",
          isOpen ? "bg-blue-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
        )}
      >
        <Icon className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={cn(
                "absolute top-full mt-2 w-72 md:w-80 bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-white/10 z-[100]",
                isRtl ? "right-0" : "left-0"
              )}
            >
            <div className={cn("flex items-center justify-between mb-4", isRtl && "flex-row-reverse")}>
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                     <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{label} Summary</span>
               </div>
               <div className="text-[8px] font-bold opacity-30 uppercase tracking-widest italic">Read-only Master Data</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                 <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : data ? (
              <div className="space-y-4">
                 {type === 'eef' ? (
                   <div className="space-y-3">
                      <div>
                         <div className={cn("text-[9px] font-black text-slate-500 uppercase mb-2", isRtl && "text-right")}>Internal constraints</div>
                         <div className="flex flex-wrap gap-2">
                            {Object.entries(data.eefs?.internal || {}).map(([k, v]) => v === true && (
                               <span key={k} className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold uppercase tracking-wider">{k}</span>
                            ))}
                         </div>
                      </div>
                      <div>
                         <div className={cn("text-[9px] font-black text-slate-500 uppercase mb-2", isRtl && "text-right")}>External constraints</div>
                         <div className="flex flex-wrap gap-2">
                            {Object.entries(data.eefs?.external || {}).map(([k, v]) => v === true && (
                               <span key={k} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-[8px] font-bold uppercase tracking-wider">{k}</span>
                            ))}
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-3">
                      <div>
                         <div className={cn("text-[9px] font-black text-slate-500 uppercase mb-2", isRtl && "text-right")}>Active Templates</div>
                         <div className="space-y-1">
                            {data.opas?.importedTemplates?.length > 0 ? (
                               data.opas.importedTemplates.map((t: string, i: number) => (
                                 <div key={i} className="text-[9px] font-bold flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    {t}
                                 </div>
                               ))
                            ) : (
                               <div className="text-[9px] opacity-40">No templates imported</div>
                            )}
                         </div>
                      </div>
                   </div>
                 )}
                 
                 <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <button 
                      onClick={() => {
                        const path = selectedProject ? `/project/${selectedProject.id}/page/foundation` : `/page/foundation`;
                        navigate(path, { state: { activeTab: type === 'eef' ? 'eefs' : 'opas' } });
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-all cursor-pointer"
                    >
                       Manage {label} <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-[8px] font-black text-slate-600">V{data.version}</span>
                 </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-4">
                 <p className="text-[10px] font-bold text-white/50 uppercase italic tracking-widest">No foundation data yet</p>
                 <button 
                   onClick={() => {
                     const path = selectedProject ? `/project/${selectedProject.id}/page/foundation` : `/page/foundation`;
                     navigate(path, { state: { activeTab: type === 'eef' ? 'eefs' : 'opas' } });
                     setIsOpen(false);
                   }}
                   className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
                 >
                    Setup {label}
                 </button>
              </div>
            )}

            {/* Triangle indicator */}
            <div className={cn(
              "absolute bottom-full -mb-2 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-slate-900",
              isRtl ? "right-6" : "left-6"
            )} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </div>
);
};
