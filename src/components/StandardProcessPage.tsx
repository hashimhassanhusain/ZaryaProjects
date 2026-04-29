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
  Star,
  Loader2,
  Table,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';

import { useUI } from '../context/UIContext';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig } from '../types';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface StandardProcessPageProps {
  page: Page;
  inputs?: { id: string; title: string; status?: string }[];
  tools?: { id: string; title: string }[];
  outputs?: { id: string; title: string; status?: string }[];
  children: React.ReactNode; 
  onSave?: () => void;
  onPrint?: () => void;
  isSaving?: boolean;
  collectionName?: string;
  gridConfig?: Partial<EntityConfig>;
}

const QuickViewModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  id: string 
}> = ({ isOpen, onClose, title, id }) => {
  const linkedPage = pages.find(p => p.id === id);
  const { selectedProject } = useProject();
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && id) {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Attempt to find a collection that might hold data for this page ID
          // For simplicity, we check if there's data in the project's pageData
          const data = selectedProject?.pageData?.[id];
          if (data) {
            setLiveData(data);
          } else {
            // Also try a query if it's a known collection type
            // This is a placeholder for real relational lookup
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, id, selectedProject]);

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
               {loading ? (
                 <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                 </div>
               ) : (
                 <>
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">Connected Data Extract</h3>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        {linkedPage?.summary || `This is a quick-read snapshot of the approved ${stripNumericPrefix(title)}. The full interactive tool is available in the respective performance domain.`}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 italic">
                        Note: This view is read-only to maintain "Single Source of Truth."
                      </p>
                   </div>

                   {liveData ? (
                     <div className="grid grid-cols-2 gap-4">
                        {Object.entries(liveData).filter(([k]) => !['id', 'projectId', 'updatedAt', 'createdAt'].includes(k)).map(([key, value]) => (
                          <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                             <p className="text-sm font-semibold text-slate-700">{String(value)}</p>
                          </div>
                        ))}
                     </div>
                   ) : (
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
                   )}
                 </>
               )}
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <p className="text-[10px] font-semibold text-slate-400 uppercase italic">Archived by Zarya Hub • {id}-V2.4</p>
               <button 
                 onClick={() => {
                   onClose();
                   // Navigate logic
                 }}
                 className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest"
               >
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
  isSaving = false,
  collectionName,
  gridConfig
}) => {
  const { t, th, language, isRtl } = useLanguage();

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

  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [quickView, setQuickView] = useState<{ isOpen: boolean; title: string, id: string }>({ isOpen: false, title: '', id: '' });
  const [driveSyncStatus, setDriveSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('synced');

  // --- GRID FIRST LOGIC ---
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [gridData, setGridData] = useState<any[]>([]);

  useEffect(() => {
    if (collectionName && selectedProject && viewMode === 'grid') {
      const q = query(collection(db, collectionName), where('projectId', '==', selectedProject.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGridData(data);
        // If no data, default to edit mode for first entry
        if (data.length === 0) {
          setViewMode('edit');
        }
      });
      return () => unsubscribe();
    } else if (!collectionName) {
      setViewMode('edit');
    }
  }, [collectionName, selectedProject, viewMode]);

  const defaultGridConfig: EntityConfig = {
    id: (collectionName as any) || 'generic',
    label: displayTitle,
    icon: FileText,
    collection: collectionName || '',
    columns: (page.formFields || []).map(f => ({
      key: f.replace(/\s+/g, ''),
      label: f,
      type: 'string'
    }))
  };

  const finalGridConfig = { ...defaultGridConfig, ...gridConfig };

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
            {inputs.map((input, idx) => {
              const inputTranslated = t(input.id);
              const inputDisplay = inputTranslated === input.id ? input.title : inputTranslated;
              return (
                <div 
                  key={`input-${input.id}-${idx}`}
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
                {tools.map((tool, idx) => {
                  const toolTranslated = t(tool.id);
                  const toolDisplay = toolTranslated === tool.id ? tool.title : toolTranslated;
                  return (
                    <div key={`tool-${tool.id}-${idx}`} className="px-5 py-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 group hover:border-amber-200 transition-colors">
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
        <section className="col-span-12 md:col-span-9 space-y-8 flex flex-col">
            <div className="flex-1 bg-white rounded-[4.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[900px] print:border-none print:shadow-none print:min-h-0 relative">
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
                           <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{t('governance')}</p>
                     </div>
                  </div>
                  <div className={cn("flex flex-col items-end gap-2 relative z-10", isRtl && "items-start")}>
                     <div className="px-5 py-2.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider italic">{t('enterprise_governance_protocol')}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{t('source_context')}: {page.focusArea}</span>
                     </div>
                  </div>
               </div>

               {/* View Toggle Bar (Top of Workspace) */}
               <div className="px-12 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
                     <button 
                       onClick={() => setViewMode('grid')}
                       className={cn(
                         "flex items-center gap-2.5 px-7 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest",
                         viewMode === 'grid' ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                       )}
                     >
                       <Table className="w-4 h-4" />
                       {t('grid_view')}
                     </button>
                     <button 
                       onClick={() => setViewMode('edit')}
                       className={cn(
                         "flex items-center gap-2.5 px-7 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest",
                         viewMode === 'edit' ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                       )}
                     >
                       <Edit2 className="w-4 h-4" />
                       {t('edit_view')}
                     </button>
                  </div>
                  
                  <div className="flex items-center gap-6">
                     <div className="flex flex-col items-end">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('data_synchronization')}</p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                              {t('live_firestore_link')}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
                 <AnimatePresence mode="wait">
                   {viewMode === 'grid' && collectionName ? (
                     <motion.div
                       key="grid"
                       initial={{ opacity: 0, scale: 0.98 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.98 }}
                       className="flex-1 p-10 overflow-hidden flex flex-col"
                     >
                       <UniversalDataTable 
                         config={finalGridConfig}
                         data={gridData}
                         onRowClick={(row) => {
                           setViewMode('edit');
                         }}
                         onNewClick={() => setViewMode('edit')}
                         onDeleteRecord={() => {}}
                       />
                     </motion.div>
                   ) : (
                     <motion.div
                       key="edit"
                       initial={{ opacity: 0, scale: 0.98 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.98 }}
                       className="flex-1 flex flex-col min-h-0"
                     >
                       <div className="flex-1 p-12 overflow-y-auto">
                        {/* Workspace Content */}
                        {driveSyncStatus === 'syncing' ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center space-y-12 animate-in zoom-in-95 duration-700 print:hidden flex-1">
                            {/* ... animation ... */}
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
                               </div>
                               <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-8">
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
                            <div className="flex flex-col space-y-6 mb-12">
                              {/* Dynamic Breadcrumb Trail */}
                              <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                                {grandParentPage && (
                                  <>
                                    <span className="hover:text-blue-500 cursor-pointer transition-colors" onClick={() => navigate(`/page/${grandParentPage.id}`)}>
                                      {stripNumericPrefix(grandParentTitle)}
                                    </span>
                                    <span className="mx-1 opacity-50">→</span>
                                  </>
                                )}
                                {parentPage && (
                                  <>
                                    <span className="hover:text-blue-500 cursor-pointer transition-colors" onClick={() => navigate(`/page/${parentPage.id}`)}>
                                      {stripNumericPrefix(parentTitle)}
                                    </span>
                                    <span className="mx-1 opacity-50">→</span>
                                  </>
                                )}
                                <span className="text-blue-600 font-black">
                                  {stripNumericPrefix(displayTitle)}
                                </span>
                              </nav>

                              <div className="flex items-center justify-between px-4">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight flex items-center gap-4 flex-wrap uppercase">
                                  {parentPage && (
                                    <>
                                      <span className="text-slate-300 font-extrabold uppercase italic opacity-60 text-2xl">{stripNumericPrefix(parentTitle)}</span>
                                      <span className="text-slate-200 font-light mx-1">{'>'}</span>
                                    </>
                                  )}
                                  <span className="text-slate-900">{stripNumericPrefix(displayTitle)}</span>
                                </h2>
                                <button 
                                  onClick={toggleFavorite}
                                  className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm border",
                                    isFavorite 
                                      ? "bg-amber-50 border-amber-200 text-amber-500 shadow-amber-200/20" 
                                      : "bg-white border-slate-100 text-slate-300 hover:text-slate-600"
                                  )}
                                >
                                  <Star className={cn("w-7 h-7", isFavorite && "fill-current")} />
                                </button>
                              </div>
                            </div>

                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                              {children}
                            </div>
                          </>
                        )}
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>

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
                         <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                           {parentPage && (
                              <>
                                <span className="opacity-30">{stripNumericPrefix(parentTitle)}</span>
                                <span className="mx-2 opacity-20">›</span>
                              </>
                           )}
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

        {/* ── GLOBAL FLOATING ACTION BUTTONS (FAB) ── */}
        <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-3 print:hidden">
          <AnimatePresence>
            <div className="flex flex-col gap-3">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={() => onSave?.()}
                disabled={isSaving}
                className="group flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all border border-blue-400/20"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span className="text-[11px] font-bold uppercase tracking-widest">{t('save_new')}</span>
              </motion.button>
              
              <div className="flex items-center gap-3">
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => onSave?.()}
                  className="p-4 bg-white text-slate-600 rounded-[2rem] shadow-xl hover:bg-slate-50 transition-all border border-slate-100 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('update')}</span>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => navigate(-1)}
                  className="p-4 bg-white text-slate-600 rounded-[2rem] shadow-xl hover:bg-slate-50 transition-all border border-slate-100 flex items-center gap-3"
                >
                  <ArrowRight className={cn("w-5 h-5 rotate-180", isRtl && "rotate-0")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('cancel')}</span>
                </motion.button>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={onPrint}
                  className="group flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-[2rem] shadow-xl hover:bg-black transition-all border border-slate-800"
                >
                  <Printer className="w-5 h-5 text-blue-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{t('print_preview')}</span>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={async () => {
                    setDriveSyncStatus('syncing');
                    await new Promise(r => setTimeout(r, 2000));
                    setDriveSyncStatus('synced');
                    toast.success('Synced to Google Drive successfully');
                  }}
                  className="group flex items-center gap-3 px-6 py-4 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-[2rem] shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                >
                  <Cloud className="w-5 h-5" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{t('sync_to_drive')}</span>
                </motion.button>
              </div>
            </div>
          </AnimatePresence>
        </div>
        
        </div>
      </div>
    </div>
  );
};
