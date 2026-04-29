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
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
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

  const [qmp, setQmp] = useState<QMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
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
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlanRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setQmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        roles: [
          { id: '1', role: 'Quality Assurance', responsibilities: 'Compliance' },
          { id: '2', role: 'QC Site Engineer', responsibilities: 'Checking' }
        ],
        planningApproach: 'Quality Standards Setting',
        assuranceApproach: 'Audits',
        controlApproach: 'Checklists',
        improvementApproach: 'Corrective Actions',
        acceptanceCriteriaLogic: 'Final handover specs'
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setQmp({ ...qmp, ...record });
       }
    }
  }, [selectedRecordId, viewMode, planRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const planData = {
        ...qmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : qmp.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'qualityManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success(t('quality_plan_created_success') || 'Quality Plan created successfully');
      } else {
        await updateDoc(doc(db, 'qualityManagementPlans', selectedRecordId), planData);
        toast.success(t('quality_plan_updated_success') || 'Quality Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'qualityManagementPlans');
    } finally {
      setIsSaving(false);
    }
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
        { id: 'requirements', title: 'Requirements Documentation' },
        { id: 'stakeholder-register', title: 'Stakeholder Register' },
        { id: 'risk-register', title: 'Risk Register' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
       <div className="space-y-6">
        {/* Quality Management Specific Tab Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 shadow-inner">
           {[
             { id: 'plan', title: 'Plan', icon: ClipboardCheck },
             { id: 'metrics', title: 'Metrics', icon: Activity },
             { id: 'acceptance', title: 'Acceptance', icon: FileSignature }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveSubTab(tab.id as any)}
               className={cn(
                 "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all",
                 activeSubTab === tab.id 
                   ? "bg-white text-blue-600 shadow-md" 
                   : "text-slate-400 hover:text-slate-600"
               )}
             >
               <tab.icon className="w-3 h-3" />
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

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 text-slate-900">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Project Title</label>
                        <input 
                          type="text"
                          value={qmp.projectTitle}
                          onChange={(e) => setQmp({ ...qmp, projectTitle: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                        <input 
                          type="date"
                          value={qmp.datePrepared}
                          onChange={(e) => setQmp({ ...qmp, datePrepared: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['planningApproach', 'assuranceApproach', 'controlApproach', 'improvementApproach'].map((key) => (
                        <div key={key} className="space-y-1.5">
                           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                           <textarea 
                             value={(qmp as any)[key]} 
                             onChange={(e) => setQmp({...qmp, [key]: e.target.value})} 
                             className="w-full h-24 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" 
                           />
                        </div>
                      ))}
                   </div>
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
