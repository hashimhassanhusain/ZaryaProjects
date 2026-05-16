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
import { cn, getISODate } from '../lib/utils';
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
  const [isArchived, setIsArchived] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [schedulePlan, setSchedulePlan] = useState<SchedulePlanData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
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
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'scheduleManagementPlans'),
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
      setSchedulePlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        version: '1.0',
        methodology: 'Critical Path Method (CPM) using Primavera/P6 logic',
        tools: 'PMIS Gantt Engine & Resource Hub',
        accuracy: '+/- 5%',
        units: 'Working Days',
        varianceThresholds: '5% Negative Variance Trigger',
        reportingFormat: 'Dashboards + Weekly PDF Exports',
        processManagement: {
          identification: 'Bottom-up decomposition from WBS packages',
          sequencing: 'Mandatory and Discretionary dependencies',
          estimatingResources: 'Expert judgment and published data',
          estimatingEffort: 'Three-point estimation technique',
          monitoring: 'Earned Value Management (EVM)'
        }
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setSchedulePlan({ ...schedulePlan, ...record });
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
        ...schedulePlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (schedulePlan.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'scheduleManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'scheduleManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Schedule Version Created' : 'Plan Saved');
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

  const handleCreateNewVersion = () => {
    handleSave(true);
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

  const handleArchive = async (id: string) => {
    try {
      const record = planRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'scheduleManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'scheduleManagementPlans');
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
        { id: 'SCOPE_PLAN', title: t('scope_management_plan') },
        { id: 'WBS', title: t('wbs') },
        { id: 'EEFS', title: 'EEFs', lastUpdated: '2024-03-21' },
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={schedulePlan.version}
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
                data={planRecords.filter(r => {
                  const archived = r.status === 'Archived';
                  return showArchived ? archived : !archived;
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-20"
            >
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-10 relative overflow-hidden">
                {isArchived && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-3 px-6 flex items-center gap-3 z-10">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-[0.2em]">Archived Baseline Snapshot - V{schedulePlan.version}</span>
                  </div>
                )}

                <section className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Preparation Date</label>
                      <input 
                        type="date"
                        value={schedulePlan.datePrepared}
                        onChange={(e) => setSchedulePlan({ ...schedulePlan, datePrepared: e.target.value })}
                        disabled={isArchived}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Governance Target</label>
                      <div className="px-5 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-sm font-black text-indigo-600 flex items-center justify-between">
                         <span>V{schedulePlan.version} BASELINE</span>
                         <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                           <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Scheduling Infrastructure</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Methodology & Tool Selection</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                          { key: 'methodology', label: 'Scheduling Methodology', icon: Network },
                          { key: 'tools', label: 'Technical Tools', icon: Zap },
                          { key: 'accuracy', label: 'Level of Accuracy', icon: Activity },
                          { key: 'units', label: 'Units of Measure', icon: Layers },
                          { key: 'varianceThresholds', label: 'Variance Control Thresholds', icon: Settings },
                          { key: 'reportingFormat', label: 'Reporting Standards', icon: FileText }
                        ].map((field) => (
                          <div key={field.key} className="space-y-3 group">
                             <div className="flex items-center gap-2 mb-1 px-1">
                               {React.createElement(field.icon as any, { className: "w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" })}
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                             </div>
                             <textarea 
                               value={(schedulePlan as any)[field.key]} 
                               onChange={(e) => setSchedulePlan({...schedulePlan, [field.key]: e.target.value})} 
                               disabled={isArchived}
                               placeholder={`Define ${field.label.toLowerCase()}...`}
                               className="w-full h-28 px-5 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all disabled:opacity-50 resize-none"
                             />
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-8 pt-10 border-t border-slate-50">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                           <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Process Refinement</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Execution & Monitoring Strategies</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Object.entries(schedulePlan.processManagement).map(([key, value]) => (
                          <div key={key} className="space-y-3 p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50 group hover:border-orange-200 transition-all">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                               {key.replace(/([A-Z])/g, ' $1')} Strategy
                             </label>
                             <textarea 
                               value={value}
                               onChange={(e) => setSchedulePlan({
                                 ...schedulePlan,
                                 processManagement: { ...schedulePlan.processManagement, [key]: e.target.value }
                               })}
                               disabled={isArchived}
                               className="w-full h-24 px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-200 transition-all disabled:opacity-50 resize-none"
                             />
                          </div>
                        ))}
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
