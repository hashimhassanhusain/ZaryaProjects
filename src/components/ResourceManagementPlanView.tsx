import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  Zap,
  Users,
  ShieldCheck,
  Settings,
  Info,
  Search,
  UserPlus,
  Target,
  Layers,
  MessageSquare,
  HelpCircle,
  ClipboardList,
  BarChart3,
  GitBranch,
  Box,
  Briefcase,
  Network,
  Award,
  Stethoscope,
  Scale
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder, EntityConfig } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
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

interface ResourceManagementPlanViewProps {
  page: Page;
}

interface HRRole {
  id: string;
  role: string;
  responsibility: string;
  authority: string;
  name?: string;
}

interface HRMPData {
  projectTitle: string;
  datePrepared: string;
  roles: HRRole[];
  orgStructurePlaceholder: string;
  staffAcquisition: string;
  staffRelease: string;
  resourceCalendars: string;
  trainingRequirements: string;
  rewardsRecognition: string;
  policyCompliance: string;
  safety: string;
  version?: string;
}

export const ResourceManagementPlanView: React.FC<ResourceManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isArchivedState, setIsArchivedState] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [hrmp, setHrmp] = useState<HRMPData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    roles: [
      { id: '1', role: 'Project Manager', responsibility: 'Overall delivery', authority: 'Budget $50k', name: '' },
      { id: '2', role: 'HSE Officer', responsibility: 'Safety compliance', authority: 'Stop-work authority', name: '' }
    ],
    orgStructurePlaceholder: 'Visual Organizational Chart Placeholder',
    staffAcquisition: 'Based on competency matrix',
    staffRelease: 'Phased exit on completion',
    resourceCalendars: 'Saturday - Thursday, 08:00 AM - 05:00 PM',
    trainingRequirements: 'Site induction, specialized tools training',
    rewardsRecognition: 'Monthly safety award',
    policyCompliance: 'Adherence to labor laws',
    safety: 'Safety first culture'
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'resourceManagementPlans'),
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
      setHrmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        roles: [{ id: '1', role: 'Lead Engineer', responsibility: 'Design Approvals', authority: 'Level 2', name: '' }],
        orgStructurePlaceholder: 'Core Project Org Chart',
        staffAcquisition: 'Direct hire and agency outsourcing',
        staffRelease: 'Completion based phased demobilization',
        resourceCalendars: 'Standard Project Calendar (Site-specific)',
        trainingRequirements: 'HSE Level 1, Technical Onboarding',
        rewardsRecognition: 'Performance-based quarterly bonuses',
        policyCompliance: 'Global Ethics & Regional Labor Laws',
        safety: 'Zero-Harm Policy Enforcement'
      });
      setIsArchivedState(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setHrmp({ ...hrmp, ...record });
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
        ...hrmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (hrmp.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'resourceManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'resourceManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Resource Plan Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'resourceManagementPlans', selectedRecordId), planData);
        toast.success('Resource plan updated');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'resourceManagementPlans');
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
      await deleteDoc(doc(db, 'resourceManagementPlans', id));
      toast.success(t('hr_plan_deleted_success') || 'HR Management Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'resourceManagementPlans');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const record = planRecords.find(r => r.id === id);
      const isRecordArchived = record?.status === 'Archived';
      await updateDoc(doc(db, 'resourceManagementPlans', id), {
        status: isRecordArchived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'resourceManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('HUMAN RESOURCE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Section', 'Description']],
      body: [
        ['Project Title', hrmp.projectTitle],
        ['Staff Acquisition', hrmp.staffAcquisition],
        ['Staff Release', hrmp.staffRelease],
        ['Calendars', hrmp.resourceCalendars],
        ['Training', hrmp.trainingRequirements]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = hrmp.version || '1.0';
    docObj.save(`${selectedProject.code}-HR-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'humanResourceManagementPlans' as any,
    label: t('hr_management_plans'),
    icon: Users,
    collection: 'humanResourceManagementPlans',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <StandardProcessPage
      page={{
        ...page,
        title: viewMode === 'edit' ? t('edit_view') : page.title
      }}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: 'PROJECT_CHARTER', title: t('project_charter') },
        { id: 'WBS', title: t('wbs') },
        { id: 'STAKEHOLDER_MATRIX', title: t('stakeholder_matrix'), lastUpdated: '2024-03-24' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={hrmp.version}
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
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-[400px] flex flex-col"
            >
              <UniversalDataTable 
                config={gridConfig}
                data={planRecords.filter(r => {
                  const isArchived = r.status === 'Archived';
                  return showArchived ? isArchived : !isArchived;
                })}
                onRowClick={(record) => {
                  setSelectedRecordId(record.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
                onArchiveRecord={handleArchive}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-20"
            >
              <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden">
                {isArchivedState && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none">
                     <ShieldCheck className="w-4 h-4" /> ARCHIVED RESOURCE CALENDAR SNAPSHOT V{hrmp.version}
                  </div>
                )}

                <section className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 block">Release Baseline Date</label>
                      <input 
                        type="date"
                        value={hrmp.datePrepared}
                        onChange={(e) => setHrmp({ ...hrmp, datePrepared: e.target.value })}
                        disabled={isArchivedState}
                        className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 block">Resource Lifecycle</label>
                      <div className="px-6 py-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-base font-black text-indigo-600 flex items-center justify-between">
                         <span className="flex items-center gap-2 tracking-tight uppercase">V{hrmp.version} BASELINE</span>
                         <Users className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {[
                       { key: 'staffAcquisition', title: 'Acquisition Logic', icon: UserPlus, color: 'bg-emerald-500' },
                       { key: 'staffRelease', title: 'Release Strategy', icon: Target, color: 'bg-orange-500' },
                       { key: 'resourceCalendars', title: 'Team Calendars', icon: Calendar, color: 'bg-indigo-500' },
                       { key: 'trainingRequirements', title: 'Training Map', icon: Award, color: 'bg-blue-500' },
                       { key: 'rewardsRecognition', title: 'Reward System', icon: Zap, color: 'bg-yellow-500' },
                       { key: 'policyCompliance', title: 'Labor Compliance', icon: Scale, color: 'bg-slate-700' },
                       { key: 'safety', title: 'HSE Controls', icon: ShieldCheck, color: 'bg-red-500' }
                     ].map((field) => (
                       <div key={field.key} className="space-y-4 group">
                          <div className="flex items-center gap-3 px-2">
                             <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5 transition-transform group-hover:scale-110", field.color)}>
                                {React.createElement(field.icon as any, { className: "w-4 h-4" })}
                             </div>
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.title}</label>
                          </div>
                          <textarea 
                            value={(hrmp as any)[field.key]} 
                            onChange={(e) => setHrmp({...hrmp, [field.key]: e.target.value})} 
                            disabled={isArchivedState}
                            className="w-full h-32 px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm leading-relaxed font-bold text-slate-700 outline-none focus:bg-white focus:shadow-2xl focus:shadow-slate-200/50 focus:border-indigo-200 transition-all disabled:opacity-50 resize-none px-6"
                            placeholder={`Define ${field.title.toLowerCase()}...`}
                          />
                       </div>
                     ))}
                  </div>

                  <div className="pt-10 border-t border-slate-100">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                           <GitBranch className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Org Architecture</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Structural Placeholder & Mapping</p>
                        </div>
                     </div>
                     <textarea 
                       value={hrmp.orgStructurePlaceholder}
                       onChange={(e) => setHrmp({ ...hrmp, orgStructurePlaceholder: e.target.value })}
                       disabled={isArchivedState}
                       className="w-full h-40 px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm leading-relaxed font-medium outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all disabled:opacity-50 resize-none text-slate-500 italic"
                     />
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
