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
  Search,
  Filter,
  MoreVertical,
  Edit2,
  ShieldAlert,
  ClipboardCheck,
  Layers,
  Box,
  Activity,
  DollarSign,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calculator,
  UserCheck,
  FileSignature
} from 'lucide-react';
import { Page, Project, PageVersion, WBSLevel, QualityMetricEntry, FormalAcceptanceEntry, FormalAcceptanceVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  getDocs,
  getDoc,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FormalAcceptanceViewProps {
  page: Page;
  embedded?: boolean;
}

export const FormalAcceptanceView: React.FC<FormalAcceptanceViewProps> = ({ page, embedded = false }) => {
  const { selectedProject } = useProject();
  const [acceptances, setAcceptances] = useState<FormalAcceptanceEntry[]>([]);
  const [metrics, setMetrics] = useState<QualityMetricEntry[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [versions, setVersions] = useState<FormalAcceptanceVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<FormalAcceptanceEntry> | null>(null);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [governanceRoles, setGovernanceRoles] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedProject) return;

    const acceptQuery = query(
      collection(db, 'formal_acceptances'),
      where('projectId', '==', selectedProject.id),
      orderBy('acceptanceId', 'asc')
    );

    const unsubAccept = onSnapshot(acceptQuery, async (snap) => {
      if (snap.empty && selectedProject) {
        // Add default sample data
        const sampleEntry = {
          projectId: selectedProject.id,
          acceptanceId: 'ZRY-ACC-001',
          requirement: 'Basement Waterproofing',
          acceptanceCriteria: 'No leakage after 48h water test',
          validationMethod: 'Visual inspection after 48h flood test',
          status: 'Pending',
          comments: 'Initial baseline requirement',
          signoffBy: '',
          version: 1.0,
          createdAt: new Date().toISOString(),
          createdBy: 'System',
          updatedAt: new Date().toISOString(),
          updatedBy: 'System'
        };
        await addDoc(collection(db, 'formal_acceptances'), sampleEntry);
      } else {
        setAcceptances(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormalAcceptanceEntry)));
      }
      setLoading(false);
    });

    const metricsQuery = query(collection(db, 'quality_metrics'), where('projectId', '==', selectedProject.id));
    const unsubMetrics = onSnapshot(metricsQuery, (snap) => {
      setMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() } as QualityMetricEntry)));
    });

    const wbsQuery = query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id));
    const unsubWbs = onSnapshot(wbsQuery, (snap) => {
      const list: WBSLevel[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as WBSLevel));
      setWbsLevels(list);
    });

    // Fetch Governance Roles
    const fetchGovernance = async () => {
      const docRef = doc(db, 'projects', selectedProject.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const pData = snap.data() as Project;
        if (pData.policyData && (pData.policyData as any).governanceRoles) {
          setGovernanceRoles((pData.policyData as any).governanceRoles);
        }
      }
    };
    fetchGovernance();

    return () => {
      unsubAccept();
      unsubMetrics();
      unsubWbs();
    };
  }, [selectedProject?.id]);

  useEffect(() => {
    if (editingEntry?.id) {
      const vQuery = query(
        collection(db, 'formal_acceptance_versions'),
        where('acceptanceEntryId', '==', editingEntry.id),
        orderBy('version', 'desc')
      );
      const unsubVersions = onSnapshot(vQuery, (snap) => {
        setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormalAcceptanceVersion)));
      });
      return () => unsubVersions();
    }
  }, [editingEntry?.id]);

  const filteredAcceptances = acceptances.filter(a => 
    a.requirement.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.acceptanceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveEntry = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !editingEntry) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const entryData = {
        ...editingEntry,
        projectId: selectedProject.id,
        version: isNewVersion ? (editingEntry.version || 1.0) + 0.1 : (editingEntry.version || 1.0),
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingEntry.createdAt || timestamp,
        createdBy: editingEntry.createdBy || user,
        status: editingEntry.status || 'Pending'
      };

      let docRef;
      if (editingEntry.id && !isNewVersion) {
        docRef = doc(db, 'formal_acceptances', editingEntry.id);
        await updateDoc(docRef, entryData);
      } else {
        docRef = await addDoc(collection(db, 'formal_acceptances'), entryData);
      }

      // Version History
      await addDoc(collection(db, 'formal_acceptance_versions'), {
        acceptanceEntryId: docRef.id,
        version: entryData.version,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: entryData,
        changeSummary: isNewVersion ? `Created new version ${entryData.version.toFixed(1)}` : (editingEntry.id ? 'Updated existing record' : 'Initial entry')
      });

      // Restriction Policy Prompt
      if (entryData.status === 'Accepted') {
        setShowPrompt({
          type: 'Status Update',
          message: "The PO and Schedule are protected. Do you want to propose a status update based on this acceptance?",
          onConfirm: () => {
            console.log('Status update proposal confirmed');
            setShowPrompt(null);
          }
        });
      }

      setIsFormOpen(false);
      setEditingEntry(null);

    } catch (err) {
      handleFirestoreError(err, editingEntry.id ? OperationType.UPDATE : OperationType.CREATE, 'formal_acceptances');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this acceptance record?')) return;
    try {
      await deleteDoc(doc(db, 'formal_acceptances', id));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    // Header with Logo
    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('FORMAL ACCEPTANCE FORM', pageWidth / 2, 35, { align: 'center' });

    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.text(`Project Title: ${selectedProject.name}`, margin, 45);
    pdfDoc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 45);

    autoTable(pdfDoc, {
      startY: 55,
      head: [['ID', 'Requirement', 'Acceptance Criteria', 'Validation Method', 'Status', 'Signoff']],
      body: acceptances.map(a => [a.acceptanceId, a.requirement, a.acceptanceCriteria, a.validationMethod, a.status, a.signoffBy]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `[${selectedProject.code}]-QUA-ACC-FORM-${dateStr}.pdf`;
    pdfDoc.save(fileName);
  };

  const acceptedCount = acceptances.filter(a => a.status === 'Accepted').length;
  const totalCount = acceptances.length;
  const percentComplete = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className={cn("space-y-8", embedded && "mt-0 pt-0")}>
      {/* Hub Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formal Acceptance</p>
            <h4 className="text-2xl font-bold text-slate-900">{percentComplete}% <span className="text-xs text-slate-400 font-medium">Complete</span></h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Requirements</p>
            <h4 className="text-2xl font-bold text-slate-900">{totalCount} <span className="text-xs text-slate-400 font-medium">Items</span></h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Sign-off</p>
            <h4 className="text-2xl font-bold text-slate-900">{totalCount - acceptedCount} <span className="text-xs text-slate-400 font-medium">Items</span></h4>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all"
          >
            <Printer className="w-3 h-3" />
            Export Form
          </button>
          <button 
            onClick={() => {
              const nextId = `ZRY-ACC-${(acceptances.length + 1).toString().padStart(3, '0')}`;
              setEditingEntry({ 
                acceptanceId: nextId, 
                requirement: '', 
                acceptanceCriteria: '', 
                validationMethod: '', 
                status: 'Pending',
                comments: '',
                signoffBy: '',
                version: 1.0
              });
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            New Sign-off
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">ID</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Requirement</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Criteria</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Status</th>
              <th className="px-8 py-5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredAcceptances.map((a) => (
              <tr key={a.id} className="group hover:bg-slate-50/30 transition-all cursor-pointer" onClick={() => { setEditingEntry(a); setIsFormOpen(true); }}>
                <td className="px-8 py-6">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg tracking-tighter">{a.acceptanceId}</span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-slate-900">{a.requirement}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm text-slate-600 font-medium line-clamp-1">{a.acceptanceCriteria}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs line-clamp-1">{a.validationMethod}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      a.status === 'Accepted' ? "bg-green-100 text-green-600" :
                      a.status === 'Rejected' ? "bg-red-100 text-red-600" :
                      a.status === 'In Progress' ? "bg-blue-100 text-blue-600" :
                      "bg-amber-100 text-amber-600"
                    )}>
                      {a.status === 'Accepted' ? <CheckCircle className="w-3 h-3" /> : 
                       a.status === 'Rejected' ? <XCircle className="w-3 h-3" /> : 
                       <Clock className="w-3 h-3" />}
                      {a.status}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingEntry(a); setIsFormOpen(true); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteEntry(a.id); }}
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

      {/* Entry Form Modal */}
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
                    <FileSignature className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Formal Acceptance Sign-off</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{editingEntry.acceptanceId}</p>
                  </div>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Requirement
                      <Tooltip text="Formal Acceptance is the final gateway before project handover or payment release." />
                    </label>
                    <select 
                      value={editingEntry.requirement}
                      onChange={(e) => setEditingEntry({ ...editingEntry, requirement: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">Select Requirement...</option>
                      {wbsLevels.map(w => (
                        <option key={w.id} value={w.title}>{w.code} - {w.title}</option>
                      ))}
                      <option value="Basement Waterproofing">Basement Waterproofing</option>
                      <option value="Structural Concrete">Structural Concrete</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acceptance Criteria</label>
                    <textarea 
                      value={editingEntry.acceptanceCriteria}
                      onChange={(e) => setEditingEntry({ ...editingEntry, acceptanceCriteria: e.target.value })}
                      rows={2}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                      placeholder="e.g. No leakage after 48h water test"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validation Method</label>
                    <select 
                      value={editingEntry.validationMethod}
                      onChange={(e) => setEditingEntry({ ...editingEntry, validationMethod: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">Select Method...</option>
                      {metrics.map(m => (
                        <option key={m.id} value={m.measurementMethod}>{m.measurementMethod}</option>
                      ))}
                      <option value="Visual Inspection">Visual Inspection</option>
                      <option value="Lab Test">Lab Test</option>
                      <option value="Survey">Survey</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sign-off Authority</label>
                    <select 
                      value={editingEntry.signoffBy}
                      onChange={(e) => setEditingEntry({ ...editingEntry, signoffBy: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">Select Sign-off Authority...</option>
                      {governanceRoles.map(r => (
                        <option key={r.id} value={r.name}>{r.name} ({r.title})</option>
                      ))}
                      <option value="Hashim Hassan">Hashim Hassan (Technical Approver)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comments / Observations</label>
                  <textarea 
                    value={editingEntry.comments}
                    onChange={(e) => setEditingEntry({ ...editingEntry, comments: e.target.value })}
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                    placeholder="Enter any additional notes..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acceptance Status</label>
                  <div className="flex gap-2">
                    {['Pending', 'In Progress', 'Accepted', 'Rejected'].map((status) => (
                      <button 
                        key={status}
                        onClick={() => setEditingEntry({ ...editingEntry, status: status as any })}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          editingEntry.status === status 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                            : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Version History */}
                {editingEntry.id && versions.length > 0 && (
                  <div className="pt-8 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Revision History
                    </h3>
                    <div className="space-y-3">
                      {versions.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">V{v.version.toFixed(1)}</span>
                            <p className="text-xs font-bold text-slate-900 mt-1">{v.changeSummary}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{v.userName} • {new Date(v.timestamp).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => setEditingEntry(v.data as FormalAcceptanceEntry)}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4" />
                  Governance Protection Active
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsFormOpen(false)}
                    className="px-8 py-4 text-white/60 font-bold text-sm hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleSaveEntry(true)}
                    disabled={isSaving}
                    className="px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-2xl hover:bg-white/20 transition-all"
                  >
                    Save as New Version
                  </button>
                  <button 
                    onClick={() => handleSaveEntry(false)}
                    disabled={isSaving}
                    className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Overwrite Current
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Layers className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Cross-Domain Sync</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                {showPrompt.message}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={showPrompt.onConfirm}
                  className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  Yes, Propose Update
                </button>
                <button 
                  onClick={() => setShowPrompt(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all"
                >
                  No, Keep Protected
                </button>
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
