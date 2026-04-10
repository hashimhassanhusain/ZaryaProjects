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
  ShieldAlert,
  Flame,
  Target as TargetIcon
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
  collection,
  query,
  where
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskManagementPlanViewProps {
  page: Page;
}

type RiskLevel = 'low' | 'medium' | 'high';

interface PIMatrixCell {
  probability: number; // 1-5
  impact: number;      // 1-5
  level: RiskLevel;
}

interface ImpactDefinition {
  level: string;
  scope: string;
  quality: string;
  time: string;
  cost: string;
}

interface RiskPlanData {
  projectTitle: string;
  datePrepared: string;
  // Page 1
  methodology: string;
  roles: string;
  categories: string;
  // Page 2
  funding: string;
  contingencyProtocols: string;
  // Page 3
  timing: string;
  tolerances: { stakeholderId: string; tolerance: string }[];
  audit: string;
  // Page 4
  probDefinitions: { level: string; description: string }[];
  impactDefinitions: ImpactDefinition[];
  // Page 5
  piMatrix: PIMatrixCell[];
}

export const RiskManagementPlanView: React.FC<RiskManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [riskPlan, setRiskPlan] = useState<RiskPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    methodology: 'Qualitative and Quantitative Risk Analysis using PI Matrix. Risks are identified through workshops and expert judgment.',
    roles: 'Project Manager: Risk Owner. Risk Manager: Maintains Risk Register. Team Members: Identify and report risks.',
    categories: 'Technical, External, Organizational, Project Management',
    funding: 'Risk management activities are funded through the Project Management budget.',
    contingencyProtocols: 'Example: 5% of total budget reserved for unforeseen technical risks. Access requires CCB approval.',
    timing: 'Risk reviews conducted bi-weekly. Major audits quarterly.',
    tolerances: [],
    audit: 'Internal audits every 3 months. External audits as required by stakeholders.',
    probDefinitions: [
      { level: 'Very high', description: '> 70% probability' },
      { level: 'High', description: '51% - 70% probability' },
      { level: 'Medium', description: '31% - 50% probability' },
      { level: 'Low', description: '11% - 30% probability' },
      { level: 'Very low', description: '< 10% probability' }
    ],
    impactDefinitions: [
      { level: 'Very high', scope: 'Major change in scope', quality: 'Quality unacceptable', time: '> 20% delay', cost: '> 20% increase' },
      { level: 'High', scope: 'Significant scope change', quality: 'Major quality reduction', time: '11-20% delay', cost: '11-20% increase' },
      { level: 'Medium', scope: 'Moderate scope change', quality: 'Moderate quality reduction', time: '6-10% delay', cost: '6-10% increase' },
      { level: 'Low', scope: 'Minor scope change', quality: 'Minor quality reduction', time: '1-5% delay', cost: '1-5% increase' },
      { level: 'Very low', scope: 'Insignificant change', quality: 'Insignificant reduction', time: '< 1% delay', cost: '< 1% increase' }
    ],
    piMatrix: Array.from({ length: 25 }, (_, i) => ({
      probability: 5 - Math.floor(i / 5),
      impact: (i % 5) + 1,
      level: (5 - Math.floor(i / 5)) * ((i % 5) + 1) > 15 ? 'high' : (5 - Math.floor(i / 5)) * ((i % 5) + 1) > 5 ? 'medium' : 'low'
    }))
  });

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activePage, setActivePage] = useState<1 | 2 | 3 | 4 | 5>(1);

  useEffect(() => {
    if (!selectedProject) return;

    const unsubProject = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.riskPlanData) {
          setRiskPlan(data.riskPlanData as unknown as RiskPlanData);
        }
        if (data.riskPlanHistory) {
          setVersions(data.riskPlanHistory);
        }
      }
      setLoading(false);
    });

    const stakeholdersQuery = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
    const unsubStakeholders = onSnapshot(stakeholdersQuery, (snap) => {
      const list: Stakeholder[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Stakeholder));
      setStakeholders(list);
    });

    return () => {
      unsubProject();
      unsubStakeholders();
    };
  }, [selectedProject?.id]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        riskPlanData: riskPlan,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: riskPlan as any
        };
        updateData.riskPlanHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt
      setShowPrompt({
        type: 'Risk Integration',
        message: "Defining risk protocols may impact budget reserves or schedule milestones. Propose a data link?",
        onConfirm: () => {
          console.log('Risk Management dynamic link confirmed');
          setShowPrompt(null);
        }
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMatrixCell = (index: number) => {
    const newMatrix = [...riskPlan.piMatrix];
    const current = newMatrix[index].level;
    const next: RiskLevel = current === 'low' ? 'medium' : current === 'medium' ? 'high' : 'low';
    newMatrix[index].level = next;
    setRiskPlan({ ...riskPlan, piMatrix: newMatrix });
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
      doc.text('RISK MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 5`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${riskPlan.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${riskPlan.datePrepared}`, pageWidth - margin - 60, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Methodology', margin, 55);
    doc.rect(margin, 60, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.methodology, pageWidth - 2 * margin - 4), margin + 2, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('Roles and Responsibilities', margin, 110);
    doc.rect(margin, 115, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.roles, pageWidth - 2 * margin - 4), margin + 2, 120);

    doc.setFont('helvetica', 'bold');
    doc.text('Risk Categories', margin, 165);
    doc.rect(margin, 170, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.categories, pageWidth - 2 * margin - 4), margin + 2, 175);

    // Page 2
    doc.addPage();
    renderHeader(2);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Management Funding', margin, 45);
    doc.rect(margin, 50, pageWidth - 2 * margin, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.funding, pageWidth - 2 * margin - 4), margin + 2, 55);

    doc.setFont('helvetica', 'bold');
    doc.text('Contingency Protocols', margin, 120);
    doc.rect(margin, 125, pageWidth - 2 * margin, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.contingencyProtocols, pageWidth - 2 * margin - 4), margin + 2, 130);

    // Page 3
    doc.addPage();
    renderHeader(3);
    doc.setFont('helvetica', 'bold');
    doc.text('Frequency and Timing', margin, 45);
    doc.rect(margin, 50, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.timing, pageWidth - 2 * margin - 4), margin + 2, 55);

    doc.setFont('helvetica', 'bold');
    doc.text('Stakeholder Risk Tolerances', margin, 100);
    autoTable(doc, {
      startY: 105,
      head: [['Stakeholder', 'Tolerance']],
      body: riskPlan.tolerances.map(t => {
        const s = stakeholders.find(sh => sh.id === t.stakeholderId);
        return [s?.name || 'Unknown', t.tolerance];
      }),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY3 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFont('helvetica', 'bold');
    doc.text('Tracking and Audit', margin, finalY3 + 10);
    doc.rect(margin, finalY3 + 15, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(riskPlan.audit, pageWidth - 2 * margin - 4), margin + 2, finalY3 + 20);

    // Page 4
    doc.addPage();
    renderHeader(4);
    doc.setFont('helvetica', 'bold');
    doc.text('Definitions of Probability', margin, 45);
    autoTable(doc, {
      startY: 50,
      head: [['Level', 'Description']],
      body: riskPlan.probDefinitions.map(d => [d.level, d.description]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY4 = (doc as any).lastAutoTable.finalY || 100;
    doc.setFont('helvetica', 'bold');
    doc.text('Definitions of Impact by Objective', margin, finalY4 + 10);
    autoTable(doc, {
      startY: finalY4 + 15,
      head: [['Level', 'Scope', 'Quality', 'Time', 'Cost']],
      body: riskPlan.impactDefinitions.map(d => [d.level, d.scope, d.quality, d.time, d.cost]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 7, cellPadding: 2 }
    });

    // Page 5
    doc.addPage();
    renderHeader(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Probability and Impact Matrix', margin, 45);
    
    const cellSize = 25;
    const startX = (pageWidth - 5 * cellSize) / 2;
    const startY = 60;

    // Draw Matrix
    riskPlan.piMatrix.forEach((cell, i) => {
      const row = 4 - Math.floor(i / 5);
      const col = i % 5;
      const x = startX + col * cellSize;
      const y = startY + (4 - row) * cellSize;
      
      const color = cell.level === 'high' ? [239, 68, 68] : cell.level === 'medium' ? [245, 158, 11] : [34, 197, 94];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, cellSize, cellSize, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.rect(x, y, cellSize, cellSize, 'S');
    });

    // Labels
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    for (let i = 0; i < 5; i++) {
      doc.text(['V. High', 'High', 'Medium', 'Low', 'V. Low'][i], startX - 15, startY + i * cellSize + cellSize / 2, { align: 'center' });
      doc.text(['V. Low', 'Low', 'Medium', 'High', 'V. High'][i], startX + i * cellSize + cellSize / 2, startY + 5 * cellSize + 5, { align: 'center' });
    }
    doc.text('PROBABILITY', startX - 25, startY + 2.5 * cellSize, { angle: 90, align: 'center' });
    doc.text('IMPACT', startX + 2.5 * cellSize, startY + 5 * cellSize + 15, { align: 'center' });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-GOV-PLN-RISK-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Risk Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Governance and protocols for project risk management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            {[1, 2, 3, 4, 5].map((p) => (
              <button 
                key={p}
                onClick={() => setActivePage(p as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activePage === p ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                P{p}
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

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900">Risk Governance Principle</h4>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            This plan defines the risk governance protocols. Risk Score (Probability × Impact) helps prioritize which threats require immediate mitigation plans.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          <input 
            type="text"
            value={riskPlan.projectTitle}
            onChange={(e) => setRiskPlan({ ...riskPlan, projectTitle: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            placeholder="Enter Project Title..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          <input 
            type="date"
            value={riskPlan.datePrepared}
            onChange={(e) => setRiskPlan({ ...riskPlan, datePrepared: e.target.value })}
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Methodology</label>
              <textarea 
                value={riskPlan.methodology}
                onChange={(e) => setRiskPlan({ ...riskPlan, methodology: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Qualitative and Quantitative Risk Analysis using PI Matrix..."
              />
            </section>
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roles and Responsibilities</label>
              <textarea 
                value={riskPlan.roles}
                onChange={(e) => setRiskPlan({ ...riskPlan, roles: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define risk management roles..."
              />
            </section>
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Categories</label>
              <textarea 
                value={riskPlan.categories}
                onChange={(e) => setRiskPlan({ ...riskPlan, categories: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Technical, External, Organizational, Project Management..."
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Management Funding</label>
              <textarea 
                value={riskPlan.funding}
                onChange={(e) => setRiskPlan({ ...riskPlan, funding: e.target.value })}
                rows={6}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define how risk management activities are funded..."
              />
            </section>
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contingency Protocols</label>
              <textarea 
                value={riskPlan.contingencyProtocols}
                onChange={(e) => setRiskPlan({ ...riskPlan, contingencyProtocols: e.target.value })}
                rows={6}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Example: 5% of total budget reserved for unforeseen technical risks..."
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
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency and Timing</label>
              <textarea 
                value={riskPlan.timing}
                onChange={(e) => setRiskPlan({ ...riskPlan, timing: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define frequency of risk reviews..."
              />
            </section>
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stakeholder Risk Tolerances</label>
                <button 
                  onClick={() => setRiskPlan({ ...riskPlan, tolerances: [...riskPlan.tolerances, { stakeholderId: '', tolerance: '' }] })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Tolerance
                </button>
              </div>
              <div className="space-y-3">
                {riskPlan.tolerances.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                    <select 
                      value={t.stakeholderId}
                      onChange={(e) => {
                        const newT = [...riskPlan.tolerances];
                        newT[i].stakeholderId = e.target.value;
                        setRiskPlan({ ...riskPlan, tolerances: newT });
                      }}
                      className="bg-white px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 outline-none"
                    >
                      <option value="">Select Stakeholder...</option>
                      {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input 
                      type="text"
                      value={t.tolerance}
                      onChange={(e) => {
                        const newT = [...riskPlan.tolerances];
                        newT[i].tolerance = e.target.value;
                        setRiskPlan({ ...riskPlan, tolerances: newT });
                      }}
                      className="flex-1 bg-transparent border-none text-sm font-medium outline-none"
                      placeholder="Define tolerance level..."
                    />
                    <button 
                      onClick={() => {
                        const newT = riskPlan.tolerances.filter((_, idx) => idx !== i);
                        setRiskPlan({ ...riskPlan, tolerances: newT });
                      }}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tracking and Audit</label>
              <textarea 
                value={riskPlan.audit}
                onChange={(e) => setRiskPlan({ ...riskPlan, audit: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define tracking and audit procedures..."
              />
            </section>
          </motion.div>
        )}

        {activePage === 4 && (
          <motion.div 
            key="page4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <section className="space-y-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Definitions of Probability</label>
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Level</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {riskPlan.probDefinitions.map((d, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{d.level}</td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={d.description}
                            onChange={(e) => {
                              const newD = [...riskPlan.probDefinitions];
                              newD[i].description = e.target.value;
                              setRiskPlan({ ...riskPlan, probDefinitions: newD });
                            }}
                            className="w-full bg-transparent border-none text-sm text-slate-600 outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Definitions of Impact by Objective</label>
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Level</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Scope</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quality</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {riskPlan.impactDefinitions.map((d, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{d.level}</td>
                        {['scope', 'quality', 'time', 'cost'].map((field) => (
                          <td key={field} className="px-6 py-4">
                            <textarea 
                              value={(d as any)[field]}
                              onChange={(e) => {
                                const newD = [...riskPlan.impactDefinitions];
                                (newD[i] as any)[field] = e.target.value;
                                setRiskPlan({ ...riskPlan, impactDefinitions: newD });
                              }}
                              className="w-full bg-transparent border-none text-[11px] text-slate-600 outline-none resize-none"
                              rows={2}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </motion.div>
        )}

        {activePage === 5 && (
          <motion.div 
            key="page5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Probability and Impact Matrix</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">High</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center gap-2 -rotate-90 origin-center w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Probability</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {['V. High', 'High', 'Medium', 'Low', 'V. Low'].map((label) => (
                      <div key={label} className="h-16 flex items-center justify-end pr-4 text-[10px] font-black text-slate-400 uppercase w-16">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {riskPlan.piMatrix.map((cell, i) => (
                      <button 
                        key={i}
                        onClick={() => toggleMatrixCell(i)}
                        className={cn(
                          "w-16 h-16 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95",
                          cell.level === 'high' ? "bg-red-500 shadow-red-100" : 
                          cell.level === 'medium' ? "bg-amber-500 shadow-amber-100" : 
                          "bg-green-500 shadow-green-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 ml-32">
                  {['V. Low', 'Low', 'Medium', 'High', 'V. High'].map((label) => (
                    <div key={label} className="w-16 text-center text-[10px] font-black text-slate-400 uppercase">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-8 ml-32">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Impact</span>
                </div>
              </div>
            </section>

            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TargetIcon className="w-4 h-4 text-blue-600" />
                Risk Score Calculation
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The Risk Score is calculated as <strong>Probability Score (1-5) × Impact Score (1-5)</strong>. 
                This helps prioritize which threats require immediate mitigation plans. 
                Scores above 15 are typically classified as <strong>High Risk</strong>, while scores below 5 are <strong>Low Risk</strong>.
              </p>
            </div>
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
                  <td className="px-6 py-4 text-sm text-slate-500">Risk Management Plan Update</td>
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
