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
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
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

  const [costPlan, setCostPlan] = useState<CostPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
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
      setCostPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        accuracy: '+/- 5%',
        units: `${selectedProject?.baseCurrency || 'IQD'}`,
        controlThresholds: '5% Variance Alert',
        thresholdPercentage: 10,
        performanceRules: 'EVM rules',
        reportingFormat: 'Monthly Finance PDF',
        processManagement: {
          estimating: 'Market rates lookup',
          budgeting: 'BOQ Aggregation',
          monitoring: 'PO Commitment tracking'
        }
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setCostPlan({ ...costPlan, ...record });
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
        ...costPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : costPlan.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'costManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success(t('cost_plan_created_success') || 'Cost Plan created successfully');
      } else {
        await updateDoc(doc(db, 'costManagementPlans', selectedRecordId), planData);
        toast.success(t('cost_plan_updated_success') || 'Cost Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'costManagementPlans');
    } finally {
      setIsSaving(false);
    }
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
        { id: 'schedule-plan', title: 'Schedule Management Plan' },
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

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Project Title</label>
                      <input 
                        type="text"
                        value={costPlan.projectTitle}
                        onChange={(e) => setCostPlan({ ...costPlan, projectTitle: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input 
                        type="date"
                        value={costPlan.datePrepared}
                        onChange={(e) => setCostPlan({ ...costPlan, datePrepared: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Accuracy</label>
                       <input value={costPlan.accuracy} onChange={(e) => setCostPlan({...costPlan, accuracy: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Units</label>
                       <input value={costPlan.units} onChange={(e) => setCostPlan({...costPlan, units: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Threshold %</label>
                       <input type="number" value={costPlan.thresholdPercentage} onChange={(e) => setCostPlan({...costPlan, thresholdPercentage: parseFloat(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" />
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-50">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Process Definition</h3>
                    <div className="grid grid-cols-1 gap-4">
                       {Object.entries(costPlan.processManagement).map(([key, value]) => (
                         <div key={key} className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest capitalize">{key}</label>
                            <textarea 
                              value={value}
                              onChange={(e) => setCostPlan({
                                ...costPlan,
                                processManagement: { ...costPlan.processManagement, [key]: e.target.value }
                              })}
                              className="w-full h-20 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none"
                            />
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
       </div>
    </StandardProcessPage>
  );
};
