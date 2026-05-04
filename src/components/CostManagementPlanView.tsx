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
  Box,
  Briefcase,
  Network,
  Award,
  Stethoscope,
  Scale,
  Activity,
  DollarSign,
  TrendingUp,
  PieChart
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
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { cn, getISODate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig } from '../types';

interface CostManagementPlanViewProps {
  page: Page;
}

interface CostPlanData {
  projectTitle: string;
  datePrepared: string;
  accuracy: string;
  units: string;
  controlThresholds: string;
  thresholdPercentage: number;
  performanceRules: string;
  reportingFormat: string;
  processManagement: {
    estimating: string;
    budgeting: string;
    monitoring: string;
  };
}

export const CostManagementPlanView: React.FC<CostManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const { formatAmount } = useCurrency();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);

  const [costPlan, setCostPlan] = useState<CostPlanData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    accuracy: '+/- 5%',
    units: `${selectedProject?.baseCurrency || 'IQD'} / Man-Hours`,
    controlThresholds: 'Example: 5% Variance (Yellow Alert), 10% Variance (Red Alert - Mandatory CCB Review)',
    thresholdPercentage: 10,
    performanceRules: 'Earned Value Management (EVM) using PMIS Cost Domain',
    reportingFormat: 'Monthly Cost Performance Reports, Variance Analysis Summaries',
    processManagement: {
      estimating: 'Bottom-up estimating based on detailed BOQ and market rates.',
      budgeting: 'Aggregation of estimated costs for work packages + Contingency Reserves.',
      monitoring: 'Real-time tracking of PO commitments vs. Budgeted Cost of Work Scheduled (BCWS).'
    }
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'costManagementPlans'),
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
      setCostPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        accuracy: '+/- 5%',
        units: `${selectedProject?.baseCurrency || 'IQD'}`,
        controlThresholds: '5% Variance Alert',
        thresholdPercentage: 10,
        performanceRules: 'EVM rules using SPI/CPI indices',
        reportingFormat: 'Monthly Finance PDF + Dashboard Link',
        processManagement: {
          estimating: 'Market rates lookup + Expert parametric estimation',
          budgeting: 'BOQ Aggregation + Management Reserve allocation',
          monitoring: 'PO Commitment tracking vs Actual Costs (AC)'
        }
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setCostPlan({ ...costPlan, ...record });
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
        ...costPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (costPlan.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'costManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'costManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Cost Baseline Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'costManagementPlans', selectedRecordId), planData);
        toast.success('Cost plan updated successfully');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'costManagementPlans');
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
      await deleteDoc(doc(db, 'costManagementPlans', id));
      toast.success(t('cost_plan_deleted_success') || 'Cost Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'costManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('COST MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Process', 'Strategy']],
      body: [
        ['Project Title', costPlan.projectTitle],
        ['Accuracy', costPlan.accuracy],
        ['Units', costPlan.units],
        ['Rules', costPlan.performanceRules],
        ['Reporting', costPlan.reportingFormat],
        ['Estimating', costPlan.processManagement.estimating],
        ['Budgeting', costPlan.processManagement.budgeting],
        ['Monitoring', costPlan.processManagement.monitoring]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = costPlan.version || '1.0';
    docObj.save(`${selectedProject.code}-COST-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'costManagementPlans' as any,
    label: t('cost_management_plans'),
    icon: DollarSign,
    collection: 'costManagementPlans',
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
        { id: 'SCHEDULE_PLAN', title: t('schedule_management_plan') },
        { id: 'WBS', title: t('wbs') },
        { id: 'EEFS', title: 'EEFs', lastUpdated: '2024-03-22' },
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={costPlan.version}
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
              className="space-y-6 pb-14"
            >
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-10 relative overflow-hidden">
                {isArchived && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-3 px-6 flex items-center gap-3 z-10">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-[0.2em]">Archived Cost Baseline - V{costPlan.version}</span>
                  </div>
                )}

                <section className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Preparation Date</label>
                      <input 
                        type="date"
                        value={costPlan.datePrepared}
                        onChange={(e) => setCostPlan({ ...costPlan, datePrepared: e.target.value })}
                        disabled={isArchived}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Financial Status</label>
                      <div className="px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-sm font-black text-emerald-600 flex items-center justify-between">
                         <span className="flex items-center gap-2 animate-pulse"><DollarSign className="w-4 h-4" /> ACTIVE BASELINE</span>
                         <span>V{costPlan.version}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                           <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Cost Governance Parameters</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-1">Accuracy, Units & Thresholds</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { key: 'accuracy', label: 'Estimating Accuracy', icon: Activity },
                          { key: 'units', label: 'Currency Units', icon: DollarSign },
                          { key: 'controlThresholds', label: 'Variance Controls', icon: ShieldCheck },
                          { key: 'performanceRules', label: 'EVM Rules', icon: TrendingUp },
                          { key: 'reportingFormat', label: 'Financial Reporting', icon: FileText }
                        ].map((field) => (
                          <div key={field.key} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 group">
                             <div className="flex items-center gap-2 mb-3">
                               <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-300 group-hover:text-emerald-500 transition-colors">
                                  {React.createElement(field.icon as any, { className: "w-3.5 h-3.5" })}
                               </div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
                             </div>
                             <textarea 
                               value={(costPlan as any)[field.key]} 
                               onChange={(e) => setCostPlan({...costPlan, [field.key]: e.target.value})} 
                               disabled={isArchived}
                               className="w-full h-24 bg-transparent text-sm font-bold text-slate-700 outline-none resize-none disabled:opacity-50"
                             />
                          </div>
                        ))}
                        <div className="p-6 bg-emerald-900 rounded-3xl border border-emerald-800 shadow-2xl space-y-4">
                           <div className="flex items-center gap-3">
                              <PieChart className="w-5 h-5 text-emerald-400" />
                              <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Global Threshold</label>
                           </div>
                           <div className="space-y-2">
                             <div className="flex justify-between items-end">
                                <span className="text-2xl font-black text-white">{costPlan.thresholdPercentage}%</span>
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Variance Limit</span>
                             </div>
                             <input 
                               type="range" 
                               min="1" 
                               max="50" 
                               value={costPlan.thresholdPercentage} 
                               onChange={(e) => setCostPlan({...costPlan, thresholdPercentage: parseFloat(e.target.value)})} 
                               disabled={isArchived}
                               className="w-full accent-emerald-500" 
                             />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8 pt-10 border-t border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                           <Settings className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Cost Execution Strategy</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-1">Lifecycle Process Definition</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {Object.entries(costPlan.processManagement).map(([key, value]) => (
                          <div key={key} className="space-y-4">
                             <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key} Strategy</label>
                             </div>
                             <textarea 
                               value={value}
                               onChange={(e) => setCostPlan({
                                 ...costPlan,
                                 processManagement: { ...costPlan.processManagement, [key]: e.target.value }
                               })}
                               disabled={isArchived}
                               className="w-full h-40 px-5 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm leading-relaxed font-medium outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 transition-all disabled:opacity-50 resize-none"
                               placeholder={`Describe ${key} strategy...`}
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
