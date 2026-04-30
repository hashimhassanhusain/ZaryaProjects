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
  BookOpen,
  LayoutDashboard
} from 'lucide-react';
import { Page, Stakeholder, LessonEntry, Project, EntityConfig } from '../types';
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
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

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
  const { t, isRtl } = useLanguage();
  const context = useStandardProcessPage();
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
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete this lesson?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'lessons_learned', id));
                toast.success('Lesson deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'lessons_learned');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
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
        toast.success(`Lessons Learned version v${nextVersion.toFixed(1)} archived.`);
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

  const gridConfig: EntityConfig = {
    id: 'lessons' as any,
    label: page.title,
    icon: Lightbulb,
    collection: 'lessons_learned',
    columns: [
      { key: 'lessonId', label: 'ID', type: 'badge' },
      { key: 'category', label: 'Category', type: 'string' },
      { key: 'description', label: 'Description', type: 'string' },
      { key: 'impact', label: 'Impact', type: 'badge' },
      { key: 'status', label: 'Status', type: 'badge' }
    ]
  };

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={page.details?.inputs?.map(id => ({ id, title: id })) || []}
    >
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left Column: Form Inputs */}
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                        <Lightbulb className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingEntry ? t('edit_lesson') : t('record_new_lesson')}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('knowledge_capture')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className={cn(
                          "px-4 py-2 rounded-xl border font-bold text-sm uppercase tracking-widest outline-none transition-all shadow-sm",
                          formData.status === 'Published' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          formData.status === 'Archived' ? "bg-slate-50 text-slate-500 border-slate-200" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Contextual Identification
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Lesson ID</label>
                          <input 
                            type="text"
                            value={formData.lessonId}
                            onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                            placeholder="LL-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                          <select 
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none appearance-none"
                          >
                            <option value="Technical">Technical / تقني</option>
                            <option value="Management">Management / إداري</option>
                            <option value="Process">Process / عمليات</option>
                            <option value="Quality">Quality / جودة</option>
                            <option value="Safety">Safety / سلامة</option>
                            <option value="Other">Other / أخرى</option>
                          </select>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-8">
                       <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Descriptive Content
                      </h3>
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Description of Lesson Learned</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"
                          placeholder={t('describe_lesson_placeholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Recommendation for Future Improvements</label>
                        <textarea 
                          value={formData.recommendation}
                          onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                          rows={4}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"
                          placeholder={t('recommendation_placeholder')}
                        />
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Attribution & Impact
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Impact Direction</label>
                          <div className="flex gap-4">
                             <button
                               onClick={() => setFormData({ ...formData, impact: 'Positive' })}
                               className={cn(
                                 "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all group",
                                 formData.impact === 'Positive' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-slate-50 border-slate-100 text-slate-400"
                               )}
                             >
                               <Award className={cn("w-6 h-6", formData.impact === 'Positive' ? "text-emerald-600" : "group-hover:text-emerald-400")} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Positive Success</span>
                             </button>
                             <button
                               onClick={() => setFormData({ ...formData, impact: 'Negative' })}
                               className={cn(
                                 "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all group",
                                 formData.impact === 'Negative' ? "bg-rose-50 border-rose-500 text-rose-700" : "bg-slate-50 border-slate-100 text-slate-400"
                               )}
                             >
                               <History className={cn("w-6 h-6", formData.impact === 'Negative' ? "text-rose-600" : "group-hover:text-rose-400")} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Corrective Action</span>
                             </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Owner / Primary Contributor</label>
                          <select 
                            value={formData.ownerId}
                            onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none appearance-none"
                          >
                            <option value="">Select Personnel...</option>
                            {stakeholders.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </section>
                  </div>
                </section>
              </div>

              {/* Right Column: Summaries & Insights */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl -ml-24 -mb-24 group-hover:bg-emerald-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">Institutional Wisdom</h3>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Zarya Knowledge Base</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Current Register Score</div>
                        <div className="text-2xl font-black italic text-emerald-400 tracking-tighter">
                          {entries.length} Artifacts
                        </div>
                      </div>

                      <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Distribution</div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           <div className="text-center p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                             <div className="text-sm font-black text-emerald-400">{entries.filter(e => e.impact === 'Positive').length}</div>
                             <div className="text-[8px] font-bold opacity-40 uppercase">Successes</div>
                           </div>
                           <div className="text-center p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                             <div className="text-sm font-black text-rose-400">{entries.filter(e => e.impact === 'Negative').length}</div>
                             <div className="text-[8px] font-bold opacity-40 uppercase">Lessons</div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-6">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>Latest Baseline</span>
                        <span className="text-emerald-500">v{(versions[0]?.version || 1.0).toFixed(1)}</span>
                      </div>
                      <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-slate-500" />
                         </div>
                         <div className="text-[9px] font-medium text-slate-400 truncate">
                            {versions[0]?.timestamp ? new Date(versions[0].timestamp).toLocaleDateString() : 'No baseline snapshots yet'}
                         </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-[3rem] p-1 shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-8 bg-slate-50/50 border-b border-slate-100 italic font-bold text-[10px] text-slate-500 uppercase tracking-[0.2em]">{t('archival_history')}</div>
                   <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                     {versions.map((v) => (
                       <div key={v.id} className="p-4 bg-white rounded-[1.5rem] border border-slate-100 flex items-start gap-3 relative overflow-hidden group hover:border-emerald-200 transition-all">
                         <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 transition-all scale-y-0 group-hover:scale-y-100" />
                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                           <History className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                         </div>
                         <div className="min-w-0">
                           <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{v.editorName}</div>
                           <div className="text-[9px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleString()}</div>
                           <div className="mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black inline-block uppercase italic">v{v.version.toFixed(1)}</div>
                         </div>
                       </div>
                     ))}
                     {versions.length === 0 && (
                       <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">{t('no_snapshots')}</div>
                     )}
                   </div>
                </section>

                <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-4">
                  <div className="flex items-center gap-3 text-blue-600">
                    <Database className="w-5 h-5" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">{t('auto_mining')}</h4>
                  </div>
                  <p className="text-[10px] text-blue-800 font-bold leading-relaxed opacity-70">
                    Zarya logic monitors project closure activities to automatically flag potential success cases for the company-wide knowledge base.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-6 flex items-center justify-end">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                <History className="w-3.5 h-3.5" />
                {t('history')}
              </button>
            </div>

            {showHistory && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-[2rem] p-8 text-white mb-8"
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
                        <div className="text-2xl font-semibold text-emerald-400">v{v.version.toFixed(1)}</div>
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

            <UniversalDataTable 
              config={gridConfig}
              data={entries}
              onRowClick={(record) => handleEdit(record as LessonEntry)}
              onNewClick={handleAdd}
              onDeleteRecord={handleDelete}
              title={context?.pageHeader}
              favoriteControl={context?.favoriteControl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
