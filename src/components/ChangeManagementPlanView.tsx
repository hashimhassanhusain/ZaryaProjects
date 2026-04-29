import React, { useState, useEffect } from 'react';
import { 
  Zap,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  UserPlus
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

interface ChangeManagementPlanViewProps {
  page: Page;
}

interface CCBMember {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  authority: 'High' | 'Medium' | 'Low';
}

interface CMPData {
  projectTitle: string;
  datePrepared: string;
  approach: string;
  definitions: {
    schedule: string;
    budget: string;
    scope: string;
    documents: string;
  };
  ccbMembers: CCBMember[];
  process: {
    submittal: string;
    tracking: string;
    review: string;
    disposition: string;
  };
  version?: string;
}

export const ChangeManagementPlanView: React.FC<ChangeManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [cmp, setCmp] = useState<CMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    approach: '',
    definitions: {
      schedule: '',
      budget: '',
      scope: '',
      documents: ''
    },
    ccbMembers: [],
    process: {
      submittal: '',
      tracking: '',
      review: '',
      disposition: ''
    }
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'changeManagementPlans'),
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
      setCmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        approach: '',
        definitions: {
          schedule: '',
          budget: '',
          scope: '',
          documents: ''
        },
        ccbMembers: [],
        process: {
          submittal: '',
          tracking: '',
          review: '',
          disposition: ''
        }
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setCmp({ ...cmp, ...record });
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
        ...cmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : cmp.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'changeManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success('Change Plan created successfully');
      } else {
        await updateDoc(doc(db, 'changeManagementPlans', selectedRecordId), planData);
        toast.success('Change Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'changeManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'changeManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'changeManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('CHANGE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Role', 'Name', 'Authority']],
      body: cmp.ccbMembers.map(m => [m.role, m.name, m.authority]),
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = cmp.version || '1.0';
    docObj.save(`${selectedProject.code}-CHG-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'changeManagementPlans' as any,
    label: t('change_management_plans'),
    icon: Zap,
    collection: 'changeManagementPlans',
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
      inputs={[{ id: 'cmp-input-1', title: 'Charter' }, { id: 'cmp-input-2', title: 'Configuration Management' }]}
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
                      <input type="text" value={cmp.projectTitle} onChange={(e) => setCmp({ ...cmp, projectTitle: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input type="date" value={cmp.datePrepared} onChange={(e) => setCmp({ ...cmp, datePrepared: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-2">CCB Members</h4>
                    {cmp.ccbMembers.map((member, idx) => (
                       <div key={member.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 relative group">
                          <button onClick={() => { const newMem = cmp.ccbMembers.filter(m => m.id !== member.id); setCmp({...cmp, ccbMembers: newMem}); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                             <Trash2 className="w-3 h-3" />
                          </button>
                          <input placeholder="Name" value={member.name} onChange={(e) => { const newMem = [...cmp.ccbMembers]; newMem[idx].name = e.target.value; setCmp({...cmp, ccbMembers: newMem});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"/>
                          <input placeholder="Role" value={member.role} onChange={(e) => { const newMem = [...cmp.ccbMembers]; newMem[idx].role = e.target.value; setCmp({...cmp, ccbMembers: newMem});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"/>
                          <select value={member.authority} onChange={(e) => { const newMem = [...cmp.ccbMembers]; newMem[idx].authority = e.target.value as any; setCmp({...cmp, ccbMembers: newMem});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none">
                             <option value="High">High Authority</option>
                             <option value="Medium">Medium Authority</option>
                             <option value="Low">Low Authority</option>
                          </select>
                       </div>
                    ))}
                    <button onClick={() => setCmp({...cmp, ccbMembers: [...cmp.ccbMembers, { id: Date.now().toString(), name: '', role: '', responsibility: '', authority: 'Medium' }]})} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200 border-dashed">
                       <Plus className="w-4 h-4" /> Add CCB Member
                    </button>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-2">Change Thresholds</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {['schedule', 'budget', 'scope', 'documents'].map(key => (
                         <div key={key} className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest capitalize">{key}</label>
                            <input value={(cmp.definitions as any)[key]} onChange={(e) => setCmp({...cmp, definitions: {...cmp.definitions, [key]: e.target.value}})} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Management Approach</label>
                    <textarea value={cmp.approach} onChange={(e) => setCmp({...cmp, approach: e.target.value})} className="w-full h-32 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
