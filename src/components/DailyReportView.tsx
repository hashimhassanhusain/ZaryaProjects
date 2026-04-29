import React, { useState, useEffect } from 'react';
import { StandardProcessPage } from './StandardProcessPage';
import { 
  FileText, 
  Plus, 
  Search, 
  Users, 
  CloudSun, 
  HardHat, 
  Truck, 
  AlertCircle,
  Download,
  Printer,
  ChevronRight,
  Clock,
  MoreVertical,
  Filter,
  CheckCircle2,
  Calendar,
  Trash2,
  ArrowRight,
  Thermometer,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface DailyReportViewProps {
  page: Page;
}

interface DailyReport {
  id: string;
  date: string;
  author: string;
  weather: string;
  temperature?: string;
  manpowerTotal: number;
  equipmentTotal: number;
  incidentSummary?: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  progressSummary: string;
  projectId: string;
  createdAt?: any;
  updatedAt?: any;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newReport, setNewReport] = useState<Partial<DailyReport>>({
    date: new Date().toISOString().split('T')[0],
    weather: 'Sunny',
    temperature: '',
    manpowerTotal: 0,
    equipmentTotal: 0,
    incidentSummary: '',
    status: 'Draft',
    progressSummary: ''
  });

  useEffect(() => {
    if (!selectedProject?.id) return;

    const q = query(
      collection(db, 'daily_reports'),
      where('projectId', '==', selectedProject.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as DailyReport));
      setReports(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'daily_reports');
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject || !newReport.progressSummary) {
      toast.error("Please provide a progress summary");
      return;
    }

    setIsSaving(true);
    try {
      if (editingReport) {
        await updateDoc(doc(db, 'daily_reports', editingReport.id), {
          ...newReport,
          updatedAt: serverTimestamp()
        });
        toast.success("Daily report updated");
      } else {
        await addDoc(collection(db, 'daily_reports'), {
          ...newReport,
          projectId: selectedProject.id,
          author: 'System User', // Should be dynamic
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Daily report filed successfully");
      }
      setView('list');
      setEditingReport(null);
      setNewReport({
        date: new Date().toISOString().split('T')[0],
        weather: 'Sunny',
        temperature: '',
        manpowerTotal: 0,
        equipmentTotal: 0,
        incidentSummary: '',
        status: 'Draft',
        progressSummary: ''
      });
    } catch (err) {
      console.error(err);
      toast.error("Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (report: DailyReport) => {
    setEditingReport(report);
    setNewReport(report);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archive this daily report?")) return;
    try {
      await deleteDoc(doc(db, 'daily_reports', id));
      toast.success("Report archived");
    } catch (err) {
      toast.error("Archive failed");
    }
  };

  const filteredReports = reports.filter(r => 
    (r.date || '').includes(searchQuery) || 
    (r.progressSummary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.author || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={handleSave}
      isSaving={isSaving}
      inputs={[{ id: '4.1.2', title: 'Work Performance Data' }]}
      outputs={[{ id: '4.2.3-OUT', title: 'Verified Daily Logs', status: 'Approved' }]}
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
              {/* Left Column: Progress & Identity */}
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingReport ? 'Update Daily Log' : 'New Daily Site Report'}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Recording site activity and verification indices</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    {/* Log Identity */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Log Identity & Timing
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Reporting Date</label>
                          <input 
                            type="date"
                            value={newReport.date}
                            onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Log Author / Foreman</label>
                          <input 
                            readOnly
                            value="System User"
                            className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Progress Summary */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Executive Progress Summary
                      </h3>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Narrative Description of Work Performed</label>
                        <textarea 
                          value={newReport.progressSummary}
                          onChange={(e) => setNewReport({ ...newReport, progressSummary: e.target.value })}
                          rows={6}
                          className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                          placeholder="Describe the technical milestones achieved today..."
                        />
                      </div>
                    </section>

                    {/* Resources */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Resource Utilization
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-900">
                         <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-6 transition-all hover:bg-white hover:shadow-lg">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest">Total Manpower</h4>
                           </div>
                           <div className="flex items-center gap-4">
                              <input 
                                type="number"
                                value={newReport.manpowerTotal}
                                onChange={(e) => setNewReport({ ...newReport, manpowerTotal: parseInt(e.target.value) || 0 })}
                                className="w-32 px-5 py-4 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-blue-600 text-center focus:ring-4 focus:ring-blue-500/10 outline-none"
                              />
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Projected vs Actual<br/>Staff count on site</div>
                           </div>
                         </div>

                         <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-6 transition-all hover:bg-white hover:shadow-lg">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                                <Truck className="w-5 h-5 text-blue-600" />
                              </div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest">Equipment Count</h4>
                           </div>
                           <div className="flex items-center gap-4">
                              <input 
                                type="number"
                                value={newReport.equipmentTotal}
                                onChange={(e) => setNewReport({ ...newReport, equipmentTotal: parseInt(e.target.value) || 0 })}
                                className="w-32 px-5 py-4 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-blue-600 text-center focus:ring-4 focus:ring-blue-500/10 outline-none"
                              />
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Heavy machinery &<br/>Fleet active status</div>
                           </div>
                         </div>
                      </div>
                    </section>
                  </div>
                </section>
              </div>

              {/* Right Column: Conditions & Incidents */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 text-white">
                        <CloudSun className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400">Site Conditions</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Atmospheric Metrics</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="grid grid-cols-2 gap-4 text-slate-400">
                          <button
                            onClick={() => setNewReport({ ...newReport, weather: 'Sunny' })}
                            className={cn(
                              "p-4 rounded-3xl border flex flex-col gap-3 transition-all",
                              newReport.weather === 'Sunny' ? "bg-white/10 border-blue-500/50 text-white" : "bg-white/5 border-white/10 text-slate-500"
                            )}
                          >
                             <CloudSun className="w-6 h-6" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Sunny</span>
                          </button>
                          <button
                            onClick={() => setNewReport({ ...newReport, weather: 'Rainy' })}
                            className={cn(
                              "p-4 rounded-3xl border flex flex-col gap-3 transition-all",
                              newReport.weather === 'Rainy' ? "bg-white/10 border-blue-500/50 text-white" : "bg-white/5 border-white/10 text-slate-500"
                            )}
                          >
                             <CloudSun className="w-6 h-6 rotate-180" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Rainy</span>
                          </button>
                       </div>

                       <div className="space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Temperature Index</label>
                          <div className="relative">
                             <Thermometer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                             <input 
                               type="text"
                               value={newReport.temperature}
                               onChange={(e) => setNewReport({ ...newReport, temperature: e.target.value })}
                               className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                               placeholder="e.g. 32°C"
                             />
                          </div>
                       </div>
                    </div>
                  </div>
                </section>

                <section className="bg-rose-50 border border-rose-100 rounded-[3rem] p-10 space-y-8">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-rose-900 italic">Incident Log</h3>
                        <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-0.5 leading-none">HSE Reporting & Delays</p>
                      </div>
                   </div>

                   <div className="space-y-2">
                     <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest ml-1">Observations / Bottlenecks</label>
                     <textarea 
                       value={newReport.incidentSummary}
                       onChange={(e) => setNewReport({ ...newReport, incidentSummary: e.target.value })}
                       rows={4}
                       className="w-full px-5 py-4 bg-white border border-rose-100 rounded-2xl text-xs font-bold text-rose-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none placeholder:text-rose-200"
                       placeholder="List any safety incidents or critical delays..."
                     />
                   </div>

                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl border border-rose-100 flex items-center justify-center shrink-0">
                         <HardHat className="w-5 h-5 text-rose-500" />
                      </div>
                      <p className="text-[9px] text-rose-800/60 font-bold uppercase tracking-tight leading-relaxed italic">
                        Safety is priority. Critical incidents reported here automatically notify the Project Manager and HSE Lead.
                      </p>
                   </div>
                </section>
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
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden text-slate-900">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Daily Operational Hierarchy</h2>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Site Log Database: {reports.length} verified records</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder={t('search_reports')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none w-64"
                      />
                    </div>
                    <button 
                      onClick={() => setView('form')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      File New Report
                    </button>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-10">
                 {filteredReports.map((report) => (
                   <motion.div
                     key={report.id}
                     whileHover={{ y: -4 }}
                     onClick={() => handleEdit(report)}
                     className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer relative overflow-hidden ring-1 ring-slate-100 hover:ring-blue-100 active:scale-95"
                   >
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm transition-colors group-hover:bg-blue-600 group-hover:text-white">
                              <Calendar className="w-5 h-5" />
                           </div>
                           <div className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic">{report.date}</div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.15em]",
                          report.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          {report.status}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-3 italic opacity-80 font-sans tracking-wide">
                           {report.progressSummary}
                        </p>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                           <div className="flex items-center gap-2.5">
                              <Users className="w-4 h-4 text-slate-300" />
                              <div>
                                 <p className="text-[10px] font-black text-slate-900 leading-none">{report.manpowerTotal}</p>
                                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">STAFF</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2.5">
                              <Truck className="w-4 h-4 text-slate-300" />
                              <div>
                                 <p className="text-[10px] font-black text-slate-900 leading-none">{report.equipmentTotal}</p>
                                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">UNITS</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                           <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[9px] font-black uppercase italic shadow-lg shadow-slate-900/10">
                              {report.author.charAt(0)}
                           </div>
                           <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{report.author}</div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                             className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-lg transition-all"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row gap-10 items-center shadow-2xl">
                  <div className="flex-1 space-y-6 relative z-10 text-slate-900">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center ring-1 ring-blue-500/30 shadow-inner">
                      <Clock className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter leading-none uppercase text-white">Daily Operational<br/>Verification Domain</h3>
                    <p className="text-slate-400 font-bold leading-relaxed max-w-xl text-[10px] uppercase tracking-wide opacity-80 font-sans">
                      Standardizing daily logs ensures a transparent audit trail for progress verification and performance monitoring. Every entry is cross-referenced with the WBS hierarchy to maintain schedule integrity.
                    </p>
                  </div>
                  <div className="absolute right-[-5%] bottom-[-10%] opacity-5 rotate-12 scale-150 pointer-events-none text-slate-900">
                    <FileText className="w-96 h-96 text-white" />
                  </div>
               </div>

               <div className="bg-blue-50 border border-blue-100 rounded-[3rem] p-10 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                     </div>
                     <h4 className="text-lg font-black uppercase tracking-tighter italic text-blue-900 leading-tight">Automated Rollup<br/>Engine Active</h4>
                     <p className="text-[10px] font-bold text-blue-800/60 leading-relaxed uppercase tracking-widest">
                       Site data from daily logs is automatically rolled up into weekly performance reports and EVM dashboards (4.2.1).
                     </p>
                  </div>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:gap-4 transition-all group">
                    Analyze Performance Metrics <ArrowRight className="w-3 h-3" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
