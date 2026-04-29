import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  FileText,
  Gavel,
  ShieldCheck
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

  const [procPlan, setProcPlan] = useState<ProcurementPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    authority: 'Procurement authority is vested in the PM.',
    pmResponsibilities: ['Define technical requirements'],
    procurementResponsibilities: ['Manage tendering process'],
    standardDocuments: ['RFP Template', 'PO Terms'],
    contractType: 'Lump Sum / Unit Price',
    bondingInsurance: 'Performance Bond (10%)',
    selectionCriteria: [],
    assumptionsConstraints: ''
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'procurementManagementPlans'),
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
      setProcPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        authority: '',
        pmResponsibilities: [],
        procurementResponsibilities: [],
        standardDocuments: [],
        contractType: '',
        bondingInsurance: '',
        selectionCriteria: [],
        assumptionsConstraints: ''
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setProcPlan({ ...procPlan, ...record });
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
        ...procPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : procPlan.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'procurementManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success('Procurement Plan created successfully');
      } else {
        await updateDoc(doc(db, 'procurementManagementPlans', selectedRecordId), planData);
        toast.success('Procurement Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'procurementManagementPlans');
    } finally {
      setIsSaving(false);
    }
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
      inputs={[{ id: 'wbs', title: 'WBS' }, { id: 'budget', title: 'Project Budget' }]}
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
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Project Title</label>
                      <input type="text" value={procPlan.projectTitle} onChange={(e) => setProcPlan({ ...procPlan, projectTitle: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input type="date" value={procPlan.datePrepared} onChange={(e) => setProcPlan({ ...procPlan, datePrepared: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['authority', 'contractType', 'bondingInsurance', 'assumptionsConstraints'].map((key) => (
                      <div key={key} className="space-y-1.5">
                         <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                         <textarea value={(procPlan as any)[key]} onChange={(e) => setProcPlan({...procPlan, [key]: e.target.value})} className="w-full h-24 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" />
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
