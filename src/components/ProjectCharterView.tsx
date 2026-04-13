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
  DollarSign,
  Target,
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  Gavel
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder, ProjectIssue } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { selectedProject } = useProject();
  const { exchangeRate: currentExchangeRate, formatAmount } = useCurrency();
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
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activeSection, setActiveSection] = useState(1);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.charterData) {
          setCharter(data.charterData as unknown as CharterData);
        } else {
          // Auto-fill project title if no data exists yet
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
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: charter as any
        };
        updateData.charterHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Smart Linking (Breadcrumbing)
      // 1. Stakeholders -> Stakeholder Register
      for (const s of charter.stakeholders) {
        if (s.name && s.role) {
          const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id), where('name', '==', s.name));
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, 'stakeholders'), {
              projectId: selectedProject.id,
              name: s.name,
              role: s.role,
              classification: 'Internal',
              influence: 'Medium',
              interest: 'Medium',
              engagementLevel: 'Green',
              createdAt: timestamp
            });
          }
        }
      }

      // 2. High-Level Risks -> Risk Register (Drafts)
      if (charter.highLevelRisks) {
        const risks = charter.highLevelRisks.split('\n').filter(r => r.trim());
        for (const r of risks) {
          const q = query(collection(db, 'risks'), where('projectId', '==', selectedProject.id), where('description', '==', r.trim()));
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, 'risks'), {
              projectId: selectedProject.id,
              description: r.trim(),
              status: 'Draft',
              probability: 'Medium',
              impact: 'Medium',
              createdAt: timestamp
            });
          }
        }
      }

      // Prompt for restricted modules
      const affected = [];
      if (charter.milestones.some(m => m.description)) affected.push('Schedule');
      if (charter.estimatedBudget) affected.push('PO/Reports');

      if (affected.length > 0) {
        setShowPrompt({
          type: affected.join(' & '),
          message: `This update affects the ${affected.join(' and ')}. Do you want to propose a link?`,
          onConfirm: () => {
            console.log('Linking proposed for:', affected);
            setShowPrompt(null);
          }
        });
      }

      if (!isNewVersion) {
        alert('Charter updated successfully.');
      }

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

    const sections = [
      { title: 'Project Purpose or Justification:', content: charter.purpose },
      { title: 'Project Description:', content: charter.description },
      { title: 'High-Level Requirements:', content: charter.requirements },
      { title: 'High-Level Risks:', content: charter.highLevelRisks }
    ];

    let y = (doc as any).lastAutoTable.finalY + 10;
    sections.forEach(s => {
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
        ['Scope:', charter.objectives.scope.objective, charter.objectives.scope.successCriteria, charter.objectives.scope.approver],
        ['Time:', charter.objectives.time.objective, charter.objectives.time.successCriteria, charter.objectives.time.approver],
        ['Cost:', charter.objectives.cost.objective, charter.objectives.cost.successCriteria, charter.objectives.cost.approver],
        ['Other:', charter.objectives.other.objective, charter.objectives.other.successCriteria, charter.objectives.other.approver]
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: y,
      head: [['Summary Milestones', 'Due Date']],
      body: charter.milestones.map(m => [m.description, m.dueDate]),
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
      body: charter.stakeholders.map(s => [s.name, s.role]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = (doc as any).lastAutoTable.finalY + 10;
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
    doc.text(charter.approvals.pmName || '________________________________', margin, y);
    doc.text(charter.approvals.sponsorName || '________________________________', pageWidth - margin - 60, y);
    y += 5;
    doc.text('Project Manager Name', margin, y);
    doc.text('Sponsor or Originator Name', pageWidth - margin - 60, y);

    y += 15;
    doc.text(charter.approvals.pmDate || '________________________________', margin, y);
    doc.text(charter.approvals.sponsorDate || '________________________________', pageWidth - margin - 60, y);
    y += 5;
    doc.text('Date', margin, y);
    doc.text('Date', pageWidth - margin - 60, y);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-FRM-CHA-${dateStr}-V${vStr}.pdf`);
  };

  const addMilestone = () => {
    setCharter({
      ...charter,
      milestones: [...charter.milestones, { id: Date.now().toString(), description: '', dueDate: '' }]
    });
  };

  const removeMilestone = (id: string) => {
    setCharter({
      ...charter,
      milestones: charter.milestones.filter(m => m.id !== id)
    });
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

  const sections = [
    { id: 1, title: 'Project Identity', icon: Briefcase },
    { id: 2, title: 'Objectives & Milestones', icon: Target },
    { id: 3, title: 'Financials & Stakeholders', icon: DollarSign },
    { id: 4, title: 'Governance & Approvals', icon: Gavel }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl">
            <button 
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 text-white font-bold text-xs hover:bg-white/10 rounded-lg transition-all"
            >
              Save New Version
            </button>
            <button 
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Overwrite
            </button>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
              activeSection === s.id 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <s.icon className={cn("w-4 h-4", activeSection === s.id ? "text-blue-400" : "text-slate-400")} />
            {s.title}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-10 space-y-10"
          >
            {activeSection === 1 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
                    <input 
                      type="text"
                      value={charter.projectTitle}
                      onChange={(e) => setCharter({ ...charter, projectTitle: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
                      <input 
                        type="date"
                        value={charter.datePrepared}
                        onChange={(e) => setCharter({ ...charter, datePrepared: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Sponsor</label>
                      <input 
                        type="text"
                        value={charter.projectSponsor}
                        onChange={(e) => setCharter({ ...charter, projectSponsor: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Manager</label>
                    <input 
                      type="text"
                      value={charter.projectManager}
                      onChange={(e) => setCharter({ ...charter, projectManager: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Customer</label>
                    <input 
                      type="text"
                      value={charter.projectCustomer}
                      onChange={(e) => setCharter({ ...charter, projectCustomer: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Purpose or Justification</label>
                  <textarea 
                    value={charter.purpose}
                    onChange={(e) => setCharter({ ...charter, purpose: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Description</label>
                  <textarea 
                    value={charter.description}
                    onChange={(e) => setCharter({ ...charter, description: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">High-Level Requirements</label>
                    <textarea 
                      value={charter.requirements}
                      onChange={(e) => setCharter({ ...charter, requirements: e.target.value })}
                      rows={6}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">High-Level Risks</label>
                    <textarea 
                      value={charter.highLevelRisks}
                      onChange={(e) => setCharter({ ...charter, highLevelRisks: e.target.value })}
                      rows={6}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                      placeholder="Enter one risk per line..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 2 && (
              <div className="space-y-10">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Project Objectives</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Objective</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Criteria</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Approver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {['scope', 'time', 'cost', 'other'].map((key) => (
                          <tr key={key}>
                            <td className="px-6 py-4 font-bold text-slate-900 capitalize">{key}:</td>
                            <td className="px-6 py-4">
                              <input 
                                type="text"
                                value={(charter.objectives as any)[key].objective}
                                onChange={(e) => setCharter({
                                  ...charter,
                                  objectives: {
                                    ...charter.objectives,
                                    [key]: { ...(charter.objectives as any)[key], objective: e.target.value }
                                  }
                                })}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text"
                                value={(charter.objectives as any)[key].successCriteria}
                                onChange={(e) => setCharter({
                                  ...charter,
                                  objectives: {
                                    ...charter.objectives,
                                    [key]: { ...(charter.objectives as any)[key], successCriteria: e.target.value }
                                  }
                                })}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text"
                                value={(charter.objectives as any)[key].approver}
                                onChange={(e) => setCharter({
                                  ...charter,
                                  objectives: {
                                    ...charter.objectives,
                                    [key]: { ...(charter.objectives as any)[key], approver: e.target.value }
                                  }
                                })}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Summary Milestones</h3>
                    <button 
                      onClick={addMilestone}
                      className="p-1 hover:bg-slate-100 rounded-md text-blue-600 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {charter.milestones.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group">
                        <div className="flex-1 space-y-4">
                          <input 
                            type="text"
                            placeholder="Milestone description..."
                            value={m.description}
                            onChange={(e) => {
                              const newMilestones = [...charter.milestones];
                              newMilestones[idx].description = e.target.value;
                              setCharter({ ...charter, milestones: newMilestones });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold"
                          />
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <input 
                              type="date"
                              value={m.dueDate}
                              onChange={(e) => {
                                const newMilestones = [...charter.milestones];
                                newMilestones[idx].dueDate = e.target.value;
                                setCharter({ ...charter, milestones: newMilestones });
                              }}
                              className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-500"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => removeMilestone(m.id)}
                          className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 3 && (
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Budget</label>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                      {(['USD', 'IQD'] as const).map((curr) => (
                        <button
                          key={curr}
                          onClick={() => setCharter({ ...charter, currency: curr })}
                          className={cn(
                            "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                            charter.currency === curr ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        type="number"
                        value={charter.estimatedBudget}
                        onChange={(e) => setCharter({ ...charter, estimatedBudget: Number(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-lg font-black text-blue-400 outline-none"
                        placeholder="0.00"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                        {charter.currency}
                      </div>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        value={charter.exchangeRate}
                        onChange={(e) => setCharter({ ...charter, exchangeRate: Number(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-lg font-black text-emerald-400 outline-none"
                        placeholder="Exchange Rate"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                        Rate
                      </div>
                    </div>
                  </div>
                  {charter.estimatedBudget > 0 && (
                    <div className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                      Formatted: {formatAmount(charter.estimatedBudget, charter.currency)}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholders List</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={pullStakeholdersFromPolicies}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-100 transition-all"
                      >
                        <Users className="w-3 h-3" />
                        Pull from Policies
                      </button>
                      <button 
                        onClick={addStakeholder}
                        className="p-1 hover:bg-slate-100 rounded-md text-blue-600 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {charter.stakeholders.map((s, idx) => (
                      <div key={s.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <input 
                            type="text"
                            placeholder="Name..."
                            value={s.name}
                            onChange={(e) => {
                              const newStakeholders = [...charter.stakeholders];
                              newStakeholders[idx].name = e.target.value;
                              setCharter({ ...charter, stakeholders: newStakeholders });
                            }}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold"
                          />
                          <input 
                            type="text"
                            placeholder="Role..."
                            value={s.role}
                            onChange={(e) => {
                              const newStakeholders = [...charter.stakeholders];
                              newStakeholders[idx].role = e.target.value;
                              setCharter({ ...charter, stakeholders: newStakeholders });
                            }}
                            className="bg-transparent border-none focus:ring-0 text-xs text-slate-500"
                          />
                        </div>
                        <button 
                          onClick={() => removeStakeholder(s.id)}
                          className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Manager Authority Level</label>
                    <textarea 
                      value={charter.pmAuthority}
                      onChange={(e) => setCharter({ ...charter, pmAuthority: e.target.value })}
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staffing Decisions</label>
                    <textarea 
                      value={charter.staffingDecisions}
                      onChange={(e) => setCharter({ ...charter, staffingDecisions: e.target.value })}
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Budget Management and Variance</label>
                    <textarea 
                      value={charter.budgetManagement}
                      onChange={(e) => setCharter({ ...charter, budgetManagement: e.target.value })}
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 4 && (
              <div className="space-y-10">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technical Decisions</label>
                    <textarea 
                      value={charter.technicalDecisions}
                      onChange={(e) => setCharter({ ...charter, technicalDecisions: e.target.value })}
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conflict Resolution</label>
                    <textarea 
                      value={charter.conflictResolution}
                      onChange={(e) => setCharter({ ...charter, conflictResolution: e.target.value })}
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Approvals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Manager Name</label>
                        <input 
                          type="text"
                          value={charter.approvals.pmName}
                          onChange={(e) => setCharter({
                            ...charter,
                            approvals: { ...charter.approvals, pmName: e.target.value }
                          })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                        <input 
                          type="date"
                          value={charter.approvals.pmDate}
                          onChange={(e) => setCharter({
                            ...charter,
                            approvals: { ...charter.approvals, pmDate: e.target.value }
                          })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sponsor or Originator Name</label>
                        <input 
                          type="text"
                          value={charter.approvals.sponsorName}
                          onChange={(e) => setCharter({
                            ...charter,
                            approvals: { ...charter.approvals, sponsorName: e.target.value }
                          })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                        <input 
                          type="date"
                          value={charter.approvals.sponsorDate}
                          onChange={(e) => setCharter({
                            ...charter,
                            approvals: { ...charter.approvals, sponsorDate: e.target.value }
                          })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* History List */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <History className="w-6 h-6 text-blue-400" />
            Charter Version History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Version</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-white/20 font-bold uppercase tracking-widest">No history recorded.</td>
                </tr>
              ) : (
                versions.map((v) => (
                  <tr key={v.version} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-blue-400 font-black">v{v.version.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {new Date(v.date).toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">
                      {v.author}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setCharter(v.data as unknown as CharterData)}
                        className="text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restricted Data Linking Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Restricted Data Link</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                {showPrompt.message}
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPrompt(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  No
                </button>
                <button 
                  onClick={showPrompt.onConfirm}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
