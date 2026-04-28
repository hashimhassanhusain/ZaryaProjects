import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import {
  FileText,
  ChevronRight,
  Cloud,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';

interface StandardProcessPageProps {
  page: Page;
  inputs?: { id: string; title: string; status?: string }[];
  tools?: { id: string; title: string }[];
  outputs?: { id: string; title: string; status?: string }[];
  children: React.ReactNode; 
  onSave?: () => void;
  onPrint?: () => void;
  isSaving?: boolean;
}

const QuickViewModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  id: string 
}> = ({ isOpen, onClose, title, id }) => {
  const linkedPage = pages.find(p => p.id === id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                     <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-blue-600 tracking-widest leading-none mb-1">{id}</p>
                    <h2 className="text-xl font-semibold text-slate-900">{stripNumericPrefix(title)}</h2>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
               >
                 <ArrowRight className="w-5 h-5 rotate-180" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-12">
               <div className="space-y-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">Connected Data Extract</h3>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                    {linkedPage?.summary || `This is a quick-read snapshot of the approved ${stripNumericPrefix(title)}. The full interactive tool is available in the respective performance domain.`}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 italic">
                    Note: This view is read-only to maintain "Single Source of Truth."
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-50 rounded-[2rem] space-y-4">
                     <h4 className="text-[9px] font-semibold uppercase text-slate-400">Governance Context</h4>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                           <span className="text-xs font-bold text-slate-600">Domain</span>
                           <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{linkedPage?.domain || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                           <span className="text-xs font-bold text-slate-600">Focus Area</span>
                           <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{linkedPage?.focusArea || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                           <span className="text-xs font-bold text-slate-600">Status</span>
                           <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-semibold uppercase tracking-widest">Baseline</span>
                        </div>
                     </div>
                  </div>
                  <div className="p-8 bg-blue-50 rounded-[2rem] space-y-4">
                     <h4 className="text-[9px] font-semibold uppercase text-blue-600">Approval & Integration</h4>
                     <div className="flex items-center gap-3">
                        <ShieldCheck className="w-10 h-10 text-blue-500" />
                        <div>
                           <p className="text-sm font-semibold text-blue-900 leading-none italic uppercase">Digitally Verified</p>
                           <p className="text-[9px] font-bold text-blue-600/60 uppercase mt-1">Cross-Process Link Active</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <p className="text-[10px] font-semibold text-slate-400 uppercase italic">Archived by Zarya Hub • {id}-V2.4</p>
               <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest">
                  View Source Process
                  <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const StandardProcessPage: React.FC<StandardProcessPageProps> = ({ 
  page, 
  inputs = [], 
  tools = [],
  outputs = [],
  children,
  onSave,
  onPrint,
  isSaving = false
}) => {
  const { t, th, language, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [quickView, setQuickView] = useState<{ isOpen: boolean; title: string, id: string }>({ isOpen: false, title: '', id: '' });
  const [driveSyncStatus, setDriveSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('synced');

  // Favorites logic
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('zarya_favorites');
    const favs = saved ? JSON.parse(saved) : ['3.6.3', '3.6.4', '2.4.1'];
    setIsFavorite(favs.includes(page.id));
  }, [page.id]);

  const toggleFavorite = () => {
    const saved = localStorage.getItem('zarya_favorites');
    let favs = saved ? JSON.parse(saved) : ['3.6.3', '3.6.4', '2.4.1'];
    
    if (favs.includes(page.id)) {
      favs = favs.filter((id: string) => id !== page.id);
      toast.success(t('removed_from_favorites'));
    } else {
      favs.push(page.id);
      toast.success(t('added_to_favorites'));
    }
    
    localStorage.setItem('zarya_favorites', JSON.stringify(favs));
    setIsFavorite(favs.includes(page.id));
    window.dispatchEvent(new Event('storage')); // Sync other components
  };

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const grandParentPage = parentPage?.parentId ? pages.find(p => p.id === parentPage.parentId) : null;

  const translatedTitle = th(page.id);
  const isIdTranslation = translatedTitle === page.id || stripNumericPrefix(translatedTitle) === '';
  const displayTitle = isIdTranslation ? page.title : translatedTitle;
  
  const parentTranslated = parentPage ? th(parentPage.id) : '';
  const isParentIdTranslation = parentTranslated === parentPage?.id || stripNumericPrefix(parentTranslated) === '';
  const parentTitle = parentPage ? (isParentIdTranslation ? parentPage.title : parentTranslated) : '';
  
  const grandParentTranslated = grandParentPage ? th(grandParentPage.id) : '';
  const isGrandParentIdTranslation = grandParentTranslated === grandParentPage?.id || stripNumericPrefix(grandParentTranslated) === '';
  const grandParentTitle = grandParentPage ? (isGrandParentIdTranslation ? grandParentPage.title : grandParentTranslated) : '';

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col print:bg-white print:p-0">
      <QuickViewModal 
        isOpen={quickView.isOpen} 
        onClose={() => setQuickView({ ...quickView, isOpen: false })}
        title={quickView.title}
        id={quickView.id}
      />

      <div className="flex-1 w-full px-4 md:px-10 py-8 print:block print:p-0">
        <div className="w-full">

        {/* ── INTERACTIVE WORKSPACE ── */}
        <section className="space-y-8 flex flex-col">
            <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col print:border-none print:shadow-none">

               <div className="px-10 pt-8 pb-2 relative flex-1">
                {/* Workspace Content */}
                {driveSyncStatus === 'syncing' ? (
                  <div className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-12 animate-in zoom-in-95 duration-700 print:hidden">
                    <div className="w-full max-w-sm aspect-[1/1.414] bg-white rounded-3xl border-8 border-slate-50 shadow-2xl flex flex-col relative overflow-hidden group">
                       <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                          <div className="w-8 h-8 bg-slate-900 rounded-xl" />
                          <div className="flex-1 mx-4 h-3 bg-slate-100 rounded-full" />
                          <div className="w-5 h-5 rounded-full bg-slate-200" />
                       </div>
                       <div className="flex-1 p-10 space-y-6">
                          <div className="w-3/4 h-5 bg-slate-50 rounded-lg" />
                          <div className="w-full h-3 bg-slate-50 rounded-full" />
                          <div className="w-full h-3 bg-slate-50 rounded-full" />
                          <div className="w-1/2 h-3 bg-slate-50 rounded-full" />
                          <div className="pt-12 grid grid-cols-2 gap-6">
                             <div className="aspect-video bg-slate-50 rounded-[2rem]" />
                             <div className="aspect-video bg-slate-50 rounded-[2rem]" />
                          </div>
                       </div>
                       <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 backdrop-blur-md transition-all flex flex-col items-center justify-center gap-8">
                          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                             <Cloud className="w-16 h-16 text-blue-400" />
                          </motion.div>
                          <p className="text-[12px] font-semibold text-white uppercase tracking-[0.2em]">Synchronizing Artifact...</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase italic">Refining Output Artifact</p>
                      <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest px-6 py-2.5 bg-slate-100 rounded-full inline-block">
                        Ready for formal sign-off & archiving
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col space-y-6">
                      {/* Dynamic Breadcrumb Trail */}
                      <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                        {grandParentPage && (
                          <>
                            <span className="hover:text-blue-500 cursor-pointer transition-colors" onClick={() => navigate(`/page/${grandParentPage.id}`)}>
                              {stripNumericPrefix(grandParentTitle)}
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                          </>
                        )}
                        {parentPage && (
                          <>
                            <span className="hover:text-blue-500 cursor-pointer transition-colors" onClick={() => navigate(`/page/${parentPage.id}`)}>
                              {stripNumericPrefix(parentTitle)}
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                          </>
                        )}
                        <span className="text-blue-600">
                          {stripNumericPrefix(displayTitle)}
                        </span>
                      </nav>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-4">
                          <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">
                            {parentPage && <span className="text-slate-300">{stripNumericPrefix(parentTitle)} <span className="mx-2 text-slate-200">›</span></span>}
                            {stripNumericPrefix(displayTitle)}
                          </h2>
                          <button 
                            onClick={toggleFavorite}
                            className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border",
                              isFavorite 
                                ? "bg-amber-50 border-amber-200 text-amber-500 shadow-amber-200/20" 
                                : "bg-white border-slate-100 text-slate-300 hover:text-slate-600"
                            )}
                          >
                            <Star className={cn("w-6 h-6", isFavorite && "fill-current")} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 mt-12">
                      {children}
                    </div>
                  </>
                )}

                {/* Print Content (Only visible when printing) */}
                <div className="hidden print:block print:w-full print:mx-auto">
                   <header className={cn("flex items-center justify-between border-b-4 border-slate-900 pb-10 mb-16", isRtl && "flex-row-reverse")}>
                      <div className="space-y-6">
                         <div className={cn("flex items-center gap-4", isRtl && "flex-row-reverse")}>
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl" />
                            <div className={cn(isRtl && "text-right")}>
                               <h1 className="text-4xl font-semibold tracking-tighter uppercase leading-none">Zarya</h1>
                               <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{t('project_management_pmis')}</p>
                            </div>
                         </div>
                      </div>
                      <div className={cn("text-right space-y-2", isRtl && "text-left")}>
                         <h2 className="text-2xl font-semibold uppercase tracking-tight italic">
                           {parentPage && `${stripNumericPrefix(parentTitle)} › `}
                           {stripNumericPrefix(displayTitle)}
                         </h2>
                         <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('project')}: {selectedProject?.name}</p>
                         <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('code')}: {selectedProject?.code}</p>
                      </div>
                   </header>

                   <main className="space-y-20">
                      <section className={cn("grid grid-cols-2 gap-16 p-12 bg-slate-50 rounded-[3rem]", isRtl && "text-right")}>
                         <div className="space-y-3">
                            <h4 className="text-[10px] font-semibold uppercase text-slate-400 tracking-[0.2em]">{t('unique_record_id')}</h4>
                            <p className="text-lg font-semibold italic">{selectedProject?.code}-{page.id}-V2.4</p>
                         </div>
                         <div className="space-y-3">
                            <h4 className="text-[10px] font-semibold uppercase text-slate-400 tracking-[0.2em]">{t('baseline_timestamp')}</h4>
                            <p className="text-lg font-semibold italic">{new Date().toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-US')}</p>
                         </div>
                      </section>

                      <div className="prose prose-slate max-w-none">
                         {children}
                      </div>

                      <section className="pt-32 mt-32 border-t-2 border-slate-200 grid grid-cols-3 gap-20">
                         <div className="space-y-12">
                            <div className="h-1.5 bg-slate-900 w-full" />
                            <div className={cn(isRtl && "text-right")}>
                               <p className="text-sm font-semibold uppercase">{t('prepared_by')}</p>
                               <p className="text-[11px] text-slate-400 font-bold uppercase mt-2">Project Planning Unit</p>
                            </div>
                         </div>
                         <div className="space-y-12">
                            <div className="h-1.5 bg-slate-900 w-full" />
                            <div className={cn(isRtl && "text-right")}>
                               <p className="text-sm font-semibold uppercase">{t('reviewed_by')}</p>
                               <p className="text-[11px] text-slate-400 font-bold uppercase mt-2">{t('project_manager')}</p>
                            </div>
                         </div>
                         <div className="space-y-12">
                            <div className="h-1.5 bg-slate-900 w-full" />
                            <div className={cn(isRtl && "text-right")}>
                               <p className="text-sm font-semibold uppercase">{t('approved_by')}</p>
                               <p className="text-[11px] text-slate-400 font-bold uppercase mt-2">{t('project_sponsor')}</p>
                            </div>
                         </div>
                      </section>
                   </main>

                   <footer className={cn("mt-32 pt-16 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-300 uppercase tracking-[0.3em]", isRtl && "flex-row-reverse")}>
                      <span>© {new Date().getFullYear()} Zarya Construction Mgmt. {t('all_rights_reserved')}</span>
                      <span dir="ltr">SEC_PRT_{selectedProject?.code}_{page.id}_{stripNumericPrefix(page.title).toUpperCase().replace(/\s+/g, '_')}_V2.4</span>
                   </footer>
                </div>
              </div>
            </div>
        </section>

        </div>
      </div>
    </div>
  );
};
