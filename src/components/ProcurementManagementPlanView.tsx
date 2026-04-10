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
  Scale,
  Activity,
  DollarSign,
  TrendingUp,
  PieChart,
  ShoppingCart,
  FileCheck,
  Gavel,
  ShieldAlert
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProcurementManagementPlanViewProps {
  page: Page;
}

interface SelectionCriteria {
  id: string;
  weight: number;
  criteria: string;
}

interface PerformanceMetric {
  id: string;
  domain: string;
  metric: string;
}

interface ProcurementPlanData {
  projectTitle: string;
  datePrepared: string;
  // Page 1
  authority: string;
  pmResponsibilities: string[];
  procurementResponsibilities: string[];
  standardDocuments: string[];
  contractType: string;
  // Page 2
  bondingInsurance: string;
  selectionCriteria: SelectionCriteria[];
  assumptionsConstraints: string;
  // Page 3
  integrationWBS: string;
  integrationSchedule: string;
  integrationDocumentation: string;
  integrationRisk: string;
  performanceReporting: string;
  performanceMetrics: PerformanceMetric[];
}

export const ProcurementManagementPlanView: React.FC<ProcurementManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [procPlan, setProcPlan] = useState<ProcurementPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    authority: 'Procurement authority is vested in the Project Manager for values up to $50k, and Hashim Hassan for values exceeding $50k.',
    pmResponsibilities: [
      'Define technical requirements and specifications',
      'Review and approve technical submittals',
      'Monitor vendor performance on site',
      'Verify deliverable acceptance',
      'Participate in final selection committee'
    ],
    procurementResponsibilities: [
      'Manage tendering process and RFPs',
      'Conduct commercial evaluation',
      'Negotiate contract terms and conditions',
      'Issue Purchase Orders (POs)',
      'Maintain procurement log and vendor database'
    ],
    standardDocuments: [
      'Request for Proposal (RFP) Template',
      'Standard Purchase Order (PO) Terms',
      'Vendor Prequalification Form',
      'Comparison Sheet (Technical & Commercial)',
      'Material Submittal Form'
    ],
    contractType: 'Lump Sum for Civil Works / Unit Price for Finishing',
    bondingInsurance: 'Performance Bond (10%) required for all contracts > $100k. Professional Indemnity insurance required for design-build packages.',
    selectionCriteria: [
      { id: '1', weight: 40, criteria: 'Technical Competence & Experience' },
      { id: '2', weight: 30, criteria: 'Commercial Competitiveness' },
      { id: '3', weight: 20, criteria: 'Delivery Schedule & Lead Times' },
      { id: '4', weight: 10, criteria: 'Quality Management System' }
    ],
    assumptionsConstraints: 'Assumption: Market prices for steel remain stable. Constraint: All vendors must be locally registered.',
    integrationWBS: 'All procurement packages must map directly to the WBS terminal nodes.',
    integrationSchedule: 'Procurement lead times are integrated into the Baseline Schedule as milestones.',
    integrationDocumentation: 'All vendor submittals must follow the project documentation coding standard.',
    integrationRisk: 'Vendor default risks are tracked in the Project Risk Register.',
    performanceReporting: 'Monthly Procurement Status Reports issued to the Steering Committee.',
    performanceMetrics: [
      { id: '1', domain: 'Quality', metric: 'Material Approval Success Rate' },
      { id: '2', domain: 'Schedule', metric: 'On-time Delivery Percentage' },
      { id: '3', domain: 'Cost', metric: 'Variance vs. Budgeted Rate' }
    ]
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activePage, setActivePage] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.procurementPlanData) {
          setProcPlan(data.procurementPlanData as unknown as ProcurementPlanData);
        }
        if (data.procurementPlanHistory) {
          setVersions(data.procurementPlanHistory);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  const totalWeight = procPlan.selectionCriteria.reduce((sum, c) => sum + c.weight, 0);

  const handleAddCriteria = () => {
    const newCriteria: SelectionCriteria = {
      id: Math.random().toString(36).substr(2, 9),
      weight: 0,
      criteria: ''
    };
    setProcPlan({ ...procPlan, selectionCriteria: [...procPlan.selectionCriteria, newCriteria] });
  };

  const handleRemoveCriteria = (id: string) => {
    setProcPlan({ ...procPlan, selectionCriteria: procPlan.selectionCriteria.filter(c => c.id !== id) });
  };

  const handleCriteriaChange = (id: string, field: keyof SelectionCriteria, value: any) => {
    setProcPlan({
      ...procPlan,
      selectionCriteria: procPlan.selectionCriteria.map(c => c.id === id ? { ...c, [field]: value } : c)
    });
  };

  const handleAddMetric = () => {
    const newMetric: PerformanceMetric = {
      id: Math.random().toString(36).substr(2, 9),
      domain: '',
      metric: ''
    };
    setProcPlan({ ...procPlan, performanceMetrics: [...procPlan.performanceMetrics, newMetric] });
  };

  const handleRemoveMetric = (id: string) => {
    setProcPlan({ ...procPlan, performanceMetrics: procPlan.performanceMetrics.filter(m => m.id !== id) });
  };

  const handleMetricChange = (id: string, field: keyof PerformanceMetric, value: string) => {
    setProcPlan({
      ...procPlan,
      performanceMetrics: procPlan.performanceMetrics.map(m => m.id === id ? { ...m, [field]: value } : m)
    });
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        procurementPlanData: procPlan,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: procPlan as any
        };
        updateData.procurementPlanHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt
      setShowPrompt({
        type: 'Procurement Integration',
        message: "The PO and Schedule pages are Protected. Do you want to propose a read-only data link for reference?",
        onConfirm: () => {
          console.log('Procurement Management read-only link confirmed');
          setShowPrompt(null);
        }
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    } finally {
      setIsSaving(false);
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
      doc.text('PROCUREMENT MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 3`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${procPlan.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${procPlan.datePrepared}`, pageWidth - margin - 60, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Procurement Authority', margin, 55);
    doc.rect(margin, 60, pageWidth - 2 * margin, 25);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(procPlan.authority, pageWidth - 2 * margin - 4), margin + 2, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('Roles and Responsibilities:', margin, 95);
    
    autoTable(doc, {
      startY: 100,
      head: [['Project Manager', 'Procurement Department']],
      body: [
        [
          procPlan.pmResponsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n'),
          procPlan.procurementResponsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY1 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFont('helvetica', 'bold');
    doc.text('Standard Procurement Documents', margin, finalY1 + 10);
    doc.rect(margin, finalY1 + 15, pageWidth - 2 * margin, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(procPlan.standardDocuments.map((d, i) => `${i + 1}. ${d}`).join('\n'), margin + 2, finalY1 + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Contract Type', margin, finalY1 + 55);
    doc.rect(margin, finalY1 + 60, pageWidth - 2 * margin, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(procPlan.contractType, pageWidth - 2 * margin - 4), margin + 2, finalY1 + 65);

    // Page 2
    doc.addPage();
    renderHeader(2);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Bonding and Insurance Requirements', margin, 45);
    doc.rect(margin, 50, pageWidth - 2 * margin, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(procPlan.bondingInsurance, pageWidth - 2 * margin - 4), margin + 2, 55);

    doc.setFont('helvetica', 'bold');
    doc.text('Selection Criteria', margin, 90);
    autoTable(doc, {
      startY: 95,
      head: [['Weight', 'Criteria']],
      body: procPlan.selectionCriteria.map(c => [`${c.weight}%`, c.criteria]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFont('helvetica', 'bold');
    doc.text('Procurement Assumptions and Constraints', margin, finalY2 + 10);
    doc.rect(margin, finalY2 + 15, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(procPlan.assumptionsConstraints, pageWidth - 2 * margin - 4), margin + 2, finalY2 + 20);

    // Page 3
    doc.addPage();
    renderHeader(3);

    doc.setFont('helvetica', 'bold');
    doc.text('Integration Requirements', margin, 45);
    autoTable(doc, {
      startY: 50,
      body: [
        ['WBS', procPlan.integrationWBS],
        ['Schedule', procPlan.integrationSchedule],
        ['Documentation', procPlan.integrationDocumentation],
        ['Risk', procPlan.integrationRisk],
        ['Performance Reporting', procPlan.performanceReporting]
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 130 }
      }
    });

    const finalY3 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Metrics', margin, finalY3 + 10);
    autoTable(doc, {
      startY: finalY3 + 15,
      head: [['Domain', 'Metric Measurement']],
      body: procPlan.performanceMetrics.map(m => [m.domain, m.metric]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-GOV-PLN-PROC-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Procurement Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Governance and rules for project procurement activities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            {[1, 2, 3].map((p) => (
              <button 
                key={p}
                onClick={() => setActivePage(p as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activePage === p ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Page {p}
              </button>
            ))}
          </div>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all"
          >
            <Download className="w-3 h-3" />
            Download PDF
          </button>
          <button 
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-all"
          >
            Save New Version
          </button>
          <button 
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Overwrite
          </button>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 flex items-start gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <Gavel className="w-7 h-7 text-white" />
        </div>
        <div>
          <h4 className="text-lg font-bold">Procurement Governance Baseline</h4>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">
            This plan defines the rules and standards for all project procurement. It does <strong>not</strong> modify transactional data in the Purchase Orders page.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          <input 
            type="text"
            value={procPlan.projectTitle}
            onChange={(e) => setProcPlan({ ...procPlan, projectTitle: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            placeholder="Enter Project Title..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          <input 
            type="date"
            value={procPlan.datePrepared}
            onChange={(e) => setProcPlan({ ...procPlan, datePrepared: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activePage === 1 && (
          <motion.div 
            key="page1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procurement Authority</label>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">
                  <User className="w-3 h-3" />
                  Approver: Hashim Hassan
                </div>
              </div>
              <textarea 
                value={procPlan.authority}
                onChange={(e) => setProcPlan({ ...procPlan, authority: e.target.value })}
                rows={3}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define procurement authority levels..."
              />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Manager Responsibilities</label>
                <div className="space-y-3">
                  {procPlan.pmResponsibilities.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                      <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400">{i + 1}</div>
                      <input 
                        type="text"
                        value={r}
                        onChange={(e) => {
                          const newR = [...procPlan.pmResponsibilities];
                          newR[i] = e.target.value;
                          setProcPlan({ ...procPlan, pmResponsibilities: newR });
                        }}
                        className="flex-1 bg-transparent border-none text-sm font-medium outline-none"
                      />
                      <button 
                        onClick={() => {
                          const newR = procPlan.pmResponsibilities.filter((_, idx) => idx !== i);
                          setProcPlan({ ...procPlan, pmResponsibilities: newR });
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setProcPlan({ ...procPlan, pmResponsibilities: [...procPlan.pmResponsibilities, ''] })}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-200 hover:text-blue-500 transition-all"
                  >
                    + Add Responsibility
                  </button>
                </div>
              </section>
              <section className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procurement Department Responsibilities</label>
                <div className="space-y-3">
                  {procPlan.procurementResponsibilities.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                      <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400">{i + 1}</div>
                      <input 
                        type="text"
                        value={r}
                        onChange={(e) => {
                          const newR = [...procPlan.procurementResponsibilities];
                          newR[i] = e.target.value;
                          setProcPlan({ ...procPlan, procurementResponsibilities: newR });
                        }}
                        className="flex-1 bg-transparent border-none text-sm font-medium outline-none"
                      />
                      <button 
                        onClick={() => {
                          const newR = procPlan.procurementResponsibilities.filter((_, idx) => idx !== i);
                          setProcPlan({ ...procPlan, procurementResponsibilities: newR });
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setProcPlan({ ...procPlan, procurementResponsibilities: [...procPlan.procurementResponsibilities, ''] })}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-200 hover:text-blue-500 transition-all"
                  >
                    + Add Responsibility
                  </button>
                </div>
              </section>
            </div>

            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Standard Procurement Documents</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {procPlan.standardDocuments.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <input 
                      type="text"
                      value={d}
                      onChange={(e) => {
                        const newD = [...procPlan.standardDocuments];
                        newD[i] = e.target.value;
                        setProcPlan({ ...procPlan, standardDocuments: newD });
                      }}
                      className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 outline-none"
                    />
                    <button 
                      onClick={() => {
                        const newD = procPlan.standardDocuments.filter((_, idx) => idx !== i);
                        setProcPlan({ ...procPlan, standardDocuments: newD });
                      }}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setProcPlan({ ...procPlan, standardDocuments: [...procPlan.standardDocuments, ''] })}
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-200 hover:text-blue-500 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Document
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract Type</label>
              <textarea 
                value={procPlan.contractType}
                onChange={(e) => setProcPlan({ ...procPlan, contractType: e.target.value })}
                rows={3}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Lump Sum for Civil Works / Unit Price for Finishing"
              />
            </section>
          </motion.div>
        )}

        {activePage === 2 && (
          <motion.div 
            key="page2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bonding and Insurance Requirements</label>
              <textarea 
                value={procPlan.bondingInsurance}
                onChange={(e) => setProcPlan({ ...procPlan, bondingInsurance: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define bonding and insurance requirements..."
              />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selection Criteria</label>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                    totalWeight === 100 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    Total: {totalWeight}% {totalWeight !== 100 && "(Must be 100%)"}
                  </div>
                </div>
                <button 
                  onClick={handleAddCriteria}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Criteria
                </button>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Weight (%)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Criteria</th>
                      <th className="px-6 py-4 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {procPlan.selectionCriteria.map((c) => (
                      <tr key={c.id} className="group hover:bg-slate-50/30 transition-all">
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            value={c.weight}
                            onChange={(e) => handleCriteriaChange(c.id, 'weight', parseInt(e.target.value) || 0)}
                            className="w-full bg-transparent border-none text-sm font-bold text-blue-600 outline-none"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={c.criteria}
                            onChange={(e) => handleCriteriaChange(c.id, 'criteria', e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-slate-600 outline-none placeholder:text-slate-300"
                            placeholder="Criteria description..."
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRemoveCriteria(c.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procurement Assumptions and Constraints</label>
              <textarea 
                value={procPlan.assumptionsConstraints}
                onChange={(e) => setProcPlan({ ...procPlan, assumptionsConstraints: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define assumptions and constraints..."
              />
            </section>
          </motion.div>
        )}

        {activePage === 3 && (
          <motion.div 
            key="page3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <section className="space-y-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Integration Requirements</label>
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { label: 'WBS', key: 'integrationWBS' },
                      { label: 'Schedule', key: 'integrationSchedule' },
                      { label: 'Documentation', key: 'integrationDocumentation' },
                      { label: 'Risk', key: 'integrationRisk' },
                      { label: 'Performance Reporting', key: 'performanceReporting' }
                    ].map((row) => (
                      <tr key={row.key} className="group hover:bg-slate-50/30 transition-all">
                        <td className="px-8 py-6 text-sm font-bold text-slate-900 w-1/3 bg-slate-50/50">{row.label}</td>
                        <td className="px-8 py-6">
                          <textarea 
                            value={(procPlan as any)[row.key]}
                            onChange={(e) => setProcPlan({ ...procPlan, [row.key]: e.target.value })}
                            className="w-full bg-transparent border-none text-sm text-slate-600 outline-none placeholder:text-slate-300 resize-none"
                            rows={2}
                            placeholder={`Define ${row.label} integration...`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Performance Metrics</label>
                <button 
                  onClick={handleAddMetric}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Metric
                </button>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Domain</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metric Measurement</th>
                      <th className="px-6 py-4 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {procPlan.performanceMetrics.map((m) => (
                      <tr key={m.id} className="group hover:bg-slate-50/30 transition-all">
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={m.domain}
                            onChange={(e) => handleMetricChange(m.id, 'domain', e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
                            placeholder="Domain (e.g. Quality)..."
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={m.metric}
                            onChange={(e) => handleMetricChange(m.id, 'metric', e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-slate-600 outline-none placeholder:text-slate-300"
                            placeholder="Metric description..."
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRemoveMetric(m.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

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
                <ShieldAlert className="w-8 h-8 text-amber-600" />
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

      {/* Version History */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Revision History</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Version</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {versions.length > 0 ? versions.map((v) => (
                <tr key={v.version}>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">V{v.version.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(v.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{v.author}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">Procurement Management Plan Update</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400 italic">No revision history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
