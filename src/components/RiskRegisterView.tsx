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
  AlertTriangle,
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
  Shield,
  User,
  Calendar,
  Database
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
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskRegisterViewProps {
  page: Page;
}

interface RiskEntry {
  id: string;
  riskId: string;
  description: string;
  category: 'Technical' | 'Management' | 'Commercial' | 'External' | 'Other';
  probability: number; // 1-5
  impact: number; // 1-5
  score: number;
  strategy: 'Avoid' | 'Mitigate' | 'Transfer' | 'Accept' | 'Escalate';
  ownerId: string;
  status: 'Draft' | 'Active' | 'Closed' | 'Occurred';
  projectId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  sourceId?: string; // If triggered from Assumption Log
}

interface RiskVersion {
  id: string;
  version: number;
  timestamp: string;
  editorName: string;
  actionType: string;
  data: RiskEntry[];
}

export const RiskRegisterView: React.FC<RiskRegisterViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<RiskEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<RiskVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<RiskEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<RiskEntry>>({
    riskId: '',
    description: '',
    category: 'Technical',
    probability: 3,
    impact: 3,
    score: 9,
    strategy: 'Mitigate',
    ownerId: '',
    status: 'Draft'
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'risks'),
      where('projectId', '==', selectedProject.id)
    );

    const stakeholdersQuery = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const versionsQuery = query(
      collection(db, 'risk_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as RiskEntry)));
      setLoading(false);
    });

    const unsubStakeholders = onSnapshot(stakeholdersQuery, (snap) => {
      setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    });

    const unsubVersions = onSnapshot(versionsQuery, (snap) => {
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RiskVersion)));
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
      riskId: `RSK-${nextNum.toString().padStart(3, '0')}`,
      description: '',
      category: 'Technical',
      probability: 3,
      impact: 3,
      score: 9,
      strategy: 'Mitigate',
      ownerId: '',
      status: 'Draft'
    });
    setView('form');
  };

  const handleEdit = (entry: RiskEntry) => {
    setEditingEntry(entry);
    setFormData(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this risk?')) return;
    try {
      await deleteDoc(doc(db, 'risks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'risks');
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
        await addDoc(collection(db, 'risk_versions'), {
          projectId: selectedProject.id,
          version: nextVersion,
          timestamp,
          editorName: user,
          actionType: 'Baseline Snapshot',
          data: entries
        });
        
        for (const e of entries) {
          await updateDoc(doc(db, 'risks', e.id), {
            version: nextVersion,
            updatedAt: timestamp,
            updatedBy: user
          });
        }
        alert(`Risk Register version v${nextVersion.toFixed(1)} archived.`);
      } else {
        const entryData = {
          ...formData,
          score: (formData.probability || 0) * (formData.impact || 0),
          projectId: selectedProject.id,
          version: editingEntry?.version || 1.0,
          updatedAt: timestamp,
          updatedBy: user,
          createdAt: editingEntry?.createdAt || timestamp,
          createdBy: editingEntry?.createdBy || user
        };

        if (editingEntry) {
          await updateDoc(doc(db, 'risks', editingEntry.id), entryData);
        } else {
          await addDoc(collection(db, 'risks'), entryData);
        }

        // --- AUTOMATED ROUTING ---
        if (formData.status === 'Occurred') {
          const confirmIssue = window.confirm("This risk has occurred. Do you want to trigger an entry in the Issue Log?");
          if (confirmIssue) {
            await addDoc(collection(db, 'issues'), {
              projectId: selectedProject.id,
              description: `[Risk Triggered] ${formData.description}`,
              category: formData.category,
              priority: (formData.probability || 0) * (formData.impact || 0) > 15 ? 'High' : 'Medium',
              ownerId: formData.ownerId,
              dateIdentified: timestamp.split('T')[0],
              status: 'Open',
              sourceId: editingEntry?.id || 'new_risk'
            });
          }
        }
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'risks');
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
    doc.text('PROJECT RISK REGISTER', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, margin, 45);
    doc.text(`Code: ${selectedProject.code}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: v${(versions[0]?.version || 1.0).toFixed(1)}`, pageWidth - margin, 50, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['ID', 'DESCRIPTION', 'CAT', 'PROB', 'IMP', 'SCORE', 'STRATEGY', 'OWNER', 'STATUS']],
      body: entries.map(e => [
        e.riskId,
        e.description,
        e.category,
        e.probability,
        e.impact,
        e.score,
        e.strategy,
        stakeholders.find(s => s.id === e.ownerId)?.name || 'N/A',
        e.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        1: { cellWidth: 50 },
        6: { cellWidth: 25 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-REG-RSK-${dateStr}-V${vStr}.pdf`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 8) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.riskId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Register
        </button>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingEntry ? 'Edit Risk' : 'Identify New Risk'}
                </h2>
                <p className="text-sm text-slate-500 font-medium">Assess and plan responses for project uncertainties.</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk ID</label>
                <input 
                  type="text"
                  value={formData.riskId}
                  onChange={(e) => setFormData({ ...formData, riskId: e.target.value })}
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
                  <option value="Technical">Technical</option>
                  <option value="Management">Management</option>
                  <option value="Commercial">Commercial</option>
                  <option value="External">External</option>
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
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Occurred">Occurred</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="Describe the risk event and its potential impact..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Probability (1-5)</label>
                <input 
                  type="range"
                  min="1"
                  max="5"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                  <span>Very Low</span>
                  <span>Low</span>
                  <span>Med</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impact (1-5)</label>
                <input 
                  type="range"
                  min="1"
                  max="5"
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                  <span>Negligible</span>
                  <span>Minor</span>
                  <span>Mod</span>
                  <span>Major</span>
                  <span>Catastrophic</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risk Score</span>
                <span className={cn(
                  "text-3xl font-black px-4 py-1 rounded-xl border",
                  getScoreColor((formData.probability || 0) * (formData.impact || 0))
                )}>
                  {(formData.probability || 0) * (formData.impact || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Response Strategy</label>
                <select 
                  value={formData.strategy}
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Avoid">Avoid</option>
                  <option value="Mitigate">Mitigate</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Accept">Accept</option>
                  <option value="Escalate">Escalate</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Owner</label>
                <select 
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Select Owner...</option>
                  {stakeholders.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 mt-12">
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                Last Updated: {editingEntry?.updatedAt ? new Date(editingEntry.updatedAt).toLocaleString('en-US') : 'Never'}
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
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
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
            Identify Risk
          </button>
        </div>
      </div>

      {showHistory && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[2.5rem] p-8 text-white"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-red-400" />
              Register Snapshots
            </h3>
            <button 
              onClick={() => handleSave(true)}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all"
            >
              Archive Baseline (v{((versions[0]?.version || 1.0) + 1).toFixed(1)})
            </button>
          </div>
          <div className="space-y-4">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-black text-red-400">v{v.version.toFixed(1)}</div>
                  <div>
                    <div className="text-sm font-bold">{v.actionType}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                      {new Date(v.timestamp).toLocaleString('en-US')} • {v.editorName}
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
              placeholder="Search risks..." 
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategy</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Risks...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-full">
                        <Database className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No risks identified.</p>
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
                      <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-md">{entry.riskId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-900 font-bold line-clamp-1">{entry.description}</p>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Category: {entry.category}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-10 h-10 rounded-xl border text-sm font-black",
                        getScoreColor(entry.score)
                      )}>
                        {entry.score}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">{entry.strategy}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">
                        {stakeholders.find(s => s.id === entry.ownerId)?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        entry.status === 'Closed' ? "bg-emerald-100 text-emerald-700" :
                        entry.status === 'Occurred' ? "bg-red-100 text-red-700" :
                        entry.status === 'Active' ? "bg-amber-100 text-amber-700" :
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
