import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Settings,
  Clock, 
  FileText,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  Target,
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  Gavel,
  Layers,
  Wrench,
  BarChart3,
  Search
} from 'lucide-react';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig, Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import { cn, getISODate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProjectManagementPlanViewProps {
  page: Page;
}

interface LifeCyclePhase {
  id: string;
  phase: string;
  deliverables: string;
}

interface TailoringDecision {
  knowledgeArea: string;
  processes: string;
  decisions: string;
}

interface ToolTechnique {
  knowledgeArea: string;
  tools: string;
}

interface PMPData {
  projectTitle: string;
  datePrepared: string;
  lifeCycle: LifeCyclePhase[];
  tailoring: TailoringDecision[];
  tools: ToolTechnique[];
  baselines: {
    scopeVariance: string;
    scopeManagement: string;
    scheduleVariance: string;
    scheduleManagement: string;
    costVariance: string;
    costManagement: string;
  };
  projectReviews: string;
}

const KNOWLEDGE_AREAS = [
  'Integration', 'Scope', 'Time', 'Cost', 'Quality', 
  'Human Resources', 'Communication', 'Risk', 'Procurement', 'Stakeholders'
];

export const ProjectManagementPlanView: React.FC<ProjectManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isArchivedState, setIsArchivedState] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [pmp, setPmp] = useState<PMPData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    lifeCycle: [{ id: '1', phase: '', deliverables: '' }],
    tailoring: KNOWLEDGE_AREAS.map(ka => ({ knowledgeArea: ka, processes: ka === 'Integration' ? 'Develop PMP' : '', decisions: '' })),
    tools: KNOWLEDGE_AREAS.map(ka => ({ knowledgeArea: ka, tools: '' })),
    baselines: {
      scopeVariance: '',
      scopeManagement: '',
      scheduleVariance: '',
      scheduleManagement: '',
      costVariance: '',
      costManagement: '',
    },
    projectReviews: ''
  });

  const [pmpRecords, setPmpRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'projectManagementPlans'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPmpRecords(data);
      setLoading(false);
      
      // Auto-select latest if none selected
      if (data.length > 0 && !selectedRecordId && viewMode === 'grid') {
        // We stay in grid but we know what the versions are
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'projectManagementPlans');
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setPmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        lifeCycle: [
          { id: '1', phase: 'Initiating', deliverables: 'Project Charter, Stakeholder Register' },
          { id: '2', phase: 'Planning', deliverables: 'PMP, Sub-plans, Baselines' },
          { id: '3', phase: 'Executing', deliverables: 'Project Deliverables' },
          { id: '4', phase: 'M&C', deliverables: 'Performance Reports, Change Requests' },
          { id: '5', phase: 'Closing', deliverables: 'Final Report, Lessons Learned' }
        ],
        tailoring: KNOWLEDGE_AREAS.map(ka => ({ knowledgeArea: ka, processes: '', decisions: '' })),
        tools: KNOWLEDGE_AREAS.map(ka => ({ knowledgeArea: ka, tools: '' })),
        baselines: {
          scopeVariance: '±0%',
          scopeManagement: 'Standard PMIS Scope Management',
          scheduleVariance: '±5 days',
          scheduleManagement: 'Critical Path Analysis',
          costVariance: '±5%',
          costManagement: 'Earned Value Management'
        },
        projectReviews: 'Monthly Progress Reviews'
      });
      setIsArchivedState(false);
    } else if (selectedRecordId) {
       const record = pmpRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setPmp({
           ...pmp,
           ...record
         });
         setIsArchivedState(record.status === 'Archived');
       }
    }
  }, [selectedRecordId, viewMode, pmpRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const currentVersionNumber = pmpRecords.length > 0 ? parseFloat(pmpRecords[0].version || '1.0') : 1.0;
      const nextVersion = isNew ? (currentVersionNumber + 0.1).toFixed(1) : currentVersionNumber.toFixed(1);

      const pmpData = {
        ...pmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (pmp.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        // Archive old versions if creating new
        if (isNew) {
          const activeDocs = pmpRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'projectManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }

        const docRef = await addDoc(collection(db, 'projectManagementPlans'), {
          ...pmpData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(t('pmp_created_success') || 'New PMP Version Created');
      } else {
        await updateDoc(doc(db, 'projectManagementPlans', selectedRecordId), pmpData);
        toast.success(t('pmp_updated_success') || 'PMP updated successfully');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projectManagementPlans');
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
      await deleteDoc(doc(db, 'projectManagementPlans', id));
      toast.success(t('pmp_deleted_success') || 'PMP deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'projectManagementPlans');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const record = pmpRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'projectManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projectManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = docObj.internal.pageSize.width;

    const renderHeader = (pageNum: number) => {
      docObj.setFontSize(16);
      docObj.setFont('helvetica', 'bold');
      docObj.text('PROJECT MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      docObj.setFontSize(8);
      docObj.text(`Page ${pageNum}`, pageWidth - margin, 10, { align: 'right' });
    };

    renderHeader(1);
    docObj.setFontSize(10);
    docObj.text(`Project Title: ${pmp.projectTitle}`, margin, 45);
    docObj.text(`Date Prepared: ${pmp.datePrepared}`, pageWidth - margin - 50, 45);

    autoTable(docObj, {
      startY: 50,
      head: [['Phase', 'Key Deliverables']],
      body: pmp.lifeCycle.map(l => [l.phase, l.deliverables]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = pmp.version || '1.0';
    docObj.save(`${selectedProject.code}-PMP-${dateStr}-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'projectManagementPlans' as any,
    label: t('project_management_plans'),
    icon: Layers,
    collection: 'projectManagementPlans',
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
        { id: '1.1.1', title: 'Project Charter', lastUpdated: '2026-05-01' },
        { id: 'outputs_other_processes', title: 'Outputs from Other Processes' },
        { id: 'eef', title: 'EEFs' },
        { id: 'opa', title: 'OPAs' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={pmpRecords}
      currentVersion={pmpRecords.find(v => v.id === selectedRecordId) || pmpRecords[0]}
      onVersionChange={(v) => {
        setSelectedRecordId(v.id);
        setViewMode('edit');
      }}
      onNewVersion={handleCreateNewVersion}
      isArchived={isArchivedState}
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
                data={pmpRecords.filter(r => {
                  const isArchived = r.status === 'Archived';
                  return showArchived ? isArchived : !isArchived;
                })}
                onRowClick={(record) => {
                  setSelectedRecordId(record.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
                onArchiveRecord={handleArchive}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
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

              {isArchivedState && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-none">Archived Snapshot</h4>
                    <p className="text-xs text-amber-600 mt-1 font-medium">This is a historical record and cannot be edited. Create a new version to make changes.</p>
                  </div>
                </div>
              )}

              <fieldset disabled={isArchivedState} className="space-y-6">
                <section className="space-y-4">
                   <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className={cn("text-xs font-bold text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Project Identification</label>
                          <input 
                            type="text"
                            value={pmp.projectTitle}
                            onChange={(e) => setPmp({ ...pmp, projectTitle: e.target.value })}
                            className={cn("w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all", isRtl && "text-right")}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn("text-xs font-bold text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Date Prepared</label>
                          <input 
                            type="date"
                            value={pmp.datePrepared}
                            onChange={(e) => setPmp({ ...pmp, datePrepared: e.target.value })}
                            className={cn("w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all", isRtl && "text-right")}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Project Life Cycle Phases</h3>
                           {!isArchivedState && (
                             <button onClick={() => setPmp({...pmp, lifeCycle: [...pmp.lifeCycle, { id: Date.now().toString(), phase: '', deliverables: '' }]})} className="p-1.5 bg-slate-900 text-white rounded-lg">
                               <Plus className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </div>
                        <div className="space-y-3">
                           {pmp.lifeCycle.map((l, idx) => (
                             <div key={`${l.id}-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl relative group">
                                {!isArchivedState && (
                                  <button 
                                    onClick={() => setPmp({...pmp, lifeCycle: pmp.lifeCycle.filter(item => item.id !== l.id)})}
                                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phase Name</label>
                                  <input 
                                    value={l.phase}
                                    onChange={(e) => {
                                      const newLife = [...pmp.lifeCycle];
                                      newLife[idx].phase = e.target.value;
                                      setPmp({...pmp, lifeCycle: newLife});
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Key Deliverables</label>
                                  <input 
                                    value={l.deliverables}
                                    onChange={(e) => {
                                      const newLife = [...pmp.lifeCycle];
                                      newLife[idx].deliverables = e.target.value;
                                      setPmp({...pmp, lifeCycle: newLife});
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none"
                                  />
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>

                   <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-center">Variances & Baseline Management</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                            <h4 className="text-[10px] font-bold text-blue-600 uppercase">Variance Thresholds</h4>
                            <div className="space-y-2">
                               <input value={pmp.baselines.scopeVariance} onChange={(e) => setPmp({...pmp, baselines: {...pmp.baselines, scopeVariance: e.target.value}})} placeholder="Scope Variance (e.g. ±0%)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                               <input value={pmp.baselines.scheduleVariance} onChange={(e) => setPmp({...pmp, baselines: {...pmp.baselines, scheduleVariance: e.target.value}})} placeholder="Schedule Variance (e.g. ±5 days)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                               <input value={pmp.baselines.costVariance} onChange={(e) => setPmp({...pmp, baselines: {...pmp.baselines, costVariance: e.target.value}})} placeholder="Cost Variance (e.g. ±5%)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                            </div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                            <h4 className="text-[10px] font-bold text-blue-600 uppercase">Management Approach</h4>
                            <div className="space-y-2">
                               <input value={pmp.baselines.scopeManagement} onChange={(e) => setPmp({...pmp, baselines: {...pmp.baselines, scopeManagement: e.target.value}})} placeholder="Scope Management Method" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                               <input value={pmp.baselines.scheduleManagement} onChange={(e) => setPmp({...pmp, baselines: {...pmp.baselines, scheduleManagement: e.target.value}})} placeholder="Schedule Management Method" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                               <input value={pmp.baselines.costManagement} onChange={(e) => setPmp({...pmp, baselines: {...pmp.baselines, costManagement: e.target.value}})} placeholder="Cost Management Method" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                            </div>
                         </div>
                      </div>
                   </div>
                </section>
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>
       </div>
    </StandardProcessPage>
  );
};
