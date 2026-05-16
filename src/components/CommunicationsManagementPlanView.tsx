import React, { useState, useEffect } from 'react';
import { 
  MessageSquare,
  Plus,
  Trash2,
  ArrowLeft,
  Users,
  Loader2,
  History,
  Info,
  ShieldCheck,
  Send,
  Clock,
  Globe,
  Settings
} from 'lucide-react';
import { orderBy } from 'firebase/firestore';
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
import { cn, getISODate } from '../lib/utils';
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
  const [isArchivedState, setIsArchivedState] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [commPlan, setCommPlan] = useState<CommPlanData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
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
      setCommPlan({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        matrix: [
          { id: '1', stakeholderName: 'Internal Team', information: 'Daily Standup', method: 'In-person / Zoom', frequency: 'Daily', sender: 'Project Coordinator', status: 'Active', projectId: selectedProject?.id || '', stakeholderId: '' }
        ],
        assumptions: 'Reliable internet for all remote team members',
        constraints: 'Time zone differences (UTC-5 to UTC+3)',
        glossary: 'PMIS: Project Management Info System'
      });
      setIsArchivedState(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setCommPlan({ ...commPlan, ...record });
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
        ...commPlan,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (commPlan.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'communicationsManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'communicationsManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Comm Plan Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'communicationsManagementPlans', selectedRecordId), planData);
        toast.success('Communications plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'communicationsManagementPlans');
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
      await deleteDoc(doc(db, 'communicationsManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'communicationsManagementPlans');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const record = planRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'communicationsManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'communicationsManagementPlans');
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
      inputs={[
        { id: 'STAKEHOLDER_REGISTER', title: t('stakeholder_register') },
        { id: 'PROJECT_CHARTER', title: t('project_charter'), lastUpdated: '2024-03-25' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={commPlan.version}
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
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-20">
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden">
                {isArchivedState && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none">
                     <ShieldCheck className="w-4 h-4" /> ARCHIVED COMMUNICATIONS SNAPSHOT V{commPlan.version}
                  </div>
                )}

                <section className="space-y-12 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Creation Timestamp</label>
                        <input 
                          type="date" 
                          value={getISODate(commPlan.datePrepared)} 
                          onChange={(e) => setCommPlan({ ...commPlan, datePrepared: e.target.value })} 
                          disabled={isArchivedState}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-600"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Transmission Standard</label>
                        <div className="px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-black text-white flex items-center justify-between">
                           <span className="flex items-center gap-2 tracking-tight uppercase"><Send className="w-4 h-4 text-emerald-400" /> SECURE BASELINE V{commPlan.version}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                             <MessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Communications Matrix</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Multi-Channel Stakeholder Routing</p>
                          </div>
                       </div>
                       {!isArchivedState && (
                          <button 
                            onClick={handleAddMatrixRow}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all group shadow-lg shadow-indigo-500/5"
                          >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            Add Protocol
                          </button>
                       )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                       {commPlan.matrix.map((row) => (
                         <div key={row.id} className="group relative bg-slate-50 border border-slate-100 p-8 rounded-[2rem] transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-indigo-200">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</label>
                                  <input 
                                    type="text" 
                                    value={row.stakeholderName} 
                                    onChange={(e) => handleMatrixChange(row.id, 'stakeholderName', e.target.value)} 
                                    disabled={isArchivedState}
                                    placeholder="Target Stakeholder"
                                    className="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all"
                                  />
                               </div>
                               <div className="space-y-2 md:col-span-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Information Payload</label>
                                  <input 
                                    type="text" 
                                    value={row.information} 
                                    onChange={(e) => handleMatrixChange(row.id, 'information', e.target.value)} 
                                    disabled={isArchivedState}
                                    placeholder="Type of communication content"
                                    className="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Method & Frequency</label>
                                  <div className="flex items-center gap-2">
                                     <input 
                                       type="text" 
                                       value={row.method} 
                                       onChange={(e) => handleMatrixChange(row.id, 'method', e.target.value)} 
                                       disabled={isArchivedState}
                                       placeholder="e.g. Email"
                                       className="w-full bg-white px-3 py-3 rounded-xl text-xs font-bold border border-slate-100 outline-none"
                                     />
                                     <input 
                                       type="text" 
                                       value={row.frequency} 
                                       onChange={(e) => handleMatrixChange(row.id, 'frequency', e.target.value)} 
                                       disabled={isArchivedState}
                                       placeholder="Daily"
                                       className="w-full bg-white px-3 py-3 rounded-xl text-xs font-bold border border-slate-100 outline-none"
                                     />
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Point of Origin</label>
                                  <div className="flex items-center gap-2">
                                     <input 
                                       type="text" 
                                       value={row.sender} 
                                       onChange={(e) => handleMatrixChange(row.id, 'sender', e.target.value)} 
                                       disabled={isArchivedState}
                                       placeholder="Role/Owner"
                                       className="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold border border-slate-100 outline-none"
                                     />
                                     {!isArchivedState && (
                                       <button 
                                         onClick={() => handleRemoveMatrixRow(row.id)}
                                         className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                     )}
                                  </div>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-50">
                     {[
                       { key: 'assumptions', label: 'Comm Assumptions', icon: Globe },
                       { key: 'constraints', label: 'Comm Constraints', icon: Clock },
                       { key: 'glossary', label: 'Technical Glossary', icon: Info }
                     ].map((field) => (
                       <div key={field.key} className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                             {React.createElement(field.icon as any, { className: "w-4 h-4 text-slate-300" })}
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                          </div>
                          <textarea 
                            value={(commPlan as any)[field.key]} 
                            onChange={(e) => setCommPlan({...commPlan, [field.key]: e.target.value})} 
                            disabled={isArchivedState}
                            className="w-full h-40 px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm leading-relaxed font-medium text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all disabled:opacity-50 resize-none"
                            placeholder={`Define ${field.label.toLowerCase()}...`}
                          />
                       </div>
                     ))}
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
