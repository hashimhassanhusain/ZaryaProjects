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
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<DecisionLogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ message: string; onConfirm: () => void } | null>(null);
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
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'decision_log'),
      where('projectId', '==', selectedProject.id),
      orderBy('decisionId', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as DecisionLogEntry)));
      setLoading(false);
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
    if (editingEntry) {
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
  }, [editingEntry]);

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
      } else {
        docRef = await addDoc(collection(db, 'decision_log'), entryData);
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

      // Mandatory Confirmation for financial/time implications
      if (formData.category === 'Cost/Price' || formData.category === 'Schedule') {
        setShowPrompt({
          message: "This decision has financial/time implications. Propose a draft link for review?",
          onConfirm: () => {
            console.log('Draft link proposed');
            setShowPrompt(null);
            setView('list');
          }
        });
      } else {
        setView('list');
      }

    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'decision_log');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete this decision?</p>
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
                await deleteDoc(doc(db, 'decision_log', id));
                toast.success('Decision deleted successfully');
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'decision_log');
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

  const generatePDF = async () => {
    if (!selectedProject) return;
    const pdfDoc = new jsPDF('l', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    // Logo
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
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 70 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25 },
        5: { cellWidth: 60 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `${selectedProject.code}-GOV-DEC-LOG-${dateStr}.pdf`;
    
    // Auto-save simulation
    const timestamp = new Date().toISOString();
    const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
    const newDoc = {
      id: `drive_${Date.now()}`,
      name: fileName,
      date: timestamp,
      url: '#',
      author: user,
      version: 1.0,
      pageId: page.id,
      path: '/01-Management/01-Governance/'
    };

    const projectDoc = await getDoc(doc(db, 'projects', selectedProject.id));
    if (projectDoc.exists()) {
      const pData = projectDoc.data();
      const updatedDocs = [...(pData.savedDocuments || []), newDoc];
      await updateDoc(doc(db, 'projects', selectedProject.id), { savedDocuments: updatedDocs });
    }

    pdfDoc.save(fileName);
  };

  const filteredEntries = entries.filter(e => 
    e.decisionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.responsibleParty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Register
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
              VERSION: v{(formData.version || 1.0).toFixed(1)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
                  Decision ID
                  <Tooltip text="Auto-generated unique ID (e.g., ZRY-DEC-001)" />
                </label>
                <input 
                  type="text"
                  value={formData.decisionId}
                  onChange={(e) => setFormData({ ...formData, decisionId: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="Example: ZRY-DEC-005"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
                  Category
                  <Tooltip text="Mandatory dropdown including Schedule, Cost/Price, Quantity, Quality, Scope" />
                </label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Schedule">Schedule</option>
                  <option value="Cost/Price">Cost/Price</option>
                  <option value="Quantity">Quantity</option>
                  <option value="Quality">Quality</option>
                  <option value="Scope">Scope</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            {(formData.category === 'Cost/Price' || formData.category === 'Schedule') && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-6 flex items-start gap-4 animate-pulse">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Protected Domain Warning</h4>
                  <p className="text-xs text-amber-700 mt-1 font-medium">
                    Note: This decision involves protected domains. No changes will be made to POs or Gantt Chart without manual confirmation.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
                Responsible Party
                <Tooltip text="Responsible party for this decision" />
              </label>
              <select 
                value={formData.responsibleParty}
                onChange={(e) => setFormData({ ...formData, responsibleParty: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              >
                <option value="">Select Responsible Party...</option>
                {stakeholders.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                ))}
                <option value="Hashim Hassan">Hashim Hassan (Director)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
                Decision
                <Tooltip text="Example: Approved using cement plaster for basement services to resist moisture" />
              </label>
              <textarea 
                value={formData.decision}
                onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="Describe the decision in detail..."
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Comments</label>
              <textarea 
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="Additional context or notes..."
              />
            </div>

            {/* Version History */}
            {editingEntry && versions.length > 0 && (
              <div className="pt-10 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Version History
                </h3>
                <div className="space-y-4">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-[10px] font-semibold text-blue-600">v{v.version.toFixed(1)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{v.changeSummary}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                            {v.userName} • {new Date(v.timestamp).toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setFormData(v.data as DecisionLogEntry)}
                        className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest hover:text-blue-700"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-xl p-8 mt-12">
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                <Info className="w-4 h-4" />
                Decision Log Audit Trail Active
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="px-8 py-4 text-white font-bold text-sm hover:bg-white/10 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/20 transition-all flex items-center gap-2"
                >
                  Save as New Version
                </button>
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Overwrite Current
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID, Decision or Responsible Party..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Printer className="w-5 h-5" />
            Export Log
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            New Decision
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Decision</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Responsible Party</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium">
                    No decisions recorded yet.
                  </td>
                </tr>
              ) : filteredEntries.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <span className="text-sm font-semibold text-slate-900">{entry.decisionId}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-widest",
                      entry.category === 'Cost/Price' ? "bg-red-50 text-red-600" :
                      entry.category === 'Schedule' ? "bg-amber-50 text-amber-600" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium text-slate-700 line-clamp-1 max-w-xs">{entry.decision}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold text-slate-900">{entry.responsibleParty}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium text-slate-500">{entry.date}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id)}
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

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 flex items-start gap-6">
        <HelpCircle className="w-8 h-8 text-blue-500 shrink-0" />
        <div>
          <h4 className="text-lg font-bold text-blue-900 mb-2">Decision Log Guidance</h4>
          <p className="text-sm text-blue-700 leading-relaxed">
            Use this log to document critical agreements and approvals from Project Leadership. Decisions related to Cost or Schedule are flagged for manual baseline review to maintain data integrity across protected domains.
          </p>
        </div>
      </div>

      {/* Prompt Modal */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrompt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-10 h-10 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight">Domain Impact Detected</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {showPrompt.message}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={showPrompt.onConfirm}
                    className="w-full py-4 bg-blue-600 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                  >
                    Yes, Propose Draft Link
                  </button>
                  <button 
                    onClick={() => {
                      setShowPrompt(null);
                      setView('list');
                    }}
                    className="w-full py-4 bg-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-[0.2em] rounded-lg hover:bg-slate-200 transition-all"
                  >
                    No, Save Only
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
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
