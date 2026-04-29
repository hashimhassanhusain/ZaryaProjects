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
  serverTimestamp
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

interface HumanResourceManagementPlanViewProps {
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

export const HumanResourceManagementPlanView: React.FC<HumanResourceManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [hrmp, setHrmp] = useState<HRMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
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
      collection(db, 'humanResourceManagementPlans'),
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
      setHrmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: new Date().toISOString().split('T')[0],
        roles: [{ id: '1', role: 'Lead Engineer', responsibility: 'Design', authority: 'Approvals', name: '' }],
        orgStructurePlaceholder: 'Placeholder',
        staffAcquisition: '',
        staffRelease: '',
        resourceCalendars: '08:00 - 17:00',
        trainingRequirements: '',
        rewardsRecognition: '',
        policyCompliance: '',
        safety: ''
      });
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setHrmp({ ...hrmp, ...record });
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
        ...hrmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (planRecords.length + 1).toFixed(1) : hrmp.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'humanResourceManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        toast.success(t('hr_plan_created_success') || 'HR Management Plan created successfully');
      } else {
        await updateDoc(doc(db, 'humanResourceManagementPlans', selectedRecordId), planData);
        toast.success(t('hr_plan_updated_success') || 'HR Management Plan updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'humanResourceManagementPlans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'humanResourceManagementPlans', id));
      toast.success(t('hr_plan_deleted_success') || 'HR Management Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'humanResourceManagementPlans');
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
        { id: 'activity-resource', title: 'Activity Resource Requirements' },
        { id: 'project-calendar', title: 'Project Calendar' },
        { id: 'risk-register', title: 'Risk Register' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
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
                data={planRecords}
                onRowClick={(record) => {
                  setSelectedRecordId(record.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-10"
            >
              <div className="flex justify-end pr-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
                 >
                   <ArrowLeft className="w-3 h-3" />
                   {t('back_to_list')}
                 </button>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 text-slate-900">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Project Title</label>
                      <input 
                        type="text"
                        value={hrmp.projectTitle}
                        onChange={(e) => setHrmp({ ...hrmp, projectTitle: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Prepared</label>
                      <input 
                        type="date"
                        value={hrmp.datePrepared}
                        onChange={(e) => setHrmp({ ...hrmp, datePrepared: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['staffAcquisition', 'staffRelease', 'resourceCalendars', 'trainingRequirements', 'rewardsRecognition', 'policyCompliance', 'safety'].map((key) => (
                      <div key={key} className="space-y-1.5">
                         <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                         <textarea 
                           value={(hrmp as any)[key]} 
                           onChange={(e) => setHrmp({...hrmp, [key]: e.target.value})} 
                           className="w-full h-24 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none" 
                         />
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
