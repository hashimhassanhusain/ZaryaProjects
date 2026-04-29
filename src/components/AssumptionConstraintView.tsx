import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  X,
  Save,
  Loader2,
  History,
  Download,
  Printer,
  ArrowLeft,
  TrendingUp,
  ShieldAlert,
  Database
} from 'lucide-react';
import { Page, AssumptionConstraintEntry, Task, User as UserType, Stakeholder } from '../types';
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
  Timestamp,
  getDocs,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage } from './StandardProcessPage';

interface AssumptionConstraintViewProps {
  page: Page;
}

interface LogVersion {
  id: string;
  version: number;
  timestamp: string;
  authorName: string;
  actionType: string;
  data: AssumptionConstraintEntry[];
}

export const AssumptionConstraintView: React.FC<AssumptionConstraintViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<AssumptionConstraintEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<LogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<AssumptionConstraintEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<AssumptionConstraintEntry>>({
    category: 'Assumption',
    description: '',
    responsiblePartyId: '',
    dueDate: new Date().toISOString().split('T')[0],
    actions: '',
    status: 'Open',
    comments: ''
  });

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'assumption_constraints'),
      where('projectId', '==', selectedProject.id)
    );

    const sq = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const vq = query(
      collection(db, 'assumption_constraints_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubEntries = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssumptionConstraintEntry)));
      setLoading(false);
    });

    const unsubStakeholders = onSnapshot(sq, (snapshot) => {
      setStakeholders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stakeholder)));
    });

    const unsubVersions = onSnapshot(vq, (snapshot) => {
      setVersions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogVersion)));
    });

    return () => {
      unsubEntries();
      unsubStakeholders();
      unsubVersions();
    };
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({
      category: 'Assumption',
      description: '',
      responsiblePartyId: '',
      dueDate: new Date().toISOString().split('T')[0],
      actions: '',
      status: 'Open',
      comments: ''
    });
    setView('form');
  };

  const handleEdit = (entry: AssumptionConstraintEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      description: entry.description,
      responsiblePartyId: entry.responsiblePartyId,
      dueDate: entry.dueDate,
      actions: entry.actions,
      status: entry.status,
      comments: entry.comments
    });
    setView('form');
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Are you sure you want to delete this entry?</p>
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
                await deleteDoc(doc(db, 'assumption_constraints', id));
                toast.success('Entry deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'assumption_constraints');
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
        await addDoc(collection(db, 'assumption_constraints_versions'), {
          projectId: selectedProject.id,
          version: nextVersion,
          timestamp,
          authorName: user,
          actionType: 'Baseline Snapshot',
          data: entries
        });
        
        for (const e of entries) {
          await updateDoc(doc(db, 'assumption_constraints', e.id), {
            version: nextVersion,
            updatedAt: timestamp,
            updatedBy: user
          });
        }
        toast.success(`Log version v${nextVersion.toFixed(1)} archived.`);
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

        let entryId = editingEntry?.id;
        if (editingEntry) {
          await updateDoc(doc(db, 'assumption_constraints', editingEntry.id), entryData);
        } else {
          const docRef = await addDoc(collection(db, 'assumption_constraints'), entryData);
          entryId = docRef.id;
        }

        // --- AUTOMATED ROUTING ---
        // 1. Risk Linkage
        if (formData.category === 'Assumption' && formData.status === 'Open') {
          const dueDate = new Date(formData.dueDate || '');
          if (dueDate < new Date()) {
            // Trigger Risk Entry
            await addDoc(collection(db, 'risks'), {
              projectId: selectedProject.id,
              description: `[Auto-Risk] Expired Assumption: ${formData.description}`,
              category: 'Technical',
              status: 'Draft',
              impact: 'Medium',
              probability: 'High',
              sourceId: entryId,
              createdAt: timestamp
            });
          }
        }

        // 2. Calendar / Task Integration
        if (formData.actions && formData.responsiblePartyId) {
          const taskData = {
            title: `[Log Action] ${formData.category}: ${formData.description.substring(0, 30)}...`,
            description: formData.actions,
            assigneeId: formData.responsiblePartyId,
            endDate: formData.dueDate,
            status: formData.status === 'Closed' ? 'Completed' : 'Todo',
            projectId: selectedProject.id,
            sourceId: entryId,
            createdAt: timestamp
          };
          
          if (editingEntry?.taskId) {
            await updateDoc(doc(db, 'tasks', editingEntry.taskId), taskData);
          } else {
            const taskRef = await addDoc(collection(db, 'tasks'), taskData);
            if (entryId) {
              await updateDoc(doc(db, 'assumption_constraints', entryId), { taskId: taskRef.id });
            }
          }
        }
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'assumption_constraints');
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
    doc.text('ASSUMPTION AND CONSTRAINT LOG', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, margin, 45);
    doc.text(`Code: ${selectedProject.code}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: v${(versions[0]?.version || 1.0).toFixed(1)}`, pageWidth - margin, 50, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['ID', 'CATEGORY', 'ASSUMPTION / CONSTRAINT', 'RESPONSIBLE', 'DUE DATE', 'STATUS']],
      body: entries.map((e, idx) => [
        `AC-${(idx + 1).toString().padStart(3, '0')}`,
        e.category,
        e.description,
        stakeholders.find(s => s.id === e.responsiblePartyId)?.name || 'N/A',
        e.dueDate,
        e.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 80 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-LOG-ASC-${dateStr}-V${vStr}.pdf`);
  };

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <ShieldAlert className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingEntry ? 'Edit Log Entry' : 'New Log Entry'}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Assumptions & Constraints Management</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className={cn(
                          "px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest outline-none transition-all shadow-sm",
                          formData.status === 'Validated' || formData.status === 'Closed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          formData.status === 'Open' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                        <option value="Validated">Validated</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                     <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Classification & Core Logic
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                          <select 
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none"
                          >
                            <option value="Assumption">Assumption / افتراض</option>
                            <option value="Constraint">Constraint / قيد</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Due Date / Target Validation</label>
                          <input 
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-8">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Detailed Description
                      </h3>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Assigned Assumption / Constraint</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                          placeholder="Detail the project logic or external restriction..."
                        />
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Action Plan & Ownership
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Responsible Party</label>
                          <select 
                            value={formData.responsiblePartyId}
                            onChange={(e) => setFormData({ ...formData, responsiblePartyId: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none"
                          >
                            <option value="">Select Responsible...</option>
                            {stakeholders.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                           <div className="p-4 bg-slate-900/5 rounded-2xl border border-slate-200 flex items-center gap-3">
                              <ShieldAlert className="w-5 h-5 text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                Entries with past-due dates automatically trigger risk alerts in the Risk Register.
                              </span>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Actions Required for Validation</label>
                        <textarea 
                          value={formData.actions}
                          onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                          rows={3}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                          placeholder="Specify steps to confirm this assumption or manage the constraint..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Comments & Notes</label>
                        <textarea 
                          value={formData.comments}
                          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                          rows={2}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                        />
                      </div>
                    </section>
                  </div>
                </section>
              </div>

              {/* Right Column: Summaries & History */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <ShieldAlert className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400">Risk Mitigation</h3>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Logic & Constraints Hub</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Inventory</div>
                        <div className="text-2xl font-black italic text-blue-400 tracking-tighter">
                          {entries.length} Logged Items
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                          <div className="text-xl font-black text-amber-400">{entries.filter(e => e.status === 'Open').length}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active/Open</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                          <div className="text-xl font-black text-emerald-400">{entries.filter(e => e.status === 'Closed' || e.status === 'Validated').length}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Resolved</div>
                        </div>
                      </div>

                      <div className="p-5 bg-blue-600/20 border border-blue-500/30 rounded-[2rem] flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                         </div>
                         <div className="space-y-0.5">
                            <div className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">Integrity Score</div>
                            <div className="text-lg font-black text-white">{Math.round((entries.filter(e => e.status === 'Validated').length / (entries.length || 1)) * 100)}% Verified</div>
                         </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-[3rem] p-1 shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-8 bg-slate-50/50 border-b border-slate-100 italic font-bold text-[10px] text-slate-500 uppercase tracking-[0.2em]">Archival Log Versions</div>
                   <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                     {versions.map((v) => (
                       <div key={v.id} className="p-4 bg-white rounded-[1.5rem] border border-slate-100 flex items-start gap-3 relative overflow-hidden group hover:border-blue-200 transition-all">
                         <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transition-all scale-y-0 group-hover:scale-y-100" />
                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                           <History className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                         </div>
                         <div className="min-w-0">
                           <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{v.authorName}</div>
                           <div className="text-[9px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleDateString()}</div>
                           <div className="mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black inline-block uppercase italic">v{v.version.toFixed(1)}</div>
                         </div>
                       </div>
                     ))}
                     {versions.length === 0 && (
                       <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">No snapshots available</div>
                     )}
                   </div>
                </section>

                <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 space-y-4">
                  <div className="flex items-center gap-3 text-amber-600">
                    <Database className="w-5 h-5" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Automation Engine</h4>
                  </div>
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed opacity-70">
                    Verified assumptions are converted to project facts, while unvalidated constraints are automatically migrated to the Probability/Impact risk assessment cycle.
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
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search log..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  <History className="w-4 h-4" />
                  History
                </button>
              </div>
            </div>

            {showHistory && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <History className="w-6 h-6 text-blue-400" />
                    Log Versions
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
                        <div className="text-2xl font-semibold text-blue-400">v{v.version.toFixed(1)}</div>
                        <div>
                          <div className="text-sm font-bold">{v.actionType}</div>
                          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                            {new Date(v.timestamp).toLocaleString()} • {v.authorName}
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

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] w-[150px]">Category</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Assumption / Constraint</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Responsible</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Due Date</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Loading Repository...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-slate-50 rounded-full">
                              <Database className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No entries recorded in current project.</p>
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
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                              entry.category === 'Assumption' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                            )}>
                              {entry.category}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs text-slate-900 font-black tracking-tight line-clamp-2 leading-relaxed">{entry.description}</p>
                            {entry.actions && (
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500" />
                                Action: {entry.actions}
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <User className="w-3 h-3 text-slate-400" />
                               </div>
                               <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                {stakeholders.find(s => s.id === entry.responsiblePartyId)?.name || 'Unassigned'}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest border border-slate-100 px-2 py-1 rounded-lg inline-block">{entry.dueDate}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              entry.status === 'Validated' || entry.status === 'Closed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              entry.status === 'Open' ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-slate-50 text-slate-500 border-slate-200"
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
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
