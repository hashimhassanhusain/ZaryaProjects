import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Page, EntityConfig, Project } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface StandardProcessPageContextType {
  pageHeader: React.ReactNode;
  favoriteControl: React.ReactNode;
}

export const StandardProcessPageContext = React.createContext<StandardProcessPageContextType | null>(null);

export const useStandardProcessPage = () => {
  const context = React.useContext(StandardProcessPageContext);
  return context;
};

import { 
  FileText, 
  ArrowRight, 
  Printer, 
  Save, 
  ChevronRight, 
  Eye, 
  CheckCircle2,
  Box,
  Cpu,
  ShieldCheck,
  Cloud,
  Star,
  Loader2,
  Table,
  Edit2,
  History,
  AlertCircle,
  X,
  Plus,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useProjectTools } from '../context/ToolsContext';
import { toast } from 'react-hot-toast';
import { HelpTooltip } from './HelpTooltip';

import { UniversalDataTable } from './common/UniversalDataTable';
import { PlanningPlanHeader } from './common/PlanningPlanHeader';

interface StandardProcessPageProps {
  page: Page;
  embedded?: boolean;
  inputs?: { id: string; title: string; status?: string; lastUpdated?: string }[];
  tools?: { id: string; title: string }[];
  outputs?: { id: string; title: string; status?: string }[];
  children: React.ReactNode; 
  onSave?: () => void;
  onPrint?: () => void;
  isSaving?: boolean;
  collectionName?: string;
  gridConfig?: Partial<EntityConfig>;
  viewMode?: 'grid' | 'edit';
  onViewModeChange?: (mode: 'grid' | 'edit') => void;
  // Versioning Props
  versions?: { id: string; version: string; timestamp: string; userName: string }[];
  currentVersion?: string;
  onVersionChange?: (versionId: string) => void;
  onNewVersion?: () => void;
  isArchived?: boolean;
  actions?: React.ReactNode;
  onNew?: () => void;
  primaryAction?: {
    label: string;
    icon: any;
    onClick: () => void;
    loading?: boolean;
  };
  secondaryActions?: {
    label: string;
    icon: any;
    onClick: () => void;
    loading?: boolean;
  }[];
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
          const data = selectedProject?.pageData?.[id];
          if (data) {
            setLiveData(data);
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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
               <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
               <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center text-white shadow-lg">
                     <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900 leading-tight">{stripNumericPrefix(title)}</h2>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="p-1.5 hover:bg-neutral-200 rounded-full transition-colors text-neutral-400"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {loading ? (
                 <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                 </div>
               ) : (
                 <>
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-950 dark:text-neutral-300 italic">Connected Data Extract</h3>
                      <p className="text-sm font-medium text-neutral-600 leading-relaxed italic">
                        {linkedPage?.summary || `This is a quick-read snapshot of the approved ${stripNumericPrefix(title)}. The full interactive tool is available in the respective performance domain.`}
                      </p>
                   </div>

                   {liveData ? (
                     <div className="grid grid-cols-2 gap-4">
                        {Object.entries(liveData).filter(([k]) => !['id', 'projectId', 'updatedAt', 'createdAt'].includes(k)).map(([key, value], idx) => (
                          <div key={`${key}-${idx}`} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                             <p className="text-[9px] font-black text-slate-950 dark:text-neutral-400 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                             <p className="text-sm font-bold text-slate-900">{String(value)}</p>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-8">
                        <div className="p-8 bg-neutral-50 rounded-[2rem] space-y-4">
                           <h4 className="text-[9px] font-black uppercase text-slate-950">Governance Context</h4>
                           <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                                 <span className="text-xs font-black text-slate-900">Domain</span>
                                 <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{linkedPage?.domain || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                                 <span className="text-xs font-bold text-neutral-600">Status</span>
                                 <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-semibold uppercase tracking-widest">Baseline</span>
                              </div>
                           </div>
                        </div>
                        <div className="p-8 bg-brand/10 rounded-[2rem] space-y-4">
                           <h4 className="text-[9px] font-semibold uppercase text-brand">Approval & Integration</h4>
                           <div className="flex items-center gap-3">
                              <ShieldCheck className="w-10 h-10 text-brand" />
                              <div>
                                 <p className="text-sm font-semibold text-brand/90 leading-none italic uppercase">Digitally Verified</p>
                                 <p className="text-[9px] font-bold text-brand/60 uppercase mt-1">Cross-Process Link Active</p>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                 </>
               )}
            </div>

            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
               <p className="text-[9px] font-black text-slate-950 dark:text-neutral-400 uppercase italic">{id}</p>
               <button onClick={onClose} className="flex items-center gap-2 px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-[9px] font-semibold uppercase tracking-widest">
                  View Source
                  <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const StandardProcessPage: React.FC<StandardProcessPageProps> = ({ 
  page, 
  embedded = false,
  inputs = [], 
  tools = [],
  children,
  onSave,
  onPrint,
  isSaving = false,
  collectionName,
  gridConfig,
  viewMode: controlledViewMode,
  onViewModeChange,
  versions = [],
  currentVersion = '1.0',
  onVersionChange,
  onNewVersion,
  isArchived = false,
  actions,
  onNew,
  primaryAction,
  secondaryActions = []
}) => {
  const { t, th, language, isRtl } = useLanguage();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { setActiveOutput } = useProjectTools();

  useEffect(() => {
    // Map page IDs to Tool Output IDs
    const mapping: Record<string, string> = {
      '1.1.1': 'project_charter',
      '2.1.13': 'sourcing_strategy',
      '2.2.1': 'scope_statement',
      'scope': 'scope_statement',
      '2.3.3': 'schedule',
      '3.3.2': 'schedule',
      'sched': 'schedule',
      '2.4.1': 'budget',
      'fin': 'budget',
      '1.5.1': 'stakeholder_register',
      '2.7.5': 'risk_register',
      'risk': 'risk_register'
    };
    
    if (page.id && mapping[page.id]) {
      setActiveOutput(mapping[page.id]);
    } else if (page.domain && mapping[page.domain]) {
      setActiveOutput(mapping[page.domain]);
    } else {
      setActiveOutput(null);
    }

    return () => setActiveOutput(null);
  }, [page.id, page.domain, setActiveOutput]);

  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'edit'>('grid');
  
  const viewMode = controlledViewMode || internalViewMode;
  const setViewMode = onViewModeChange || setInternalViewMode;

  const handleNew = () => {
    if (onNew) {
      onNew();
    } else {
      setViewMode('edit');
    }
  };

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const grandParentPage = parentPage?.parentId ? pages.find(p => p.id === parentPage.parentId) : null;

  const translatedTitle = th(page.id);
  const displayTitle = (translatedTitle === page.id || stripNumericPrefix(translatedTitle) === '') ? page.title : translatedTitle;
  
  const parentTranslated = parentPage ? th(parentPage.id) : '';
  const parentTitle = parentPage ? ((parentTranslated === parentPage?.id || stripNumericPrefix(parentTranslated) === '') ? parentPage.title : parentTranslated) : '';
  
  const grandParentTranslated = grandParentPage ? th(grandParentPage.id) : '';
  const grandParentTitle = grandParentPage ? ((grandParentTranslated === grandParentPage?.id || stripNumericPrefix(grandParentTranslated) === '') ? grandParentPage.title : grandParentTranslated) : '';

  const [gridData, setGridData] = useState<any[]>([]);
  const [quickView, setQuickView] = useState<{ isOpen: boolean; title: string, id: string }>({ isOpen: false, title: '', id: '' });
  const [isFavorite, setIsFavorite] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('synced');

  useEffect(() => {
    if (collectionName && selectedProject && viewMode === 'grid') {
      const q = query(collection(db, collectionName), where('projectId', '==', selectedProject.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGridData(data);
        if (data.length === 0) {
          setViewMode('edit');
        }
      });
      return () => unsubscribe();
    } else if (!collectionName && !controlledViewMode) {
      setViewMode('edit');
    }
  }, [collectionName, selectedProject, viewMode, controlledViewMode]);

  useEffect(() => {
    const saved = localStorage.getItem('pmis_favorites');
    const favs = saved ? JSON.parse(saved) : [];
    setIsFavorite(favs.includes(page.id));
  }, [page.id]);

  const toggleFavorite = () => {
    const saved = localStorage.getItem('pmis_favorites');
    let favs = saved ? JSON.parse(saved) : [];
    if (favs.includes(page.id)) {
      favs = favs.filter((id: string) => id !== page.id);
      toast.success(t('removed_from_favorites'));
    } else {
      favs.push(page.id);
      toast.success(t('added_to_favorites'));
    }
    localStorage.setItem('pmis_favorites', JSON.stringify(favs));
    setIsFavorite(favs.includes(page.id));
    window.dispatchEvent(new Event('storage'));
  };

  const pageHeader = <BreadcrumbHeader page={page} />;


  const favoriteControl = (
    <button 
      onClick={toggleFavorite} 
      className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white border border-slate-100 shadow-sm hover:border-slate-200 active:scale-90 shrink-0", 
        isFavorite && "bg-amber-50 border-amber-200 text-amber-500"
      )}
    >
      <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
    </button>
  );

  return (
    <StandardProcessPageContext.Provider value={{ pageHeader, favoriteControl }}>
      <div className="min-h-screen bg-app-bg flex flex-col print:bg-white print:p-0">
      <QuickViewModal 
        isOpen={quickView.isOpen} 
        onClose={() => setQuickView({ ...quickView, isOpen: false })}
        title={quickView.title}
        id={quickView.id}
      />

      <div className={cn("flex-1 w-full px-4 md:px-6 py-4 print:block print:p-0", embedded && "p-0")}>
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6">
          <section className="col-span-12 space-y-4 flex flex-col">
            <div className={cn("flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[700px] print:border-none relative", embedded && "rounded-none border-none shadow-none min-h-0")}>
               <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {viewMode === 'grid' && collectionName ? (
                      <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-hidden flex flex-col">
                        <UniversalDataTable 
                          config={{
                            id: (collectionName as any) || 'generic',
                            label: displayTitle,
                            icon: FileText,
                            collection: collectionName || '',
                            columns: (page.formFields || []).map(f => ({
                              key: f.replace(/\s+/g, ''),
                              label: f,
                              type: 'string'
                            })),
                            ...gridConfig
                          }} 
                          data={gridData} 
                          onRowClick={() => setViewMode('edit')} 
                          onNewClick={handleNew} 
                          onDeleteRecord={() => {}} 
                          favoriteControl={favoriteControl}
                          showAddButton={false}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 p-4 overflow-y-auto">
                          {driveSyncStatus === 'syncing' ? (
                            <div className="flex flex-col items-center justify-center p-12 animate-in zoom-in-95 duration-700 space-y-8 flex-1">
                              <div className="w-full max-w-sm aspect-[1/1.414] bg-white rounded-2xl border-4 border-slate-50 shadow-2xl flex flex-col relative overflow-hidden">
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-8">
                                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}><Cloud className="w-16 h-16 text-brand" /></motion.div>
                                  <p className="text-[12px] font-semibold text-white uppercase tracking-widest">Synchronizing Artifact...</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {page.focusArea === 'Planning' && onVersionChange && onNewVersion ? (
                                <PlanningPlanHeader 
                                  currentVersion={currentVersion}
                                  onVersionChange={onVersionChange}
                                  onNewVersion={onNewVersion}
                                  versions={versions}
                                />
                              ) : (
                                <div className="flex flex-col space-y-2">
                                  {!embedded && (
                                    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 mt-2", isRtl && "md:flex-row-reverse")}>
                                      <div className="flex-1 space-y-2">
                                        <div className={cn("flex items-start gap-4", isRtl && "flex-row-reverse")}>
                                          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg shrink-0 group">
                                            <FileText className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                                          </div>
                                          <div className={cn("flex-1", isRtl && "text-right")}>
                                            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tighter italic uppercase leading-none flex flex-wrap items-center gap-x-2">
                                              {grandParentPage && (
                                                <span className="text-text-secondary/30 font-black inline-flex items-center gap-2">
                                                  {stripNumericPrefix(grandParentTitle)}
                                                  <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                                                </span>
                                              )}
                                              {parentPage && (
                                                <span className="text-text-secondary/50 font-black inline-flex items-center gap-2">
                                                  {stripNumericPrefix(parentTitle)}
                                                  <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                                                </span>
                                              )}
                                              <span className="text-text-primary">{stripNumericPrefix(displayTitle)}</span>
                                            </h1>
                                          </div>
                                        </div>
                                      </div>

                                      <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                                        {viewMode === 'grid' && collectionName && !isArchived && (
                                          <button 
                                            onClick={handleNew}
                                            className="group flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl shadow-lg shadow-brand/10 hover:bg-brand-secondary transition-all active:scale-95"
                                          >
                                            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                              <Plus className="w-3 h-3" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t('add_entry')}</span>
                                          </button>
                                        )}

                                        {secondaryActions.map((action, idx) => (
                                          <button
                                            key={`sec-action-${idx}`}
                                            onClick={action.onClick}
                                            disabled={action.loading}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all"
                                          >
                                            {action.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <action.icon className="w-3 h-3" />}
                                            {action.label}
                                          </button>
                                        ))}

                                        {primaryAction && (
                                          <button
                                            onClick={primaryAction.onClick}
                                            disabled={primaryAction.loading}
                                            className="flex items-center gap-2 px-4 py-1.5 bg-brand text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-brand-secondary shadow-lg shadow-brand/20 transition-all active:scale-95"
                                          >
                                            {primaryAction.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <primaryAction.icon className="w-3.5 h-3.5" />}
                                            {primaryAction.label}
                                          </button>
                                        )}

                                        {actions}
                                        {favoriteControl}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {isArchived && (
                                <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-800 animate-in slide-in-from-top-2">
                                   <History className="w-5 h-5 text-amber-500" />
                                   <div className="flex-1">
                                      <p className="text-xs font-bold uppercase tracking-widest leading-none mb-1">Archived Snapshot</p>
                                      <p className="text-[10px] font-medium opacity-80 italic">You are viewing a historical baseline. Editing is disabled for data integrity.</p>
                                   </div>
                                </div>
                              )}

                              {/* HUB DASHBOARD VIEW */}
                              {page.type === 'hub' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 mb-8">
                                  {pages
                                    .filter(p => p.parentId === page.id || (p.domain === page.domain && p.focusArea === page.focusArea && p.id !== page.id && !p.parentId))
                                    .map((childPage, childIdx) => (
                                      <motion.div
                                        key={childPage.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * childIdx }}
                                        onClick={() => navigate(selectedProject ? `/project/${selectedProject.id}/page/${childPage.id}` : `/page/${childPage.id}`)}
                                        className="group p-8 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden border-b-4 hover:border-brand"
                                      >
                                        <div className="flex items-start justify-between mb-8">
                                          <div className="w-12 h-12 bg-app-bg dark:bg-white/5 rounded-2xl flex items-center justify-center text-text-secondary group-hover:bg-text-primary group-hover:text-white transition-colors">
                                            <ArrowRight className={cn("w-5 h-5", isRtl ? "rotate-180" : "")} />
                                          </div>
                                          <div className="px-3 py-1 bg-app-bg dark:bg-white/5 rounded-lg font-black text-[9px] text-text-secondary uppercase tracking-[0.2em] leading-none opacity-60">
                                            {stripNumericPrefix(childPage.id)}
                                          </div>
                                        </div>
                                        <div>
                                          <h3 className="text-lg font-black text-text-primary dark:text-white uppercase italic tracking-tighter mb-2 group-hover:text-brand transition-colors">
                                            {stripNumericPrefix(t(childPage.id) === childPage.id ? childPage.title : t(childPage.id))}
                                          </h3>
                                          <p className="text-xs text-text-secondary font-medium leading-relaxed line-clamp-3 opacity-80">
                                            {t(childPage.id + '_summary') || childPage.summary}
                                          </p>
                                        </div>
                                      </motion.div>
                                    ))}
                                </div>
                              )}

                              <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">{children}</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                 <div className="hidden print:block print:w-full">
                   <header className={cn("flex items-center justify-between border-b-4 border-slate-900 pb-10 mb-16", isRtl && "flex-row-reverse")}>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl" />
                        <div><h1 className="text-4xl font-semibold tracking-tighter uppercase leading-none">PMIS</h1><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{t('project_management_pmis')}</p></div>
                      </div>
                      <div className="text-right">
                         <h2 className="text-2xl font-black uppercase tracking-tighter italic">{parentPage && <><span className="opacity-30">{stripNumericPrefix(parentTitle)}</span><span className="mx-2 opacity-20">›</span></>}{stripNumericPrefix(displayTitle)}</h2>
                         <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('project')}: {selectedProject?.name}</p>
                      </div>
                   </header>
                   <main className="space-y-20"><div className="prose prose-slate max-w-none">{children}</div></main>
                 </div>
               </div>
            </div>
          </section>

          <div className={cn("fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1.5 print:hidden", isRtl && "right-auto left-4 items-start")}>
            <AnimatePresence>
              {viewMode === 'edit' && !isArchived && (
                <div className="flex flex-col gap-1.5">
                  <HelpTooltip title={t('save_new')} text={t('save_button_tooltip')} position={isRtl ? "right" : "left"}>
                    <motion.button initial={{ opacity: 0, scale: 0.8, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, x: 20 }} onClick={() => onSave?.()} disabled={isSaving} className="group flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl shadow-2xl hover:bg-brand-secondary active:scale-95 transition-all"><div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">{isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}</div><span className="text-[10px] font-black uppercase tracking-widest">{t('save_new')}</span></motion.button>
                  </HelpTooltip>
                  <div className="flex items-center gap-1.5">
                    <HelpTooltip title={t('update')} text={t('update_button_tooltip')} position="top">
                      <button onClick={() => onSave?.()} className="h-10 px-4 bg-white text-slate-600 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2 group active:scale-95 transition-all"><div className="w-6 h-6 rounded-lg bg-orange-50 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white"><CheckCircle2 className="w-3.5 h-3.5" /></div><span className="text-[8px] font-black uppercase tracking-widest">{t('update')}</span></button>
                    </HelpTooltip>
                    <HelpTooltip title={t('cancel')} text={t('cancel_button_tooltip')} position="top">
                      <button onClick={() => setViewMode('grid')} className="h-10 px-4 bg-white text-neutral-600 rounded-xl shadow-xl border border-neutral-100 flex items-center gap-2 group active:scale-95 transition-all"><div className="w-6 h-6 rounded-lg bg-neutral-50 text-neutral-400 flex items-center justify-center group-hover:bg-neutral-900 group-hover:text-white"><ArrowRight className={cn("w-3.5 h-3.5 rotate-180", isRtl && "rotate-0")} /></div><span className="text-[8px] font-black uppercase tracking-widest">{t('cancel')}</span></button>
                    </HelpTooltip>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpTooltip title={t('print_preview')} text={t('print_button_tooltip')} position="top">
                      <button onClick={onPrint} className="group flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl shadow-2xl hover:bg-black active:scale-95 transition-all"><div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-brand"><Printer className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black uppercase tracking-widest">{t('print_preview')}</span></button>
                    </HelpTooltip>
                    <HelpTooltip title={t('sync_to_drive')} text={t('sync_button_tooltip')} position="top">
                      <button onClick={async () => { setDriveSyncStatus('syncing'); await new Promise(r => setTimeout(r, 2000)); setDriveSyncStatus('synced'); toast.success(t('synced_to_drive_success')); }} className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-brand to-brand-secondary text-white rounded-xl shadow-2xl hover:scale-105 active:scale-95 transition-all"><div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center"><Cloud className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black uppercase tracking-widest">{t('sync_to_drive')}</span></button>
                    </HelpTooltip>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </StandardProcessPageContext.Provider>
  );
};
