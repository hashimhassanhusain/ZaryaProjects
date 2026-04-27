import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
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
  LayoutDashboard
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder, ProjectIssue } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  getDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { StandardProcessPage } from './StandardProcessPage';

interface ProjectCharterViewProps {
  page: Page;
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
  // Section 1
  projectTitle: string;
  projectSponsor: string;
  datePrepared: string;
  projectManager: string;
  projectCustomer: string;
  purpose: string;
  description: string;
  requirements: string;
  highLevelRisks: string;
  
  // Section 2
  objectives: {
    scope: { objective: string; successCriteria: string; approver: string };
    time: { objective: string; successCriteria: string; approver: string };
    cost: { objective: string; successCriteria: string; approver: string };
    other: { objective: string; successCriteria: string; approver: string };
  };
  milestones: Milestone[];
  
  // Section 3
  estimatedBudget: number;
  currency: 'USD' | 'IQD';
  exchangeRate: number;
  stakeholders: CharterStakeholder[];
  pmAuthority: string;
  staffingDecisions: string;
  budgetManagement: string;
  
  // Section 4
  technicalDecisions: string;
  conflictResolution: string;
  
  // Approvals
  approvals: {
    pmName: string;
    pmDate: string;
    sponsorName: string;
    sponsorDate: string;
  };
}

