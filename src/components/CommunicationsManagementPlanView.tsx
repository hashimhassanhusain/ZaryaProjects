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
  MessageSquare,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder, CommunicationPlanEntry } from '../types';
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

interface CommunicationsManagementPlanViewProps {
  page: Page;
}

interface CommPlanData {
  projectTitle: string;
  datePrepared: string;
  matrix: CommunicationPlanEntry[];
  assumptions: string;
  constraints: string;
  glossary: string;
}

export const CommunicationsManagementPlanView: React.FC<CommunicationsManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [commPlan, setCommPlan] = useState<CommPlanData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    matrix: [],
    assumptions: '',
    constraints: '',
    glossary: ''
  });

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [governanceRoles, setGovernanceRoles] = useState<any[]>([]);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CommunicationPlanEntry | null>(null);

  const [newEntry, setNewEntry] = useState<Partial<CommunicationPlanEntry>>({
    stakeholderId: '',
    stakeholderName: '',
    information: '',
    method: '',
    frequency: '',
    sender: '',
    status: 'Active'
  });

  useEffect(() => {
    if (!selectedProject) return;

    // Fetch Comm Plan Data
    const unsubComm = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.commPlanData) {
          setCommPlan(data.commPlanData as unknown as CommPlanData);
        }
        if (data.commPlanHistory) {
          setVersions(data.commPlanHistory);
        }
        if (data.policyData?.roles) {
          setGovernanceRoles(data.policyData.roles);
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
      unsubComm();
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
        commPlanData: commPlan,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: commPlan as any
        };
        updateData.commPlanHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Data Pushing: Assumptions & Constraints to Log
      if (commPlan.assumptions || commPlan.constraints) {
        // This is a bit complex as we don't want to duplicate. 
        // For simplicity in this demo, we'll just log that we would push it.
        // In a real app, we'd check for existing ones or create new entries.
        console.log('Pushing assumptions/constraints to log...');
      }

      // Restriction Policy Prompt
      const affected = ['Reports', 'Schedule'];
      setShowPrompt({
        type: affected.join(' & '),
        message: `This relates to the ${affected.join('/')} module. Propose a link?`,
        onConfirm: () => {
          console.log('Comm Plan linking confirmed for:', affected);
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
      doc.text('COMMUNICATIONS MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
    };

    renderHeader();
    doc.setFontSize(10);
    doc.text(`Project Title: ${commPlan.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${commPlan.datePrepared}`, pageWidth - margin - 50, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Section A: Communications Matrix', margin, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Stakeholder', 'Information', 'Method', 'Timing/Frequency', 'Sender']],
      body: commPlan.matrix.map(m => [m.stakeholderName, m.information, m.method, m.frequency, m.sender]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Section B: Assumptions & Constraints', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      body: [
        ['Assumptions', commPlan.assumptions],
        ['Constraints', commPlan.constraints]
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, fillColor: [245, 245, 245] } }
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Section C: Glossary of Terms or Acronyms', margin, y);
    y += 5;
    const glossaryLines = doc.splitTextToSize(commPlan.glossary || '', pageWidth - 2 * margin);
    doc.setFont('helvetica', 'normal');
    doc.text(glossaryLines, margin, y);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    // [P16314]-[Dept]-[Type]-[Desc]-[Ver]-[Date]
    doc.save(`${selectedProject.code}-GOV-PLN-COMM-V${vStr}-${dateStr}.pdf`);
  };

  const handleAddEntry = () => {
    if (!newEntry.stakeholderId || !newEntry.information) return;
    
    const entry: CommunicationPlanEntry = {
      id: Date.now().toString(),
      projectId: selectedProject?.id || '',
      stakeholderId: newEntry.stakeholderId!,
      stakeholderName: stakeholders.find(s => s.id === newEntry.stakeholderId)?.name || '',
      information: newEntry.information!,
      method: newEntry.method || '',
      frequency: newEntry.frequency || '',
      sender: newEntry.sender || '',
      status: 'Active'
    };

    setCommPlan({
      ...commPlan,
      matrix: [...commPlan.matrix, entry]
    });
    setIsAddingEntry(false);
    setNewEntry({
      stakeholderId: '',
      stakeholderName: '',
      information: '',
      method: '',
      frequency: '',
      sender: '',
      status: 'Active'
    });
  };

  const removeEntry = (id: string) => {
    setCommPlan({
      ...commPlan,
      matrix: commPlan.matrix.filter(m => m.id !== id)
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Communications Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Strategy for project information distribution</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          <input 
            type="text"
            value={commPlan.projectTitle}
            onChange={(e) => setCommPlan({ ...commPlan, projectTitle: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            placeholder="Enter Project Title..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          <input 
            type="date"
            value={commPlan.datePrepared}
            onChange={(e) => setCommPlan({ ...commPlan, datePrepared: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* Section A: Communications Matrix */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Section A: Communications Matrix</h3>
          <button 
            onClick={() => setIsAddingEntry(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-100 transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Communication Requirement
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Information</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing/Frequency</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {commPlan.matrix.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{entry.stakeholderName}</span>
                      {!entry.sender && (
                        <AlertTriangle className="w-3 h-3 text-amber-500" title="Missing Sender" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.information}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.method}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.frequency}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                      entry.sender ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {entry.sender || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => removeEntry(entry.id)} className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {commPlan.matrix.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                    No communication requirements defined. Click "Add Communication Requirement" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section B: Assumptions & Constraints */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section B: Assumptions</label>
          <textarea 
            value={commPlan.assumptions}
            onChange={(e) => setCommPlan({ ...commPlan, assumptions: e.target.value })}
            rows={4}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none"
            placeholder="List any communication assumptions..."
          />
        </div>
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section B: Constraints</label>
          <textarea 
            value={commPlan.constraints}
            onChange={(e) => setCommPlan({ ...commPlan, constraints: e.target.value })}
            rows={4}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none"
            placeholder="List any communication constraints..."
          />
        </div>
      </section>

      {/* Section C: Glossary */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <BookOpen className="w-3 h-3 text-slate-400" />
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Section C: Glossary of Terms or Acronyms</label>
        </div>
        <textarea 
          value={commPlan.glossary}
          onChange={(e) => setCommPlan({ ...commPlan, glossary: e.target.value })}
          rows={6}
          className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
          placeholder="Define terms and acronyms used in this plan..."
        />
      </section>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {isAddingEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">New Communication Requirement</h3>
                <button onClick={() => setIsAddingEntry(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</label>
                  <select 
                    value={newEntry.stakeholderId}
                    onChange={(e) => setNewEntry({ ...newEntry, stakeholderId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                  >
                    <option value="">Select Stakeholder...</option>
                    {stakeholders.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Information</label>
                  <input 
                    type="text"
                    value={newEntry.information}
                    onChange={(e) => setNewEntry({ ...newEntry, information: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                    placeholder="Example: Monthly Budget Status Report"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</label>
                  <input 
                    type="text"
                    value={newEntry.method}
                    onChange={(e) => setNewEntry({ ...newEntry, method: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                    placeholder="Example: Official Letter / Email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing/Frequency</label>
                  <input 
                    type="text"
                    value={newEntry.frequency}
                    onChange={(e) => setNewEntry({ ...newEntry, frequency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                    placeholder="Example: Last Thursday of every month"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender</label>
                  <select 
                    value={newEntry.sender}
                    onChange={(e) => setNewEntry({ ...newEntry, sender: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                  >
                    <option value="">Select Sender...</option>
                    {governanceRoles.map((r, i) => (
                      <option key={i} value={r.name}>{r.name} ({r.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsAddingEntry(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEntry}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Add Requirement
                </button>
              </div>
            </motion.div>
          </div>
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
                  <td className="px-6 py-4 text-sm text-slate-500">Communications Management Plan Update</td>
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

      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium italic p-4 bg-slate-50 rounded-xl">
        <Info className="w-3 h-3" />
        Official communication must follow the Naming Protocol defined in Policies.
      </div>
    </div>
  );
};
