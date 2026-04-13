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
  Lightbulb,
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
  Award,
  BookOpen
} from 'lucide-react';
import { Page, Stakeholder, LessonEntry } from '../types';
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

interface LessonsLearnedViewProps {
  page: Page;
}

interface LessonVersion {
  id: string;
  version: number;
  timestamp: string;
  editorName: string;
  actionType: string;
  data: LessonEntry[];
}

export const LessonsLearnedView: React.FC<LessonsLearnedViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<LessonEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<LessonEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<LessonEntry>>({
    lessonId: '',
    category: 'Technical',
    description: '',
    recommendation: '',
    impact: 'Positive',
    ownerId: '',
    status: 'Draft'
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'lessons_learned'),
      where('projectId', '==', selectedProject.id)
    );

    const stakeholdersQuery = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const versionsQuery = query(
      collection(db, 'lessons_learned_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as LessonEntry)));
      setLoading(false);
    });

    const unsubStakeholders = onSnapshot(stakeholdersQuery, (snap) => {
      setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    });

    const unsubVersions = onSnapshot(versionsQuery, (snap) => {
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as LessonVersion)));
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
      lessonId: `LL-${nextNum.toString().padStart(3, '0')}`,
      category: 'Technical',
      description: '',
      recommendation: '',
      impact: 'Positive',
      ownerId: '',
      status: 'Draft'
    });
    setView('form');
  };

  const handleEdit = (entry: LessonEntry) => {
    setEditingEntry(entry);
    setFormData(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await deleteDoc(doc(db, 'lessons_learned', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'lessons_learned');
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
        await addDoc(collection(db, 'lessons_learned_versions'), {
          projectId: selectedProject.id,
          version: nextVersion,
          timestamp,
          editorName: user,
          actionType: 'Baseline Snapshot',
          data: entries
        });
        
        for (const e of entries) {
          await updateDoc(doc(db, 'lessons_learned', e.id), {
            version: nextVersion,
            updatedAt: timestamp,
            updatedBy: user
          });
        }
        alert(`Lessons Learned version v${nextVersion.toFixed(1)} archived.`);
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
          await updateDoc(doc(db, 'lessons_learned', editingEntry.id), entryData);
        } else {
          await addDoc(collection(db, 'lessons_learned'), entryData);
        }
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'lessons_learned');
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
    doc.text('LESSONS LEARNED REGISTER', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, margin, 45);
    doc.text(`Code: ${selectedProject.code}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: v${(versions[0]?.version || 1.0).toFixed(1)}`, pageWidth - margin, 50, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['ID', 'CATEGORY', 'DESCRIPTION', 'RECOMMENDATION', 'IMPACT', 'OWNER', 'STATUS']],
      body: entries.map(e => [
        e.lessonId,
        e.category,
        e.description,
        e.recommendation,
        e.impact,
        stakeholders.find(s => s.id === e.ownerId)?.name || 'N/A',
        e.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        2: { cellWidth: 50 },
        3: { cellWidth: 50 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-REG-LLN-${dateStr}-V${vStr}.pdf`);
  };

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.lessonId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
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
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingEntry ? 'Edit Lesson' : 'Record New Lesson'}
                </h2>
                <p className="text-sm text-slate-500 font-medium">Capture knowledge and insights to improve future project performance.</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson ID</label>
                <input 
                  type="text"
                  value={formData.lessonId}
                  onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
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
                  <option value="Process">Process</option>
                  <option value="Quality">Quality</option>
                  <option value="Safety">Safety</option>
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
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description of Lesson</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="What happened? What was the situation?..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recommendation</label>
              <textarea 
                value={formData.recommendation}
                onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="What should be done differently next time?..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impact</label>
                <select 
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: e.target.value as any })}
                  className={cn(
                    "w-full px-6 py-4 border rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 transition-all outline-none uppercase tracking-widest",
                    formData.impact === 'Positive' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                  )}
                >
                  <option value="Positive">Positive (Success Story)</option>
                  <option value="Negative">Negative (Corrective Action)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Owner / Contributor</label>
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
            Capture Lesson
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
              <History className="w-6 h-6 text-emerald-400" />
              Register Snapshots
            </h3>
            <button 
              onClick={() => handleSave(true)}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all"
            >
              Archive Baseline (v{((versions[0]?.version || 1.0) + 1).toFixed(1)})
            </button>
          </div>
          <div className="space-y-4">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-black text-emerald-400">v{v.version.toFixed(1)}</div>
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
              placeholder="Search lessons..." 
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact</th>
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
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Lessons...</p>
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
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No lessons captured.</p>
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
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{entry.lessonId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">{entry.category}</div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-900 font-bold line-clamp-1">{entry.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Rec: {entry.recommendation}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        entry.impact === 'Positive' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {entry.impact}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">
                        {stakeholders.find(s => s.id === entry.ownerId)?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        entry.status === 'Published' ? "bg-emerald-100 text-emerald-700" :
                        entry.status === 'Archived' ? "bg-slate-100 text-slate-700" :
                        "bg-amber-100 text-amber-700"
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
