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
import { PlanningPlanHeader } from './common/PlanningPlanHeader';
import toast from 'react-hot-toast';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn, getISODate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScopeManagementPlanViewProps {
  page: Page;
}

interface ScopePlanData {
  projectTitle: string;
  datePrepared: string;
  version: string;
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
  const [isArchivedState, setIsArchivedState] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [scope, setScope] = useState<ScopePlanData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    version: '1.0',
    scopeStatement: 'Define technical boundaries and physical constraints of construction site.',
    wbsStructure: 'CSI MasterFormat 16-Division structure with 4-level decomposition.',
    wbsDictionary: 'Mandatory fields: WP ID, Description, Responsible Org, Estimated Cost.',
    baselineMaintenance: 'Monthly audits coinciding with progress report cycles.',
    scopeChange: 'All scope adjustments require CCB approval if impact > $5,000.',
    deliverableAcceptance: 'Interim acceptance via site engineer inspection; Final via client PM.',
    requirementsIntegration: 'Traceability matrix mapping from Project Charter to WBS Work Packages.'
  });

  const [scopeRecords, setScopeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'scopeManagementPlans'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setScopeRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setScope({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        version: '1.0',
        scopeStatement: '',
        wbsStructure: '',
        wbsDictionary: '',
        baselineMaintenance: 'Standard Monthly Maintenance',
        scopeChange: 'Standard Change Control',
        deliverableAcceptance: 'QC Inspection Sign-off',
        requirementsIntegration: ''
      });
      setIsArchivedState(false);
    } else if (selectedRecordId) {
       const record = scopeRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setScope({ ...scope, ...record });
         setIsArchivedState(record.status === 'Archived');
       }
    }
  }, [selectedRecordId, viewMode, scopeRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const currentVersionNumber = scopeRecords.length > 0 ? parseFloat(scopeRecords[0].version || '1.0') : 1.0;
      const nextVersion = isNew ? (currentVersionNumber + 0.1).toFixed(1) : currentVersionNumber.toFixed(1);

      const scopeData = {
        ...scope,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (scope.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = scopeRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'scopeManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'scopeManagementPlans'), {
          ...scopeData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Scope Baseline Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'scopeManagementPlans', selectedRecordId), scopeData);
        toast.success('Scope plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'scopeManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewVersion = () => {
    handleSave(true);
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

  const handleArchive = async (id: string) => {
    try {
      const record = scopeRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'scopeManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'scopeManagementPlans');
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
        ['Version', scope.version],
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
    docObj.save(`${selectedProject.code}-SCOPE-PLAN-${dateStr}-V${scope.version}.pdf`);
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
      page={page}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: 'PROJECT_CHARTER', title: t('project_charter') },
        { id: 'REQUIREMENTS_DOC', title: t('requirements_documentation'), lastUpdated: '2024-03-24' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={scopeRecords}
      currentVersion={scope.version}
      onVersionChange={(v) => {
        const record = scopeRecords.find(r => r.version === v);
        if (record) {
          setSelectedRecordId(record.id);
          setViewMode('edit');
        }
      }}
      onNewVersion={handleCreateNewVersion}
      isArchived={isArchivedState}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <UniversalDataTable 
                config={gridConfig}
                data={scopeRecords.filter(r => {
                  const isArchived = r.status === 'Archived';
                  return showArchived ? isArchived : !isArchived;
                })}
                onRowClick={(record) => { setSelectedRecordId(record.id); setViewMode('edit'); }}
                onNewClick={() => { setSelectedRecordId(null); setViewMode('edit'); }}
                onDeleteRecord={handleDelete}
                onArchiveRecord={handleArchive}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
              />
            </motion.div>
          ) : (
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-20">
               <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden">
                {isArchivedState && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none">
                     <ShieldCheck className="w-4 h-4" /> ARCHIVED SCOPE BASELINE SNAPSHOT V{scope.version}
                  </div>
                )}

                <section className="space-y-12 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Baseline Assessment Date</label>
                        <input 
                          type="date" 
                          value={getISODate(scope.datePrepared)} 
                          onChange={(e) => setScope({ ...scope, datePrepared: e.target.value })} 
                          disabled={isArchivedState}
                          className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-600"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Technical Status</label>
                        <div className="px-6 py-5 bg-blue-50 border border-blue-100 rounded-2xl text-base font-black text-blue-600 flex items-center justify-between">
                           <span className="flex items-center gap-2 tracking-tight uppercase"><Box className="w-5 h-5" /> SCOPE BASELINE V{scope.version}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-5 border-b border-slate-100 pb-8">
                        <div className="w-14 h-14 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                            <Layers className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 tracking-tight text-sans">Scope Baseline Strategy</h3>
                          <p className="text-[11px] text-blue-600 uppercase font-black tracking-widest mt-1">Hierarchical Definition of Deliverables & Work Packages</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Scope Statement Development Process</label>
                          <textarea 
                            value={scope.scopeStatement}
                            onChange={(e) => setScope({...scope, scopeStatement: e.target.value})}
                            disabled={isArchivedState}
                            className="w-full h-40 px-8 py-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed font-medium text-slate-600 outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all resize-none shadow-inner"
                            placeholder="Detail the procedural steps to define site boundaries, inclusions, and exclusions..."
                          />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">WBS Structure & Decomposition</label>
                             <div className="relative">
                                <div className="absolute top-1/2 -translate-y-1/2 left-5 text-blue-500 opacity-40">
                                   <GitBranch className="w-5 h-5" />
                                </div>
                                <input 
                                  type="text" 
                                  value={scope.wbsStructure} 
                                  onChange={(e) => setScope({...scope, wbsStructure: e.target.value})} 
                                  disabled={isArchivedState}
                                  placeholder="Example: 03-Concrete > 03.1-Foundations..."
                                  className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5"
                                />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">WBS Dictionary Mandatory Fields</label>
                             <div className="relative">
                                <div className="absolute top-1/2 -translate-y-1/2 left-5 text-blue-500 opacity-40">
                                   <ClipboardList className="w-5 h-5" />
                                </div>
                                <input 
                                  type="text" 
                                  value={scope.wbsDictionary} 
                                  onChange={(e) => setScope({...scope, wbsDictionary: e.target.value})} 
                                  disabled={isArchivedState}
                                  placeholder="WP IDs, Code of Accounts, Acceptance Criteria..."
                                  className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5"
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-100">
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-2">
                           <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
                              <ShieldCheck className="w-5 h-5" />
                           </div>
                           <div>
                             <h4 className="text-base font-bold text-slate-900 tracking-tight">Maintenance Protocol</h4>
                             <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Baseline Integrity Hub</p>
                           </div>
                        </div>
                        <textarea 
                          value={scope.baselineMaintenance} 
                          onChange={(e) => setScope({...scope, baselineMaintenance: e.target.value})} 
                          disabled={isArchivedState}
                          className="w-full h-48 px-8 py-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed font-medium text-slate-600 outline-none focus:bg-white focus:ring-8 focus:ring-emerald-500/5 transition-all resize-none shadow-inner"
                          placeholder="Document how technical baselines will be audited/maintained..."
                        />
                     </div>
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-2">
                           <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white">
                              <GitBranch className="w-5 h-5" />
                           </div>
                           <div>
                             <h4 className="text-base font-bold text-slate-900 tracking-tight">Change Velocity</h4>
                             <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Creep Management & Control</p>
                           </div>
                        </div>
                        <textarea 
                          value={scope.scopeChange} 
                          onChange={(e) => setScope({...scope, scopeChange: e.target.value})} 
                          disabled={isArchivedState}
                          className="w-full h-48 px-8 py-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed font-medium text-slate-600 outline-none focus:bg-white focus:ring-8 focus:ring-amber-500/5 transition-all resize-none shadow-inner"
                          placeholder="Detail formal CCB triggers and impact threshold thresholds..."
                        />
                     </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
