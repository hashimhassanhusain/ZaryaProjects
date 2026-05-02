import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  FileText,
  Printer,
  Loader2,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  ShieldCheck,
  Activity,
  Network,
  Zap,
  Layers,
  Settings
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
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScheduleManagementPlanViewProps {
  page: Page;
}

interface SchedulePlanData {
  projectTitle: string;
  datePrepared: string;
  version: string;
  methodology: string;
  tools: string;
  accuracy: string;
  units: string;
  varianceThresholds: string;
  reportingFormat: string;
  processManagement: {
    identification: string;
    sequencing: string;
    estimatingResources: string;
    estimatingEffort: string;
    monitoring: string;
  };
}

export const ScheduleManagementPlanView: React.FC<ScheduleManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [schedulePlan, setSchedulePlan] = useState<SchedulePlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    version: '1.0',
    methodology: 'Critical Path Method (CPM)',
    tools: 'PMIS Integrated Schedule Domain',
    accuracy: '+/- 5%',
    units: 'Working Days / Man-Hours',
    varianceThresholds: '5% Variance Alert',
    reportingFormat: 'Weekly Progress Reports',
    processManagement: {
      identification: 'WBS-based activity decomposition',
      sequencing: 'Precedence Diagramming Method (PDM)',
      estimatingResources: 'Historical Data Refining',
      estimatingEffort: 'Productivity Rates Library',
      monitoring: 'Integrated Snapshot Analysis'
    }
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [versions, setVersions] = useState<{ id: string; version: string; timestamp: string; userName: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'scheduleManagementPlans'),
      where('projectId', '==', selectedProject.id),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPlanRecords(data);
      setVersions(data.map(d => ({ 
        id: d.id, 
        version: d.version, 
        timestamp: d.updatedAt, 
        userName: d.updatedBy || 'Unkown' 
      })));
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setSchedulePlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        version: '1.0',
        methodology: 'Critical Path Method (CPM)',
        tools: 'PMIS Gantt Engine',
        accuracy: '+/- 5%',
        units: 'Days',
        varianceThresholds: '5% Alert',
        reportingFormat: 'Weekly PDF',
        processManagement: {
          identification: 'WBS Decomposition',
          sequencing: 'FS Links',
          estimatingResources: 'Historical Data',
          estimatingEffort: 'Productivity Rates',
          monitoring: 'Weekly Snapshot'
        }
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setSchedulePlan({ ...schedulePlan, ...record });
       }
    }
  }, [selectedRecordId, viewMode, planRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const newVersionNum = isNew ? (parseFloat(schedulePlan.version) + 0.1).toFixed(1) : schedulePlan.version;

      const planData = {
        ...schedulePlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: newVersionNum
      };

      if (!selectedRecordId || isNew) {
        await addDoc(collection(db, 'scheduleManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success(isNew ? 'New baseline version created' : 'Schedule plan saved');
      } else {
        await updateDoc(doc(db, 'scheduleManagementPlans', selectedRecordId), planData);
        toast.success('Schedule plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'scheduleManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'scheduleManagementPlans', id));
      toast.success('Deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'scheduleManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('SCHEDULE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Process', 'Strategy']],
      body: [
        ['Project Title', schedulePlan.projectTitle],
        ['Version', schedulePlan.version],
        ['Methodology', schedulePlan.methodology],
        ['Tools', schedulePlan.tools],
        ['Accuracy', schedulePlan.accuracy],
        ['Units', schedulePlan.units],
        ['Reporting', schedulePlan.reportingFormat],
        ['ID Process', schedulePlan.processManagement.identification],
        ['Sequencing', schedulePlan.processManagement.sequencing],
        ['Monitoring', schedulePlan.processManagement.monitoring]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = schedulePlan.version || '1.0';
    docObj.save(`${selectedProject.code}-SCH-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'scheduleManagementPlans' as any,
    label: t('schedule_management_plans'),
    icon: Activity,
    collection: 'scheduleManagementPlans',
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
        { id: 'scope-plan', title: 'Scope Management Plan' },
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
              className="space-y-6 pb-20"
            >
              <div className="flex justify-between items-center pr-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
                 >
                   <ArrowLeft className="w-3.5 h-3.5" />
                   {t('back_to_list') || 'Back to List'}
                 </button>
              </div>

              <PlanningPlanHeader 
                currentVersion={schedulePlan.version}
                onVersionChange={(v) => {
                  const record = planRecords.find(r => r.version === v);
                  if (record) {
                    setSelectedRecordId(record.id);
                  }
                }}
                onNewVersion={() => handleSave(true)}
                versions={versions}
              />

              <section className="space-y-8">
                 <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-slate-100">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Date Prepared</label>
                          <input 
                            type="date"
                            value={schedulePlan.datePrepared}
                            onChange={(e) => setSchedulePlan({ ...schedulePlan, datePrepared: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Baseline Version</label>
                          <div className="px-5 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-black text-emerald-600">
                             V{schedulePlan.version} - Snapshot
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                             <Settings className="w-4 h-4" />
                          </div>
                          Scheduling Infrastructure
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Scheduling Methodology</label>
                             <textarea 
                               value={schedulePlan.methodology} 
                               onChange={(e) => setSchedulePlan({...schedulePlan, methodology: e.target.value})} 
                               className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Technical Tools</label>
                             <textarea 
                               value={schedulePlan.tools} 
                               onChange={(e) => setSchedulePlan({...schedulePlan, tools: e.target.value})} 
                               className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6 pt-10 border-t border-slate-50">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                             <Network className="w-4 h-4" />
                          </div>
                          Process Management
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(schedulePlan.processManagement).map(([key, value]) => (
                            <div key={key} className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block capitalize">
                                 {key.replace(/([A-Z])/g, ' $1')}
                               </label>
                               <input 
                                 value={value}
                                 onChange={(e) => setSchedulePlan({
                                   ...schedulePlan,
                                   processManagement: { ...schedulePlan.processManagement, [key]: e.target.value }
                                 })}
                                 className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-orange-200 transition-all"
                               />
                            </div>
                          ))}
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
