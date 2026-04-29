import React, { useState, useEffect } from 'react';
import { 
  Users,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Target,
  UserPlus
} from 'lucide-react';
import { Page, Stakeholder } from '../types';
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

interface StakeholderManagementPlanViewProps {
  page: Page;
}

type EngagementLevel = 'Unaware' | 'Resistant' | 'Neutral' | 'Supportive' | 'Leading';

interface StakeholderEngagement {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  current: EngagementLevel;
  desired: EngagementLevel;
  commNeeds: string;
  method: string;
  timing: string;
  approach: string;
}

interface SMPData {
  projectTitle: string;
  datePrepared: string;
  engagements: StakeholderEngagement[];
  pendingChanges: string;
  relationships: string;
  version?: string;
}

export const StakeholderManagementPlanView: React.FC<StakeholderManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [smp, setSmp] = useState<SMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    engagements: [],
    pendingChanges: '',
    relationships: ''
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'stakeholderManagementPlans'),
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlanRecords(data);
      setLoading(false);
    });

    const sQ = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
    const unsubS = onSnapshot(sQ, (snap) => {
      setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    });

    return () => {
      unsub();
      unsubS();
    };
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setSmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        engagements: [],
        pendingChanges: '',
        relationships: ''
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setSmp({ ...smp, ...record });
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
        ...smp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : smp.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'stakeholderManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success('Stakeholder Plan created successfully');
      } else {
        await updateDoc(doc(db, 'stakeholderManagementPlans', selectedRecordId), planData);
        toast.success('Stakeholder Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'stakeholderManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'stakeholderManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'stakeholderManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('STAKEHOLDER MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Stakeholder', 'Current', 'Desired', 'Approach']],
      body: smp.engagements.map(e => [e.stakeholderName, e.current, e.desired, e.approach]),
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = smp.version || '1.0';
    docObj.save(`${selectedProject.code}-SMP-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'stakeholderManagementPlans' as any,
    label: t('stakeholder_management_plans'),
    icon: Users,
    collection: 'stakeholderManagementPlans',
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
      inputs={[{ id: 'stakeholder-register', title: 'Stakeholder Register' }]}
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
                      <input type="text" value={smp.projectTitle} onChange={(e) => setSmp({ ...smp, projectTitle: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input type="date" value={smp.datePrepared} onChange={(e) => setSmp({ ...smp, datePrepared: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b pb-2">Engagement Matrix</h4>
                    {smp.engagements.map((eng, idx) => (
                       <div key={`${eng.id}-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 relative group">
                          <button onClick={() => { const newEng = smp.engagements.filter(e => e.id !== eng.id); setSmp({...smp, engagements: newEng}); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                             <Trash2 className="w-3 h-3" />
                          </button>
                          <select value={eng.stakeholderId} onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].stakeholderId = e.target.value; newEng[idx].stakeholderName = stakeholders.find(s => s.id === e.target.value)?.name || ''; setSmp({...smp, engagements: newEng});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-sans">
                             <option value="">Select Stakeholder...</option>
                             {stakeholders.map((s, sIdx) => <option key={`${s.id}-${sIdx}`} value={s.id}>{s.name}</option>)}
                          </select>
                          <select value={eng.current} onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].current = e.target.value as EngagementLevel; setSmp({...smp, engagements: newEng});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-sans">
                             {['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'].map((l, lIdx) => <option key={`${l}-${lIdx}`} value={l}>{l} (Current)</option>)}
                          </select>
                          <select value={eng.desired} onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].desired = e.target.value as EngagementLevel; setSmp({...smp, engagements: newEng});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-sans">
                             {['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'].map((l, lIdx) => <option key={`${l}-${lIdx}`} value={l}>{l} (Desired)</option>)}
                          </select>
                          <input type="text" placeholder="Engagement Approach..." value={eng.approach} onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].approach = e.target.value; setSmp({...smp, engagements: newEng});}} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold font-sans"/>
                       </div>
                    ))}
                    <button onClick={() => setSmp({...smp, engagements: [...smp.engagements, { id: Date.now().toString(), stakeholderId: '', stakeholderName: '', current: 'Neutral', desired: 'Neutral', commNeeds: '', method: '', timing: '', approach: '' }]})} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200 border-dashed">
                       <Plus className="w-4 h-4" /> Add Engagement Entry
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending Stakeholder Changes</label>
                       <textarea value={smp.pendingChanges} onChange={(e) => setSmp({...smp, pendingChanges: e.target.value})} className="w-full h-32 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stakeholder Relationships</label>
                       <textarea value={smp.relationships} onChange={(e) => setSmp({...smp, relationships: e.target.value})} className="w-full h-32 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
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
