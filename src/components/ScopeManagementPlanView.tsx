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
  Box
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

interface ScopeManagementPlanViewProps {
  page: Page;
}

interface ScopePlanData {
  projectTitle: string;
  datePrepared: string;
  // Page 1
  scopeStatement: string;
  wbsStructure: string;
  wbsDictionary: string;
  // Page 2
  baselineMaintenance: string;
  scopeChange: string;
  deliverableAcceptance: string;
  requirementsIntegration: string;
}

export const ScopeManagementPlanView: React.FC<ScopeManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [scope, setScope] = useState<ScopePlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    scopeStatement: '',
    wbsStructure: '',
    wbsDictionary: '',
    baselineMaintenance: '',
    scopeChange: '',
    deliverableAcceptance: '',
    requirementsIntegration: ''
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activePage, setActivePage] = useState<1 | 2>(1);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.scopePlanData) {
          setScope(data.scopePlanData as unknown as ScopePlanData);
        }
        if (data.scopePlanHistory) {
          setVersions(data.scopePlanHistory);
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
        scopePlanData: scope,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: scope as any
        };
        updateData.scopePlanHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt for Baseline Change
      setShowPrompt({
        type: 'Scope Baseline',
        message: "This modification alters the Scope Baseline. Propose a link to update Schedule and Cost?",
        onConfirm: () => {
          console.log('Scope Baseline update confirmed for Schedule and Cost');
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
      doc.text('SCOPE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 2`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${scope.projectTitle}`, margin, 45);
    doc.text(`Date: ${scope.datePrepared}`, pageWidth - margin - 50, 45);

    const sectionsP1 = [
      { title: 'Scope Statement Development', content: scope.scopeStatement },
      { title: 'WBS Structure', content: scope.wbsStructure },
      { title: 'WBS Dictionary', content: scope.wbsDictionary }
    ];

    let y = 55;
    sectionsP1.forEach(section => {
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 5;
      const lines = doc.splitTextToSize(section.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(40, lines.length * 5 + 5));
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(40, lines.length * 5 + 5) + 10;
    });

    // Page 2
    doc.addPage();
    renderHeader(2);
    
    const sectionsP2 = [
      { title: 'Scope Baseline Maintenance', content: scope.baselineMaintenance },
      { title: 'Scope Change', content: scope.scopeChange },
      { title: 'Deliverable Acceptance', content: scope.deliverableAcceptance },
      { title: 'Scope and Requirements Integration', content: scope.requirementsIntegration }
    ];

    y = 45;
    sectionsP2.forEach(section => {
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 5;
      const lines = doc.splitTextToSize(section.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(35, lines.length * 5 + 5));
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(35, lines.length * 5 + 5) + 10;
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-GOV-PLN-SCOPE-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Scope Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Defining, maintaining, and controlling project scope</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setActivePage(1)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activePage === 1 ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Page 1
            </button>
            <button 
              onClick={() => setActivePage(2)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activePage === 2 ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Page 2
            </button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          <input 
            type="text"
            value={scope.projectTitle}
            onChange={(e) => setScope({ ...scope, projectTitle: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            placeholder="Enter Project Title..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
          <input 
            type="date"
            value={scope.datePrepared}
            onChange={(e) => setScope({ ...scope, datePrepared: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activePage === 1 ? (
          <motion.div 
            key="page1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Statement Development</label>
              <textarea 
                value={scope.scopeStatement}
                onChange={(e) => setScope({ ...scope, scopeStatement: e.target.value })}
                rows={6}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define the process for developing the project scope statement..."
              />
            </section>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WBS Structure</label>
                <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                  <Layers className="w-3 h-3" />
                  Mandatory Hierarchy for Reports
                </div>
              </div>
              <textarea 
                value={scope.wbsStructure}
                onChange={(e) => setScope({ ...scope, wbsStructure: e.target.value })}
                rows={6}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Example: 03-Concrete Works > 03.1-Foundations > 03.1.1-Rebar"
              />
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">WBS Dictionary</label>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    The WBS Dictionary defines the work content of each component in detail.
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded ml-auto">
                  <BarChart3 className="w-3 h-3" />
                  Linked to Quality Metrics
                </div>
              </div>
              <textarea 
                value={scope.wbsDictionary}
                onChange={(e) => setScope({ ...scope, wbsDictionary: e.target.value })}
                rows={6}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define the work content of each WBS component..."
              />
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="page2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Baseline Maintenance</label>
              <textarea 
                value={scope.baselineMaintenance}
                onChange={(e) => setScope({ ...scope, baselineMaintenance: e.target.value })}
                rows={5}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define how the scope baseline will be maintained..."
              />
            </section>
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Change</label>
              <textarea 
                value={scope.scopeChange}
                onChange={(e) => setScope({ ...scope, scopeChange: e.target.value })}
                rows={5}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Instruction: Describe the process for approving scope creep..."
              />
            </section>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deliverable Acceptance</label>
                <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  Connected to QC Approach
                </div>
              </div>
              <textarea 
                value={scope.deliverableAcceptance}
                onChange={(e) => setScope({ ...scope, deliverableAcceptance: e.target.value })}
                rows={5}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Example: Technical sign-off from Consultant + Lab test results"
              />
            </section>
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope and Requirements Integration</label>
              <textarea 
                value={scope.requirementsIntegration}
                onChange={(e) => setScope({ ...scope, requirementsIntegration: e.target.value })}
                rows={5}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define how scope and requirements are integrated..."
              />
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
                  <td className="px-6 py-4 text-sm text-slate-500">Scope Management Plan Update</td>
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
