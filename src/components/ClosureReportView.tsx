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
  Flag,
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
  LayoutDashboard,
  ShieldCheck,
  DollarSign,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { Page, ClosureReportEntry, Project, EntityConfig, ClosureReportVersion } from '../types';
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

interface ClosureReportViewProps {
  page: Page;
}

export const ClosureReportView: React.FC<ClosureReportViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ClosureReportEntry[]>([]);
  const [versions, setVersions] = useState<ClosureReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ClosureReportEntry>>({
    reportId: '',
    status: 'Draft',
    datePrepared: new Date().toISOString().split('T')[0],
    preparedBy: auth.currentUser?.displayName || '',
    summaryOfProject: '',
    deliverablesPerformance: '',
    schedulePerformanceSummary: '',
    costPerformanceSummary: '',
    qualitySummary: '',
    scopeSummary: '',
    risksSummary: '',
    lessonsLearnedSummary: '',
    handoverSummary: '',
    adminClosureNotes: '',
    financialClosureNotes: '',
    finalApprovalStatus: 'Pending',
    version: 1.0
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'closure_reports'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClosureReportEntry)));
      setLoading(false);
    });

    return () => unsubEntries();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedRecordId && viewMode === 'edit') {
      const record = entries.find(r => r.id === selectedRecordId);
      if (record) {
        setFormData(record);
        
        // Fetch versions
        const vQuery = query(
          collection(db, 'closure_report_versions'),
          where('reportEntryId', '==', selectedRecordId),
          orderBy('version', 'desc')
        );
        const unsubVersions = onSnapshot(vQuery, (snap) => {
          setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClosureReportVersion)));
        });
        return () => unsubVersions();
      }
    } else if (!selectedRecordId && viewMode === 'edit') {
      const nextNum = entries.length + 1;
      setFormData({
        reportId: `CR-${nextNum.toString().padStart(3, '0')}`,
        status: 'Draft',
        datePrepared: new Date().toISOString().split('T')[0],
        preparedBy: auth.currentUser?.displayName || '',
        summaryOfProject: '',
        deliverablesPerformance: '',
        schedulePerformanceSummary: '',
        costPerformanceSummary: '',
        qualitySummary: '',
        scopeSummary: '',
        risksSummary: '',
        lessonsLearnedSummary: '',
        handoverSummary: '',
        adminClosureNotes: '',
        financialClosureNotes: '',
        finalApprovalStatus: 'Pending',
        version: 1.0
      });
      setVersions([]);
    }
  }, [selectedRecordId, viewMode, entries]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.reportId) return;
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
        docRef = doc(db, 'closure_reports', selectedRecordId);
        await updateDoc(docRef, entryData);
      } else {
        docRef = await addDoc(collection(db, 'closure_reports'), entryData);
      }

      await addDoc(collection(db, 'closure_report_versions'), {
        reportEntryId: docRef.id,
        projectId: selectedProject.id,
        version: entryData.version,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: entryData,
        changeSummary: isNewVersion ? `Created v${entryData.version.toFixed(1)}` : 'Update recorded'
      });

      toast.success(selectedRecordId && !isNewVersion ? 'Report updated' : 'Version saved');
      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'closure_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'closure_reports', id));
      toast.success('Report deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'closure_reports');
    }
  };

  const generatePDF = () => {
    if (!selectedProject || !formData.reportId) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CLOSURE REPORT', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const sections = [
      { title: 'Project Summary', content: formData.summaryOfProject },
      { title: 'Deliverables Performance', content: formData.deliverablesPerformance },
      { title: 'Schedule Performance', content: formData.schedulePerformanceSummary },
      { title: 'Cost Performance', content: formData.costPerformanceSummary },
      { title: 'Quality Summary', content: formData.qualitySummary },
      { title: 'Scope Summary', content: formData.scopeSummary },
      { title: 'Risks Summary', content: formData.risksSummary },
      { title: 'Lessons Learned', content: formData.lessonsLearnedSummary }
    ];

    let currentY = 50;
    sections.forEach(s => {
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(s.title, margin, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(s.content || 'N/A', pageWidth - (margin * 2));
      doc.text(splitText, margin, currentY);
      currentY += (splitText.length * 5) + 10;
    });

    doc.save(`${selectedProject.code}-CLOSURE-${formData.reportId}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'closure_reports',
    label: t('project_closure_report'),
    icon: Flag,
    collection: 'closure_reports',
    columns: [
      { key: 'reportId', label: 'ID', type: 'badge' },
      { key: 'preparedBy', label: 'Author', type: 'string' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'finalApprovalStatus', label: 'Approval', type: 'badge' },
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
      <div className="space-y-10">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <UniversalDataTable 
                config={gridConfig}
                data={entries}
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
              className="space-y-12 pb-32"
            >
              <div className="flex justify-end pr-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
                 >
                   <ArrowLeft className="w-3.5 h-3.5" />
                   {t('back_to_list')}
                 </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                  {/* Canvas Header */}
                  <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                          <Flag className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">Project Closure Canvas</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formData.reportId}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-[10px] uppercase tracking-widest outline-none bg-white"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Final">Final</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-10 space-y-10">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Report ID</label>
                          <input 
                            type="text"
                            value={formData.reportId}
                            onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold outline-none focus:ring-4 focus:ring-slate-500/5 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Summary of Project</label>
                          <textarea 
                            value={formData.summaryOfProject}
                            onChange={(e) => setFormData({ ...formData, summaryOfProject: e.target.value })}
                            rows={3}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-slate-500/5 transition-all resize-none"
                            placeholder="Final overview..."
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Operational Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { icon: CheckCircle2, color: 'emerald', label: 'Deliverables Performance', field: 'deliverablesPerformance' },
                      { icon: Clock, color: 'amber', label: 'Schedule Performance', field: 'schedulePerformanceSummary' },
                      { icon: DollarSign, color: 'blue', label: 'Cost Performance', field: 'costPerformanceSummary' },
                      { icon: ShieldCheck, color: 'indigo', label: 'Quality Performance', field: 'qualitySummary' }
                    ].map(sect => (
                      <div key={sect.field} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                          <sect.icon className={cn("w-4 h-4", `text-${sect.color}-500`)} />
                          <label className="text-[10px] font-bold uppercase tracking-widest">{sect.label}</label>
                        </div>
                        <textarea 
                          value={(formData as any)[sect.field]}
                          onChange={(e) => setFormData({ ...formData, [sect.field]: e.target.value })}
                          rows={4}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                  <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 space-y-8">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
                           <ShieldCheck className="w-5 h-5 text-white" />
                         </div>
                         <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Institutional Archive</h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">v{formData.version?.toFixed(1)} Snapshot</p>
                         </div>
                       </div>

                       <div className="space-y-4">
                          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Approval Status</div>
                             <select 
                                value={formData.finalApprovalStatus}
                                onChange={(e) => setFormData({ ...formData, finalApprovalStatus: e.target.value as any })}
                                className="bg-transparent text-xs font-black text-emerald-400 outline-none uppercase tracking-widest text-right"
                             >
                               <option value="Pending">Pending</option>
                               <option value="Approved">Approved</option>
                               <option value="Rejected">Rejected</option>
                             </select>
                          </div>
                       </div>
                    </div>
                  </section>

                  {/* Snapshot History Sidebar */}
                  {versions.length > 0 && (
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-400" />
                          <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Snapshot History</h3>
                       </div>
                       <div className="p-2 max-h-[400px] overflow-y-auto no-scrollbar">
                          {versions.map(v => (
                            <div 
                              key={v.id} 
                              onClick={() => setFormData(v.data as ClosureReportEntry)}
                              className="p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 border border-transparent hover:border-slate-100"
                            >
                               <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all font-black text-[10px]">
                                  v{v.version.toFixed(1)}
                               </div>
                               <div className="min-w-0">
                                  <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{v.changeSummary}</div>
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.userName} • {new Date(v.timestamp).toLocaleDateString()}</div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-4">
                 <button 
                    onClick={() => handleSave(true)}
                    className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-2xl border border-white/5"
                 >
                    Snapshot v{(formData.version! + 0.1).toFixed(1)}
                 </button>
                 <button 
                    onClick={() => handleSave(false)}
                    className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-2"
                 >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {selectedRecordId ? 'Update Record' : 'Initialize Closure'}
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
