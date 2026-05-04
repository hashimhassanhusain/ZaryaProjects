import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Settings,
  Clock, 
  FileText,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  DollarSign,
  Target,
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  Gavel,
  Box,
  LayoutDashboard,
  ListChecks,
  Database
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder, ProjectIssue, EntityConfig } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  getDoc,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn, getISODate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface ProjectCharterViewProps {
  page: Page;
  embedded?: boolean;
}

interface Milestone {
  id: string;
  description: string;
  dueDate: string;
}

interface CharterStakeholder {
  id: string;
  name: string;
  role: string;
}

interface CharterData {
  projectTitle: string;
  projectSponsor: string;
  sponsorAuthority: string;
  datePrepared: string;
  projectManager: string;
  pmResponsibility: string;
  pmAuthorityLevel: string;
  projectCustomer: string;
  purpose: string;
  description: string; // High-level description
  boundaries: string;
  deliverables: string; // Key Deliverables
  requirements: string; // High-level requirements
  highLevelRisks: string; // Overall project risk
  assumptions: string; // High-level assumptions and constraints
  objectives: {
    scope: { objective: string; successCriteria: string; approver: string };
    time: { objective: string; successCriteria: string; approver: string };
    cost: { objective: string; successCriteria: string; approver: string };
    other: { objective: string; successCriteria: string; approver: string };
  };
  milestones: Milestone[];
  estimatedBudget: number;
  budgetDescription: string;
  currency: 'USD' | 'IQD';
  exchangeRate: number;
  stakeholders: CharterStakeholder[];
  approvalRequirements: string;
  exitCriteria: string;
  approvals: {
    pmName: string;
    pmDate: string;
    sponsorName: string;
    sponsorDate: string;
  };
}

