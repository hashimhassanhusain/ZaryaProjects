import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  TrendingUp,
  BarChart3,
  Users,
  ShieldCheck,
  Target,
  Zap,
  Activity,
  Award,
  ChevronRight,
  GitBranch,
  Search
} from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { getISODate } from '../lib/utils';
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
  const [isArchived, setIsArchived] = useState(false);

  const [riskPlan, setRiskPlan] = useState<RiskPlanData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    methodology: 'Qualitative and Quantitative Risk Analysis per Corporate Standards.',
    roles: 'Project Manager (Risk Owner), HSE Officer (Safety Risks).',
    categories: 'Technical (Design/Build), External (Supply Chain), Organizational (HR).',
    funding: 'General Contingency Reserve (5% of Direct Costs).',
    contingencyProtocols: 'Threshold alerts at $10k variance; PCR trigger at $50k.',
    timing: 'Bi-weekly project review meetings.',
    tolerances: [],
    audit: 'Quarterly compliance and risk process audits.'
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'riskManagementPlans'),
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
      setRiskPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        methodology: 'Integrated Risk Framework (IRF) 2024.',
        roles: 'Assigned per RACI Matrix.',
        categories: 'Schedule, Cost, Quality, Scope, HSE.',
        funding: 'Central Risk Pool.',
        contingencyProtocols: 'Standard mitigation escalation path.',
        timing: 'Weekly Monitoring.',
        tolerances: [],
        audit: 'External Audit Semi-Annually.'
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setRiskPlan({ ...riskPlan, ...record });
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
        ...riskPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (riskPlan.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'riskManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'riskManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Risk Plan Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'riskManagementPlans', selectedRecordId), planData);
        toast.success('Risk plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'riskManagementPlans');
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
      inputs={[
        { id: 'PROJECT_CHARTER', title: t('project_charter') },
        { id: 'SCOPE_BASELINE', title: t('stakeholder_matrix'), lastUpdated: '2024-03-10' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={riskPlan.version}
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
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-20">
               <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden">
                {isArchived && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none">
                     <ShieldCheck className="w-4 h-4" /> ARCHIVED RISK PROTOCOL SNAPSHOT V{riskPlan.version}
                  </div>
                )}

                <section className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 block">Governance Baseline Date</label>
                      <input 
                        type="date"
                        value={riskPlan.datePrepared}
                        onChange={(e) => setRiskPlan({ ...riskPlan, datePrepared: e.target.value })}
                        disabled={isArchived}
                        className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-red-500/5 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 block">Risk Tolerance Level</label>
                      <div className="px-6 py-5 bg-red-50/50 border border-red-100 rounded-2xl text-base font-black text-red-600 flex items-center justify-between">
                         <span className="flex items-center gap-2 tracking-tight uppercase">V{riskPlan.version} THRESHOLD</span>
                         <ShieldAlert className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {[
                       { key: 'methodology', title: 'Risk Methodology', icon: Target, color: 'bg-indigo-500' },
                       { key: 'roles', title: 'Governance Roles', icon: Users, color: 'bg-blue-500' },
                       { key: 'categories', title: 'Risk Categories (RBS)', icon: GitBranch, color: 'bg-emerald-500' },
                       { key: 'funding', title: 'Risk Reserve Fund', icon: Zap, color: 'bg-orange-500' },
                       { key: 'contingencyProtocols', title: 'Threshold Protocols', icon: Activity, color: 'bg-red-500' },
                       { key: 'timing', title: 'Cadence & Review', icon: TrendingUp, color: 'bg-yellow-500' },
                       { key: 'audit', title: 'Internal Risk Audit', icon: Award, color: 'bg-slate-700' }
                     ].map((field) => (
                       <div key={field.key} className="space-y-4 group">
                          <div className="flex items-center gap-3 px-2">
                             <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5 transition-transform group-hover:scale-110", field.color)}>
                                {React.createElement(field.icon as any, { className: "w-4 h-4" })}
                             </div>
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.title}</label>
                          </div>
                          <textarea 
                            value={(riskPlan as any)[field.key]} 
                            onChange={(e) => setRiskPlan({...riskPlan, [field.key]: e.target.value})} 
                            disabled={isArchived}
                            className="w-full h-32 px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm leading-relaxed font-bold text-slate-700 outline-none focus:bg-white focus:shadow-2xl focus:shadow-slate-200/50 focus:border-red-200 transition-all disabled:opacity-50 resize-none px-6"
                            placeholder={`Define ${field.title.toLowerCase()}...`}
                          />
                       </div>
                     ))}
                  </div>

                  <div className="pt-10 border-t border-slate-100">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-600/20">
                           <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Appetite & Tolerances</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Stakeholder-specific threshold triggers</p>
                        </div>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 min-h-[150px] flex items-center justify-center border-dashed border-slate-300">
                        <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                          <Search className="w-4 h-4" /> Tolerance Matrix Placeholder - Versioned to Baseline
                        </p>
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
