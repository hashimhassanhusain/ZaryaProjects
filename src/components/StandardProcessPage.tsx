import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { 
  FileText, 
  ArrowRight, 
  Printer, 
  Download, 
  Save, 
  History, 
  ChevronRight, 
  Eye, 
  Settings,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Box,
  Cpu,
  Layers,
  ShieldCheck,
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
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* ── BLOCK A: INPUT HUB (Left Sidebar) ── */}
        <aside className="col-span-3 space-y-6 print:hidden">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" />
                {t('input_arsenal')}
             </h3>
             <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{inputs.length} {t('items')}</span>
          </div>
          
          <div className="space-y-3">
            {inputs.map((input) => {
              const inputTranslated = t(input.id);
              const inputDisplay = inputTranslated === input.id ? input.title : inputTranslated;
              return (
                <div 
                  key={input.id}
                  onClick={() => setQuickView({ isOpen: true, title: inputDisplay, id: input.id })}
                  className={cn(
                    "group p-5 bg-white border border-slate-100 rounded-[2rem] hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer border-l-4 border-l-blue-500 active:scale-[0.98]",
                    isRtl && "border-l-0 border-r-4 border-r-blue-500"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest italic">{input.id}</span>
                    <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className={cn("text-[13px] font-semibold text-slate-900 leading-tight", isRtl && "text-right")}>
                    {stripNumericPrefix(inputDisplay)}
                  </h4>
                </div>
              );
            })}
            
            {inputs.length === 0 && (
              <div className="p-10 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">{t('initial_process_state')}</p>
              </div>
            )}
          </div>

          {/* Tools & Techniques Section */}
          <div className="pt-6 space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                   <Cpu className="w-4 h-4 text-amber-500" />
                   {t('tools_logic')}
                </h3>
             </div>
             <div className="space-y-2">
                {tools.map((tool) => {
                  const toolTranslated = t(tool.id);
                  const toolDisplay = toolTranslated === tool.id ? tool.title : toolTranslated;
                  return (
                    <div key={tool.id} className="px-5 py-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 group hover:border-amber-200 transition-colors">
                       <div className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                       <span className="text-xs font-bold text-slate-600 truncate">{toolDisplay}</span>
                    </div>
                  );
                })}
                {tools.length === 0 && (
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4">{t('standard_processing_only')}</p>
                )}
             </div>
          </div>
        </aside>

        {/* ── BLOCK B: INTERACTIVE WORKSPACE (Central Flow) ── */}
        <section className="col-span-12 md:col-span-6 space-y-8 flex flex-col">
            <div className="flex-1 bg-white rounded-[4.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[900px] print:border-none print:shadow-none print:min-h-0">
               {/* Workflow Visualization Header */}
               <div className="bg-slate-900 p-10 flex items-center justify-between print:hidden overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                  <div className={cn("flex items-center gap-8 relative z-10", isRtl && "flex-row-reverse")}>
                     <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-2">
                           <Box className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{t('input_arsenal')}</p>
                     </div>
                     <ArrowRight className={cn("w-6 h-6 text-white/10", isRtl && "rotate-180")} />
                     <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-2 animate-pulse">
                           <Cpu className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-[10px] font-semibold text-white uppercase tracking-widest">{t('processing_logic')}</p>
                     </div>
                     <ArrowRight className={cn("w-6 h-6 text-white/10", isRtl && "rotate-180")} />
                     <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mb-2">
                           <Layers className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{t('output_tier')}</p>
                     </div>
                  </div>
                  <div className={cn("flex flex-col items-end gap-2 relative z-10", isRtl && "items-start")}>
                     <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-[11px] font-semibold text-white uppercase tracking-tighter italic">{t('enterprise_governance_protocol')}</span>
                     </div>
                     <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">{t('source_context')}: {page.focusArea}</span>
                  </div>
               </div>

               <div className="p-16 relative flex-1">
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

        {/* ── BLOCK C: OUTPUT TIER (Right Sidebar) ── */}
        <aside className="col-span-3 space-y-10 print:hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  {t('output_tier')}
               </h3>
               <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{t('archive_ready')}</span>
            </div>
            
            <div className="space-y-5">
               {outputs.map((output) => {
                 const outputTranslated = t(output.id);
                 const outputDisplay = outputTranslated === output.id ? output.title : outputTranslated;
                 return (
                   <div 
                     key={output.id}
                     className={cn(
                       "group p-8 bg-white border border-emerald-100 rounded-[3rem] space-y-6 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all border-r-8 border-r-emerald-500 active:scale-[0.98]",
                       isRtl && "border-r-0 border-l-8 border-l-emerald-500"
                     )}
                   >
                      <div className="flex items-center justify-between">
                         <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <FileText className="w-6 h-6" />
                         </div>
                         <div className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-semibold uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                            {t(output.status?.toLowerCase() || 'baseline')}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <h4 className={cn("text-[15px] font-semibold text-slate-900 leading-tight", isRtl && "text-right")}>
                           {stripNumericPrefix(outputDisplay)}
                         </h4>
                         <p className={cn("text-[10px] font-semibold text-slate-300 uppercase tracking-widest italic", isRtl && "text-right")}>{output.id}</p>
                      </div>
                      <button 
                        onClick={onPrint}
                        className="w-full py-4 bg-slate-900 text-white rounded-[2rem] text-[10px] font-semibold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10"
                      >
                        {t('export_pdf_deliverable')}
                      </button>
                   </div>
                 );
               })}

               {outputs.length === 0 && (
                 <div className="p-12 bg-emerald-50/50 border border-emerald-100 rounded-[3.5rem] space-y-6 text-center">
                    <Printer className="w-12 h-12 text-emerald-500/20 mx-auto" />
                    <div className="space-y-1">
                       <p className="text-xs font-semibold text-emerald-900 uppercase tracking-tight">{t('finalizing_resultant_artifact')}</p>
                       <p className="text-[9px] font-semibold text-emerald-600/40 uppercase tracking-widest italic">{t('awaiting_work_completion')}</p>
                    </div>
                 </div>
               )}
            </div>
          </div>

          {/* ── Google Drive Integration Card ── */}
          <div className="p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[4rem] shadow-2xl shadow-blue-600/30 space-y-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />
             <div className={cn("flex items-center justify-between relative z-10", isRtl && "flex-row-reverse")}>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/20">
                   <Cloud className="w-7 h-7" />
                </div>
                <div className={cn("flex flex-col items-end", isRtl && "items-start")}>
                   <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)] mb-1" />
                   <span className="text-[8px] font-semibold text-white/60 uppercase tracking-widest">{t('enterprise_sync')}</span>
                </div>
             </div>
             <div className="space-y-4 relative z-10">
                <h4 className={cn("text-lg font-semibold text-white italic uppercase tracking-tight leading-tight", isRtl && "text-right")}>{t('automated_cloud_archival_plan')}</h4>
                <p className={cn("text-[12px] text-white/80 font-bold leading-relaxed", isRtl && "text-right")}>
                   {t('zarya_creates_structure')} 
                   <span className="block mt-3 p-3 bg-black/20 rounded-2xl font-mono text-[10px] text-blue-200" dir="ltr">
                     /Drive/ZARYA/{page.domain}/{page.focusArea}/
                   </span>
                </p>
             </div>
          </div>
        </aside>
        
        </div>
      </div>
    </div>
  );
};
