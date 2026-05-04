import React, { useState, useEffect } from 'react';
import { 
  ClipboardList,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Layers,
  BarChart3,
  GitBranch,
  CheckCircle2,
  History,
  FileText,
  Shield
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
  deleteDoc,
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
import { EntityConfig } from '../types';

interface RequirementsManagementPlanViewProps {
  page: Page;
}

interface RMPData {
  projectTitle: string;
  datePrepared: string;
  collection: string;
  analysis: string;
  categories: string;
  documentation: string;
  prioritization: string;
  metrics: string;
  traceabilityStructure: string;
  tracking: string;
  reporting: string;
  validation: string;
  configurationManagement: string;
  version?: string;
}

export const RequirementsManagementPlanView: React.FC<RequirementsManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);

  const [rmp, setRmp] = useState<RMPData>({
    projectTitle: '',
    datePrepared: getISODate(new Date()),
    collection: '',
    analysis: '',
    categories: '',
    documentation: '',
    prioritization: '',
    metrics: '',
    traceabilityStructure: '',
    tracking: '',
    reporting: '',
    validation: '',
    configurationManagement: ''
  });

  const [planRecords, setPlanRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'requirementsManagementPlans'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlanRecords(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'requirementsManagementPlans');
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setRmp({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        datePrepared: getISODate(new Date()),
        collection: 'Brainstorming, Interviews, Focus Groups, Observation',
        analysis: 'Requirements categorization and consistency checks',
        categories: 'Functional, Non-functional, Technical, Quality',
        documentation: 'Requirements Traceability Matrix (RTM)',
        prioritization: 'MoSCoW Method (Must-have, Should-have, Could-have, Won\'t-have)',
        metrics: 'Percentage of requirements fulfilled, Change frequency',
        traceabilityStructure: 'Linked to WBS and Test Cases',
        tracking: 'Monthly RTM updates',
        reporting: 'Status included in monthly progress reports',
        validation: 'Stakeholder sign-off and UAT',
        configurationManagement: 'SharePoint version control'
      });
      setIsArchived(false);
    } else if (selectedRecordId) {
       const record = planRecords.find(r => r.id === selectedRecordId);
       if (record) {
         setRmp({ ...rmp, ...record });
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
        ...rmp,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        status: isNew ? 'Active' : (rmp.status || 'Active')
      };

      if (isNew || !selectedRecordId) {
        if (isNew) {
          const activeDocs = planRecords.filter(r => r.status !== 'Archived');
          for (const docToArchive of activeDocs) {
            await updateDoc(doc(db, 'requirementsManagementPlans', docToArchive.id), { status: 'Archived' });
          }
        }
        const docRef = await addDoc(collection(db, 'requirementsManagementPlans'), {
          ...planData,
          createdAt: timestamp
        });
        setSelectedRecordId(docRef.id);
        toast.success(isNew ? 'New Version Created' : 'Plan Saved');
      } else {
        await updateDoc(doc(db, 'requirementsManagementPlans', selectedRecordId), planData);
        toast.success('Requirements Plan updated successfully');
      }
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'requirementsManagementPlans');
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
      await deleteDoc(doc(db, 'requirementsManagementPlans', id));
      toast.success('Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'requirementsManagementPlans');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.setFont('helvetica', 'bold');
    docObj.text('REQUIREMENTS MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });

    autoTable(docObj, {
      startY: 50,
      head: [['Section', 'Description']],
      body: [
        ['Collection', rmp.collection],
        ['Analysis', rmp.analysis],
        ['Validation', rmp.validation],
        ['CM', rmp.configurationManagement]
      ],
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const vStr = rmp.version || '1.0';
    docObj.save(`${selectedProject.code}-REQ-PLAN-V${vStr}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'requirementsManagementPlans' as any,
    label: t('requirements_management_plans'),
    icon: ClipboardList,
    collection: 'requirementsManagementPlans',
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
        { id: 'STAKEHOLDER_REGISTER', title: t('stakeholder_register'), lastUpdated: '2024-03-20' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      versions={planRecords}
      currentVersion={rmp.version}
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
            <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-10">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8 text-slate-900 relative overflow-hidden">
                {isArchived && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 flex items-center gap-2 z-10">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Archived Snapshot - V{rmp.version} - Read Only</span>
                  </div>
                )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Project Attribution</label>
                      <input 
                        type="text" 
                        value={rmp.projectTitle} 
                        onChange={(e) => setRmp({ ...rmp, projectTitle: e.target.value })} 
                        disabled={isArchived}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Validation Date</label>
                      <input 
                        type="date" 
                        value={rmp.datePrepared} 
                        onChange={(e) => setRmp({ ...rmp, datePrepared: e.target.value })} 
                        disabled={isArchived}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50"
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { key: 'collection', icon: ClipboardList, label: 'Collection Methodology' },
                      { key: 'analysis', icon: BarChart3, label: 'Analysis Strategy' },
                      { key: 'categories', icon: Layers, label: 'Requirement Categories' },
                      { key: 'documentation', icon: ClipboardList, label: 'Documentation Standards' },
                      { key: 'prioritization', icon: GitBranch, label: 'Prioritization Framework' },
                      { key: 'metrics', icon: BarChart3, label: 'Product Metrics' },
                      { key: 'traceabilityStructure', icon: Layers, label: 'Traceability Matrix Structure' },
                      { key: 'tracking', icon: History, label: 'Tracking & Monitoring' },
                      { key: 'reporting', icon: FileText, label: 'Reporting & Cadence' },
                      { key: 'validation', icon: CheckCircle2, label: 'Validation Procedures' },
                      { key: 'configurationManagement', icon: Shield, label: 'Configuration Control' }
                    ].map((field) => (
                      <div key={field.key} className="space-y-3 p-6 bg-slate-50/30 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                         <div className="flex items-center gap-3 mb-2">
                           <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                              {React.createElement(field.icon as any, { className: "w-4 h-4" })}
                           </div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                         </div>
                         <textarea 
                           value={(rmp as any)[field.key]} 
                           onChange={(e) => setRmp({...rmp, [field.key]: e.target.value})} 
                           disabled={isArchived}
                           className="w-full h-32 px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl text-sm leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50 resize-none" 
                           placeholder={`Define ${field.label.toLowerCase()}...`}
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
