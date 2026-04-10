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
  ShieldCheck,
  Settings,
  Info,
  Search,
  UserPlus,
  ClipboardCheck,
  Activity,
  FileSignature
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

import { QualityMetricsRegisterView } from './QualityMetricsRegisterView';
import { FormalAcceptanceView } from './FormalAcceptanceView';

interface QualityManagementPlanViewProps {
  page: Page;
}

interface QualityRole {
  id: string;
  role: string;
  responsibilities: string;
}

interface QMPData {
  projectTitle: string;
  datePrepared: string;
  roles: QualityRole[];
  planningApproach: string;
  assuranceApproach: string;
  controlApproach: string;
  improvementApproach: string;
  acceptanceCriteriaLogic: string;
}

export const QualityManagementPlanView: React.FC<QualityManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [qmp, setQmp] = useState<QMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    roles: [
      { id: '1', role: '', responsibilities: '' },
      { id: '2', role: '', responsibilities: '' },
      { id: '3', role: '', responsibilities: '' },
      { id: '4', role: '', responsibilities: '' }
    ],
    planningApproach: '',
    assuranceApproach: '',
    controlApproach: '',
    improvementApproach: '',
    acceptanceCriteriaLogic: ''
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'metrics' | 'acceptance'>('plan');

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.qmpData) {
          setQmp(data.qmpData as unknown as QMPData);
        }
        if (data.qmpHistory) {
          setVersions(data.qmpHistory);
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
        qmpData: qmp,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: qmp as any
        };
        updateData.qmpHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt
      const affected = ['Schedule', 'PO', 'Reports'];
      setShowPrompt({
        type: affected.join(' & '),
        message: `Caution: This update affects ${affected.join(', ')}. Propose link?`,
        onConfirm: () => {
          console.log('QMP linking confirmed for:', affected);
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
      doc.text('QUALITY MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 2`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${qmp.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${qmp.datePrepared}`, pageWidth - margin - 50, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Quality Roles and Responsibilities', margin, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Role', 'Responsibilities']],
      body: qmp.roles.map((r, i) => [`${i + 1}. ${r.role}`, `${i + 1}. ${r.responsibilities}`]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Quality Planning Approach', margin, y);
    y += 5;
    const planningLines = doc.splitTextToSize(qmp.planningApproach || '', pageWidth - 2 * margin);
    doc.rect(margin, y, pageWidth - 2 * margin, Math.max(40, planningLines.length * 5 + 5));
    doc.setFont('helvetica', 'normal');
    doc.text(planningLines, margin + 2, y + 5);

    // Page 2
    doc.addPage();
    renderHeader(2);
    
    y = 45;
    const sections = [
      { title: 'Quality Assurance Approach', content: qmp.assuranceApproach },
      { title: 'Quality Control Approach', content: qmp.controlApproach },
      { title: 'Quality Improvement Approach', content: qmp.improvementApproach }
    ];

    sections.forEach(section => {
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 5;
      const lines = doc.splitTextToSize(section.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(40, lines.length * 5 + 5));
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(40, lines.length * 5 + 5) + 10;
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    // [P16314]-[Dept/DIV]-[Type]-[Desc]-[Ver]-[Date]
    const fileName = `${selectedProject.code}-MGT-PLN-QUAL-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quality Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Governance Hub • Project P16314</p>
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
      
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 shadow-inner">
        {[
          { id: 'plan', title: '3.3 Management Plan', icon: ClipboardCheck },
          { id: 'metrics', title: '3.3.1 Metrics Register', icon: Activity },
          { id: 'acceptance', title: '3.3.2 Formal Acceptance', icon: FileSignature }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeSubTab === tab.id 
                ? "bg-white text-blue-600 shadow-md" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.title}
          </button>
        ))}
      </div>

      {activeSubTab === 'plan' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
              <input 
                type="text"
                value={qmp.projectTitle}
                onChange={(e) => setQmp({ ...qmp, projectTitle: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Enter Project Title..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
              <input 
                type="date"
                value={qmp.datePrepared}
                onChange={(e) => setQmp({ ...qmp, datePrepared: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Roles and Responsibilities */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Quality Roles and Responsibilities</h3>
            <div className="grid grid-cols-1 gap-4">
              {qmp.roles.map((role, idx) => (
                <div key={role.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx + 1}. Role</label>
                    <input 
                      type="text"
                      value={role.role}
                      onChange={(e) => {
                        const newRoles = [...qmp.roles];
                        newRoles[idx].role = e.target.value;
                        setQmp({ ...qmp, roles: newRoles });
                      }}
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx + 1}. Responsibilities</label>
                    <input 
                      type="text"
                      value={role.responsibilities}
                      onChange={(e) => {
                        const newRoles = [...qmp.roles];
                        newRoles[idx].responsibilities = e.target.value;
                        setQmp({ ...qmp, roles: newRoles });
                      }}
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Approaches */}
          <div className="grid grid-cols-1 gap-8">
            {[
              { key: 'planningApproach', title: 'Quality Planning Approach' },
              { key: 'assuranceApproach', title: 'Quality Assurance Approach' },
              { key: 'controlApproach', title: 'Quality Control Approach' },
              { key: 'improvementApproach', title: 'Quality Improvement Approach' },
              { key: 'acceptanceCriteriaLogic', title: 'Acceptance Criteria Logic' }
            ].map((section) => (
              <section key={section.key} className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{section.title}</label>
                <textarea 
                  value={(qmp as any)[section.key]}
                  onChange={(e) => setQmp({ ...qmp, [section.key]: e.target.value })}
                  rows={4}
                  className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                  placeholder={`Define the ${section.title.toLowerCase()}...`}
                />
              </section>
            ))}
          </div>

          {/* Revision History Table */}
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
                      <td className="px-6 py-4 text-sm text-slate-500">Quality Management Plan Update</td>
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
        </>
      )}

      {activeSubTab === 'metrics' && (
        <QualityMetricsRegisterView page={page} embedded={true} />
      )}

      {activeSubTab === 'acceptance' && (
        <FormalAcceptanceView page={page} embedded={true} />
      )}

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
