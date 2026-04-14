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
  Users,
  ChevronRight,
  FileText,
  Printer,
  Download,
  Save,
  Loader2,
  History,
  X,
  ArrowLeft,
  TrendingUp,
  User,
  Calendar,
  Database,
  Mail,
  Phone,
  Briefcase,
  Target
} from 'lucide-react';
import { Page, Stakeholder } from '../types';
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

interface StakeholderRegisterViewProps {
  page: Page;
}

interface StakeholderVersion {
  id: string;
  version: number;
  timestamp: string;
  editorName: string;
  actionType: string;
  data: Stakeholder[];
}

export const StakeholderRegisterView: React.FC<StakeholderRegisterViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<StakeholderVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<Stakeholder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<Stakeholder>>({
    name: '',
    position: '',
    role: '',
    contactInfo: '',
    classification: 'Internal',
    influence: 'Medium',
    interest: 'Medium',
    expectations: '',
    requirements: '',
    priorityScore: 5,
    influenceScore: 5,
    criticalityIndex: 25,
    communicationFrequency: 'Weekly',
    engagementLevel: 'Green'
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const versionsQuery = query(
      collection(db, 'stakeholder_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
      setLoading(false);
    });

    const unsubVersions = onSnapshot(versionsQuery, (snap) => {
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as StakeholderVersion)));
    });

    return () => {
      unsubEntries();
      unsubVersions();
    };
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({
      name: '',
      position: '',
      role: '',
      contactInfo: '',
      classification: 'Internal',
      influence: 'Medium',
      interest: 'Medium',
      expectations: '',
      requirements: '',
      priorityScore: 5,
      influenceScore: 5,
      criticalityIndex: 25,
      communicationFrequency: 'Weekly',
      engagementLevel: 'Green'
    });
    setView('form');
  };

  const handleEdit = (entry: Stakeholder) => {
    setEditingEntry(entry);
    setFormData(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this stakeholder?')) return;
    try {
      await deleteDoc(doc(db, 'stakeholders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'stakeholders');
    }
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.name) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 1) + 1;
        await addDoc(collection(db, 'stakeholder_versions'), {
          projectId: selectedProject.id,
          version: nextVersion,
          timestamp,
          editorName: user,
          actionType: 'Baseline Snapshot',
          data: entries
        });
        
        for (const e of entries) {
          await updateDoc(doc(db, 'stakeholders', e.id), {
            version: nextVersion,
            updatedAt: timestamp,
            updatedBy: user
          });
        }
        alert(`Stakeholder Register version v${nextVersion.toFixed(1)} archived.`);
      } else {
        const entryData = {
          ...formData,
          priorityScore: formData.priorityScore || 5,
          influenceScore: formData.influenceScore || 5,
          criticalityIndex: (formData.priorityScore || 5) * (formData.influenceScore || 5),
          projectId: selectedProject.id,
          version: editingEntry?.version || 1.0,
          updatedAt: timestamp,
          updatedBy: user,
          createdAt: editingEntry?.createdAt || timestamp,
          createdBy: editingEntry?.createdBy || user
        };

        if (editingEntry) {
          await updateDoc(doc(db, 'stakeholders', editingEntry.id), entryData);
        } else {
          await addDoc(collection(db, 'stakeholders'), entryData);
        }
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'stakeholders');
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
    doc.text('STAKEHOLDER REGISTER', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, margin, 45);
    doc.text(`Code: ${selectedProject.code}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: v${(versions[0]?.version || 1.0).toFixed(1)}`, pageWidth - margin, 50, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['NAME', 'POSITION', 'ROLE', 'CLASS', 'INFLUENCE', 'INTEREST', 'ENGAGEMENT']],
      body: entries.map(e => [
        e.name,
        e.position,
        e.role,
        e.classification,
        e.influence,
        e.interest,
        e.engagementLevel
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-REG-STK-${dateStr}-V${vStr}.pdf`);
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'Red': return 'bg-red-100 text-red-700 border-red-200';
      case 'Amber': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredEntries = entries.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
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
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingEntry ? 'Edit Stakeholder' : 'Add New Stakeholder'}
                </h2>
                <p className="text-sm text-slate-500 font-medium">Identify and analyze project stakeholders for effective engagement.</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Position / Title</label>
                <input 
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="Project Director"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Role</label>
                <input 
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="Approver / Decision Maker"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Info</label>
                <input 
                  type="text"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="Email or Phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Classification</label>
                <select 
                  value={formData.classification}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      // Logic for new classification if needed, but for now just allow it
                      return;
                    }
                    setFormData({ ...formData, classification: e.target.value as any });
                  }}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                  <option value="new" className="text-blue-600 font-bold">+ Add New...</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Power / Influence</label>
                <select 
                  value={formData.influence}
                  onChange={(e) => setFormData({ ...formData, influence: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interest Level</label>
                <select 
                  value={formData.interest}
                  onChange={(e) => setFormData({ ...formData, interest: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expectations</label>
                <textarea 
                  value={formData.expectations}
                  onChange={(e) => setFormData({ ...formData, expectations: e.target.value })}
                  rows={3}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requirements</label>
                <textarea 
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={3}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comm. Frequency</label>
                <input 
                  type="text"
                  value={formData.communicationFrequency}
                  onChange={(e) => setFormData({ ...formData, communicationFrequency: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="Weekly / Monthly / Ad-hoc"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Engagement Level</label>
                <select 
                  value={formData.engagementLevel}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      return;
                    }
                    setFormData({ ...formData, engagementLevel: e.target.value as any });
                  }}
                  className={cn(
                    "w-full px-6 py-4 border rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 transition-all outline-none uppercase tracking-widest",
                    getEngagementColor(formData.engagementLevel || 'Green')
                  )}
                >
                  <option value="Green">Green (Supportive)</option>
                  <option value="Amber">Amber (Neutral)</option>
                  <option value="Red">Red (Resistant)</option>
                  <option value="new" className="text-blue-600 font-bold">+ Add New...</option>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search stakeholders..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Add Stakeholder
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
              <History className="w-6 h-6 text-blue-400" />
              Register Snapshots
            </h3>
            <button 
              onClick={() => handleSave(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all"
            >
              Archive Baseline (v{((versions[0]?.version || 1.0) + 1).toFixed(1)})
            </button>
          </div>
          <div className="space-y-4">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-black text-blue-400">v{v.version.toFixed(1)}</div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position / Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Power</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Interest</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Engagement</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Stakeholders...</p>
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
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No stakeholders recorded.</p>
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-900 font-bold">{entry.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{entry.contactInfo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-600 font-medium">{entry.position}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{entry.role}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        entry.classification === 'Internal' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      )}>
                        {entry.classification}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xs font-bold text-slate-600">{entry.influence}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xs font-bold text-slate-600">{entry.interest}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        getEngagementColor(entry.engagementLevel || 'Green')
                      )}>
                        {entry.engagementLevel}
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
