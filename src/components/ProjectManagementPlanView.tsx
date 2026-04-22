import React, { useState, useEffect } from 'react';
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
  Target,
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  Gavel,
  Layers,
  Wrench,
  BarChart3,
  Search
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
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
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProjectManagementPlanViewProps {
  page: Page;
}

interface LifeCyclePhase {
  id: string;
  phase: string;
  deliverables: string;
}

interface TailoringDecision {
  knowledgeArea: string;
  processes: string;
  decisions: string;
}

interface ToolTechnique {
  knowledgeArea: string;
  tools: string;
}

interface PMPData {
  projectTitle: string;
  datePrepared: string;
  lifeCycle: LifeCyclePhase[];
  tailoring: TailoringDecision[];
  tools: ToolTechnique[];
  baselines: {
    scopeVariance: string;
    scopeManagement: string;
    scheduleVariance: string;
    scheduleManagement: string;
    costVariance: string;
    costManagement: string;
  };
  projectReviews: string;
}

const KNOWLEDGE_AREAS = [
  'Integration', 'Scope', 'Time', 'Cost', 'Quality', 
  'Human Resources', 'Communication', 'Risk', 'Procurement', 'Stakeholders'
];

export const ProjectManagementPlanView: React.FC<ProjectManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  const [pmp, setPmp] = useState<PMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    lifeCycle: [{ id: '1', phase: '', deliverables: '' }],
    tailoring: KNOWLEDGE_AREAS.map(ka => ({ knowledgeArea: ka, processes: '', decisions: '' })),
    tools: KNOWLEDGE_AREAS.map(ka => ({ knowledgeArea: ka, tools: '' })),
    baselines: {
      scopeVariance: '',
      scopeManagement: '',
      scheduleVariance: '',
      scheduleManagement: '',
      costVariance: '',
      costManagement: '',
    },
    projectReviews: ''
  });

  // Auto-fill project title
  useEffect(() => {
    if (selectedProject && !pmp.projectTitle) {
      setPmp(prev => ({
        ...prev,
        projectTitle: prev.projectTitle || `${selectedProject.name} (${selectedProject.code})`
      }));
    }
  }, [selectedProject, pmp.projectTitle]);

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activeSection, setActiveSection] = useState(1);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.pmpData) {
          setPmp(data.pmpData as unknown as PMPData);
        } else {
          // Auto-fill project title if no data exists yet
          setPmp(prev => ({
            ...prev,
            projectTitle: `${selectedProject.name} (${selectedProject.code})`
          }));
        }
        if (data.pmpHistory) {
          setVersions(data.pmpHistory);
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
        pmpData: pmp,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: pmp as any
        };
        updateData.pmpHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt
      const affected = ['Schedule', 'PO', 'Reports'];
      setShowPrompt({
        type: affected.join(' & '),
        message: `This update impacts the ${affected.join(', ')}. Do you want to initiate a link?`,
        onConfirm: () => {
          console.log('PMP linking initiated for:', affected);
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
      doc.text('PROJECT MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 2`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${pmp.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${pmp.datePrepared}`, pageWidth - margin - 50, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Phase', 'Key Deliverables']],
      body: pmp.lifeCycle.map(l => [l.phase, l.deliverables]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Management Processes and Tailoring Decisions', margin, (doc as any).lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Knowledge Area', 'Processes', 'Tailoring Decisions']],
      body: pmp.tailoring.map(t => [t.knowledgeArea, t.processes, t.decisions]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    // Page 2
    doc.addPage();
    renderHeader(2);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Process Tools and Techniques', margin, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Knowledge Area', 'Tools and Techniques']],
      body: pmp.tools.map(t => [t.knowledgeArea, t.tools]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Variances and Baseline Management', margin, (doc as any).lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      body: [
        ['Scope Variance', pmp.baselines.scopeVariance, 'Scope Baseline Management', pmp.baselines.scopeManagement],
        ['Schedule Variance', pmp.baselines.scheduleVariance, 'Schedule Baseline Management', pmp.baselines.scheduleManagement],
        ['Cost Variance', pmp.baselines.costVariance, 'Cost Baseline Management', pmp.baselines.costManagement]
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } }
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Reviews', margin, (doc as any).lastAutoTable.finalY + 10);
    
    const reviewLines = doc.splitTextToSize(pmp.projectReviews || '', pageWidth - 2 * margin);
    doc.rect(margin, (doc as any).lastAutoTable.finalY + 15, pageWidth - 2 * margin, Math.max(30, reviewLines.length * 5 + 5));
    doc.setFont('helvetica', 'normal');
    doc.text(reviewLines, margin + 2, (doc as any).lastAutoTable.finalY + 20);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-ZRY-MGT-PLN-INT-${dateStr}-V${vStr}.pdf`;

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
      formData.append('path', '01_PROJECT_MANAGEMENT_FORMS/2.0_Planning/2.1_Governance_Domain/2.1.2_PROJECT_MANAGEMENT_PLAN');
      
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

  const addPhase = () => {
    setPmp({
      ...pmp,
      lifeCycle: [...pmp.lifeCycle, { id: Date.now().toString(), phase: '', deliverables: '' }]
    });
  };

  const removePhase = (id: string) => {
    setPmp({
      ...pmp,
      lifeCycle: pmp.lifeCycle.filter(l => l.id !== id)
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Project Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Integration and overall project management strategy</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all",
              isEditing 
                ? "bg-amber-100 text-amber-700 border border-amber-200" 
                : "bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100"
            )}
          >
            {isEditing ? <CheckCircle2 className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
            {isEditing ? 'Finish Editing' : 'Edit Plan'}
          </button>
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
          {isEditing ? (
            <input 
              type="text"
              value={pmp.projectTitle}
              onChange={(e) => setPmp({ ...pmp, projectTitle: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              placeholder="Example: P16314 - Villa 2"
            />
          ) : (
            <div className="px-1 py-1 text-lg font-bold text-slate-900">
              {pmp.projectTitle || '---'}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          {isEditing ? (
            <input 
              type="date"
              value={pmp.datePrepared}
              onChange={(e) => setPmp({ ...pmp, datePrepared: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          ) : (
            <div className="px-1 py-1 text-sm font-medium text-slate-600">
              {pmp.datePrepared || '---'}
            </div>
          )}
        </div>
      </div>

      {/* Project Life Cycle */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Project Life Cycle</h3>
          {isEditing && (
            <button onClick={addPhase} className="p-1 hover:bg-slate-100 rounded-md text-blue-600 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-4">
          {pmp.lifeCycle.map((l, idx) => (
            <div key={l.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl group relative">
              {isEditing && (
                <button 
                  onClick={() => removePhase(l.id)}
                  className="absolute -right-2 -top-2 p-1.5 bg-white border border-slate-200 rounded-full text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    placeholder="Example: Phase: Execution"
                    value={l.phase}
                    onChange={(e) => {
                      const newLife = [...pmp.lifeCycle];
                      newLife[idx].phase = e.target.value;
                      setPmp({ ...pmp, lifeCycle: newLife });
                    }}
                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  />
                ) : (
                  <div className="text-sm font-bold text-slate-900">{l.phase || '---'}</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Deliverables</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    placeholder="Example: Deliverables: Structural Completion"
                    value={l.deliverables}
                    onChange={(e) => {
                      const newLife = [...pmp.lifeCycle];
                      newLife[idx].deliverables = e.target.value;
                      setPmp({ ...pmp, lifeCycle: newLife });
                    }}
                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                  />
                ) : (
                  <div className="text-sm text-slate-600">{l.deliverables || '---'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tailoring Decisions */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Processes and Tailoring Decisions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Knowledge Area</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Processes</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tailoring Decisions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pmp.tailoring.map((t, idx) => (
                <tr key={t.knowledgeArea}>
                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">{t.knowledgeArea}</td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={t.processes}
                        onChange={(e) => {
                          const newTailoring = [...pmp.tailoring];
                          newTailoring[idx].processes = e.target.value;
                          setPmp({ ...pmp, tailoring: newTailoring });
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm"
                      />
                    ) : (
                      <div className="text-sm text-slate-600">{t.processes || '---'}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        type="text"
                        placeholder={t.knowledgeArea === 'Risk' ? "Example: Full Risk Register used for this project" : ""}
                        value={t.decisions}
                        onChange={(e) => {
                          const newTailoring = [...pmp.tailoring];
                          newTailoring[idx].decisions = e.target.value;
                          setPmp({ ...pmp, tailoring: newTailoring });
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm"
                      />
                    ) : (
                      <div className="text-sm text-slate-600">{t.decisions || '---'}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tools and Techniques */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Process Tools and Techniques</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pmp.tools.map((t, idx) => (
            <div key={t.knowledgeArea} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-32 font-bold text-slate-900 text-xs">{t.knowledgeArea}</div>
              {isEditing ? (
                <input 
                  type="text"
                  value={t.tools}
                  onChange={(e) => {
                    const newTools = [...pmp.tools];
                    newTools[idx].tools = e.target.value;
                    setPmp({ ...pmp, tools: newTools });
                  }}
                  className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none"
                  placeholder="Tools & Techniques..."
                />
              ) : (
                <div className="flex-1 text-sm text-slate-600">{t.tools || '---'}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Baselines */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Variances and Baseline Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Variance</label>
              {isEditing ? (
                <textarea 
                  value={pmp.baselines.scopeVariance}
                  onChange={(e) => setPmp({ ...pmp, baselines: { ...pmp.baselines, scopeVariance: e.target.value } })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none"
                  rows={2}
                />
              ) : (
                <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.baselines.scopeVariance || '---'}</div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Variance</label>
              {isEditing ? (
                <textarea 
                  value={pmp.baselines.scheduleVariance}
                  onChange={(e) => setPmp({ ...pmp, baselines: { ...pmp.baselines, scheduleVariance: e.target.value } })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none"
                  rows={2}
                />
              ) : (
                <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.baselines.scheduleVariance || '---'}</div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Variance</label>
              {isEditing ? (
                <textarea 
                  value={pmp.baselines.costVariance}
                  onChange={(e) => setPmp({ ...pmp, baselines: { ...pmp.baselines, costVariance: e.target.value } })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none"
                  rows={2}
                  placeholder="Instruction: Define the percentage of cost overrun allowed before a Change Request is mandatory (e.g., 5%)"
                />
              ) : (
                <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.baselines.costVariance || '---'}</div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Baseline Management</label>
              {isEditing ? (
                <textarea 
                  value={pmp.baselines.scopeManagement}
                  onChange={(e) => setPmp({ ...pmp, baselines: { ...pmp.baselines, scopeManagement: e.target.value } })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none"
                  rows={2}
                />
              ) : (
                <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.baselines.scopeManagement || '---'}</div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Baseline Management</label>
              {isEditing ? (
                <textarea 
                  value={pmp.baselines.scheduleManagement}
                  onChange={(e) => setPmp({ ...pmp, baselines: { ...pmp.baselines, scheduleManagement: e.target.value } })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none"
                  rows={2}
                />
              ) : (
                <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.baselines.scheduleManagement || '---'}</div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Baseline Management</label>
              {isEditing ? (
                <textarea 
                  value={pmp.baselines.costManagement}
                  onChange={(e) => setPmp({ ...pmp, baselines: { ...pmp.baselines, costManagement: e.target.value } })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none"
                  rows={2}
                />
              ) : (
                <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.baselines.costManagement || '---'}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Project Reviews */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Project Reviews</h3>
        {isEditing ? (
          <textarea 
            value={pmp.projectReviews}
            onChange={(e) => setPmp({ ...pmp, projectReviews: e.target.value })}
            rows={6}
            className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-medium outline-none resize-none leading-relaxed"
          />
        ) : (
          <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pmp.projectReviews || '---'}</div>
        )}
      </section>

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