export const ProjectCharterView: React.FC<ProjectCharterViewProps> = ({ page, embedded = false }) => {
  const { t, language, isRtl } = useLanguage();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { exchangeRate: currentExchangeRate } = useCurrency();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [charter, setCharter] = useState<CharterData>({
    projectTitle: '',
    projectSponsor: '',
    sponsorAuthority: '',
    datePrepared: new Date().toISOString().split('T')[0],
    projectManager: '',
    pmResponsibility: '',
    pmAuthorityLevel: '',
    projectCustomer: '',
    purpose: '',
    description: '',
    boundaries: '',
    deliverables: '',
    requirements: '',
    highLevelRisks: '',
    assumptions: '',
    objectives: {
      scope: { objective: '', successCriteria: '', approver: '' },
      time: { objective: '', successCriteria: '', approver: '' },
      cost: { objective: '', successCriteria: '', approver: '' },
      other: { objective: '', successCriteria: '', approver: '' },
    },
    milestones: [{ id: '1', description: '', dueDate: '' }],
    estimatedBudget: 0,
    budgetDescription: '',
    currency: 'USD',
    exchangeRate: currentExchangeRate,
    stakeholders: [{ id: '1', name: '', role: '' }],
    approvalRequirements: '',
    exitCriteria: '',
    approvals: {
      pmName: '',
      pmDate: '',
      sponsorName: '',
      sponsorDate: '',
    }
  });

  const handleAutoFill = async () => {
    if (!selectedProject) return;
    const loadingToast = toast.loading('Fetching Master Data...');
    try {
      const docRef = doc(db, 'projectFoundations', selectedProject.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const found = docSnap.data();
        const biz = found.businessDocuments || {};
        const agreements = found.agreements || [];
        const eefs = found.eefs || {};

        setCharter(prev => ({
          ...prev,
          projectTitle: selectedProject.name,
          purpose: biz.feasibilityStudy || prev.purpose,
          description: agreements.length > 0 ? agreements[0].initialScope : prev.description,
          budgetDescription: biz.roi ? `Expected ROI: ${biz.roi}%` : prev.budgetDescription,
          milestones: agreements.length > 0 && agreements[0].milestones 
            ? agreements[0].milestones.split('\n').map((m: string, i: number) => ({ id: `${Date.now()}-${i}`, description: m, dueDate: '' }))
            : prev.milestones,
          assumptions: `Internal EEFs: ${Object.keys(eefs.internal || {}).filter(k => eefs.internal[k] === true).join(', ')}\nExternal EEFs: ${Object.keys(eefs.external || {}).filter(k => eefs.external[k] === true).join(', ')}`
        }));
        toast.success('Successfully auto-filled from Foundation Center!', { id: loadingToast });
      } else {
        toast.error('No Foundation Data found for this project.', { id: loadingToast });
      }
    } catch (err) {
      console.error('Error auto-filling charter:', err);
      toast.error('Failed to fetch master data', { id: loadingToast });
    }
  };

  const [charters, setCharters] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'projectCharters'), 
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCharters(data);
      if (data.length === 0) {
        setViewMode('edit');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedRecordId && viewMode === 'edit') {
      const record = charters.find(c => c.id === selectedRecordId);
      if (record) {
        setCharter({
          ...charter,
          ...record
        });
        
        // Fetch versions
        const vQuery = query(
          collection(db, 'project_charter_versions'),
          where('reportEntryId', '==', selectedRecordId),
          orderBy('version', 'desc')
        );
        const unsubVersions = onSnapshot(vQuery, (snap) => {
          setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubVersions();
      }
    } else if (!selectedRecordId && viewMode === 'edit') {
      setCharter({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        projectSponsor: '',
        sponsorAuthority: '',
        datePrepared: new Date().toISOString().split('T')[0],
        projectManager: '',
        pmResponsibility: '',
        pmAuthorityLevel: '',
        projectCustomer: '',
        purpose: '',
        description: '',
        boundaries: '',
        deliverables: '',
        requirements: '',
        highLevelRisks: '',
        objectives: {
          scope: { objective: '', successCriteria: '', approver: '' },
          time: { objective: '', successCriteria: '', approver: '' },
          cost: { objective: '', successCriteria: '', approver: '' },
          other: { objective: '', successCriteria: '', approver: '' },
        },
        milestones: [{ id: '1', description: '', dueDate: '' }],
        estimatedBudget: 0,
        budgetDescription: '',
        currency: 'USD',
        exchangeRate: currentExchangeRate,
        stakeholders: [{ id: '1', name: '', role: '' }],
        approvalRequirements: '',
        exitCriteria: '',
        approvals: {
          pmName: '',
          pmDate: '',
          sponsorName: '',
          sponsorDate: '',
        },
        version: '1.0'
      } as any);
      setVersions([]);
    }
  }, [selectedRecordId, viewMode, charters]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const nextVersion = isNew ? (parseFloat((charter as any).version || '1.0') + 0.1).toFixed(1) : ((charter as any).version || '1.0');
      
      const charterData = {
        ...charter,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        createdAt: (charter as any).createdAt || timestamp
      };

      let docRef;
      if (!selectedRecordId || isNew) {
        docRef = await addDoc(collection(db, 'projectCharters'), {
          ...charterData,
          createdAt: timestamp
        });
      } else {
        docRef = doc(db, 'projectCharters', selectedRecordId);
        await updateDoc(docRef, charterData);
      }

      // Save versioning snapshot
      await addDoc(collection(db, 'project_charter_versions'), {
        reportEntryId: selectedRecordId || docRef.id,
        version: nextVersion,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: charterData,
        changeSummary: isNew ? 'Baseline Revised' : 'Charter Updated'
      });

      toast.success(isNew ? t('charter_created_success') : t('charter_updated_success'));
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projectCharters');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'projectCharters', id));
      toast.success(t('charter_deleted_success'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'projectCharters');
    }
  };

  const pullStakeholdersFromPolicies = async () => {
    if (!selectedProject) return;
    try {
      const projectDoc = await getDoc(doc(db, 'projects', selectedProject.id));
      if (projectDoc.exists()) {
        const data = projectDoc.data() as Project;
        if (data.policyData && data.policyData.roles) {
          const policyRoles = data.policyData.roles as any[];
          const newStakeholders = policyRoles.map((r, i) => ({
            id: (charter.stakeholders.length + i + 1).toString(),
            name: r.name,
            role: r.role
          }));
          setCharter({
            ...charter,
            stakeholders: [...charter.stakeholders, ...newStakeholders]
          });
        }
      }
    } catch (err) {
      console.error('Error pulling stakeholders:', err);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = docObj.internal.pageSize.width;

    const renderHeader = (pageNum: number) => {
      docObj.setFontSize(16);
      docObj.setFont('helvetica', 'bold');
      docObj.text('PROJECT CHARTER', pageWidth / 2, 35, { align: 'center' });
      docObj.setFontSize(8);
      docObj.text(`Page ${pageNum} of 4`, pageWidth - margin, 10, { align: 'right' });
    };

    renderHeader(1);
    autoTable(docObj, {
      startY: 45,
      body: [
        ['Project Title:', charter.projectTitle],
        ['Project Sponsor:', charter.projectSponsor, 'Date Prepared:', charter.datePrepared],
        ['Project Manager:', charter.projectManager, 'Project Customer:', charter.projectCustomer]
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 2: { fontStyle: 'bold', cellWidth: 35 } }
    });

    const pdfSections = [
      { title: 'Project Purpose or Justification:', content: charter.purpose },
      { title: 'High-Level Project Description:', content: charter.description },
      { title: 'Project Boundaries:', content: charter.boundaries },
      { title: 'Key Deliverables:', content: charter.deliverables },
      { title: 'High-Level Requirements:', content: charter.requirements },
      { title: 'Overall Project Risks:', content: charter.highLevelRisks },
      { title: 'Assumptions & Constraints:', content: charter.assumptions },
      { title: 'Project Approval Requirements:', content: charter.approvalRequirements },
      { title: 'Project Exit Criteria:', content: charter.exitCriteria }
    ];

    let y = (docObj as any).lastAutoTable.finalY + 10;
    pdfSections.forEach(s => {
      docObj.setFontSize(10);
      docObj.setFont('helvetica', 'bold');
      docObj.text(s.title, margin, y);
      y += 5;
      docObj.setFont('helvetica', 'normal');
      const lines = docObj.splitTextToSize(s.content || '', pageWidth - 2 * margin);
      docObj.rect(margin, y, pageWidth - 2 * margin, Math.max(20, lines.length * 5 + 5));
      docObj.text(lines, margin + 2, y + 5);
      y += Math.max(20, lines.length * 5 + 5) + 10;
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = charter.version || '1.0';
    const fileName = `${selectedProject.code}-PMIS-MGT-FRM-CHA-${dateStr}-V${vStr}.pdf`;
    docObj.save(fileName);
    toast.success(t('pdf_generated_success'));
  };

  const addStakeholder = () => {
    setCharter({
      ...charter,
      stakeholders: [...charter.stakeholders, { id: Date.now().toString(), name: '', role: '' }]
    });
  };

  const removeStakeholder = (id: string) => {
    setCharter({
      ...charter,
      stakeholders: charter.stakeholders.filter(s => s.id !== id)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const gridConfig: EntityConfig = {
    id: 'projectCharters',
    label: t('project_charter'),
    icon: FileText,
    collection: 'projectCharters',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'projectSponsor', label: t('project_sponsor'), type: 'string' },
      { key: 'projectManager', label: t('project_manager'), type: 'string' },
      { key: 'datePrepared', label: t('date_prepared'), type: 'date' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  return (
    <StandardProcessPage
      page={{
        ...page,
        title: viewMode === 'edit' ? t('edit_view') : page.title
      }}
      embedded={embedded}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: 'business-case', title: 'Business Case', status: 'Approved' },
        { id: 'agreements', title: 'Agreements', status: 'Finalized' },
        { id: '1.1.2', title: 'Management Policies' },
        { id: '1.2.1', title: 'Stakeholder Register' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <div className="space-y-6">
        {viewMode === 'edit' && (
          <div className="flex justify-start">
             <button 
               onClick={handleAutoFill}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
             >
                <Database className="w-4 h-4" />
                Auto-fill from Foundation Center
             </button>
          </div>
        )}
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
                data={charters}
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
              className="space-y-6"
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

              <section className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                    <div className={cn("space-y-0.5", isRtl && "text-right")}>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">{t('project_canvas_hub')}</h2>
                      <p className={cn("text-[9px] text-slate-400 font-medium tracking-wide border-l-2 border-blue-500/50 pl-2", isRtl && "border-l-0 border-r-2 pr-2")}>{t('interactive_workspace')}</p>
                    </div>
                 </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Identification Card */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                         <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10">
                            <Briefcase className="w-4.5 h-4.5" />
                         </div>
                         <div className="space-y-1">
                            <label className={cn("text-[8px] font-bold text-slate-400 uppercase tracking-widest px-0.5 block", isRtl && "text-right")}>{t('project_title')}</label>
                            <input 
                              type="text"
                              value={charter.projectTitle}
                              onChange={(e) => setCharter({ ...charter, projectTitle: e.target.value })}
                              className={cn("w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                            />
                         </div>
                         <div className="space-y-1">
                            <label className={cn("text-[8px] font-bold text-slate-400 uppercase tracking-widest px-0.5 block", isRtl && "text-right")}>{t('project_manager')}</label>
                            <input 
                              type="text"
                              value={charter.projectManager}
                              onChange={(e) => setCharter({ ...charter, projectManager: e.target.value })}
                              className={cn("w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                            />
                         </div>
                         <div className="space-y-1">
                            <label className={cn("text-[8px] font-bold text-slate-400 uppercase tracking-widest px-0.5 block", isRtl && "text-right")}>{t('pm_authority_level')}</label>
                            <input 
                              type="text"
                              value={charter.pmAuthorityLevel}
                              onChange={(e) => setCharter({ ...charter, pmAuthorityLevel: e.target.value })}
                              className={cn("w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                            />
                         </div>
                         <div className="space-y-1">
                            <label className={cn("text-[8px] font-bold text-slate-400 uppercase tracking-widest px-0.5 block", isRtl && "text-right")}>{t('project_sponsor')}</label>
                            <input 
                              type="text"
                              value={charter.projectSponsor}
                              onChange={(e) => setCharter({ ...charter, projectSponsor: e.target.value })}
                              className={cn("w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                            />
                         </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('project_purpose')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.purpose}
                             onChange={(e) => setCharter({ ...charter, purpose: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('measurable_project_objectives')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.objectives.scope.objective}
                             placeholder="Summary objectives and success criteria..."
                             onChange={(e) => setCharter({ 
                               ...charter, 
                               objectives: { 
                                 ...charter.objectives, 
                                 scope: { ...charter.objectives.scope, objective: e.target.value } 
                               } 
                             })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('high_level_project_description')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.description}
                             onChange={(e) => setCharter({ ...charter, description: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('project_boundaries')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.boundaries}
                             onChange={(e) => setCharter({ ...charter, boundaries: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('high_level_deliverables')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.deliverables}
                             onChange={(e) => setCharter({ ...charter, deliverables: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('high_level_requirements')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.requirements}
                             onChange={(e) => setCharter({ ...charter, requirements: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('overall_project_risk')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.highLevelRisks}
                             onChange={(e) => setCharter({ ...charter, highLevelRisks: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('summary_milestone_schedule')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={JSON.stringify(charter.milestones)}
                             placeholder="List major dates..."
                             onChange={(e) => {
                               try {
                                 const val = JSON.parse(e.target.value);
                                 if (Array.isArray(val)) setCharter({ ...charter, milestones: val });
                               } catch (err) {
                                 // Allow manual entry bypass for now by just setting description
                               }
                             }}
                          />
                       </div>
                       
                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('project_approval_requirements')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.approvalRequirements}
                             placeholder="Who decides success? Who signs off?"
                             onChange={(e) => setCharter({ ...charter, approvalRequirements: e.target.value })}
                          />
                       </div>

                       <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                          <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-wider", isRtl && "text-right")}>{t('project_exit_criteria')}</h3>
                          <textarea 
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                             rows={2}
                             value={charter.exitCriteria}
                             placeholder="Conditions for closing or cancellation..."
                             onChange={(e) => setCharter({ ...charter, exitCriteria: e.target.value })}
                          />
                       </div>

                       <div className="col-span-full bg-white rounded-2xl p-6 border border-slate-200">
                          <div className={cn("flex items-center justify-between mb-4", isRtl && "flex-row-reverse")}>
                             <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{t('stakeholders')}</h3>
                             <button onClick={addStakeholder} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-widest text-[8px] hover:bg-slate-800 transition-colors"><Plus className="w-3 h-3" />{t('add')}</button>
                          </div>
                          <div className="overflow-x-auto">
                             <table className="w-full text-left">
                                <thead>
                                   <tr className="bg-slate-50/50">
                                      <th className="px-3 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">{t('role')}</th>
                                      <th className="px-3 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">{t('name')}</th>
                                      <th className="px-3 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">{t('actions')}</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                   {charter.stakeholders.map((s, idx) => (
                                      <tr key={`${s.id}-${idx}`} className="group">
                                         <td className="px-3 py-2">
                                            <input className="w-full bg-transparent border-b border-transparent group-hover:border-slate-200 p-1 text-xs outline-none focus:border-blue-500 transition-colors" value={s.role} onChange={(e) => {
                                               const newS = [...charter.stakeholders];
                                               newS[idx].role = e.target.value;
                                               setCharter({...charter, stakeholders: newS});
                                            }} />
                                         </td>
                                         <td className="px-3 py-2">
                                            <input className="w-full bg-transparent border-b border-transparent group-hover:border-slate-200 p-1 text-xs outline-none focus:border-blue-500 transition-colors" value={s.name} onChange={(e) => {
                                               const newS = [...charter.stakeholders];
                                               newS[idx].name = e.target.value;
                                               setCharter({...charter, stakeholders: newS});
                                            }} />
                                         </td>
                                         <td className="px-3 py-2">
                                            <button onClick={() => removeStakeholder(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{t('preapproved_financial_resources')}</h3>
                    <div className="space-y-2">
                       <input 
                         type="number"
                         value={charter.estimatedBudget}
                         onChange={(e) => setCharter({ ...charter, estimatedBudget: Number(e.target.value) })}
                         className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-xs font-semibold"
                         placeholder={t('estimated_budget')}
                       />
                       <textarea 
                         value={charter.budgetDescription}
                         onChange={(e) => setCharter({ ...charter, budgetDescription: e.target.value })}
                         className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-xs"
                         rows={2}
                         placeholder={t('budget_description')}
                       />
                    </div>
                 </div>

                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{t('approvals')}</h3>
                    <div className="grid grid-cols-2 gap-2">
                       <input placeholder="PM Name" value={charter.approvals.pmName} onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, pmName: e.target.value}})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px]" />
                       <input type="date" value={charter.approvals.pmDate} onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, pmDate: e.target.value}})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px]" />
                       <input placeholder="Sponsor Name" value={charter.approvals.sponsorName} onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, sponsorName: e.target.value}})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px]" />
                       <input type="date" value={charter.approvals.sponsorDate} onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, sponsorDate: e.target.value}})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px]" />
                    </div>
                 </div>
              </section>
               {/* History Stack */}
               {versions.length > 0 && (
                 <div className="pt-10 border-t border-slate-100">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-400" />
                          <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{t('charter_history')}</h3>
                       </div>
                       <div className="p-2 max-h-[400px] overflow-y-auto no-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                             {versions.map(v => (
                               <div 
                                 key={v.id} 
                                 onClick={() => setCharter(v.data as CharterData)}
                                 className="p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 border border-transparent hover:border-slate-100"
                               >
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all font-black text-[10px]">
                                     v{parseFloat(v.version).toFixed(1)}
                                  </div>
                                  <div className="min-w-0">
                                     <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{v.changeSummary}</div>
                                     <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.userName} • {new Date(v.timestamp).toLocaleDateString()}</div>
                                  </div>
                               </div>
                             ))}
                          </div>
                      </div>
                    </div>
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
