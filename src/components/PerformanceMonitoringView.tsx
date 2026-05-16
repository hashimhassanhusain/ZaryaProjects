import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  BarChart3, 
  Download, 
  Save, 
  Target, 
  ShieldCheck, 
  Activity,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Zap,
  Briefcase,
  ArrowLeft,
  Trash2,
  Plus,
  Loader2
} from 'lucide-react';
import { Page, Project, PageVersion, EntityConfig } from '../types';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, onSnapshot, updateDoc, query, collection, where, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface PerformanceMonitoringViewProps {
  page: Page;
}

export const PerformanceMonitoringView: React.FC<PerformanceMonitoringViewProps> = ({ page }) => {
  const { t, language, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [data, setData] = useState({
    governanceKPIs: [
       { name: 'Variance Approval Velocity', planned: 2, actual: 4, unit: 'Days' },
       { name: 'Change Request Cycle Time', planned: 5, actual: 3, unit: 'Days' },
       { name: 'Policy Compliance Rate', planned: 100, actual: 95, unit: '%' },
       { name: 'Approval Bottlenecks', planned: 0, actual: 2, unit: 'Queue' }
    ],
    evmSnapshot: {
       pv: 1250000,
       ev: 1100000,
       ac: 1300000,
       spi: 0.88,
       cpi: 0.85
    },
    performanceSummary: '',
    criticalActions: [
      'Escalate Resource Approval Delay to Project Sponsor',
      'Recalibrate Schedule Baseline in Planning Domain',
      'Conduct Root Cause Analysis for Variance Approval Speed'
    ],
    version: '1.0'
  });

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'performance_reports'), 
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(docs);
      if (docs.length === 0 && loading) {
        // No records yet, stay in edit but init from project defaults if any
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'performance_reports');
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedRecordId && viewMode === 'edit') {
      const record = records.find(r => r.id === selectedRecordId);
      if (record) {
        setData(record);
        
        // Fetch versions
        const vQuery = query(
          collection(db, 'performance_report_versions'),
          where('reportEntryId', '==', selectedRecordId),
          orderBy('version', 'desc')
        );
        const unsubVersions = onSnapshot(vQuery, (snap) => {
          const vData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setVersions(vData);
        });
        return () => unsubVersions();
      }
    } else if (!selectedRecordId && viewMode === 'edit') {
      // Initialize with fresh data or last record if any
      const lastRecord = records[0];
      setData({
        governanceKPIs: lastRecord?.governanceKPIs || [
           { name: 'Variance Approval Velocity', planned: 2, actual: 4, unit: 'Days' },
           { name: 'Change Request Cycle Time', planned: 5, actual: 3, unit: 'Days' },
           { name: 'Policy Compliance Rate', planned: 100, actual: 95, unit: '%' },
           { name: 'Approval Bottlenecks', planned: 0, actual: 2, unit: 'Queue' }
        ],
        evmSnapshot: lastRecord?.evmSnapshot || {
           pv: 1250000,
           ev: 1100000,
           ac: 1300000,
           spi: 0.88,
           cpi: 0.85
        },
        performanceSummary: lastRecord?.performanceSummary || '',
        criticalActions: lastRecord?.criticalActions || [
          'Escalate Resource Approval Delay to Project Sponsor',
          'Recalibrate Schedule Baseline in Planning Domain',
          'Conduct Root Cause Analysis for Variance Approval Speed'
        ],
        version: lastRecord ? (parseFloat(lastRecord.version) + 0.1).toFixed(1) : '1.0'
      });
      setVersions([]);
    }
  }, [selectedRecordId, viewMode, records]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      const version = isNew ? (parseFloat(data.version) + 0.1).toFixed(1) : data.version;
      
      const recordData = {
        ...data,
        projectId: selectedProject.id,
        version,
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: data.createdAt || timestamp,
        createdBy: data.createdBy || user
      };

      let docRef;
      if (!selectedRecordId || isNew) {
        docRef = await addDoc(collection(db, 'performance_reports'), {
          ...recordData,
          createdAt: timestamp
        });
      } else {
        docRef = doc(db, 'performance_reports', selectedRecordId);
        await updateDoc(docRef, recordData);
      }

      // Save version
      await addDoc(collection(db, 'performance_report_versions'), {
        reportEntryId: selectedRecordId || docRef.id,
        version,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: recordData,
        changeSummary: isNew ? `Baseline Snapshot v${version}` : 'Update recorded'
      });

      toast.success(isNew ? 'Baseline Snapshot saved' : 'Performance report updated');
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'performance_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'performance_reports', id));
      toast.success('Record deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'performance_reports');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNANCE PERFORMANCE REPORT', pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Project Code: ${selectedProject.code}`, margin, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: ${data.version}`, pageWidth - margin, 50, { align: 'right' });

    doc.text('Key Performance Indicators:', margin, 60);
    autoTable(doc, {
      startY: 65,
      head: [['Metric', 'Planned', 'Actual', 'Variance']],
      body: data.governanceKPIs.map(k => [k.name, `${k.planned} ${k.unit}`, `${k.actual} ${k.unit}`, `${(k.actual - k.planned).toFixed(1)}`]),
      theme: 'grid',
      headStyles: { fillColor: [48, 48, 48] }
    });

    doc.save(`${selectedProject.code}-PMIS-PERF-REPORT-V${data.version}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'performance_reports',
    label: t('project_performance_reports'),
    icon: BarChart3,
    collection: 'performance_reports',
    columns: [
      { key: 'version', label: 'Version', type: 'badge' },
      { key: 'createdAt', label: 'Report Date', type: 'date' },
      { key: 'updatedBy', label: 'Author', type: 'string' }
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

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
                data={records}
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
              className="space-y-12"
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

              {/* Performance Dashboard Canvas */}
              <section className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row gap-12">
                   <div className="flex-1 space-y-10">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center text-blue-400">
                            <BarChart3 className="w-7 h-7" />
                         </div>
                         <div>
                            <h3 className="text-3xl font-black tracking-tight italic">GOVERNANCE ANALYTICS <span className="text-blue-500 ml-2">v{data.version}</span></h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Planned vs. Actual Performance Engine</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {data.governanceKPIs.map((kpi: any, idx: number) => (
                            <div key={idx} className="sticky-note p-8 space-y-6 transition-all group relative overflow-hidden h-48 w-full">
                               <div className="absolute top-0 right-0 w-24 h-24 bg-white/50 rounded-full -mr-12 -mt-12 blur-xl transition-all" />
                               <div className="flex items-center justify-between relative z-10">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-brand transition-colors text-center w-full">{kpi.name}</span>
                                  {kpi.actual > kpi.planned ? (
                                     <ArrowUpRight className="w-4 h-4 text-rose-500" />
                                  ) : (
                                     <Zap className="w-4 h-4 text-emerald-500" />
                                  )}
                               </div>
                               <div className="flex items-end gap-3 relative z-10">
                                  <input 
                                    type="number"
                                    value={kpi.actual}
                                    onChange={(e) => {
                                      const newKPIs = [...data.governanceKPIs];
                                      newKPIs[idx].actual = Number(e.target.value);
                                      setData({ ...data, governanceKPIs: newKPIs });
                                    }}
                                    className="bg-transparent text-5xl font-black text-slate-900 outline-none w-28 tracking-tighter"
                                  />
                                  <span className="text-sm font-bold text-slate-400 mb-2 italic group-hover:text-brand transition-colors">{kpi.unit}</span>
                               </div>
                               <div className="space-y-4 relative z-10">
                                  <div className="flex items-center gap-4">
                                     <div className="flex-1 h-2 bg-slate-200/50 rounded-full overflow-hidden">
                                        <motion.div 
                                           initial={{ width: 0 }}
                                           animate={{ width: `${Math.min(100, (kpi.actual / Math.max(kpi.planned, 1)) * 100)}%` }}
                                           className={cn(
                                              "h-full rounded-full transition-all duration-1000",
                                              kpi.actual > kpi.planned ? "bg-rose-500" : "bg-emerald-500"
                                           )}
                                        />
                                     </div>
                                     <input 
                                        type="number"
                                        value={kpi.planned}
                                        onChange={(e) => {
                                          const newKPIs = [...data.governanceKPIs];
                                          newKPIs[idx].planned = Number(e.target.value);
                                          setData({ ...data, governanceKPIs: newKPIs });
                                        }}
                                        className="bg-white/50 text-[10px] font-bold text-slate-800 p-2 rounded-lg w-16 text-center outline-none focus:bg-white/80"
                                     />
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="w-full md:w-96 space-y-8">
                      <div className="bg-blue-600 rounded-[3rem] p-10 shadow-3xl shadow-blue-900/60 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform" />
                         <h4 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-8">Performance Snapshot</h4>
                         <div className="space-y-8">
                            <div className="flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span className="text-sm font-bold text-blue-100">Schedule Perf</span>
                                 <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest">SPI (Status)</span>
                               </div>
                               <input 
                                 type="number" step="0.01" 
                                 value={data.evmSnapshot.spi} 
                                 onChange={(e) => setData({ ...data, evmSnapshot: { ...data.evmSnapshot, spi: Number(e.target.value) }})}
                                 className={cn("text-4xl font-black italic bg-transparent outline-none w-24 text-right", data.evmSnapshot.spi >= 1 ? "text-white" : "text-amber-300")} 
                               />
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span className="text-sm font-bold text-blue-100">Cost Health</span>
                                 <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest">CPI (Efficiency)</span>
                               </div>
                               <input 
                                 type="number" step="0.01" 
                                 value={data.evmSnapshot.cpi} 
                                 onChange={(e) => setData({ ...data, evmSnapshot: { ...data.evmSnapshot, cpi: Number(e.target.value) }})}
                                 className={cn("text-4xl font-black italic bg-transparent outline-none w-24 text-right", data.evmSnapshot.cpi >= 1 ? "text-white" : "text-rose-300")} 
                               />
                            </div>
                         </div>
                      </div>

                      <div className="bg-white/5 rounded-[3rem] p-10 border border-white/10 space-y-6">
                         <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-blue-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Governance Log</h4>
                         </div>
                         <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={data.governanceKPIs}>
                                  <Bar dataKey="actual" radius={[4, 4, 4, 4]}>
                                     {data.governanceKPIs.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.actual > entry.planned ? '#f43f5e' : '#10b981'} />
                                     ))}
                                  </Bar>
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="pt-6 border-t border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed opacity-60 text-center">Data reflections based on last validated audit cycle.</p>
                         </div>
                      </div>
                   </div>
                </div>
              </section>

              {/* Summary & Actions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-100 transition-colors" />
                    <div className="space-y-8 relative z-10">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                             <Activity className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight">Executive Narrative</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Performance Insights</p>
                          </div>
                       </div>
                       <textarea 
                          value={data.performanceSummary}
                          onChange={(e) => setData({ ...data, performanceSummary: e.target.value })}
                          rows={6}
                          className="w-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-sm font-medium leading-relaxed outline-none focus:ring-8 focus:ring-slate-500/5 transition-all shadow-inner resize-none"
                          placeholder="Synthesize the data into a high-level governance summary..."
                       />
                    </div>
                 </div>

                 <div className="bg-slate-50 rounded-[3rem] p-12 border border-slate-100 space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/50 rounded-full -mr-24 -mt-24 blur-3xl" />
                    <div className="flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-100">
                             <Target className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight italic">COMMAND STEERING</h4>
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Critical Strategic Actions</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                       {data.criticalActions.map((action: string, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:translate-x-2 group">
                             <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">{i+1}</div>
                             <input 
                               value={action}
                               onChange={(e) => {
                                 const next = [...data.criticalActions];
                                 next[i] = e.target.value;
                                 setData({ ...data, criticalActions: next });
                               }}
                               className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700"
                             />
                             <button 
                               onClick={() => {
                                 const next = data.criticalActions.filter((_, idx) => idx !== i);
                                 setData({ ...data, criticalActions: next });
                               }}
                               className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       ))}
                       <button 
                         onClick={() => setData({ ...data, criticalActions: [...data.criticalActions, ''] })}
                         className="w-full py-4 border-2 border-dashed border-slate-300 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Assign Steering Action
                        </button>
                    </div>

                    <div className="flex bg-slate-900 p-8 rounded-[2rem] gap-6 mt-8 relative z-10 border border-white/5">
                        <div className="flex-1">
                           <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">System Audit</div>
                           <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">Strategic actions are logged in the project governance ledger and notified to relevant focus area leads.</p>
                        </div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20">
                           <ShieldCheck className="w-6 h-6" />
                        </div>
                    </div>
                 </div>
              </div>

              {/* History Stack */}
              {versions.length > 0 && (
                <div className="pt-10 border-t border-slate-100">
                   <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                         <History className="w-4 h-4 text-slate-400" />
                         <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Snapshot History</h3>
                      </div>
                      <div className="p-2 max-h-[400px] overflow-y-auto no-scrollbar">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {versions.map(v => (
                              <div 
                                key={v.id} 
                                onClick={() => setData(v.data as any)}
                                className="p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 border border-transparent hover:border-slate-100"
                              >
                                 <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all font-black text-[10px]">
                                    v{typeof v.version === 'string' ? parseFloat(v.version).toFixed(1) : v.version.toFixed(1)}
                                 </div>
                                 <div className="min-w-0">
                                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{v.changeSummary}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.userName} • {new Date(v.timestamp).toLocaleDateString()}</div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* Version/Action Footer */}
              <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-200">
                  <div className="flex items-center gap-6">
                    <div className="px-5 py-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Baseline</span>
                       <span className="text-sm font-black text-slate-900 italic">v{data.version}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                       Last updated by <span className="text-slate-900">{records.find(r => r.id === selectedRecordId)?.updatedBy || 'System'}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     {selectedRecordId && (
                       <button 
                         onClick={() => handleSave(true)}
                         className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                        >
                         Baseline New Snapshot
                       </button>
                     )}
                     <button 
                        onClick={() => handleSave(false)}
                        className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {selectedRecordId ? 'Update Existing' : 'Initialize Baseline'}
                     </button>
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};

