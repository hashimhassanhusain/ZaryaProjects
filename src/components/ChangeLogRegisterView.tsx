import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  Search, 
  Edit2, 
  ShieldAlert, 
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Info,
  History,
  GitBranch,
  ArrowRight
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

interface ChangeLogRegisterViewProps {
  page: Page;
}

interface ChangeLogEntry {
  id: string; // Change ID (e.g., ZRY-CR-001)
  category: string;
  description: string;
  submittedBy: string;
  submissionDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Review';
  disposition: string;
  impactAnalysis: string;
  approvalDate?: string;
  history?: { status: string; date: string; user: string }[];
}

interface ChangeLogData {
  projectTitle: string;
  datePrepared: string;
  entries: ChangeLogEntry[];
}

export const ChangeLogRegisterView: React.FC<ChangeLogRegisterViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [data, setData] = useState<ChangeLogData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    entries: [
      { 
        id: 'ZRY-CR-001', 
        category: 'Scope/Cost', 
        description: 'Increased Plastering Quantity due to design changes in Villa 2.', 
        submittedBy: 'Dana Salih', 
        submissionDate: '2026-03-15', 
        status: 'Approved', 
        disposition: 'Approved by CCB on 2026-03-20. Budget adjusted by +$5,000.',
        impactAnalysis: 'Minor impact on finishing schedule (+2 days).',
        approvalDate: '2026-03-20',
        history: [
          { status: 'Pending', date: '2026-03-15', user: 'Dana Salih' },
          { status: 'In Review', date: '2026-03-18', user: 'Hashim Hassan' },
          { status: 'Approved', date: '2026-03-20', user: 'CCB' }
        ]
      },
      { 
        id: 'ZRY-CR-002', 
        category: 'Quality', 
        description: 'Change in tile specification for the main lobby.', 
        submittedBy: 'Ivan', 
        submissionDate: '2026-03-22', 
        status: 'Pending', 
        disposition: 'Awaiting technical evaluation.',
        impactAnalysis: 'Potential cost saving of $2,000.',
        history: [
          { status: 'Pending', date: '2026-03-22', user: 'Ivan' }
        ]
      }
    ]
  });

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangeLogEntry | null>(null);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    const unsubProject = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const pData = snap.data() as Project;
        if (pData.changeLogData) {
          setData(pData.changeLogData as unknown as ChangeLogData);
        }
        if (pData.changeLogHistory) {
          setVersions(pData.changeLogHistory);
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

  const filteredEntries = data.entries.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateChangeId = () => {
    const count = data.entries.length + 1;
    return `ZRY-CR-${count.toString().padStart(3, '0')}`;
  };

  const handleSaveEntry = (entry: ChangeLogEntry) => {
    const isNew = !data.entries.find(e => e.id === entry.id);
    let newEntries;
    
    // Add history record if status changed
    const existing = data.entries.find(e => e.id === entry.id);
    if (existing && existing.status !== entry.status) {
      const historyRecord = {
        status: entry.status,
        date: new Date().toISOString().split('T')[0],
        user: auth.currentUser?.displayName || auth.currentUser?.email || 'System'
      };
      entry.history = [...(entry.history || []), historyRecord];
    } else if (isNew) {
      entry.history = [{
        status: entry.status,
        date: new Date().toISOString().split('T')[0],
        user: auth.currentUser?.displayName || auth.currentUser?.email || 'System'
      }];
    }

    if (isNew) {
      newEntries = [...data.entries, entry];
    } else {
      newEntries = data.entries.map(e => e.id === entry.id ? entry : e);
    }
    
    setData({ ...data, entries: newEntries });
    setIsFormOpen(false);
    setEditingEntry(null);

    // Restriction Policy Prompt for Approved Changes
    if (entry.status === 'Approved') {
      setShowPrompt({
        type: 'Baseline Update',
        message: "This change is approved. Do you want to propose a read-only update to the Cost/Schedule Baseline?",
        onConfirm: () => {
          console.log('Baseline update proposal confirmed');
          setShowPrompt(null);
        }
      });
    }
  };

  const handleDeleteEntry = (id: string) => {
    setData({ ...data, entries: data.entries.filter(e => e.id !== id) });
  };

  const handleSaveLog = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        changeLogData: data,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: data as any
        };
        updateData.changeLogHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for log
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;

    // Header with Logo
    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANGE LOG', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project Title: ${data.projectTitle || selectedProject.name}`, margin, 45);
    doc.text(`Date Prepared: ${data.datePrepared}`, pageWidth - margin - 50, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Change ID', 'Category', 'Description of Change', 'Submitted by', 'Submission Date', 'Status', 'Disposition']],
      body: data.entries.map(e => [e.id, e.category, e.description, e.submittedBy, e.submissionDate, e.status, e.disposition]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 60 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-GOV-LOG-CHNG-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Change Log</h2>
            <p className="text-xs text-slate-500 font-medium">Tracking all project change requests and CCB decisions</p>
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
            onClick={() => handleSaveLog(true)}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-all"
          >
            Save New Version
          </button>
          <button 
            onClick={() => handleSaveLog(false)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Overwrite
          </button>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <Info className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Change Governance</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Disposition indicates the final decision of the Change Control Board (CCB). Approved changes may require baseline updates to Cost and Schedule.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search changes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <button 
          onClick={() => {
            setEditingEntry({ 
              id: generateChangeId(), 
              category: 'Scope', 
              description: '', 
              submittedBy: '', 
              submissionDate: new Date().toISOString().split('T')[0], 
              status: 'Pending', 
              disposition: '',
              impactAnalysis: ''
            });
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Plus className="w-4 h-4" />
          Add New Change
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Change ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Submitted by</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Status</th>
                <th className="px-8 py-5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEntries.map((e) => (
                <tr key={e.id} className="group hover:bg-slate-50/30 transition-all">
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg tracking-tighter">{e.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase">{e.category}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-900 line-clamp-2">{e.description}</p>
                    {e.disposition && <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">{e.disposition}</p>}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-600 font-medium">{e.submittedBy}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs text-slate-500 font-medium">{e.submissionDate}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                        e.status === 'Approved' ? "bg-green-100 text-green-600" :
                        e.status === 'Rejected' ? "bg-red-100 text-red-600" :
                        e.status === 'In Review' ? "bg-blue-100 text-blue-600" :
                        "bg-amber-100 text-amber-600"
                      )}>
                        {e.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : 
                         e.status === 'Rejected' ? <XCircle className="w-3 h-3" /> : 
                         e.status === 'In Review' ? <Clock className="w-3 h-3" /> :
                         <AlertCircle className="w-3 h-3" />}
                        {e.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          setEditingEntry(e);
                          setIsFormOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEntry(e.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Entry Form Modal */}
      <AnimatePresence>
        {isFormOpen && editingEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Change Request Details</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{editingEntry.id}</p>
                  </div>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      value={editingEntry.category}
                      onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                    >
                      {['Scope', 'Cost', 'Schedule', 'Quality', 'Resources', 'Risk'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Submitted By</label>
                    <select 
                      value={editingEntry.submittedBy}
                      onChange={(e) => setEditingEntry({ ...editingEntry, submittedBy: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                    >
                      <option value="">Select Submitter...</option>
                      {stakeholders.map(s => <option key={s.id} value={s.name}>{s.name} ({s.position})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description of Change</label>
                  <textarea 
                    value={editingEntry.description}
                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                    placeholder="Describe the proposed change..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impact Analysis</label>
                  <textarea 
                    value={editingEntry.impactAnalysis}
                    onChange={(e) => setEditingEntry({ ...editingEntry, impactAnalysis: e.target.value })}
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                    placeholder="Analyze impact on scope, schedule, and cost..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status & Disposition</label>
                    <div className="flex flex-wrap gap-2">
                      {['Pending', 'In Review', 'Approved', 'Rejected'].map((status) => (
                        <button 
                          key={status}
                          onClick={() => setEditingEntry({ ...editingEntry, status: status as any })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            editingEntry.status === status 
                              ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                              : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      value={editingEntry.disposition}
                      onChange={(e) => setEditingEntry({ ...editingEntry, disposition: e.target.value })}
                      rows={2}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                      placeholder="Final decision of the CCB..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Evolution</label>
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 max-h-40 overflow-y-auto">
                      {editingEntry.history?.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 relative pb-3 last:pb-0">
                          {i < editingEntry.history!.length - 1 && (
                            <div className="absolute left-1.5 top-4 bottom-0 w-0.5 bg-slate-200"></div>
                          )}
                          <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0 z-10"></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{h.status}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{h.date} • {h.user}</p>
                          </div>
                        </div>
                      ))}
                      {(!editingEntry.history || editingEntry.history.length === 0) && (
                        <p className="text-[10px] text-slate-400 italic text-center py-4">No history recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveEntry(editingEntry)}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Save Change Request
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
                <ShieldAlert className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Baseline Update Proposal</h3>
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

      {/* Version History (Log Level) */}
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
                  <td className="px-6 py-4 text-sm text-slate-500">Change Log Update</td>
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
