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
  ShieldCheck,
  Settings,
  Info,
  Search,
  UserPlus,
  ClipboardCheck,
  Activity,
  FileSignature
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  collection,
  addDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn, getISODate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig } from '../types';
import { ArrowLeft } from 'lucide-react';

import { QualityMetricsRegisterView } from './QualityMetricsRegisterView';
import { FormalAcceptanceView } from './FormalAcceptanceView';

interface QualityManagementPlanViewProps {
  page: Page;
}

interface QualityRole {
  id: string;
  role: string;
  responsibilities: string;
}

interface QMPData {
  projectTitle: string;
  datePrepared: string;
  roles: QualityRole[];
  planningApproach: string;
  assuranceApproach: string;
  controlApproach: string;
  improvementApproach: string;
  acceptanceCriteriaLogic: string;
}

export const QualityManagementPlanView: React.FC<QualityManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'metrics' | 'acceptance'>('plan');
  const [isArchived, setIsArchived] = useState(false);

  const [qmp, setQmp] = useState<QMPData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    roles: [
      { id: '1', role: 'Project Manager', responsibilities: 'Primary quality accountability' },
      { id: '2', role: 'Quality Engineer', responsibilities: 'Site inspections and testing' },
      { id: '3', role: 'Subcontractor Lead', responsibilities: 'Internal quality compliance' },
      { id: '4', role: 'External Auditor', responsibilities: 'Periodic standard audits' }
    ],
    planningApproach: 'ISO 9001 based planning',
    assuranceApproach: 'Regular internal audits and walkthroughs',
    controlApproach: 'Strict inspection checklists and test reports',
    improvementApproach: 'Continuous feedback loop from site reports',
    acceptanceCriteriaLogic: 'Zero tolerance for structural defects'
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'qualityManagementPlans'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPlanRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setQmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        roles: [
          { id: '1', role: 'QA Lead', responsibilities: 'Overall quality compliance' },
          { id: '2', role: 'Field QC', responsibilities: 'Daily inspections' }
        ],
        planningApproach: 'Establishing quality metrics and baseline standards',
        assuranceApproach: 'Independent audits and process reviews',
        controlApproach: 'Defect tracking and corrective action requests (CAR)',
        improvementApproach: 'PDCA (Plan-Do-Check-Act) implementation',
        acceptanceCriteriaLogic: 'Technical specifications compliance and stakeholder sign-off'
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setQmp({ ...qmp, ...record });
         setIsArchived(record.status === 'Archived');
       }
    }
  }, [selectedRecordId, viewMode, planRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const currentVersionNumber = planRecords.length > 0 ? parseFloat(planRecords[0].version || '1.0') : 1.0;
      const nextVersion = isNew ? (currentVersionNumber + 0.1).toFixed(1) : currentVersionNumber.toFixed(1);

      const planData = {
        ...qmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (qmp.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'qualityManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'qualityManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Quality Plan Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'qualityManagementPlans', selectedRecordId), planData);
        toast.success('Quality plan updated successfully');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'qualityManagementPlans');
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
      await deleteDoc(doc(db, 'qualityManagementPlans', id));
      toast.success(t('quality_plan_deleted_success') || 'Quality Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'qualityManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('QUALITY MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Process/Section', 'Definition']],
      body: [
        ['Project Title', qmp.projectTitle],
        ['Planning Approach', qmp.planningApproach],
        ['Assurance Approach', qmp.assuranceApproach],
        ['Control Approach', qmp.controlApproach],
        ['Improvement', qmp.improvementApproach],
        ['Acceptance Logic', qmp.acceptanceCriteriaLogic]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = qmp.version || '1.0';
    docObj.save(`${selectedProject.code}-QUALITY-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'qualityManagementPlans' as any,
    label: t('quality_management_plans'),
    icon: ShieldCheck,
    collection: 'qualityManagementPlans',
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
        { id: 'SCOPE_PLAN', title: t('scope_management_plan') },
        { id: 'STAKEHOLDER_REGISTER', title: t('stakeholder_register') },
        { id: 'RISK_REGISTER', title: t('risk_register'), lastUpdated: '2024-03-23' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={qmp.version}
      onVersionChange={(v) => {
        const record = planRecords.find(r => r.version === v);
        if (record) {
          setSelectedRecordId(record.id);
          setViewMode('edit');
        }
      }}
      onNewVersion={handleCreateNewVersion}
      isArchived={isArchived}
    >
       <div className="space-y-6">
        {/* Quality Management Specific Tab Bar */}
        <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-3xl w-fit border border-slate-200 shadow-inner">
           {[
             { id: 'plan', title: 'Strategy Plan', icon: ClipboardCheck },
             { id: 'metrics', title: 'Quality Metrics', icon: Activity },
             { id: 'acceptance', title: 'Formal Acceptance', icon: FileSignature }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveSubTab(tab.id as any)}
               className={cn(
                 "flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                 activeSubTab === tab.id 
                   ? "bg-white text-indigo-600 shadow-xl shadow-slate-200/50" 
                   : "text-slate-400 hover:text-indigo-400 hover:bg-white/50"
               )}
             >
               <tab.icon className="w-3.5 h-3.5" />
               {tab.title}
             </button>
           ))}
        </div>

        <AnimatePresence mode="wait">
          {activeSubTab === 'plan' ? (
            viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="min-h-[400px] flex flex-col"
              >
                <UniversalDataTable 
                  config={gridConfig}
                  data={planRecords}
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 pb-20"
              >
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-10 relative overflow-hidden">
                  {isArchived && (
                    <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-3 px-6 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest">
                       <ShieldCheck className="w-4 h-4" /> REUSE ARCHIVED SNAPSHOT V{qmp.version}
                    </div>
                  )}

                  <section className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Preparation Date</label>
                        <input 
                          type="date"
                          value={qmp.datePrepared}
                          onChange={(e) => setQmp({ ...qmp, datePrepared: e.target.value })}
                          disabled={isArchived}
                          className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Quality Status</label>
                        <div className="px-5 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-sm font-black text-indigo-600 flex items-center justify-between">
                           <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> ISO-MODERN SNAPSHOT</span>
                           <span>V{qmp.version}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                             <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Quality Governance</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Standards & Process Strategy</p>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {[
                            { key: 'planningApproach', label: 'Quality Planning Approach', icon: ClipboardCheck },
                            { key: 'assuranceApproach', label: 'Assurance & Auditing', icon: ShieldCheck },
                            { key: 'controlApproach', label: 'Quality Control (QC) Logic', icon: Activity },
                            { key: 'improvementApproach', label: 'Continuous Improvement', icon: Settings },
                            { key: 'acceptanceCriteriaLogic', label: 'Acceptance Criteria Logic', icon: FileSignature }
                          ].map((field) => (
                            <div key={field.key} className="space-y-4 group">
                               <div className="flex items-center gap-2 px-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-100 group-hover:bg-indigo-500 transition-colors" />
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                               </div>
                               <textarea 
                                 value={(qmp as any)[field.key]} 
                                 onChange={(e) => setQmp({...qmp, [field.key]: e.target.value})} 
                                 disabled={isArchived}
                                 className="w-full h-32 px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm leading-relaxed font-bold text-slate-700 outline-none focus:bg-white focus:shadow-2xl focus:shadow-indigo-500/5 focus:border-indigo-200 transition-all disabled:opacity-50 resize-none"
                                 placeholder={`Define ${field.label.toLowerCase()}...`}
                               />
                            </div>
                          ))}
                       </div>
                    </div>
                  </section>
                </div>
              </motion.div>
            )
          ) : activeSubTab === 'metrics' ? (
            <motion.div key="metrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <QualityMetricsRegisterView page={page} embedded={true} />
            </motion.div>
          ) : (
            <motion.div key="acceptance" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <FormalAcceptanceView page={page} embedded={true} />
            </motion.div>
          )}
        </AnimatePresence>
       </div>
    </StandardProcessPage>
  );
};
