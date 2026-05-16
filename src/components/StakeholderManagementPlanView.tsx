import React, { useState, useEffect } from 'react';
import { 
  Users,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Target,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  Activity,
  Heart,
  Search,
  Globe
} from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { getISODate } from '../lib/utils';
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
  const [isArchived, setIsArchived] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [smp, setSmp] = useState<SMPData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
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
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
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
        datePrepared: getISODate(new Date()),
        engagements: [],
        pendingChanges: 'Monthly assessment of stakeholder influence/interest.',
        relationships: 'Direct alignment between project sponsor and lead contractor.'
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setSmp({ ...smp, ...record });
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
        ...smp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (smp.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'stakeholderManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'stakeholderManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Engagement Plan Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'stakeholderManagementPlans', selectedRecordId), planData);
        toast.success('Engagement plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'stakeholderManagementPlans');
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
      await deleteDoc(doc(db, 'stakeholderManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'stakeholderManagementPlans');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const record = planRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'stakeholderManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'stakeholderManagementPlans');
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
      inputs={[
        { id: 'STAKEHOLDER_REGISTER', title: t('stakeholder_register') },
        { id: 'COMMUNICATION_PLAN', title: t('communications_plan'), lastUpdated: '2024-03-24' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={smp.version}
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
                data={planRecords.filter(r => {
                  const archived = r.status === 'Archived';
                  return showArchived ? archived : !archived;
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
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-20">
               <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden">
                {isArchived && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none">
                     <ShieldCheck className="w-4 h-4" /> ARCHIVED ENGAGEMENT SNAPSHOT V{smp.version}
                  </div>
                )}

                <section className="space-y-12 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Strategy Baseline Date</label>
                        <input 
                          type="date" 
                          value={getISODate(smp.datePrepared)} 
                          onChange={(e) => setSmp({ ...smp, datePrepared: e.target.value })} 
                          disabled={isArchived}
                          className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-600"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Engagement Velocity</label>
                        <div className="px-6 py-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-base font-black text-emerald-600 flex items-center justify-between">
                           <span className="flex items-center gap-2 tracking-tight uppercase"><TrendingUp className="w-5 h-5" /> ACTIVE ENGAGEMENT V{smp.version}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                       <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
                             <Users className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight text-sans">Engagement Assessment Matrix</h3>
                            <p className="text-[11px] text-emerald-600 uppercase font-black tracking-widest mt-1">Analytical Mapping of Stakeholder Dynamics</p>
                          </div>
                       </div>
                       {!isArchived && (
                          <button 
                            onClick={() => setSmp({...smp, engagements: [...smp.engagements, { id: Date.now().toString(), stakeholderId: '', stakeholderName: '', current: 'Neutral', desired: 'Neutral', commNeeds: '', method: '', timing: '', approach: '' }]})}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.1em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                          >
                            <UserPlus className="w-4 h-4" />
                            Provision Entry
                          </button>
                       )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {smp.engagements.map((eng, idx) => (
                        <div key={eng.id} className="group relative bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-emerald-200 ring-offset-4 focus-within:ring-2 ring-emerald-500">
                           {!isArchived && (
                             <button 
                               onClick={() => { const newEng = smp.engagements.filter(e => e.id !== eng.id); setSmp({...smp, engagements: newEng}); }}
                               className="absolute -top-3 -right-3 w-10 h-10 bg-white border border-slate-100 text-red-500 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-50"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Stakeholder Identity</label>
                                 <select 
                                   value={eng.stakeholderId} 
                                   onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].stakeholderId = e.target.value; newEng[idx].stakeholderName = stakeholders.find(s => s.id === e.target.value)?.name || ''; setSmp({...smp, engagements: newEng});}} 
                                   disabled={isArchived}
                                   className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 appearance-none cursor-pointer"
                                 >
                                    <option value="">Select Target...</option>
                                    {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                 </select>
                              </div>
                              
                              <div className="space-y-3">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Engagement Levels</label>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-slate-400 uppercase text-center tracking-tighter">Current</p>
                                      <select 
                                        value={eng.current} 
                                        onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].current = e.target.value as EngagementLevel; setSmp({...smp, engagements: newEng});}} 
                                        disabled={isArchived}
                                        className="w-full px-3 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 outline-none text-center"
                                      >
                                         {['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'].map((l) => <option key={l} value={l}>{l}</option>)}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-emerald-500 uppercase text-center tracking-tighter">Target</p>
                                      <select 
                                        value={eng.desired} 
                                        onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].desired = e.target.value as EngagementLevel; setSmp({...smp, engagements: newEng});}} 
                                        disabled={isArchived}
                                        className="w-full px-3 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-black uppercase text-emerald-600 outline-none text-center"
                                      >
                                         {['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'].map((l) => <option key={l} value={l}>{l}</option>)}
                                      </select>
                                    </div>
                                 </div>
                              </div>

                              <div className="lg:col-span-2 space-y-3">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Strategical Engagement Approach</label>
                                 <div className="relative group/input">
                                    <div className="absolute top-1/2 -translate-y-1/2 left-5 text-emerald-500 opacity-30 group-focus-within/input:opacity-100 transition-opacity">
                                       <Activity className="w-5 h-5" />
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder="Define specific engagement tactical path..." 
                                      value={eng.approach} 
                                      onChange={(e) => { const newEng = [...smp.engagements]; newEng[idx].approach = e.target.value; setSmp({...smp, engagements: newEng});}} 
                                      disabled={isArchived}
                                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 transition-all shadow-inner shadow-slate-100/50"
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-100">
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-2">
                           <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                              <Heart className="w-5 h-5" />
                           </div>
                           <div>
                             <h4 className="text-base font-bold text-slate-900 tracking-tight">Psychological Mapping</h4>
                             <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Relational Dynamics & Sentiment Hub</p>
                           </div>
                        </div>
                        <textarea 
                          value={smp.relationships} 
                          onChange={(e) => setSmp({...smp, relationships: e.target.value})} 
                          disabled={isArchived}
                          className="w-full h-48 px-8 py-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed font-medium text-slate-600 outline-none focus:bg-white focus:ring-8 focus:ring-slate-500/5 transition-all resize-none shadow-inner"
                          placeholder="Document key stakeholder relationships 
and influence vectors..."
                        />
                     </div>
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-2">
                           <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                              <Globe className="w-5 h-5" />
                           </div>
                           <div>
                             <h4 className="text-base font-bold text-slate-900 tracking-tight">Governance Evolution</h4>
                             <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Environmental Change Vector</p>
                           </div>
                        </div>
                        <textarea 
                          value={smp.pendingChanges} 
                          onChange={(e) => setSmp({...smp, pendingChanges: e.target.value})} 
                          disabled={isArchived}
                          className="w-full h-48 px-8 py-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed font-medium text-slate-600 outline-none focus:bg-white focus:ring-8 focus:ring-indigo-500/5 transition-all resize-none shadow-inner"
                          placeholder="Detail how engagement strategy 
will evolve with project complexity..."
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
