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
  Activity
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

interface ScheduleManagementPlanViewProps {
  page: Page;
}

interface SchedulePlanData {
  projectTitle: string;
  datePrepared: string;
  methodology: string;
  tools: string;
  accuracy: string;
  units: string;
  varianceThresholds: string;
  reportingFormat: string;
  processManagement: {
    identification: string;
    sequencing: string;
    estimatingResources: string;
    estimatingEffort: string;
    monitoring: string;
  };
}

export const ScheduleManagementPlanView: React.FC<ScheduleManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [schedulePlan, setSchedulePlan] = useState<SchedulePlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    methodology: 'Critical Path Method (CPM) using Zarya Web-App',
    tools: 'Zarya Integrated Schedule Domain, Gantt Chart Engine',
    accuracy: '+/- 5%',
    units: 'Working Days / Man-Hours',
    varianceThresholds: 'Example: 5% Variance requires a status explanation; 10% requires a Recovery Plan',
    reportingFormat: 'Weekly Progress Reports, Monthly Executive Summaries',
    processManagement: {
      identification: 'WBS-based activity decomposition',
      sequencing: 'Precedence Diagramming Method (PDM)',
      estimatingResources: 'Parametric estimating based on historical Villa data',
      estimatingEffort: 'Expert judgment + Historical productivity rates',
      monitoring: 'Weekly site updates vs. Baseline'
    }
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.schedulePlanData) {
          setSchedulePlan(data.schedulePlanData as unknown as SchedulePlanData);
        }
        if (data.schedulePlanHistory) {
          setVersions(data.schedulePlanHistory);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        schedulePlanData: schedulePlan,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: schedulePlan as any
        };
        updateData.schedulePlanHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt
      setShowPrompt({
        type: 'Schedule Baseline',
        message: "The Project Schedule is a Protected Baseline. Are you sure you want to propose a link to this metadata?",
        onConfirm: () => {
          console.log('Schedule Baseline metadata link confirmed');
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

    const renderHeader = () => {
      doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHEDULE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Page 1 of 1', pageWidth - margin, 10, { align: 'right' });
    };

    renderHeader();
    doc.setFontSize(10);
    doc.text(`Project Title: ${schedulePlan.projectTitle}`, margin, 45);
    doc.text(`Date: ${schedulePlan.datePrepared}`, pageWidth - margin - 50, 45);

    const sections = [
      { title: 'Schedule Methodology', content: schedulePlan.methodology },
      { title: 'Schedule Tools', content: schedulePlan.tools }
    ];

    let y = 55;
    sections.forEach(section => {
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 5;
      const lines = doc.splitTextToSize(section.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, 20);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 2, y + 5);
      y += 30;
    });

    // Accuracy, Units, Thresholds
    doc.setFont('helvetica', 'bold');
    doc.text('Level of Accuracy', margin, y);
    doc.text('Units of Measure', margin + 60, y);
    doc.text('Variance Thresholds', margin + 120, y);
    y += 5;
    doc.rect(margin, y, 60, 20);
    doc.rect(margin + 60, y, 60, 20);
    doc.rect(margin + 120, y, 50, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(schedulePlan.accuracy, 56), margin + 2, y + 5);
    doc.text(doc.splitTextToSize(schedulePlan.units, 56), margin + 62, y + 5);
    doc.text(doc.splitTextToSize(schedulePlan.varianceThresholds, 46), margin + 122, y + 5);
    y += 30;

    doc.setFont('helvetica', 'bold');
    doc.text('Schedule Reporting and Format', margin, y);
    y += 5;
    doc.rect(margin, y, pageWidth - 2 * margin, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(schedulePlan.reportingFormat, pageWidth - 2 * margin - 4), margin + 2, y + 5);
    y += 30;

    doc.setFont('helvetica', 'bold');
    doc.text('Process Management', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      body: [
        ['Activity identification', schedulePlan.processManagement.identification],
        ['Activity sequencing', schedulePlan.processManagement.sequencing],
        ['Estimating resources', schedulePlan.processManagement.estimatingResources],
        ['Estimating effort and duration', schedulePlan.processManagement.estimatingEffort],
        ['Updating, monitoring, and controlling', schedulePlan.processManagement.monitoring]
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 120 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-GOV-PLN-SCH-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Schedule Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Governance and rules for project timeline management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900">Immutable Baseline Notice</h4>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            The existing Schedule Domain (Gantt Chart, Activities) is the immutable baseline. This plan defines the <strong>governance</strong> of that data, not the data itself.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          <input 
            type="text"
            value={schedulePlan.projectTitle}
            onChange={(e) => setSchedulePlan({ ...schedulePlan, projectTitle: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            placeholder="Enter Project Title..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
          <input 
            type="date"
            value={schedulePlan.datePrepared}
            onChange={(e) => setSchedulePlan({ ...schedulePlan, datePrepared: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Methodology</label>
            <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
              <GitBranch className="w-3 h-3" />
              CPM Standard
            </div>
          </div>
          <textarea 
            value={schedulePlan.methodology}
            onChange={(e) => setSchedulePlan({ ...schedulePlan, methodology: e.target.value })}
            rows={3}
            className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
            placeholder="Critical Path Method (CPM) using Zarya Web-App"
          />
        </section>

        <section className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Tools</label>
          <textarea 
            value={schedulePlan.tools}
            onChange={(e) => setSchedulePlan({ ...schedulePlan, tools: e.target.value })}
            rows={3}
            className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
            placeholder="Zarya Integrated Schedule Domain..."
          />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <section className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Level of Accuracy</label>
            <textarea 
              value={schedulePlan.accuracy}
              onChange={(e) => setSchedulePlan({ ...schedulePlan, accuracy: e.target.value })}
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none leading-relaxed"
              placeholder="+/- 5%"
            />
          </section>
          <section className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Units of Measure</label>
            <textarea 
              value={schedulePlan.units}
              onChange={(e) => setSchedulePlan({ ...schedulePlan, units: e.target.value })}
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none leading-relaxed"
              placeholder="Working Days / Man-Hours"
            />
          </section>
          <section className="space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Variance Thresholds</label>
              <div className="group relative">
                <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Thresholds defined here trigger notifications in the Issue Log as "Watch Items".
                </div>
              </div>
            </div>
            <textarea 
              value={schedulePlan.varianceThresholds}
              onChange={(e) => setSchedulePlan({ ...schedulePlan, varianceThresholds: e.target.value })}
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none leading-relaxed"
              placeholder="Example: 5% Variance requires status explanation..."
            />
          </section>
        </div>

        <section className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Reporting and Format</label>
          <textarea 
            value={schedulePlan.reportingFormat}
            onChange={(e) => setSchedulePlan({ ...schedulePlan, reportingFormat: e.target.value })}
            rows={3}
            className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
            placeholder="Weekly Progress Reports..."
          />
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Process Management</label>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">
              <User className="w-3 h-3" />
              Manager: Dana Salih
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-50">
                {[
                  { label: 'Activity identification', key: 'identification' },
                  { label: 'Activity sequencing', key: 'sequencing' },
                  { label: 'Estimating resources', key: 'estimatingResources' },
                  { label: 'Estimating effort and duration', key: 'estimatingEffort' },
                  { label: 'Updating, monitoring, and controlling', key: 'monitoring' }
                ].map((row) => (
                  <tr key={row.key} className="group hover:bg-slate-50/30 transition-all">
                    <td className="px-8 py-6 text-sm font-bold text-slate-900 w-1/3 bg-slate-50/50">{row.label}</td>
                    <td className="px-8 py-6">
                      <textarea 
                        value={(schedulePlan.processManagement as any)[row.key]}
                        onChange={(e) => setSchedulePlan({
                          ...schedulePlan,
                          processManagement: { ...schedulePlan.processManagement, [row.key]: e.target.value }
                        })}
                        className="w-full bg-transparent border-none text-sm text-slate-600 outline-none placeholder:text-slate-300 resize-none"
                        rows={2}
                        placeholder={`Define ${row.label.toLowerCase()} process...`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
                  <td className="px-6 py-4 text-sm text-slate-500">Schedule Management Plan Update</td>
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
