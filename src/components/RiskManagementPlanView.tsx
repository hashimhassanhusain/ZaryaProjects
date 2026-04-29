import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react';
import { Page } from '../types';
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

interface RiskManagementPlanViewProps {
  page: Page;
}

type RiskLevel = 'low' | 'medium' | 'high';

interface PIMatrixCell {
  probability: number;
  impact: number;
  level: RiskLevel;
}

interface RiskPlanData {
  projectTitle: string;
  datePrepared: string;
  methodology: string;
  roles: string;
  categories: string;
  funding: string;
  contingencyProtocols: string;
  timing: string;
  tolerances: { stakeholderId: string; tolerance: string }[];
  audit: string;
  version?: string;
}

export const RiskManagementPlanView: React.FC<RiskManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [riskPlan, setRiskPlan] = useState<RiskPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    methodology: 'Qualitative and Quantitative Risk Analysis.',
    roles: 'Project Manager: Risk Owner.',
    categories: 'Technical, External, Organizational.',
    funding: 'Risk management budget.',
    contingencyProtocols: '5% Contingency.',
    timing: 'Bi-weekly.',
    tolerances: [],
    audit: 'Internal audits quarterly.'
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'riskManagementPlans'),
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
      setRiskPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        methodology: '',
        roles: '',
        categories: '',
        funding: '',
        contingencyProtocols: '',
        timing: '',
        tolerances: [],
        audit: ''
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setRiskPlan({ ...riskPlan, ...record });
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
        ...riskPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : riskPlan.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'riskManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success('Risk Plan created successfully');
      } else {
        await updateDoc(doc(db, 'riskManagementPlans', selectedRecordId), planData);
        toast.success('Risk Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'riskManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'riskManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'riskManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('RISK MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Section', 'Description']],
      body: [
        ['Methodology', riskPlan.methodology],
        ['Roles', riskPlan.roles],
        ['Categories', riskPlan.categories],
        ['Funding', riskPlan.funding],
        ['Audit', riskPlan.audit]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = riskPlan.version || '1.0';
    docObj.save(`${selectedProject.code}-RISK-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'riskManagementPlans' as any,
    label: t('risk_management_plans'),
    icon: ShieldAlert,
    collection: 'riskManagementPlans',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <StandardProcessPage
      page={{ ...page, title: viewMode === 'edit' ? t('edit_view') : page.title }}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[{ id: 'risk-register', title: 'Risk Register' }, { id: 'scope-baseline', title: 'Scope Baseline' }]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <UniversalDataTable 
                config={gridConfig}
                data={planRecords}
                onRowClick={(record) => { setSelectedRecordId(record.id); setViewMode('edit'); }}
                onNewClick={() => { setSelectedRecordId(null); setViewMode('edit'); }}
                onDeleteRecord={handleDelete}
              />
            </motion.div>
          ) : (
            <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 pb-10">
              <div className="flex justify-end pr-2">
                 <button onClick={() => setViewMode('grid')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider">
                   <ArrowLeft className="w-3 h-3" /> {t('back_to_list')}
                 </button>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 text-slate-900">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Project Title</label>
                      <input type="text" value={riskPlan.projectTitle} onChange={(e) => setRiskPlan({ ...riskPlan, projectTitle: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input type="date" value={riskPlan.datePrepared} onChange={(e) => setRiskPlan({ ...riskPlan, datePrepared: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['methodology', 'roles', 'categories', 'funding', 'contingencyProtocols', 'timing', 'audit'].map((key) => (
                      <div key={key} className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                         <textarea value={(riskPlan as any)[key]} onChange={(e) => setRiskPlan({...riskPlan, [key]: e.target.value})} className="w-full h-24 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
