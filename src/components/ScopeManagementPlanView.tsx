import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  Zap,
  Users,
  ShieldCheck,
  Settings,
  Info,
  Search,
  UserPlus,
  Target,
  Layers,
  MessageSquare,
  HelpCircle,
  ClipboardList,
  BarChart3,
  GitBranch,
  Box
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig } from '../types';
import toast from 'react-hot-toast';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScopeManagementPlanViewProps {
  page: Page;
}

interface ScopePlanData {
  projectTitle: string;
  datePrepared: string;
  // Page 1
  scopeStatement: string;
  wbsStructure: string;
  wbsDictionary: string;
  // Page 2
  baselineMaintenance: string;
  scopeChange: string;
  deliverableAcceptance: string;
  requirementsIntegration: string;
}

export const ScopeManagementPlanView: React.FC<ScopeManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [scope, setScope] = useState<ScopePlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    scopeStatement: '',
    wbsStructure: '',
    wbsDictionary: '',
    baselineMaintenance: '',
    scopeChange: '',
    deliverableAcceptance: '',
    requirementsIntegration: ''
  });

  const [scopeRecords, setScopeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'scopeManagementPlans'),
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScopeRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setScope({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        scopeStatement: '',
        wbsStructure: '03-Concrete Works > 03.1-Foundations > 03.1.1-Rebar',
        wbsDictionary: '',
        baselineMaintenance: 'Monthly baseline audits',
        scopeChange: 'Formal Change Request required for all creep > 0%',
        deliverableAcceptance: 'Consultant sign-off on site',
        requirementsIntegration: ''
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = scopeRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setScope({ ...scope, ...record });
       }
    }
  }, [selectedRecordId, viewMode, scopeRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const scopeData = {
        ...scope,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (scopeRecords.length + 1).toFixed(1) : scope.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'scopeManagementPlans'), {
          ...scopeData,
          createdAt: timestamp
        });
        toast.success(t('scope_plan_created_success') || 'Scope Plan created successfully');
      } else {
        await updateDoc(doc(db, 'scopeManagementPlans', selectedRecordId), scopeData);
        toast.success(t('scope_plan_updated_success') || 'Scope Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'scopeManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'scopeManagementPlans', id));
      toast.success(t('scope_plan_deleted_success') || 'Scope Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'scopeManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('SCOPE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Section', 'Description']],
      body: [
        ['Project Title', scope.projectTitle],
        ['Date Prepared', scope.datePrepared],
        ['Scope Statement', scope.scopeStatement],
        ['WBS Structure', scope.wbsStructure],
        ['WBS Dictionary', scope.wbsDictionary],
        ['Baseline Maintenance', scope.baselineMaintenance],
        ['Scope Change', scope.scopeChange],
        ['Deliverable Acceptance', scope.deliverableAcceptance]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = scope.version || '1.0';
    docObj.save(`${selectedProject.code}-SCOPE-PLAN-${dateStr}-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'scopeManagementPlans' as any,
    label: t('scope_management_plans'),
    icon: Box,
    collection: 'scopeManagementPlans',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <StandardProcessPage
      page={{
        ...page,
        title: viewMode === 'edit' ? t('edit_view') : page.title
      }}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '1.1.1', title: 'Project Charter' },
        { id: 'requirements-docs', title: 'Requirements Documentation' },
        { id: 'eef', title: 'EEFs' },
        { id: 'opa', title: 'OPAs' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
       <div className="space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-[400px] flex flex-col"
            >
              <UniversalDataTable 
                config={gridConfig}
                data={scopeRecords}
                onRowClick={(record) => {
                  setSelectedRecordId(record.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-10"
            >
              <div className="flex justify-end pr-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
                 >
                   <ArrowLeft className="w-3 h-3" />
                   {t('back_to_list')}
                 </button>
              </div>

              <section className="space-y-4">
                 <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className={cn("text-[9px] font-bold text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Project Identification</label>
                        <input 
                          type="text"
                          value={scope.projectTitle}
                          onChange={(e) => setScope({ ...scope, projectTitle: e.target.value })}
                          className={cn("w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all", isRtl && "text-right")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={cn("text-[9px] font-bold text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Date Prepared</label>
                        <input 
                          type="date"
                          value={scope.datePrepared}
                          onChange={(e) => setScope({ ...scope, datePrepared: e.target.value })}
                          className={cn("w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all", isRtl && "text-right")}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        Scope Baseline Strategy
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                         <div className="space-y-1.5">
                           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scope Statement Development</label>
                           <textarea 
                             value={scope.scopeStatement}
                             onChange={(e) => setScope({...scope, scopeStatement: e.target.value})}
                             className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none"
                             placeholder="Define the process for developing the project scope statement..."
                           />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <BarChart3 className="w-3 h-3" />
                                WBS Structure
                              </label>
                              <input 
                                value={scope.wbsStructure}
                                onChange={(e) => setScope({...scope, wbsStructure: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                placeholder="Example: 03-Concrete Works > 03.1-Foundations"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">WBS Dictionary Approach</label>
                              <input 
                                value={scope.wbsDictionary}
                                onChange={(e) => setScope({...scope, wbsDictionary: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                placeholder="Detail level, mandatory fields..."
                              />
                           </div>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                       <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                          Maintenance & Control
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Baseline Maintenance</label>
                             <textarea value={scope.baselineMaintenance} onChange={(e) => setScope({...scope, baselineMaintenance: e.target.value})} className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scope Change Process</label>
                             <textarea value={scope.scopeChange} onChange={(e) => setScope({...scope, scopeChange: e.target.value})} className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" />
                          </div>
                       </div>
                    </div>
                 </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
       </div>
    </StandardProcessPage>
  );
};
