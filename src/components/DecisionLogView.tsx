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
  FileText,
  Printer,
  Download,
  Save,
  Loader2,
  History,
  X,
  ArrowLeft,
  Gavel,
  User,
  Calendar,
  Database,
  AlertTriangle,
  ChevronRight,
  CheckSquare,
  Square,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  FileSignature,
  Calculator,
  Info,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { Page, DecisionLogEntry, DecisionLogVersion, Stakeholder } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
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
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DecisionLogViewProps {
  page: Page;
}

export const DecisionLogView: React.FC<DecisionLogViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<DecisionLogEntry[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<DecisionLogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [versions, setVersions] = useState<DecisionLogVersion[]>([]);

  const [formData, setFormData] = useState<Partial<DecisionLogEntry>>({
    decisionId: '',
    category: 'Scope',
    decision: '',
    responsibleParty: '',
    date: new Date().toISOString().split('T')[0],
    comments: '',
    version: 1.0
  });

  useEffect(() => {
    if (!selectedProject?.id) return;

    const entriesQuery = query(
      collection(db, 'decision_log'),
      where('projectId', '==', selectedProject.id),
      orderBy('decisionId', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as DecisionLogEntry)));
    });

    const fetchStakeholders = async () => {
      const sQuery = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
      const sSnap = await getDocs(sQuery);
      setStakeholders(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    };
    fetchStakeholders();

    return () => unsubEntries();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (editingEntry?.id) {
      const vQuery = query(
        collection(db, 'decision_log_versions'),
        where('decisionId', '==', editingEntry.id),
        orderBy('version', 'desc')
      );
      const unsubVersions = onSnapshot(vQuery, (snap) => {
        setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as DecisionLogVersion)));
      });
      return () => unsubVersions();
    } else {
      setVersions([]);
    }
  }, [editingEntry?.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    const nextNum = entries.length + 1;
    setFormData({
      decisionId: `ZRY-DEC-${nextNum.toString().padStart(3, '0')}`,
      category: 'Scope',
      decision: '',
      responsibleParty: '',
      date: new Date().toISOString().split('T')[0],
      comments: '',
      version: 1.0
    });
    setView('form');
  };

  const handleEdit = (entry: DecisionLogEntry) => {
    setEditingEntry(entry);
    setFormData(entry);
    setView('form');
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.decisionId) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const entryData = {
        ...formData,
        projectId: selectedProject.id,
        version: isNewVersion ? (editingEntry?.version || 1.0) + 0.1 : (editingEntry?.version || 1.0),
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingEntry?.createdAt || timestamp,
        createdBy: editingEntry?.createdBy || user
      };

      let docRef;
      if (editingEntry && !isNewVersion) {
        docRef = doc(db, 'decision_log', editingEntry.id);
        await updateDoc(docRef, entryData);
        toast.success("Decision updated");
      } else {
        docRef = await addDoc(collection(db, 'decision_log'), entryData);
        toast.success("Decision recorded");
      }

      // Version History
      await addDoc(collection(db, 'decision_log_versions'), {
        decisionId: docRef.id,
        version: entryData.version,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        actionType: isNewVersion ? 'New Version' : (editingEntry ? 'Update' : 'Initial Create'),
        data: entryData,
        changeSummary: isNewVersion ? 'Created new version' : (editingEntry ? 'Updated existing record' : 'Initial entry')
      });

      setView('list');
    } catch (err) {
      toast.error("Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Retire this decision record?")) return;
    try {
      await deleteDoc(doc(db, 'decision_log', id));
      toast.success('Decision record retired');
    } catch (error) {
       toast.error("Deletion failed");
    }
  };

  const generatePDF = async () => {
    if (!selectedProject) return;
    const pdfDoc = new jsPDF('l', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('DECISION LOG', pageWidth / 2, 35, { align: 'center' });
    pdfDoc.setFontSize(10);
    pdfDoc.text(`Project Title: ${selectedProject.name}`, margin, 45);
    pdfDoc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 45);

    autoTable(pdfDoc, {
      startY: 50,
      head: [['ID', 'Category', 'Decision', 'Responsible Party', 'Date', 'Comments']],
      body: entries.map(e => [
        e.decisionId,
        e.category,
        e.decision,
        e.responsibleParty,
        e.date,
        e.comments
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [48, 48, 48], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    pdfDoc.save(`${selectedProject.code}-DECISION-LOG.pdf`);
  };

  const filteredEntries = entries.filter(e => 
    e.decisionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.decision || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.responsibleParty || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
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
              {/* Left Column: Decision Details */}
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Gavel className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingEntry ? 'Update Decision Entry' : 'Log New Decision'}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1 italic">Formalizing project intelligence & authority</p>
                      </div>
                    </div>
                    <div className="px-4 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      v{(formData.version || 1.0).toFixed(1)}
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    {/* Identification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Decision ID</label>
                         <input 
                           type="text"
                           value={formData.decisionId}
                           onChange={(e) => setFormData({ ...formData, decisionId: e.target.value })}
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Governance Category</label>
                         <select 
                           value={formData.category}
                           onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none"
                         >
                            {['Scope', 'Cost/Price', 'Schedule', 'Quality', 'Quantity'].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                         </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Responsible Party / Stakeholder</label>
                      <select 
                        value={formData.responsibleParty}
                        onChange={(e) => setFormData({ ...formData, responsibleParty: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none"
                      >
                        <option value="">Select Responsible Party...</option>
                        {stakeholders.map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Decision / Formal Outcome</label>
                      <textarea 
                        value={formData.decision}
                        onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                        rows={4}
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none leading-relaxed"
                        placeholder="State the formal decision and its rationale..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Comments & Context</label>
                      <textarea 
                        value={formData.comments}
                        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                        rows={3}
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none leading-relaxed"
                        placeholder="Additional notes for audit trail..."
                      />
                    </div>

                    <div className="flex justify-end gap-4 pt-10 border-t border-slate-50">
                       <button 
                         onClick={() => handleSave(true)}
                         disabled={isSaving}
                         className="px-8 py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                       >
                         Lock Version & Record New
                       </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Assessment & History */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-indigo-600/20 transition-all duration-700" />
                   <div className="relative z-10 space-y-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 font-sans">Strategic Impact</h3>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Decision Domain Analysis</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-between group/impact transition-all hover:bg-white/10">
                           <div className="space-y-1">
                             <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selected Category</div>
                             <div className="text-lg font-black italic text-white uppercase">{formData.category}</div>
                           </div>
                           <ShieldCheck className={cn(
                             "w-8 h-8 transition-all",
                             (formData.category === 'Cost/Price' || formData.category === 'Schedule') ? "text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "text-emerald-500"
                           )} />
                        </div>

                        {(formData.category === 'Cost/Price' || formData.category === 'Schedule') && (
                          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] space-y-3">
                             <div className="flex items-center gap-2 text-amber-500">
                               <AlertTriangle className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Baseline Alert</span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                               Note: This decision involves protected domains. No changes will be made to POs or Gantt Chart without manual confirmation.
                             </p>
                          </div>
                        )}
                      </div>
                   </div>
                </section>

                {/* Audit History */}
                {editingEntry && versions.length > 0 && (
                  <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm flex flex-col p-8 space-y-8">
                     <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        Audit Trail History
                     </h3>
                     <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {versions.map(v => (
                          <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group/version hover:bg-white transition-all">
                             <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black italic">v{v.version.toFixed(1)}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(v.timestamp).toLocaleDateString()}</span>
                             </div>
                             <p className="text-[10px] font-bold text-slate-700 leading-tight italic uppercase tracking-tight">{v.changeSummary}</p>
                             <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                                <div className="flex items-center gap-2">
                                   <div className="w-4 h-4 bg-slate-200 rounded-full" />
                                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{v.userName}</span>
                                </div>
                                <button 
                                  onClick={() => setFormData(v.data as DecisionLogEntry)}
                                  className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover/version:opacity-100 transition-opacity"
                                >
                                  Preview Details
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </section>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Decision Governance Log</h2>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic italic">Formalizing project authority: {entries.length} decisions logged</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ID, Category, Stakeholder..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none w-64"
                      />
                    </div>
                    <button 
                      onClick={handleAdd}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Log Outcome
                    </button>
                 </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/20 border-b border-slate-50">
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Decision ID</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Impact Core</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Formal Outcome</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Authority / Party</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Date</th>
                          <th className="px-10 py-6"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredEntries.length === 0 ? (
                         <tr>
                            <td colSpan={6} className="px-10 py-32 text-center text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em] italic">No decisions recorded for selected criteria.</td>
                         </tr>
                       ) : filteredEntries.map((entry) => (
                        <tr key={entry.id} onClick={() => handleEdit(entry)} className="hover:bg-slate-50 group cursor-pointer transition-colors relative overflow-hidden">
                           <td className="px-10 py-8">
                              <span className="text-sm font-black text-slate-900 tracking-tight italic uppercase">{entry.decisionId}</span>
                           </td>
                           <td className="px-10 py-8">
                             <div className={cn(
                               "inline-flex px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.1em]",
                               entry.category === 'Cost/Price' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                               entry.category === 'Schedule' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                               "bg-indigo-50 text-indigo-600 border border-indigo-100"
                             )}>
                               {entry.category}
                             </div>
                           </td>
                           <td className="px-10 py-8 min-w-[300px]">
                              <div className="text-xs font-bold text-slate-700 line-clamp-2 max-w-xs uppercase leading-relaxed font-sans">{entry.decision}</div>
                           </td>
                           <td className="px-10 py-8">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-900 tracking-tight italic uppercase">{entry.responsibleParty}</span>
                              </div>
                           </td>
                           <td className="px-10 py-8">
                              <div className="text-[10px] font-bold text-slate-400 tracking-widest">{entry.date}</div>
                           </td>
                           <td className="px-10 py-8 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                className="opacity-0 group-hover:opacity-100 p-3 bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row gap-10 items-center shadow-2xl">
                  <div className="flex-1 space-y-6 relative z-10">
                    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center ring-1 ring-indigo-500/30 shadow-inner">
                      <FileSignature className="w-7 h-7 text-indigo-400" />
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter leading-none uppercase">Governance<br/>Integrity Hub</h3>
                    <p className="text-slate-400 font-bold leading-relaxed max-w-xl text-[10px] uppercase tracking-wide opacity-80 font-sans">
                      The Decision Log formalizes all verbal agreements. High-impact decisions (Cost/Schedule) trigger a manual baseline review to ensure Zarya's data integrity across domains.
                    </p>
                  </div>
                  <div className="absolute right-[-5%] bottom-[-10%] opacity-5 rotate-12 scale-150 pointer-events-none">
                    <Gavel className="w-96 h-96" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="bg-white rounded-[3rem] border border-slate-200 p-8 flex flex-col justify-between items-center text-center group hover:border-indigo-500 transition-all cursor-default">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calculator className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged Decisions</div>
                      <div className="text-4xl font-black italic tracking-tighter text-slate-900">{entries.length}</div>
                    </div>
                    <div className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Active Audit Trail</div>
                  </div>
                  <div className="bg-white rounded-[3rem] border border-slate-200 p-8 flex flex-col justify-between items-center text-center group hover:border-amber-500 transition-all cursor-default">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impact Alerts</div>
                      <div className="text-4xl font-black italic tracking-tighter text-slate-900">
                        {entries.filter(e => e.category === 'Cost/Price' || e.category === 'Schedule').length}
                      </div>
                    </div>
                    <div className="text-[8px] font-black text-amber-600 uppercase tracking-widest italic leading-none px-4">Manual Review Mandatory</div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block">
    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>
  </div>
);
