import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Database,
  ChevronRight,
  FileText,
  Printer,
  Download,
  Save,
  Loader2,
  History,
  X,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { Page, User as UserType, Stakeholder } from '../types';
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
  orderBy
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChangeLogViewProps {
  page: Page;
}

interface ChangeEntry {
  id: string;
  changeId: string;
  category: 'Scope' | 'Schedule' | 'Cost' | 'Quality' | 'Resources' | 'Other';
  description: string;
  submittedBy: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Deferred';
  disposition: string;
  costImpact: number;
  scheduleImpact: number;
  projectId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

interface ChangeVersion {
  id: string;
  version: number;
  timestamp: string;
  editorName: string;
  changeSummary: string;
  data: ChangeEntry[];
}

export const ChangeLogView: React.FC<ChangeLogViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<ChangeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<ChangeEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<ChangeEntry>>({
    changeId: '',
    category: 'Scope',
    description: '',
    submittedBy: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    disposition: '',
    costImpact: 0,
    scheduleImpact: 0
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'change_log'),
      where('projectId', '==', selectedProject.id)
    );

    const stakeholdersQuery = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const versionsQuery = query(
      collection(db, 'change_log_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeEntry)));
      setLoading(false);
    });

    const unsubStakeholders = onSnapshot(stakeholdersQuery, (snap) => {
      setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    });

    const unsubVersions = onSnapshot(versionsQuery, (snap) => {
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeVersion)));
    });

    return () => {
      unsubEntries();
      unsubStakeholders();
      unsubVersions();
    };
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    const nextNum = entries.length + 1;
    setFormData({
      changeId: `CR-${nextNum.toString().padStart(3, '0')}`,
      category: 'Scope',
      description: '',
      submittedBy: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      disposition: '',
      costImpact: 0,
      scheduleImpact: 0
    });
    setView('form');
  };

  const handleEdit = (entry: ChangeEntry) => {
    setEditingEntry(entry);
    setFormData(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this change request?')) return;
    try {
      await deleteDoc(doc(db, 'change_log', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'change_log');
    }
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.description) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 1) + 1;
        await addDoc(collection(db, 'change_log_versions'), {
          projectId: selectedProject.id,
          version: nextVersion,
          timestamp,
          editorName: user,
          changeSummary: `Monthly Snapshot v${nextVersion.toFixed(1)}`,
          data: entries
        });
        
        for (const e of entries) {
          await updateDoc(doc(db, 'change_log', e.id), {
            version: nextVersion,
            updatedAt: timestamp,
            updatedBy: user
          });
        }
        alert(`Change Log version v${nextVersion.toFixed(1)} issued.`);
      } else {
        const entryData = {
          ...formData,
          projectId: selectedProject.id,
          version: editingEntry?.version || 1.0,
          updatedAt: timestamp,
          updatedBy: user,
          createdAt: editingEntry?.createdAt || timestamp,
          createdBy: editingEntry?.createdBy || user
        };

        if (editingEntry) {
          await updateDoc(doc(db, 'change_log', editingEntry.id), entryData);
        } else {
          await addDoc(collection(db, 'change_log'), entryData);
        }

        // --- LINKAGE LOGIC ---
        if (formData.status === 'Approved') {
          // 1. Finance Link
          if (formData.costImpact && formData.costImpact > 0) {
            // Push to Cost Variance in PMP or similar
            // For now, we'll log it as a system event or update a project-level metric
            console.log(`[Finance Link] Pushing cost impact: ${formData.costImpact}`);
          }
          // 2. Schedule Link
          if (formData.scheduleImpact && formData.scheduleImpact > 0) {
            console.log(`[Schedule Link] Alerting schedule baseline: ${formData.scheduleImpact} days`);
          }
        }
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'change_log');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CHANGE LOG', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, margin, 45);
    doc.text(`Code: ${selectedProject.code}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: v${(versions[0]?.version || 1.0).toFixed(1)}`, pageWidth - margin, 50, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['ID', 'CAT', 'DESCRIPTION', 'SUBMITTED BY', 'DATE', 'STATUS', 'DISPOSITION']],
      body: entries.map(e => [
        e.changeId,
        e.category,
        e.description,
        e.submittedBy,
        e.date,
        e.status,
        e.disposition
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        2: { cellWidth: 60 },
        6: { cellWidth: 40 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-LOG-CHG-${dateStr}-V${vStr}.pdf`);
  };

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.changeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.submittedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Change Log
        </button>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingEntry ? 'Edit Change Request' : 'New Change Request'}
                </h2>
                <p className="text-sm text-slate-500 font-medium">Document and track project modifications and their impacts.</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Change ID</label>
                <input 
                  type="text"
                  value={formData.changeId}
                  onChange={(e) => setFormData({ ...formData, changeId: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Scope">Scope</option>
                  <option value="Schedule">Schedule</option>
                  <option value="Cost">Cost</option>
                  <option value="Quality">Quality</option>
                  <option value="Resources">Resources</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Deferred">Deferred</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description of Change</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="Detail the proposed change and its justification..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Submitted By</label>
                <select 
                  value={formData.submittedBy}
                  onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Select Stakeholder...</option>
                  {stakeholders.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Submission Date</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Impact (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number"
                    value={formData.costImpact}
                    onChange={(e) => setFormData({ ...formData, costImpact: parseFloat(e.target.value) })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule Impact (Days)</label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number"
                    value={formData.scheduleImpact}
                    onChange={(e) => setFormData({ ...formData, scheduleImpact: parseInt(e.target.value) })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disposition / Comments</label>
              <textarea 
                value={formData.disposition}
                onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}
                rows={3}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="Final decision, justification, or additional notes..."
              />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 mt-12">
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                Last Updated: {editingEntry?.updatedAt ? new Date(editingEntry.updatedAt).toLocaleString() : 'Never'}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="px-8 py-4 text-white font-bold text-sm hover:bg-white/10 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Update Current
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-500 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-amber-200">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{page.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">REF: {page.id}</span>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md">Active Changes: {entries.filter(e => e.status === 'Pending').length}</span>
            </div>
          </div>
        </div>
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
            Export
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            New Change Request
          </button>
        </div>
      </header>

      {showHistory && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[2.5rem] p-8 text-white"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-amber-400" />
              Change Log Snapshots
            </h3>
            <button 
              onClick={() => handleSave(true)}
              className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 transition-all"
            >
              Issue Monthly Snapshot (v{((versions[0]?.version || 1.0) + 1).toFixed(1)})
            </button>
          </div>
          <div className="space-y-4">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-black text-amber-400">v{v.version.toFixed(1)}</div>
                  <div>
                    <div className="text-sm font-bold">{v.changeSummary}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                      {new Date(v.timestamp).toLocaleString()} • {v.editorName}
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search change log..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 text-slate-500 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted By</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Change Log...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-full">
                        <RefreshCw className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No changes recorded.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    onClick={() => handleEdit(entry)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{entry.changeId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        entry.category === 'Cost' ? "bg-red-50 text-red-600" :
                        entry.category === 'Schedule' ? "bg-blue-50 text-blue-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-900 font-bold line-clamp-1">{entry.description}</p>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Impact: {entry.costImpact > 0 ? `+$${entry.costImpact.toLocaleString()}` : 'No Cost'} • {entry.scheduleImpact > 0 ? `+${entry.scheduleImpact} Days` : 'No Delay'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">{entry.submittedBy}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{entry.date}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        entry.status === 'Approved' ? "bg-emerald-100 text-emerald-700" :
                        entry.status === 'Rejected' ? "bg-red-100 text-red-700" :
                        entry.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
