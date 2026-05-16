import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  FileText,
  Gavel,
  ShieldCheck,
  CreditCard,
  Briefcase,
  FileSearch,
  Scale,
  Target
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

interface ProcurementManagementPlanViewProps {
  page: Page;
}

interface SelectionCriteria {
  id: string;
  weight: number;
  criteria: string;
}

interface ProcurementPlanData {
  projectTitle: string;
  datePrepared: string;
  authority: string;
  pmResponsibilities: string[];
  procurementResponsibilities: string[];
  standardDocuments: string[];
  contractType: string;
  bondingInsurance: string;
  selectionCriteria: SelectionCriteria[];
  assumptionsConstraints: string;
  version?: string;
}

export const ProcurementManagementPlanView: React.FC<ProcurementManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isArchivedState, setIsArchivedState] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [procPlan, setProcPlan] = useState<ProcurementPlanData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    authority: 'Procurement authority is vested in the Project Manager for items up to $50k.',
    pmResponsibilities: ['Define technical requirements', 'Review vendor SOWs'],
    procurementResponsibilities: ['Manage tendering process', 'Contract negotiation'],
    standardDocuments: ['RFP Template', 'PO General Terms', 'SOW Template'],
    contractType: 'Lump Sum / Unit Price with Max Cap',
    bondingInsurance: 'Performance Bond (10%), PLI ($2M)',
    selectionCriteria: [],
    assumptionsConstraints: 'Local sourcing preference as per ESG mandates.'
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'procurementManagementPlans'),
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
      setProcPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        authority: 'Standard Corporate Procurement Guidelines Apply.',
        pmResponsibilities: ['Technical Verification'],
        procurementResponsibilities: ['Compliance Check'],
        standardDocuments: ['RFP', 'RFQ'],
        contractType: 'Fixed Price',
        bondingInsurance: 'Standard',
        selectionCriteria: [],
        assumptionsConstraints: ''
      });
      setIsArchivedState(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setProcPlan({ ...procPlan, ...record });
         setIsArchivedState(record.status === 'Archived');
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
        ...procPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (procPlan.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'procurementManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'procurementManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Procurement Plan Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'procurementManagementPlans', selectedRecordId), planData);
        toast.success('Procurement plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'procurementManagementPlans');
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
      await deleteDoc(doc(db, 'procurementManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'procurementManagementPlans');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const record = planRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'procurementManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'procurementManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('PROCUREMENT MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Section', 'Description']],
      body: [
        ['Authority', procPlan.authority],
        ['Contract Type', procPlan.contractType],
        ['Bonding & Insurance', procPlan.bondingInsurance],
        ['Assumptions & Constraints', procPlan.assumptionsConstraints]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = procPlan.version || '1.0';
    docObj.save(`${selectedProject.code}-PROC-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'procurementManagementPlans' as any,
    label: t('procurement_management_plans'),
    icon: ShoppingCart,
    collection: 'procurementManagementPlans',
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
        { id: 'WBS', title: t('work_breakdown_structure') },
        { id: 'BUDGET', title: t('project_budget'), lastUpdated: '2024-03-24' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={procPlan.version}
      onVersionChange={(v) => {
        const record = planRecords.find(r => r.version === v);
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
                data={planRecords.filter(r => {
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
            <motion.div key="edit" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8 pb-20">
               <div className="bg-white rounded-[4rem] p-16 border border-slate-200 shadow-2xl shadow-slate-200/50 space-y-16 relative overflow-hidden">
                {isArchivedState && (
                  <div className="absolute top-0 left-0 right-0 bg-slate-900 py-4 px-10 flex items-center gap-4 z-10 font-black uppercase text-[10px] text-white tracking-[0.2em]">
                     <ShieldCheck className="w-5 h-5 text-emerald-400" /> HISTORICAL PROCUREMENT BASELINE V{procPlan.version} — READ ONLY
                  </div>
                )}

                <section className="space-y-16 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Plan Authorization Date</label>
                        <div className="relative group">
                           <input 
                             type="date" 
                             value={getISODate(procPlan.datePrepared)} 
                             onChange={(e) => setProcPlan({ ...procPlan, datePrepared: e.target.value })} 
                             disabled={isArchivedState}
                             className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-lg font-bold outline-none focus:ring-8 focus:ring-slate-900/5 transition-all text-slate-700"
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Global Contract Mode</label>
                        <div className="px-8 py-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between group cursor-default">
                           <span className="flex items-center gap-3 font-black text-sm tracking-widest uppercase"><CreditCard className="w-6 h-6 text-emerald-400" /> PROCUREMENT ALPHA V{procPlan.version}</span>
                           <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="group space-y-5 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl">
                       <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                             <Briefcase className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">Authority Matrix</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Procurement Delegation & Limits</p>
                          </div>
                       </div>
                       <textarea 
                         value={procPlan.authority} 
                         onChange={(e) => setProcPlan({...procPlan, authority: e.target.value})} 
                         disabled={isArchivedState}
                         className="w-full h-40 bg-transparent border-none text-base font-semibold text-slate-600 outline-none resize-none px-2 leading-relaxed"
                         placeholder="Define procurement authority limits..."
                       />
                    </div>

                    <div className="group space-y-5 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl">
                       <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                             <FileSearch className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">Contract Strategy</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Vehicle Selection & Incentive Hub</p>
                          </div>
                       </div>
                       <textarea 
                         value={procPlan.contractType} 
                         onChange={(e) => setProcPlan({...procPlan, contractType: e.target.value})} 
                         disabled={isArchivedState}
                         className="w-full h-40 bg-transparent border-none text-base font-semibold text-slate-600 outline-none resize-none px-2 leading-relaxed"
                         placeholder="Detail contract types (Fixed Price, Cost-Plus, etc.)..."
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="group space-y-5 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl">
                       <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                             <Gavel className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">Tendering Protocol</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Source Selection Criteria</p>
                          </div>
                       </div>
                       <textarea 
                         value={procPlan.bondingInsurance} 
                         onChange={(e) => setProcPlan({...procPlan, bondingInsurance: e.target.value})} 
                         disabled={isArchivedState}
                         className="w-full h-40 bg-transparent border-none text-base font-semibold text-slate-600 outline-none resize-none px-2 leading-relaxed"
                         placeholder="Define bonding, insurance, and selection criteria..."
                       />
                    </div>

                    <div className="group space-y-5 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl">
                       <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center">
                             <Scale className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">Vendor Constraints</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Assumptions & Strategic Bottlenecks</p>
                          </div>
                       </div>
                       <textarea 
                         value={procPlan.assumptionsConstraints} 
                         onChange={(e) => setProcPlan({...procPlan, assumptionsConstraints: e.target.value})} 
                         disabled={isArchivedState}
                         className="w-full h-40 bg-transparent border-none text-base font-semibold text-slate-600 outline-none resize-none px-2 leading-relaxed"
                         placeholder="List procurement assumptions and constraints..."
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
