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
  HelpCircle
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot, 
  collection,
  query,
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StakeholderManagementPlanViewProps {
  page: Page;
}

type EngagementLevel = 'Unaware' | 'Resistant' | 'Neutral' | 'Supportive' | 'Leading';

interface StakeholderEngagement {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  current: EngagementLevel;
  desired: EngagementLevel;
  commNeeds: string;
  method: string;
  timing: string;
  approach: string;
}

interface SMPData {
  projectTitle: string;
  datePrepared: string;
  engagements: StakeholderEngagement[];
  pendingChanges: string;
  relationships: string;
}

export const StakeholderManagementPlanView: React.FC<StakeholderManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [smp, setSmp] = useState<SMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    engagements: [],
    pendingChanges: '',
    relationships: ''
  });

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activePage, setActivePage] = useState<1 | 2>(1);

  useEffect(() => {
    if (!selectedProject) return;

    // Fetch SMP Data
    const unsubSMP = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.smpData) {
          setSmp(data.smpData as unknown as SMPData);
        }
        if (data.smpHistory) {
          setVersions(data.smpHistory);
        }
      }
    });

    // Fetch Stakeholders
    const stakeholdersQuery = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
    const unsubStakeholders = onSnapshot(stakeholdersQuery, (snap) => {
      setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
      setLoading(false);
    });

    return () => {
      unsubSMP();
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
        smpData: smp,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: smp as any
        };
        updateData.smpHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Data Pushing: Sync with Communications Plan
      // Logic: For each engagement, we could update the comm plan matrix
      console.log('Syncing with Communications Management Plan...');

      // Restriction Policy Prompt
      const affected = ['Schedule', 'Reports'];
      setShowPrompt({
        type: affected.join(' & '),
        message: `Updating stakeholder engagement may impact the ${affected.join('/')}. Proceed with linking?`,
        onConfirm: () => {
          console.log('SMP linking confirmed for:', affected);
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
      doc.text('STAKEHOLDER MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 2`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${smp.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${smp.datePrepared}`, pageWidth - margin - 50, 45);

    autoTable(doc, {
      startY: 55,
      head: [['Stakeholder', 'Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading']],
      body: smp.engagements.map(e => [
        e.stakeholderName,
        e.current === 'Unaware' ? 'C' : (e.desired === 'Unaware' ? 'D' : ''),
        e.current === 'Resistant' ? 'C' : (e.desired === 'Resistant' ? 'D' : ''),
        e.current === 'Neutral' ? 'C' : (e.desired === 'Neutral' ? 'D' : ''),
        e.current === 'Supportive' ? 'C' : (e.desired === 'Supportive' ? 'D' : ''),
        e.current === 'Leading' ? 'C' : (e.desired === 'Leading' ? 'D' : '')
      ]),
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      headStyles: { fillColor: [48, 48, 48] }
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('C = Current level of engagement D = Desired level of engagement', margin, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['Stakeholder', 'Communication Needs', 'Method/Medium', 'Timing/Frequency']],
      body: smp.engagements.map(e => [e.stakeholderName, e.commNeeds, e.method, e.timing]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Pending Stakeholder Changes', margin, y);
    y += 5;
    const pendingLines = doc.splitTextToSize(smp.pendingChanges || '', pageWidth - 2 * margin);
    doc.rect(margin, y, pageWidth - 2 * margin, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(pendingLines, margin + 2, y + 5);

    // Page 2
    doc.addPage();
    renderHeader(2);
    y = 45;
    doc.setFont('helvetica', 'bold');
    doc.text('Stakeholder Relationships', margin, y);
    y += 5;
    const relLines = doc.splitTextToSize(smp.relationships || '', pageWidth - 2 * margin);
    doc.rect(margin, y, pageWidth - 2 * margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(relLines, margin + 2, y + 5);

    y += 50;
    doc.setFont('helvetica', 'bold');
    doc.text('Stakeholder Engagement Approach', margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Stakeholder', 'Approach']],
      body: smp.engagements.map(e => [e.stakeholderName, e.approach]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-GOV-PLN-STK-V${vStr}-${dateStr}.pdf`);
  };

  const addStakeholder = () => {
    setSmp({
      ...smp,
      engagements: [
        ...smp.engagements,
        { 
          id: Date.now().toString(), 
          stakeholderId: '', 
          stakeholderName: '', 
          current: 'Neutral', 
          desired: 'Neutral', 
          commNeeds: '', 
          method: '', 
          timing: '', 
          approach: '' 
        }
      ]
    });
  };

  const removeStakeholder = (id: string) => {
    setSmp({
      ...smp,
      engagements: smp.engagements.filter(e => e.id !== id)
    });
  };

  const levels: EngagementLevel[] = ['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Stakeholder Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Engagement strategy and relationship management</p>
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
            value={smp.projectTitle}
            onChange={(e) => setSmp({ ...smp, projectTitle: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            placeholder="Enter Project Title..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          <input 
            type="date"
            value={smp.datePrepared}
            onChange={(e) => setSmp({ ...smp, datePrepared: e.target.value })}
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
            className="space-y-10"
          >
            {/* Engagement Matrix */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Engagement Assessment Matrix</h3>
                <button onClick={addStakeholder} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-100 transition-all">
                  <Plus className="w-3 h-3" />
                  Add Stakeholder
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</th>
                      {levels.map(l => (
                        <th key={l} className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{l}</th>
                      ))}
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {smp.engagements.map((eng, idx) => (
                      <tr key={eng.id} className="group">
                        <td className="px-6 py-4">
                          <select 
                            value={eng.stakeholderId}
                            onChange={(e) => {
                              const newEng = [...smp.engagements];
                              newEng[idx].stakeholderId = e.target.value;
                              newEng[idx].stakeholderName = stakeholders.find(s => s.id === e.target.value)?.name || '';
                              setSmp({ ...smp, engagements: newEng });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold"
                          >
                            <option value="">Select Stakeholder...</option>
                            {stakeholders.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        {levels.map(l => (
                          <td key={l} className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  const newEng = [...smp.engagements];
                                  newEng[idx].current = l;
                                  setSmp({ ...smp, engagements: newEng });
                                }}
                                className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all",
                                  eng.current === l ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                )}
                                title="Current Engagement Level"
                              >
                                C
                              </button>
                              <button 
                                onClick={() => {
                                  const newEng = [...smp.engagements];
                                  newEng[idx].desired = l;
                                  setSmp({ ...smp, engagements: newEng });
                                }}
                                className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all",
                                  eng.desired === l ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                )}
                                title="Desired Engagement Level"
                              >
                                D
                              </button>
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => removeStakeholder(eng.id)} className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium italic px-4 py-2 bg-slate-50 rounded-xl w-fit">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white not-italic font-black">C</span> Current Level</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded flex items-center justify-center text-[8px] text-white not-italic font-black">D</span> Desired Level</div>
              </div>
            </section>

            {/* Communication Needs */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Communication Needs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Communication Needs</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method/Medium</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing/Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {smp.engagements.map((eng, idx) => (
                      <tr key={eng.id}>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{eng.stakeholderName || 'Select Stakeholder Above'}</td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={eng.commNeeds}
                            onChange={(e) => {
                              const newEng = [...smp.engagements];
                              newEng[idx].commNeeds = e.target.value;
                              setSmp({ ...smp, engagements: newEng });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm"
                            placeholder="Example: Monthly Budget Status"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={eng.method}
                            onChange={(e) => {
                              const newEng = [...smp.engagements];
                              newEng[idx].method = e.target.value;
                              setSmp({ ...smp, engagements: newEng });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm"
                            placeholder="Example: Official Letter"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={eng.timing}
                            onChange={(e) => {
                              const newEng = [...smp.engagements];
                              newEng[idx].timing = e.target.value;
                              setSmp({ ...smp, engagements: newEng });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm"
                            placeholder="Example: Last Thursday"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pending Stakeholder Changes</label>
              <textarea 
                value={smp.pendingChanges}
                onChange={(e) => setSmp({ ...smp, pendingChanges: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Document any pending changes in stakeholder engagement..."
              />
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="page2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <section className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stakeholder Relationships</label>
              <textarea 
                value={smp.relationships}
                onChange={(e) => setSmp({ ...smp, relationships: e.target.value })}
                rows={6}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Describe key relationships between stakeholders..."
              />
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Stakeholder Engagement Approach</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Approach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {smp.engagements.map((eng, idx) => {
                      const isRequired = eng.current !== eng.desired;
                      return (
                        <tr key={eng.id}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{eng.stakeholderName || 'N/A'}</span>
                              {isRequired && (
                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest mt-1">Required: Gap Detected</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <textarea 
                              value={eng.approach}
                              onChange={(e) => {
                                const newEng = [...smp.engagements];
                                newEng[idx].approach = e.target.value;
                                setSmp({ ...smp, engagements: newEng });
                              }}
                              rows={2}
                              className={cn(
                                "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all resize-none",
                                isRequired && !eng.approach ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"
                              )}
                              placeholder={`Example: Regular briefings on project ROI and milestones...`}
                            />
                          </td>
                        </tr>
                      );
                    })}
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
                  <td className="px-6 py-4 text-sm text-slate-500">Stakeholder Management Plan Update</td>
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
