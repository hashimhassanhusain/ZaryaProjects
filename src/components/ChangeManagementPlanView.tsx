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
  const [isArchived, setIsArchived] = useState(false);

  const [cmp, setCmp] = useState<CMPData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    approach: 'Standard construction change control flow with CCB oversight.',
    definitions: {
      schedule: 'Any variance > 5 days from baseline.',
      budget: 'Any cost increase > $10,000 per package.',
      scope: 'Any addition or subtraction to the technical specs.',
      documents: 'Updates to approved drawings or method statements.'
    },
    ccbMembers: [
      { id: '1', name: 'Zarya PM', role: 'Chairperson', responsibility: 'Final approval', authority: 'High' }
    ],
    process: {
      submittal: 'Formal CR form via PMIS.',
      tracking: 'Integrated Change Log.',
      review: 'Weekly Tuesday CCB meeting.',
      disposition: 'Signed records archived in Finance.'
    },
    version: '1.0'
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'changeManagementPlans'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPlanRecords(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'changeManagementPlans');
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setCmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
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
        },
        version: '1.0'
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setCmp({ ...cmp, ...record });
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
        ...cmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (cmp.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'changeManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'changeManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Change Plan Baseline Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'changeManagementPlans', selectedRecordId), planData);
        toast.success('Change plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'changeManagementPlans');
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
      inputs={[
        { id: 'PROJECT_CHARTER', title: t('project_charter') },
        { id: 'SCOPE_PLAN', title: t('scope_management_plan') }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={cmp.version}
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
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10 pb-20">
               <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden">
                {isArchived && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none">
                     <Zap className="w-4 h-4 animate-pulse" /> ARCHIVED CHANGE CONTROL BASELINE V{cmp.version}
                  </div>
                )}

                <section className="space-y-12 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Baseline Assessment Date</label>
                        <input 
                          type="date" 
                          value={getISODate(cmp.datePrepared)} 
                          onChange={(e) => setCmp({ ...cmp, datePrepared: e.target.value })} 
                          disabled={isArchived}
                          className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-600"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Governance Status</label>
                        <div className="px-6 py-5 bg-orange-50 border border-orange-100 rounded-2xl text-base font-black text-orange-600 flex items-center justify-between">
                           <span className="flex items-center gap-2 tracking-tight uppercase"><Zap className="w-5 h-5" /> CHANGE PROTOCOL V{cmp.version}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="flex items-center gap-5 border-b border-slate-100 pb-8">
                        <div className="w-14 h-14 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white shadow-xl">
                            <Zap className="w-7 h-7 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">CCB Governance Hub</h3>
                          <p className="text-[11px] text-orange-600 uppercase font-black tracking-widest mt-1">Change Control Board Members & Authority Levels</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                        {cmp.ccbMembers.map((member, idx) => (
                           <div key={member.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 relative group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                              {!isArchived && (
                                <button 
                                  onClick={() => { const newMem = cmp.ccbMembers.filter(m => m.id !== member.id); setCmp({...cmp, ccbMembers: newMem}); }} 
                                  className="absolute -top-3 -right-3 w-10 h-10 bg-white border border-slate-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-50"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Member Name</label>
                                <input placeholder="Full Name" value={member.name} disabled={isArchived} onChange={(e) => { const newMem = [...cmp.ccbMembers]; newMem[idx].name = e.target.value; setCmp({...cmp, ccbMembers: newMem});}} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Designated Role</label>
                                <input placeholder="e.g. Project Director" value={member.role} disabled={isArchived} onChange={(e) => { const newMem = [...cmp.ccbMembers]; newMem[idx].role = e.target.value; setCmp({...cmp, ccbMembers: newMem});}} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none"/>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Authority Level</label>
                                <select value={member.authority} disabled={isArchived} onChange={(e) => { const newMem = [...cmp.ccbMembers]; newMem[idx].authority = e.target.value as any; setCmp({...cmp, ccbMembers: newMem});}} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer">
                                   <option value="High">Final Authority (High)</option>
                                   <option value="Medium">Review Level (Medium)</option>
                                   <option value="Low">Advisory (Low)</option>
                                </select>
                              </div>
                           </div>
                        ))}
                        
                        {!isArchived && (
                          <button 
                            onClick={() => setCmp({...cmp, ccbMembers: [...cmp.ccbMembers, { id: Date.now().toString(), name: '', role: '', responsibility: '', authority: 'Medium' }]})} 
                            className="flex items-center justify-center gap-3 w-full py-6 bg-slate-50 border-2 border-dashed border-slate-100 text-slate-400 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 hover:border-slate-200 transition-all"
                          >
                             <UserPlus className="w-5 h-5" /> Add Board Member to CCB
                          </button>
                        )}
                     </div>
                  </div>

                  <div className="space-y-8 pt-10 border-t border-slate-100">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-600/20 font-black italic">
                          T
                       </div>
                       <div>
                         <h4 className="text-xl font-bold text-slate-900 tracking-tight">Technical Thresholds</h4>
                         <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Automated Triggers for Formal CR Submittal</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {Object.entries(cmp.definitions).map(([key, value]) => (
                         <div key={key} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 space-y-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-hover:text-orange-600 transition-colors">{key} LIMIT</label>
                            <textarea 
                              value={value} 
                              onChange={(e) => setCmp({...cmp, definitions: {...cmp.definitions, [key]: e.target.value}})} 
                              disabled={isArchived}
                              className="w-full h-24 bg-transparent text-sm font-bold text-slate-700 outline-none resize-none leading-relaxed" 
                              placeholder={`Define threshold for ${key}...`}
                            />
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-12 pt-10 border-t border-slate-100">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Management Philosophy & Oversight Approach</label>
                       <textarea 
                         value={cmp.approach} 
                         onChange={(e) => setCmp({...cmp, approach: e.target.value})} 
                         disabled={isArchived}
                         className="w-full h-48 px-10 py-8 bg-slate-50 border border-slate-100 rounded-[3rem] text-sm leading-[1.8] font-medium text-slate-600 outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all resize-none shadow-inner" 
                         placeholder="Define the core philosophy for managing project changes and maintain baseline integrity..."
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {Object.entries(cmp.process).map(([key, value]) => (
                         <div key={key} className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{key.replace(/([A-Z])/g, ' $1')} PROCESS</label>
                            <textarea 
                                value={value}
                                onChange={(e) => setCmp({ ...cmp, process: { ...cmp.process, [key]: e.target.value } })}
                                disabled={isArchived}
                                className="w-full h-32 px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all resize-none"
                            />
                         </div>
                       ))}
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
