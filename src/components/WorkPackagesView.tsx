import React, { useState, useEffect, useMemo } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { WBSLevel, EntityConfig, Page, Activity } from '../types';
import { masterFormatData } from '../data/masterFormat';
import { masterFormatSections } from '../constants/masterFormat';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  Filter,
  ChevronRight,
  Layers,
  Grid3X3,
  Building2,
  List,
  ArrowRight,
  FileText,
  Star
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';
import { deriveStatus, rollupToParent } from '../services/rollupService';
import { UniversalDataTable } from './common/UniversalDataTable';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { generateStandardPDF } from '../lib/pdfService';

interface WorkPackagesViewProps {
  page?: Page;
  embedded?: boolean;
}

export const WorkPackagesView: React.FC<WorkPackagesViewProps> = ({ page, embedded = false }) => {
  const { selectedProject } = useProject();
  const { t, isRtl, language } = useLanguage();
  const projectId = selectedProject?.id || '';
  const [workPackages, setWorkPackages] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [isManualTitle, setIsManualTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<WBSLevel>>({
    title: '',
    code: '',
    divisionCode: '',
    projectId: projectId,
    status: 'Not Started',
    type: 'Work Package'
  });

  useEffect(() => {
    if (!projectId) return;

    const q = query(
      collection(db, 'wbs'), 
      where('projectId', '==', projectId),
      where('type', '==', 'Work Package'),
      orderBy('code', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = { id: doc.id, ...doc.data() } as WBSLevel;
        // In the new decoupled architecture, division info is linked via costCenterId
        (item as any).divisionName = 'TBD'; 
        return item;
      });
      setWorkPackages(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'wbs'));

    const qAct = query(
      collection(db, 'activities'),
      where('projectId', '==', projectId)
    );

    const unsubAct = onSnapshot(qAct, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
    });

    return () => {
      unsubscribe();
      unsubAct();
    };
  }, [projectId]);

  const handleSave = async () => {
    if (!formData.title || !formData.divisionCode || !formData.code) {
      toast.error('Please fill in all required fields (Cost Account, Code, and Title)');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        projectId,
        type: 'Work Package',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'wbs', editingId), data);
        toast.success(t('entry_updated'));
      } else {
        await addDoc(collection(db, 'wbs'), data);
        toast.success(t('entry_created'));
      }

      if (data.parentId) {
        await rollupToParent('division', data.parentId);
      }

      setViewMode('grid');
      setEditingId(null);
      setFormData({ title: '', code: '', divisionCode: '', projectId, status: 'Not Started', type: 'Work Package' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'wbs');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      const wpToDelete = workPackages.find(wp => wp.id === id);
      const parentIdToRollup = wpToDelete?.parentId;
      await deleteDoc(doc(db, 'wbs', id));
      if (parentIdToRollup) {
        await rollupToParent('division', parentIdToRollup);
      }
      toast.success(t('entry_deleted'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'wbs');
    }
  };

  const filteredPackages = useMemo(() => {
    return workPackages.filter(wp => {
      if (selectedDivision === 'All') return true;
      return wp.divisionCode === selectedDivision;
    });
  }, [workPackages, selectedDivision]);

  const handlePrint = () => {
    if (!selectedProject) return;
    const columns = [t('code'), t('title'), t('cost_account'), t('status')];
    const rows = filteredPackages.map(wp => [
      wp.code,
      wp.title,
      wp.divisionCode,
      wp.status || 'Not Started'
    ]);

    generateStandardPDF({
      page: page || { id: 'work_packages', title: t('work_package_dictionary'), domain: 'Planning', focusArea: 'Scope', type: 'terminal' },
      project: selectedProject,
      data: filteredPackages,
      columns,
      rows
    });
  };

  const gridConfig: EntityConfig = {
    id: 'packages',
    label: t('work_package_dictionary'),
    icon: Grid3X3,
    collection: 'wbs',
    columns: [
      { key: 'code', label: t('code'), type: 'badge' },
      { key: 'title', label: t('title'), type: 'string' },
      { key: 'divisionName', label: t('cost_account'), type: 'string' },
      { key: 'status', label: t('status'), type: 'status' },
    ]
  };

  const internalPage: Page = page || {
    id: 'work_packages',
    title: t('work_package_dictionary'),
    domain: 'Planning',
    focusArea: 'Scope',
    type: 'terminal'
  };

  return (
    <StandardProcessPage
      page={internalPage}
      embedded={embedded}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={handleSave}
      onPrint={handlePrint}
      isSaving={isSaving}
    >
      <AnimatePresence mode="wait">
        {viewMode === 'edit' ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pb-20"
          >
            <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">{t('cost_account')}</label>
                        <select
                          value={formData.divisionCode}
                          onChange={(e) => setFormData({ ...formData, divisionCode: e.target.value, code: '', title: '' })}
                          className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-text-primary focus:ring-4 focus:ring-brand/10 transition-all outline-none italic"
                        >
                          <option value="">{t('select_cost_account')}</option>
                          {masterFormatData.map((div, idx) => (
                            <option key={`${div.number}-${idx}`} value={div.number}>{div.number} - {div.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">{t('status')}</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-text-primary focus:ring-4 focus:ring-brand/10 transition-all outline-none italic"
                        >
                          <option value="Not Started">{t('not_started')}</option>
                          <option value="In Progress">{t('in_progress')}</option>
                          <option value="Completed">{t('completed')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">{t('code')}</label>
                            <input
                              type="text"
                              value={formData.code}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                              placeholder="00000"
                              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-black text-text-primary focus:ring-4 focus:ring-brand/10 transition-all outline-none italic"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">{t('title')}</label>
                            {!isManualTitle ? (
                              <div className="relative">
                                <select
                                  value={masterFormatSections.some(s => s.title === formData.title) ? formData.title : ''}
                                  onChange={(e) => {
                                    if (e.target.value === 'manual') setIsManualTitle(true);
                                    else setFormData({ ...formData, title: e.target.value });
                                  }}
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-text-primary focus:ring-4 focus:ring-brand/10 transition-all outline-none italic pr-12"
                                >
                                  <option value="">{t('select_standard_item')}</option>
                                  {masterFormatSections
                                    .filter(s => s.divisionId === formData.divisionCode)
                                    .map((section, idx) => (
                                      <option key={`${section.id}-${idx}`} value={section.title}>{section.id} - {section.title}</option>
                                    ))
                                  }
                                  <option value="manual" className="text-brand font-black">+ {t('manual_entry')}</option>
                                </select>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formData.title}
                                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                  placeholder={t('manual_title_placeholder')}
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-text-primary focus:ring-4 focus:ring-brand/10 transition-all outline-none italic pr-14"
                                  autoFocus
                                />
                                <button 
                                  onClick={() => setIsManualTitle(false)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-brand transition-colors bg-slate-50 rounded-lg"
                                >
                                  <List className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                       </div>

                       <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">{t('scope_description')}</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={6}
                          className="w-full px-8 py-6 bg-white border border-slate-200 rounded-[2rem] text-sm text-text-primary focus:ring-4 focus:ring-brand/10 transition-all outline-none resize-none shadow-inner italic"
                          placeholder={t('scope_description_placeholder')}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-10 bg-text-primary rounded-[3rem] text-white shadow-2xl relative overflow-hidden h-full border-b-8 border-brand">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl -mr-20 -mt-20" />
                       <div className="relative z-10 flex flex-col h-full">
                          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 text-brand italic">{t('classification_guide')}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed mb-8 opacity-80">
                            {t('classification_help_text')}
                          </p>
                          <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1">
                            {formData.divisionCode ? (
                              masterFormatData.find(d => d.number === formData.divisionCode)?.items.map((item, idx) => (
                                <button
                                  key={`${item.code}-${idx}`}
                                  onClick={() => setFormData({ ...formData, code: item.code, title: item.title, isManualTitle: false })}
                                  className={cn(
                                    "w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all border border-b-4",
                                    formData.code === item.code 
                                      ? "bg-brand border-brand-secondary text-white shadow-xl shadow-brand/20 -translate-y-1" 
                                      : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                                  )}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black italic uppercase tracking-tighter">{item.title}</span>
                                    <span className="text-[9px] opacity-40 font-black font-mono tracking-widest mt-1">{item.code}</span>
                                  </div>
                                  <ArrowRight className="w-4 h-4 opacity-20" />
                                </button>
                              ))
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2rem] p-10 text-center space-y-4">
                                <Search className="w-10 h-10 text-white/10" strokeWidth={1} />
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{t('select_cost_account_first')}</span>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-surface p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-6 border-b-4">
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 bg-app-bg dark:bg-white/5 rounded-2xl flex items-center justify-center text-text-secondary">
                     <Filter className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">{t('division_filter')}</h3>
                     <p className="text-[10px] font-bold text-text-secondary opacity-40 uppercase tracking-widest">{t('filter_by_cost_account')}</p>
                  </div>
               </div>
               
               <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => setSelectedDivision('All')}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-b-4",
                      selectedDivision === 'All' ? "bg-brand border-brand-secondary text-white" : "bg-app-bg border-transparent text-text-secondary hover:bg-slate-100"
                    )}
                  >
                     {t('all_accounts')}
                  </button>
                  {masterFormatData.slice(0, 5).map((div, idx) => (
                    <button 
                      key={`${div.number}-${idx}`}
                      onClick={() => setSelectedDivision(div.number)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-b-4",
                        selectedDivision === div.number ? "bg-brand border-brand-secondary text-white" : "bg-app-bg border-transparent text-text-secondary hover:bg-slate-100"
                      )}
                    >
                       {div.number}
                    </button>
                  ))}
               </div>
            </div>

            <UniversalDataTable 
              config={gridConfig}
              data={filteredPackages}
              onRowClick={(record) => {
                setEditingId(record.id);
                setFormData({ ...record });
                setViewMode('edit');
                const isStandard = masterFormatSections.some(s => s.title === record.title);
                setIsManualTitle(!isStandard);
              }}
              onNewClick={() => {
                setEditingId(null);
                setFormData({ title: '', code: '', divisionCode: '', projectId, status: 'Not Started', type: 'Work Package' });
                setViewMode('edit');
                setIsManualTitle(false);
              }}
              onDeleteRecord={handleDelete}
              title={
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-brand uppercase tracking-widest bg-brand/5 px-2 py-0.5 rounded-lg border border-brand/10">100+ Pages Architecture</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight italic">
                    {t('work_package_dictionary')}
                  </h2>
                </div>
              }
              favoriteControl={
                <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white border border-slate-100 shadow-sm hover:border-slate-200 active:scale-90 shrink-0">
                  <Star className="w-4 h-4 text-slate-300" />
                </div>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