export const ProjectCharterView: React.FC<ProjectCharterViewProps> = ({ page }) => {
  const { t, language, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const { exchangeRate: currentExchangeRate } = useCurrency();
  const [charter, setCharter] = useState<CharterData>({
    projectTitle: '',
    projectSponsor: '',
    datePrepared: new Date().toISOString().split('T')[0],
    projectManager: '',
    projectCustomer: '',
    purpose: '',
    description: '',
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
    currency: 'USD',
    exchangeRate: currentExchangeRate,
    stakeholders: [{ id: '1', name: '', role: '' }],
    pmAuthority: '',
    staffingDecisions: '',
    budgetManagement: '',
    technicalDecisions: '',
    conflictResolution: '',
    approvals: {
      pmName: '',
      pmDate: '',
      sponsorName: '',
      sponsorDate: '',
    }
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.charterData) {
          const charterData = data.charterData as any;
          setCharter(prev => ({
            ...prev,
            ...charterData,
            objectives: {
              scope: { ...prev.objectives.scope, ...(charterData.objectives?.scope || {}) },
              time: { ...prev.objectives.time, ...(charterData.objectives?.time || {}) },
              cost: { ...prev.objectives.cost, ...(charterData.objectives?.cost || {}) },
              other: { ...prev.objectives.other, ...(charterData.objectives?.other || {}) },
            },
            approvals: {
              ...prev.approvals,
              ...(charterData.approvals || {})
            },
            milestones: charterData.milestones || prev.milestones || [],
            stakeholders: charterData.stakeholders || prev.stakeholders || []
          }));
        } else {
          setCharter(prev => ({
            ...prev,
            projectTitle: `${selectedProject.name} (${selectedProject.code})`
          }));
        }
        if (data.charterHistory) {
          setVersions(data.charterHistory);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id, selectedProject?.name, selectedProject?.code]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const updateData: any = {
        charterData: charter,
        updatedAt: timestamp,
        updatedBy: user
      };
      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 1.0) + 0.1;
        const newVersion: PageVersion = {
          version: Number(nextVersion.toFixed(1)),
          date: timestamp,
          author: user,
          data: charter as any
        };
        updateData.charterHistory = [newVersion, ...versions];
      }
      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);
      toast.success(t('charter_updated_success'));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    } finally {
      setIsSaving(false);
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
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    const renderHeader = (pageNum: number) => {
      doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT CHARTER', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 4`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1: Project Identity
    renderHeader(1);
    autoTable(doc, {
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
      { title: 'Project Description:', content: charter.description },
      { title: 'High-Level Requirements:', content: charter.requirements },
      { title: 'High-Level Risks:', content: charter.highLevelRisks }
    ];

    let y = ((doc as any).lastAutoTable?.finalY ?? 150) + 10;
    pdfSections.forEach(s => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(s.title, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(s.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(20, lines.length * 5 + 5));
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(20, lines.length * 5 + 5) + 10;
    });

    // Page 2: Objectives & Milestones
    doc.addPage();
    renderHeader(2);
    y = 45;
    autoTable(doc, {
      startY: y,
      head: [['Project Objectives', 'Success Criteria', 'Person Approving']],
      body: [
        ['Scope:', charter.objectives?.scope?.objective || '', charter.objectives?.scope?.successCriteria || '', charter.objectives?.scope?.approver || ''],
        ['Time:', charter.objectives?.time?.objective || '', charter.objectives?.time?.successCriteria || '', charter.objectives?.time?.approver || ''],
        ['Cost:', charter.objectives?.cost?.objective || '', charter.objectives?.cost?.successCriteria || '', charter.objectives?.cost?.approver || ''],
        ['Other:', charter.objectives?.other?.objective || '', charter.objectives?.other?.successCriteria || '', charter.objectives?.other?.approver || '']
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = ((doc as any).lastAutoTable?.finalY ?? 150) + 10;
    autoTable(doc, {
      startY: y,
      head: [['Summary Milestones', 'Due Date']],
      body: (charter.milestones || []).map(m => [m.description || '', m.dueDate || '']),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    // Page 3: Financials & Stakeholders
    doc.addPage();
    renderHeader(3);
    y = 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Estimated Budget:', margin, y);
    y += 5;
    doc.rect(margin, y, pageWidth - 2 * margin, 15);
    doc.setFont('helvetica', 'normal');
    const budgetText = charter.estimatedBudget ? `${charter.currency} ${charter.estimatedBudget.toLocaleString('en-US')}` : 'Not Specified';
    doc.text(budgetText, margin + 5, y + 10);
    y += 25;

    autoTable(doc, {
      startY: y,
      head: [['Stakeholder(s)', 'Role']],
      body: (charter.stakeholders || []).map(s => [s.name || '', s.role || '']),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = ((doc as any).lastAutoTable?.finalY ?? 150) + 10;
    const p3Sections = [
      { title: 'Project Manager Authority Level:', content: charter.pmAuthority },
      { title: 'Staffing Decisions:', content: charter.staffingDecisions },
      { title: 'Budget Management and Variance:', content: charter.budgetManagement }
    ];

    p3Sections.forEach(s => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(s.title, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(s.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(15, lines.length * 5 + 5));
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(15, lines.length * 5 + 5) + 10;
    });

    // Page 4: Governance & Approvals
    doc.addPage();
    renderHeader(4);
    y = 45;
    const p4Sections = [
      { title: 'Technical Decisions:', content: charter.technicalDecisions },
      { title: 'Conflict Resolution:', content: charter.conflictResolution }
    ];

    p4Sections.forEach(s => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(s.title, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(s.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(25, lines.length * 5 + 5));
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(25, lines.length * 5 + 5) + 15;
    });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Approvals:', margin, y);
    y += 15;

    doc.setFontSize(9);
    doc.text('________________________________', margin, y);
    doc.text('________________________________', pageWidth - margin - 60, y);
    y += 5;
    doc.text('Project Manager Signature', margin, y);
    doc.text('Sponsor or Originator Signature', pageWidth - margin - 60, y);
    
    y += 15;
    doc.text(charter.approvals?.pmName || '________________________________', margin, y);
    doc.text(charter.approvals?.sponsorName || '________________________________', pageWidth - margin - 60, y);
    y += 5;
    doc.text('Project Manager Name', margin, y);
    doc.text('Sponsor or Originator Name', pageWidth - margin - 60, y);

    y += 15;
    doc.text(charter.approvals?.pmDate || '________________________________', margin, y);
    doc.text(charter.approvals?.sponsorDate || '________________________________', pageWidth - margin - 60, y);
    y += 5;
    doc.text('Date', margin, y);
    doc.text('Date', pageWidth - margin - 60, y);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-ZRY-MGT-FRM-CHA-${dateStr}-V${vStr}.pdf`;
    
    // Save locally
    doc.save(fileName);

    // Also upload to Drive
    handleDriveUpload(doc, fileName);
  };

  const handleDriveUpload = async (doc: jsPDF, fileName: string) => {
    if (!selectedProject) return;
    setIsExporting(true);
    
    try {
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      formData.append('path', '01_PROJECT_MANAGEMENT_FORMS/1.0_Initiating/1.1_Governance_Domain');
      
      const res = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload to Google Drive');
      }

      toast.success(t('pdf_saved_to_drive'));
    } catch (error: any) {
      console.error('Drive upload error:', error);
      toast.error(`${t('drive_upload_failed')}: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
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

  return (
    <StandardProcessPage
      page={page}
      onSave={() => handleSave(true)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: 'business-case', title: 'Business Case', status: 'Approved' },
        { id: 'agreements', title: 'Agreements', status: 'Finalized' },
        { id: '1.1.2', title: 'Management Policies' },
        { id: '1.2.1', title: 'Stakeholder Register' }
      ]}
    >
      <div className="space-y-16">
        {/* Project Canvas Hub */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className={cn("space-y-1", isRtl && "text-right")}>
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{t('project_canvas_hub')}</h2>
              <p className={cn("text-xs text-slate-500 font-medium tracking-wide border-l-2 border-blue-500 pl-3", isRtl && "border-l-0 border-r-2 pr-3")}>{t('interactive_workspace')}</p>
            </div>
            <div className={cn("flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100", isRtl && "flex-row-reverse")}>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{t('smart_integration_active')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Identity & Purpose */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Briefcase className="w-6 h-6" />
                 </div>
                    <div className="space-y-2">
                       <label className={cn("text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 block", isRtl && "text-right")}>{t('project_title')}</label>
                       <input 
                         type="text"
                         value={charter.projectTitle}
                         onChange={(e) => setCharter({ ...charter, projectTitle: e.target.value })}
                         className={cn("w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none", isRtl && "text-right")}
                         placeholder={t('project_title')}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className={cn("text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 block", isRtl && "text-right")}>{t('project_sponsor')}</label>
                       <input 
                         type="text"
                         value={charter.projectSponsor}
                         onChange={(e) => setCharter({ ...charter, projectSponsor: e.target.value })}
                         className={cn("w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none", isRtl && "text-right")}
                         placeholder={t('project_sponsor')}
                       />
                    </div>
                 </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-slate-900/20">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 backdrop-blur-md">
                    <Target className="w-6 h-6" />
                 </div>
                 <div className="space-y-4">
                    <h3 className={cn("text-xl font-semibold tracking-tight leading-none", isRtl && "text-right")}>{t('core_objectives')}</h3>
                    <div className="space-y-3">
                       <textarea 
                         placeholder={t('objectives_desc')} 
                         className={cn("w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all", isRtl && "text-right")}
                         rows={4}
                         value={charter.purpose}
                         onChange={(e) => setCharter({ ...charter, purpose: e.target.value })}
                       />
                    </div>
                 </div>
              </div>
            </div>

            {/* Column 2: Scope & Quality */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 space-y-6 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all">
                  <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                     <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                        <Box className="w-5 h-5" />
                     </div>
                     <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('project_boundaries')}</span>
                  </div>
                  <div className="space-y-4">
                     <h3 className={cn("text-lg font-semibold text-slate-900", isRtl && "text-right")}>{t('project_boundaries')}</h3>
                     <textarea 
                        className={cn("w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none", isRtl && "text-right")}
                        placeholder={t('boundaries_desc')}
                        rows={6}
                        value={charter.description}
                        onChange={(e) => setCharter({ ...charter, description: e.target.value })}
                     />
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 space-y-6 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all">
                  <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                     <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                     </div>
                     <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('quality_assurance')}</span>
                  </div>
                  <div className="space-y-4">
                     <h3 className={cn("text-lg font-semibold text-slate-900", isRtl && "text-right")}>{t('success_criteria')}</h3>
                     <textarea 
                        className={cn("w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none", isRtl && "text-right")}
                        placeholder={t('success_criteria_desc')}
                        rows={6}
                        value={charter.requirements}
                        onChange={(e) => setCharter({ ...charter, requirements: e.target.value })}
                     />
                  </div>
               </div>

               {/* RAM Table Integrated Here */}
               <div className="col-span-full bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
                  <div className={cn("flex items-center justify-between mb-8", isRtl && "flex-row-reverse")}>
                     <div className={cn("flex items-center gap-4", isRtl && "flex-row-reverse")}>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                           <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div className={cn(isRtl && "text-right")}>
                           <h3 className="text-xl font-semibold text-slate-900">{t('ram_raci_matrix')}</h3>
                           <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-1">{t('matrix_structure_raci')}</p>
                        </div>
                     </div>
                     <button 
                        onClick={addStakeholder}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10"
                     >
                        <Plus className="w-4 h-4" />
                        {t('add_node')}
                     </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                     <table className={cn("w-full text-left border-collapse", isRtl && "text-right")}>
                        <thead>
                           <tr className="bg-slate-50">
                              <th className={cn("px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-slate-100", isRtl && "text-right")}>{t('role_entity')}</th>
                              <th className={cn("px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-slate-100", isRtl && "text-right")}>{t('responsibility')}</th>
                              <th className={cn("px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-slate-100", isRtl && "text-right")}>{t('accountability')}</th>
                              <th className={cn("px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-slate-100", isRtl && "text-right")}>{t('actions')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {charter.stakeholders.map((s, idx) => (
                              <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <input 
                                       placeholder={t('principal_role')} 
                                       className={cn("bg-transparent font-semibold text-slate-900 outline-none w-full border-b border-transparent focus:border-indigo-500 transition-all", isRtl && "text-right")}
                                       value={s.role}
                                       onChange={(e) => {
                                           const newS = [...charter.stakeholders];
                                           newS[idx].role = e.target.value;
                                           setCharter({...charter, stakeholders: newS});
                                       }}
                                    />
                                 </td>
                                 <td className="px-6 py-4">
                                    <input 
                                       placeholder={t('assigned_to')} 
                                       className={cn("bg-transparent text-sm text-slate-600 outline-none w-full border-b border-transparent focus:border-indigo-500 transition-all", isRtl && "text-right")}
                                       value={s.name}
                                       onChange={(e) => {
                                           const newS = [...charter.stakeholders];
                                           newS[idx].name = e.target.value;
                                           setCharter({...charter, stakeholders: newS});
                                       }}
                                    />
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className={cn("flex gap-2", isRtl && "flex-row-reverse")}>
                                       {['R', 'A', 'C', 'I'].map(type => (
                                          <button 
                                             key={type}
                                             className={cn(
                                                "w-7 h-7 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center border",
                                                idx % 4 === ['R', 'A', 'C', 'I'].indexOf(type) 
                                                   ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                                   : "bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                                             )}
                                          >
                                             {type}
                                          </button>
                                       ))}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <button 
                                       onClick={() => removeStakeholder(s.id)}
                                       className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  <div className={cn("mt-4 flex items-center gap-6", isRtl && "flex-row-reverse")}>
                     <button 
                        onClick={pullStakeholdersFromPolicies}
                        className={cn("text-[10px] font-semibold uppercase tracking-widest text-indigo-600 hover:text-indigo-900 transition-all flex items-center gap-2", isRtl && "flex-row-reverse")}
                     >
                        <History className="w-4 h-4" />
                        {t('repopulate_from_db')}
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Approvals & Budget Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-12 border-t border-slate-100">
           <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 space-y-8">
              <div className={cn("flex items-center gap-4", isRtl && "flex-row-reverse")}>
                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 shadow-sm">
                    <DollarSign className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-widest">{t('financial_framework')}</h3>
              </div>
              <div className="space-y-6">
                 <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full translate-x-12 -translate-y-12 blur-2xl group-hover:bg-blue-500/10 transition-all" />
                    <label className={cn("text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1", isRtl && "text-right")}>{t('budget_estimate_iqd')}</label>
                    <div className={cn("flex items-baseline gap-2", isRtl && "flex-row-reverse")}>
                       <span className="text-slate-400 font-semibold">IQD</span>
                       <input 
                         type="number"
                         value={charter.estimatedBudget}
                         onChange={(e) => setCharter({ ...charter, estimatedBudget: Number(e.target.value) })}
                         className={cn("bg-transparent border-none p-0 text-3xl font-semibold text-slate-900 outline-none w-full", isRtl && "text-right")}
                       />
                    </div>
                    <div className={cn("mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100", isRtl && "flex-row-reverse")}>
                       <span>{t('exchange_rate')}: (1,310)</span>
                       <span className="text-blue-600">${(charter.estimatedBudget / 1310).toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className={cn("text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 block", isRtl && "text-right")}>{t('budget_authority_details')}</label>
                    <textarea 
                      value={charter.budgetManagement}
                      onChange={(e) => setCharter({ ...charter, budgetManagement: e.target.value })}
                      className={cn("w-full bg-white border border-slate-200 rounded-3xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all", isRtl && "text-right")}
                      rows={3}
                      placeholder={t('budget_limits_desc')}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100">
                 <div className={cn("flex items-center gap-4 mb-8", isRtl && "flex-row-reverse")}>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 shadow-sm">
                       <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-widest">{t('formal_approvals')}</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-100">
                       <span className={cn("text-[10px] font-semibold uppercase tracking-widest text-blue-600 block mb-4", isRtl && "text-right")}>{t('project_manager')}</span>
                       <input 
                          placeholder={t('print_name')} 
                          className={cn("w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold mb-2 outline-none focus:ring-2 focus:ring-blue-500/10", isRtl && "text-right")}
                          value={charter.approvals.pmName}
                          onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, pmName: e.target.value}})}
                       />
                       <input 
                          type="date"
                          className={cn("w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10", isRtl && "text-right")}
                          value={charter.approvals.pmDate}
                          onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, pmDate: e.target.value}})}
                       />
                    </div>
                    <div className="space-y-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm border-t-4 border-t-amber-500">
                       <span className={cn("text-[10px] font-semibold uppercase tracking-widest text-amber-600 block mb-4", isRtl && "text-right")}>{t('project_sponsor')}</span>
                       <input 
                          placeholder={t('print_name')} 
                          className={cn("w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold mb-2 outline-none focus:ring-2 focus:ring-amber-500/10", isRtl && "text-right")}
                          value={charter.approvals.sponsorName}
                          onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, sponsorName: e.target.value}})}
                       />
                       <input 
                          type="date"
                          className={cn("w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/10", isRtl && "text-right")}
                          value={charter.approvals.sponsorDate}
                          onChange={(e) => setCharter({...charter, approvals: {...charter.approvals, sponsorDate: e.target.value}})}
                       />
                    </div>
                 </div>
              </div>
              <div className={cn("p-8 bg-blue-600 rounded-[2.5rem] text-white flex items-center justify-between", isRtl && "flex-row-reverse")}>
                 <div className={cn(isRtl && "text-right")}>
                    <h4 className="font-semibold text-xl tracking-tight">{t('generate_final_charter')}</h4>
                    <p className="text-xs text-blue-100 font-medium">{t('auto_populate_desc')}</p>
                 </div>
                 <button 
                   onClick={generatePDF}
                   disabled={isExporting}
                   className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-600 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50"
                 >
                    {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </StandardProcessPage>
  );
};
