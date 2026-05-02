import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Users, 
  CloudSun, 
  HardHat, 
  Truck, 
  AlertCircle,
  Clock,
  Calendar,
  Trash2,
  ArrowRight,
  Thermometer,
  MoreVertical,
  Filter,
  CheckCircle2,
  Download,
  Printer
} from 'lucide-react';
import { Page, DailyReport, EntityConfig } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface DailyReportViewProps {
  page: Page;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  const context = useStandardProcessPage();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<DailyReport>>({
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
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'daily_reports');
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject || !formData.progressSummary) {
      toast.error("Please provide a progress summary");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        projectId: selectedProject.id,
        updatedAt: serverTimestamp()
      };

      if (editingReport?.id) {
        await updateDoc(doc(db, 'daily_reports', editingReport.id), data);
        toast.success("Daily report updated");
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'daily_reports', id), {
          ...data,
          id,
          author: 'System User',
          createdAt: serverTimestamp()
        });
        toast.success("Daily report filed successfully");
      }
      setViewMode('grid');
      setEditingReport(null);
    } catch (err) {
      handleFirestoreError(err, editingReport ? OperationType.UPDATE : OperationType.CREATE, 'daily_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archive this daily report?")) return;
    try {
      await deleteDoc(doc(db, 'daily_reports', id));
      toast.success("Report archived");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'daily_reports');
    }
  };

  const gridConfig: EntityConfig = {
    id: 'daily_reports' as any,
    label: page.title,
    icon: FileText,
    collection: 'daily_reports',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'author', label: 'Author', type: 'string' },
      { key: 'manpowerTotal', label: 'Manpower', type: 'number' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'weather', label: 'Weather', type: 'string' }
    ]
  };

  return (
    <StandardProcessPage
      page={page}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={handleSave}
      isSaving={isSaving}
      inputs={[{ id: '4.1.2', title: 'Work Performance Data' }]}
    >
      <AnimatePresence mode="wait">
        {viewMode === 'edit' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
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
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Log Author / Foreman</label>
                          <input 
                            readOnly
                            value={formData.author || 'System User'}
                            className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Executive Progress Summary
                      </h3>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Narrative Description of Work Performed</label>
                        <textarea 
                          value={formData.progressSummary}
                          onChange={(e) => setFormData({ ...formData, progressSummary: e.target.value })}
                          rows={6}
                          className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                          placeholder="Describe the technical milestones achieved today..."
                        />
                      </div>
                    </section>

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
                                value={formData.manpowerTotal}
                                onChange={(e) => setFormData({ ...formData, manpowerTotal: parseInt(e.target.value) || 0 })}
                                className="w-32 px-5 py-4 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-blue-600 text-center focus:ring-4 focus:ring-blue-500/10 outline-none"
                              />
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
                                value={formData.equipmentTotal}
                                onChange={(e) => setFormData({ ...formData, equipmentTotal: parseInt(e.target.value) || 0 })}
                                className="w-32 px-5 py-4 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-blue-600 text-center focus:ring-4 focus:ring-blue-500/10 outline-none"
                              />
                           </div>
                         </div>
                      </div>
                    </section>
                  </div>
                </section>
              </div>

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
                            onClick={() => setFormData({ ...formData, weather: 'Sunny' })}
                            className={cn(
                              "p-4 rounded-3xl border flex flex-col gap-3 transition-all",
                              formData.weather === 'Sunny' ? "bg-white/10 border-blue-500/50 text-white" : "bg-white/5 border-white/10 text-slate-500"
                            )}
                          >
                             <CloudSun className="w-6 h-6" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Sunny</span>
                          </button>
                          <button
                            onClick={() => setFormData({ ...formData, weather: 'Rainy' })}
                            className={cn(
                              "p-4 rounded-3xl border flex flex-col gap-3 transition-all",
                              formData.weather === 'Rainy' ? "bg-white/10 border-blue-500/50 text-white" : "bg-white/5 border-white/10 text-slate-500"
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
                               value={formData.temperature}
                               onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
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
                       value={formData.incidentSummary}
                       onChange={(e) => setFormData({ ...formData, incidentSummary: e.target.value })}
                       rows={4}
                       className="w-full px-5 py-4 bg-white border border-rose-100 rounded-2xl text-sm font-bold text-rose-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none placeholder:text-rose-200"
                       placeholder="List any safety incidents or critical delays..."
                     />
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
            className="flex-1 flex flex-col pt-4"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={reports}
              onRowClick={(record) => {
                setEditingReport(record as DailyReport);
                setFormData(record as DailyReport);
                setViewMode('edit');
              }}
              onNewClick={() => {
                setEditingReport(null);
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  weather: 'Sunny',
                  temperature: '',
                  manpowerTotal: 0,
                  equipmentTotal: 0,
                  incidentSummary: '',
                  status: 'Draft',
                  progressSummary: ''
                });
                setViewMode('edit');
              }}
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
