import React, { useState, useEffect } from 'react';
import { 
  MessageSquare,
  Plus,
  Trash2,
  ArrowLeft,
  Users,
  Loader2,
  History,
  Info
} from 'lucide-react';
import { Page, CommunicationPlanEntry } from '../types';
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

interface CommunicationsManagementPlanViewProps {
  page: Page;
}

interface CommPlanData {
  projectTitle: string;
  datePrepared: string;
  matrix: CommunicationPlanEntry[];
  assumptions: string;
  constraints: string;
  glossary: string;
  version?: string;
}

export const CommunicationsManagementPlanView: React.FC<CommunicationsManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [commPlan, setCommPlan] = useState<CommPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    matrix: [],
    assumptions: '',
    constraints: '',
    glossary: ''
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'communicationsManagementPlans'),
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
      setCommPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        matrix: [
          { id: '1', stakeholderName: 'Client', information: 'Monthly Progress Report', method: 'Email', frequency: 'Monthly', sender: 'Project Manager', status: 'Active', projectId: selectedProject?.id || '', stakeholderId: '' }
        ],
        assumptions: '',
        constraints: '',
        glossary: ''
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setCommPlan({ ...commPlan, ...record });
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
        ...commPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : commPlan.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'communicationsManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success('Communications Plan created successfully');
      } else {
        await updateDoc(doc(db, 'communicationsManagementPlans', selectedRecordId), planData);
        toast.success('Communications Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'communicationsManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'communicationsManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'communicationsManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('COMMUNICATIONS MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Stakeholder', 'Information', 'Method', 'Frequency', 'Sender']],
      body: commPlan.matrix.map(m => [m.stakeholderName, m.information, m.method, m.frequency, m.sender]),
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = commPlan.version || '1.0';
    docObj.save(`${selectedProject.code}-COMM-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'communicationsManagementPlans' as any,
    label: t('communications_management_plans'),
    icon: MessageSquare,
    collection: 'communicationsManagementPlans',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  const handleAddMatrixRow = () => {
    setCommPlan({
      ...commPlan,
      matrix: [...commPlan.matrix, { id: crypto.randomUUID(), stakeholderName: '', information: '', method: '', frequency: '', sender: '', status: 'Active', projectId: selectedProject?.id || '', stakeholderId: '' }]
    });
  };

  const handleRemoveMatrixRow = (id: string) => {
    setCommPlan({
      ...commPlan,
      matrix: commPlan.matrix.filter(m => m.id !== id)
    });
  };

  const handleMatrixChange = (id: string, field: string, value: string) => {
    setCommPlan({
      ...commPlan,
      matrix: commPlan.matrix.map(m => m.id === id ? { ...m, [field]: value } : m)
    });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <StandardProcessPage
      page={{ ...page, title: viewMode === 'edit' ? t('edit_view') : page.title }}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[{ id: 'stakeholder-register', title: 'Stakeholder Register' }, { id: 'eefs', title: 'EEFs' }]}
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
                      <input type="text" value={commPlan.projectTitle} onChange={(e) => setCommPlan({ ...commPlan, projectTitle: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input type="date" value={commPlan.datePrepared} onChange={(e) => setCommPlan({ ...commPlan, datePrepared: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Communications Matrix</label>
                      <button onClick={handleAddMatrixRow} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2 text-left">Stakeholder</th>
                            <th className="px-4 py-2 text-left">Info</th>
                            <th className="px-4 py-2 text-left">Method</th>
                            <th className="px-4 py-2 text-left">Timing</th>
                            <th className="px-4 py-2 text-left">Sender</th>
                            <th className="px-4 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {commPlan.matrix.map((row, idx) => (
                            <tr key={`${row.id}-${idx}`}>
                              <td className="px-4 py-2"><input type="text" value={row.stakeholderName} onChange={(e) => handleMatrixChange(row.id, 'stakeholderName', e.target.value)} className="w-full bg-transparent outline-none"/></td>
                              <td className="px-4 py-2"><input type="text" value={row.information} onChange={(e) => handleMatrixChange(row.id, 'information', e.target.value)} className="w-full bg-transparent outline-none"/></td>
                              <td className="px-4 py-2"><input type="text" value={row.method} onChange={(e) => handleMatrixChange(row.id, 'method', e.target.value)} className="w-full bg-transparent outline-none"/></td>
                              <td className="px-4 py-2"><input type="text" value={row.frequency} onChange={(e) => handleMatrixChange(row.id, 'frequency', e.target.value)} className="w-full bg-transparent outline-none"/></td>
                              <td className="px-4 py-2"><input type="text" value={row.sender} onChange={(e) => handleMatrixChange(row.id, 'sender', e.target.value)} className="w-full bg-transparent outline-none"/></td>
                              <td className="px-4 py-2"><button onClick={() => handleRemoveMatrixRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['assumptions', 'constraints', 'glossary'].map((key) => (
                      <div key={key} className="space-y-1.5 col-span-1 even:col-span-1 last:md:col-span-2">
                         <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest capitalize">{key}</label>
                         <textarea value={(commPlan as any)[key]} onChange={(e) => setCommPlan({...commPlan, [key]: e.target.value})} className="w-full h-24 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
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
