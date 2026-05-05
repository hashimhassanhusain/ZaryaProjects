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
import { Page, Project, PageVersion, WBSLevel, QualityMetricEntry, FormalAcceptanceEntry, FormalAcceptanceVersion, EntityConfig } from '../types';
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
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface FormalAcceptanceViewProps {
  page: Page;
}

export const FormalAcceptanceView: React.FC<FormalAcceptanceViewProps> = ({ page }) => {
  const { t, language, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [acceptances, setAcceptances] = useState<FormalAcceptanceEntry[]>([]);
  const [metrics, setMetrics] = useState<QualityMetricEntry[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [versions, setVersions] = useState<FormalAcceptanceVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [governanceRoles, setGovernanceRoles] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<FormalAcceptanceEntry>>({
    acceptanceId: '',
    requirement: '',
    acceptanceCriteria: '',
    validationMethod: '',
    status: 'Pending',
    comments: '',
    signoffBy: '',
    version: 1.0
  });

  useEffect(() => {
    if (!selectedProject) return;

    const acceptQuery = query(
      collection(db, 'formal_acceptances'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );

    const unsubAccept = onSnapshot(acceptQuery, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FormalAcceptanceEntry));
      setAcceptances(data);
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
    if (selectedRecordId && viewMode === 'edit') {
      const record = acceptances.find(r => r.id === selectedRecordId);
      if (record) {
        setFormData(record);
        
        // Fetch versions
        const vQuery = query(
          collection(db, 'formal_acceptance_versions'),
          where('acceptanceEntryId', '==', selectedRecordId),
          orderBy('version', 'desc')
        );
        const unsubVersions = onSnapshot(vQuery, (snap) => {
          setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FormalAcceptanceVersion)));
        });
        return () => unsubVersions();
      }
    } else if (!selectedRecordId && viewMode === 'edit') {
      const nextId = `ACC-${(acceptances.length + 1).toString().padStart(3, '0')}`;
      setFormData({
        acceptanceId: nextId,
        requirement: '',
        acceptanceCriteria: '',
        validationMethod: '',
        status: 'Pending',
        comments: '',
        signoffBy: '',
        version: 1.0
      });
      setVersions([]);
    }
  }, [selectedRecordId, viewMode, acceptances]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const entryData = {
        ...formData,
        projectId: selectedProject.id,
        version: isNewVersion ? (formData.version || 1.0) + 0.1 : (formData.version || 1.0),
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: formData.createdAt || timestamp,
        createdBy: formData.createdBy || user
      };

      let docRef;
      if (selectedRecordId && !isNewVersion) {
        docRef = doc(db, 'formal_acceptances', selectedRecordId);
        await updateDoc(docRef, entryData);
      } else {
        docRef = await addDoc(collection(db, 'formal_acceptances'), entryData);
      }

      await addDoc(collection(db, 'formal_acceptance_versions'), {
        acceptanceEntryId: docRef.id,
        version: entryData.version,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: entryData,
        changeSummary: isNewVersion ? `Created v${entryData.version.toFixed(1)}` : 'Update recorded'
      });

      if (entryData.status === 'Accepted') {
        setShowPrompt({
          type: 'Status Update',
          message: "The PO and Schedule are protected. Propose a status update base on this acceptance?",
          onConfirm: () => {
            setShowPrompt(null);
          }
        });
      }

      toast.success('Acceptance record saved');
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'formal_acceptances');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'formal_acceptances', id));
      toast.success('Record deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'formal_acceptances');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    pdfDoc.setFontSize(16);
    pdfDoc.text('FORMAL ACCEPTANCE FORM', pageWidth / 2, 35, { align: 'center' });
    
    autoTable(pdfDoc, {
        startY: 45,
        head: [['ID', 'Requirement', 'Criteria', 'Status']],
        body: acceptances.map(a => [a.acceptanceId, a.requirement, a.acceptanceCriteria, a.status]),
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
    });

    pdfDoc.save(`${selectedProject.code}-ACCEPTANCES.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'formal_acceptances',
    label: t('deliverable_acceptance'),
    icon: ClipboardCheck,
    collection: 'formal_acceptances',
    columns: [
      { key: 'acceptanceId', label: 'ID', type: 'badge' },
      { key: 'requirement', label: 'Requirement', type: 'string' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'signoffBy', label: 'Authority', type: 'string' },
      { key: 'updatedAt', label: 'Last Update', type: 'date' }
    ]
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <StandardProcessPage
      page={page}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-[400px]"
            >
              <UniversalDataTable 
                config={gridConfig}
                data={acceptances}
                onRowClick={(row) => {
                  setSelectedRecordId(row.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="flex justify-end">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
                 >
                   <ArrowLeft className="w-3.5 h-3.5" />
                   {t('back_to_list')}
                 </button>
              </div>

              {/* Acceptance Canvas */}
              <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                      <FileSignature className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Sign-off Canvas</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formData.acceptanceId}</p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Requirement Source</label>
                        <select 
                          value={formData.requirement}
                          onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                        >
                          <option value="">Select Requirement...</option>
                          {wbsLevels.map(w => (
                            <option key={w.id} value={w.title}>{w.code} - {w.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Sign-off Authority</label>
                        <select 
                          value={formData.signoffBy}
                          onChange={(e) => setFormData({ ...formData, signoffBy: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                        >
                          <option value="">Select Sign-off Authority...</option>
                          {governanceRoles.map(r => (
                            <option key={r.id} value={r.name}>{r.name} ({r.title})</option>
                          ))}
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Acceptance Criteria</label>
                        <textarea 
                          value={formData.acceptanceCriteria}
                          onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                          rows={3}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                          placeholder="What constitutes success?"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Comments / Observations</label>
                        <textarea 
                          value={formData.comments}
                          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                          rows={3}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                          placeholder="Evidence found during validation..."
                        />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Acceptance Status</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         {['Pending', 'In Progress', 'Accepted', 'Rejected'].map(s => (
                            <button 
                               key={s}
                               onClick={() => setFormData({ ...formData, status: s as any })}
                               className={cn(
                                 "py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all",
                                 formData.status === s ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                               )}
                            >
                               {s}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* History Stack */}
                   {versions.length > 0 && (
                     <div className="pt-10 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                           <History className="w-4 h-4" />
                           Revision Stack
                        </h4>
                        <div className="space-y-3">
                           {versions.map(v => (
                              <div key={v.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                                 <div>
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-widest">v{v.version.toFixed(1)}</span>
                                    <p className="text-xs font-bold text-slate-900 mt-1">{v.changeSummary}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.userName} • {new Date(v.timestamp).toLocaleString()}</p>
                                 </div>
                                 <button 
                                   onClick={() => setFormData(v.data as FormalAcceptanceEntry)}
                                   className="px-4 py-2 bg-white text-[9px] font-black text-blue-600 uppercase tracking-widest rounded-lg border border-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                 >
                                   Restore
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>

                <div className="bg-slate-900 p-8 flex items-center justify-between border-t border-slate-800">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Active Revision</span>
                        <span className="text-xl font-black text-white italic tracking-tighter">v{formData.version?.toFixed(1)}</span>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      {selectedRecordId && (
                        <button 
                          onClick={() => handleSave(true)}
                          className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10"
                        >
                          New Snapshot
                        </button>
                      )}
                      <button 
                        onClick={() => handleSave(false)}
                        className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-2"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {selectedRecordId ? 'Update Record' : 'Log Acceptance'}
                      </button>
                   </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-50">
                <Layers className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Cross-Domain Sync</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                {showPrompt.message}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={showPrompt.onConfirm}
                  className="w-full py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  Propose Update
                </button>
                <button 
                  onClick={() => setShowPrompt(null)}
                  className="w-full py-5 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Keep Protected
                </button>
              </div>
            </motion.div>
          </div>
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
