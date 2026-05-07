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
  Printer,
  ChevronDown,
  Building2,
  Target,
  Package,
  History,
  ShieldCheck,
  X,
  Search,
  Briefcase,
  ListTodo
} from 'lucide-react';
import { Page, DailyReport, EntityConfig, PurchaseOrder, Company, ProjectIssue, POLineItem } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn, getISODate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { DriveUploadButton } from './common/DriveUploadButton';

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
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<DailyReport>>({
    date: new Date().toISOString().split('T')[0],
    discipline: 'General',
    weather: 'Sunny',
    temperature: '',
    manpowerTotal: 0,
    equipmentTotal: 0,
    incidentSummary: '',
    status: 'Draft',
    progressSummary: '',
    companies: [],
    equipmentList: [],
    materialsReceived: [],
    poProgress: [],
    departmentOutputs: []
  });

  useEffect(() => {
    if (!selectedProject?.id) return;

    // Fetch POs
    const poUnsubscribe = onSnapshot(
      query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setPos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      }
    );

    // Fetch Companies
    const companyUnsubscribe = onSnapshot(
      collection(db, 'companies'),
      (snapshot) => {
        setAllCompanies(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
      }
    );

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

      let reportId = editingReport?.id;

      if (reportId) {
        await updateDoc(doc(db, 'daily_reports', reportId), data);
        toast.success("Daily report updated");
      } else {
        reportId = crypto.randomUUID();
        await setDoc(doc(db, 'daily_reports', reportId), {
          ...data,
          id: reportId,
          author: 'System User',
          createdAt: serverTimestamp()
        });
        toast.success("Daily report filed successfully");
      }

      // Automation: Create Issue if incident is reported
      if (formData.incidentSummary && formData.incidentSummary.trim().length > 0) {
        const issueId = crypto.randomUUID();
        const issue: Partial<ProjectIssue> = {
          id: issueId,
          projectId: selectedProject.id,
          issue: formData.incidentSummary,
          category: 'Site Observation',
          impact: 'Potential Delay',
          urgency: 'High',
          status: 'Open',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days later
          responsibleParty: 'Site Engineer',
          responsiblePartyId: '', // Can be improved if we have a way to pick a user
          actions: 'Investigate and resolve observation from daily log.',
          comments: `Automatically generated from Daily Log on ${formData.date}`
        };
        await setDoc(doc(db, 'issues', issueId), {
          ...issue,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        toast.success("Issue automatically created and linked to Kanban");
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
      { key: 'discipline', label: 'Discipline', type: 'badge' },
      { key: 'author', label: 'Author', type: 'string' },
      { key: 'manpowerTotal', label: 'Manpower', type: 'number' },
      { key: 'status', label: 'Status', type: 'badge' },
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
      actions={
        <DriveUploadButton 
          drivePath="7_Performance_Reports_Quality_and_Communications/7.1_Work_Performance_Reports/7.1.1_Daily_Reports" 
          label="Daily Report Upload" 
        />
      }
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
                          {editingReport ? t('update_daily_log') : t('new_daily_log')}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Recording site activity and verification indices</p>
                      </div>
                    </div>
                  </div>

                    <section className="p-10 space-y-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Discipline / Section</label>
                            <div className="grid grid-cols-2 gap-2">
                               {['Civil', 'Mechanical', 'Technical Office', 'HSE', 'General'].map(d => (
                                 <button
                                   key={d}
                                   onClick={() => setFormData({ ...formData, discipline: d as any })}
                                   className={cn(
                                     "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                     formData.discipline === d 
                                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50/50"
                                   )}
                                 >
                                   {d}
                                 </button>
                               ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                           <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('reporting_date')}</label>
                           <input 
                             type="date"
                             value={getISODate(formData.date)}
                             onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                             className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                           />
                        </div>
                      </div>

                      <section className="space-y-8 bg-blue-50/30 p-8 rounded-[2.5rem] border border-blue-100/50">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                PO Progress Tracking
                            </h3>
                            <button 
                                onClick={() => {
                                    const firstPO = pos[0];
                                    if(!firstPO) return;
                                    const firstItem = firstPO.lineItems?.[0];
                                    setFormData({
                                        ...formData,
                                        poProgress: [
                                            ...(formData.poProgress || []),
                                            { 
                                                poId: firstPO.id, 
                                                poNumber: firstPO.contractNumber || firstPO.id.slice(0, 8),
                                                lineItemId: firstItem?.id || '',
                                                description: firstItem?.description || '',
                                                quantityDone: 0,
                                                uom: firstItem?.unit || '',
                                                totalQuantity: firstItem?.quantity || 0
                                            }
                                        ]
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-xl text-[10px] font-bold text-blue-600 uppercase tracking-widest shadow-sm hover:bg-blue-50 transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                Add PO Progress
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.poProgress?.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-white p-6 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                    <div className="md:col-span-1 space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select PO</label>
                                        <select 
                                            value={item.poId}
                                            onChange={(e) => {
                                                const selectedPO = pos.find(p => p.id === e.target.value);
                                                if(!selectedPO) return;
                                                const firstItem = selectedPO.lineItems?.[0];
                                                const newProgress = [...(formData.poProgress || [])];
                                                newProgress[idx] = { 
                                                    ...item, 
                                                    poId: selectedPO.id,
                                                    poNumber: selectedPO.contractNumber || selectedPO.id.slice(0, 8),
                                                    lineItemId: firstItem?.id || '',
                                                    description: firstItem?.description || '',
                                                    uom: firstItem?.unit || '',
                                                    totalQuantity: firstItem?.quantity || 0
                                                };
                                                setFormData({ ...formData, poProgress: newProgress });
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                        >
                                            {pos.map(p => <option key={p.id} value={p.id}>{p.contractNumber || p.id.slice(0, 8)} ({p.supplier})</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1 space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Line Item</label>
                                        <select 
                                            value={item.lineItemId}
                                            onChange={(e) => {
                                                const po = pos.find(p => p.id === item.poId);
                                                const lineItem = po?.lineItems.find(li => li.id === e.target.value);
                                                if(!lineItem) return;
                                                const newProgress = [...(formData.poProgress || [])];
                                                newProgress[idx] = { 
                                                    ...item, 
                                                    lineItemId: lineItem.id,
                                                    description: lineItem.description,
                                                    uom: lineItem.unit,
                                                    totalQuantity: lineItem.quantity
                                                };
                                                setFormData({ ...formData, poProgress: newProgress });
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                        >
                                            {pos.find(p => p.id === item.poId)?.lineItems.map(li => <option key={li.id} value={li.id}>{li.description}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1 space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Daily Qty ({item.uom})</label>
                                        <input 
                                            type="number"
                                            value={item.quantityDone}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newProgress = [...(formData.poProgress || [])];
                                                newProgress[idx].quantityDone = val;
                                                setFormData({ ...formData, poProgress: newProgress });
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-blue-600 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex flex-col justify-center h-full">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">% Completion</div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-emerald-500 transition-all duration-500" 
                                                    style={{ width: `${Math.min(100, (item.quantityDone / item.totalQuantity) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-600">{((item.quantityDone / item.totalQuantity) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-1 flex justify-end pb-1 gap-1">
                                        <button 
                                            onClick={async () => {
                                                const taskId = crypto.randomUUID();
                                                const po = pos.find(p => p.id === item.poId);
                                                await setDoc(doc(db, 'tasks', taskId), {
                                                    id: taskId,
                                                    projectId: selectedProject.id,
                                                    title: `PO Task: ${item.poNumber} - ${item.description}`,
                                                    description: `Auto-generated from Daily Report. PO: ${item.poNumber}, Progress: ${((item.quantityDone / item.totalQuantity) * 100).toFixed(1)}%`,
                                                    status: 'Todo',
                                                    priority: 'Medium',
                                                    poId: item.poId,
                                                    poNumber: item.poNumber,
                                                    supplier: po?.supplier || '',
                                                    createdAt: serverTimestamp(),
                                                    updatedAt: serverTimestamp()
                                                });
                                                toast.success("Task generated successfully for PO " + item.poNumber);
                                                // Navigate to tasks and open the new task
                                                window.location.href = `/page/3.6.3?taskId=${taskId}`;
                                            }}
                                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                            title="Generate Task"
                                        >
                                            <ListTodo className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const newProgress = formData.poProgress?.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, poProgress: newProgress });
                                            }}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                      </section>

                      {/* Department Outputs */}
                      <section className="space-y-8 bg-emerald-50/30 p-8 rounded-[2.5rem] border border-emerald-100/50">
                         <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Departmental Outputs & Milestones
                            </h3>
                            <button 
                                onClick={() => {
                                    setFormData({
                                        ...formData,
                                        departmentOutputs: [
                                            ...(formData.departmentOutputs || []),
                                            { discipline: formData.discipline || 'General', description: '', quantity: 0, unit: '' }
                                        ]
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-[10px] font-bold text-emerald-600 uppercase tracking-widest shadow-sm hover:bg-emerald-50 transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                Add Output
                            </button>
                         </div>
                         <div className="space-y-4">
                            {formData.departmentOutputs?.map((output, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Activity Description</label>
                                        <input 
                                            type="text"
                                            value={output.description || ''}
                                            onChange={(e) => {
                                                const newList = [...(formData.departmentOutputs || [])];
                                                newList[idx].description = e.target.value;
                                                setFormData({ ...formData, departmentOutputs: newList });
                                            }}
                                            placeholder="e.g. Completed foundation pour B-1"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Measurement</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number"
                                                value={output.quantity || 0}
                                                onChange={(e) => {
                                                    const newList = [...(formData.departmentOutputs || [])];
                                                    newList[idx].quantity = parseFloat(e.target.value) || 0;
                                                    setFormData({ ...formData, departmentOutputs: newList });
                                                }}
                                                className="w-24 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-emerald-600 outline-none"
                                            />
                                            <input 
                                                type="text"
                                                value={output.unit || ''}
                                                onChange={(e) => {
                                                     const newList = [...(formData.departmentOutputs || [])];
                                                     newList[idx].unit = e.target.value;
                                                     setFormData({ ...formData, departmentOutputs: newList });
                                                }}
                                                placeholder="Unit"
                                                className="w-20 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pb-1">
                                        <button 
                                            onClick={() => {
                                                const newList = formData.departmentOutputs?.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, departmentOutputs: newList });
                                            }}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                         </div>
                      </section>

                      <section className="space-y-6">
                        <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Executive Progress Narrative
                        </h3>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('narrative_description')}</label>
                          <textarea 
                            value={formData.progressSummary || ''}
                            onChange={(e) => setFormData({ ...formData, progressSummary: e.target.value })}
                            rows={6}
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                            placeholder="Describe the technical milestones achieved today..."
                          />
                        </div>
                      </section>

                      {/* Logistical Sections */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-900">
                         {/* Companies & Manpower */}
                         <section className="space-y-6 bg-slate-50 p-8 rounded-[3rem] border border-slate-200">
                           <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                Companies & Manpower
                              </h3>
                              <button 
                                onClick={() => setFormData({ 
                                    ...formData, 
                                    companies: [...(formData.companies || []), { companyId: allCompanies[0]?.id || '', companyName: allCompanies[0]?.name || '', count: 0 }] 
                                })}
                                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-blue-50 text-blue-600 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="space-y-3">
                              {formData.companies?.map((co, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                   <select 
                                     value={co.companyId}
                                     onChange={(e) => {
                                        const c = allCompanies.find(x => x.id === e.target.value);
                                        const newList = [...(formData.companies || [])];
                                        newList[idx] = { ...co, companyId: c?.id || '', companyName: c?.name || '' };
                                        setFormData({ ...formData, companies: newList });
                                     }}
                                     className="flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none"
                                   >
                                      {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                                   <input 
                                      type="number"
                                      value={co.count}
                                      onChange={(e) => {
                                          const newList = [...(formData.companies || [])];
                                          newList[idx].count = parseInt(e.target.value) || 0;
                                          const total = newList.reduce((sum, x) => sum + x.count, 0);
                                          setFormData({ ...formData, companies: newList, manpowerTotal: total });
                                      }}
                                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-blue-600 text-center outline-none"
                                   />
                                   <button 
                                      onClick={() => {
                                          const newList = formData.companies?.filter((_, i) => i !== idx);
                                          const total = newList?.reduce((sum, x) => sum + x.count, 0) || 0;
                                          setFormData({ ...formData, companies: newList, manpowerTotal: total });
                                      }}
                                      className="text-slate-300 hover:text-rose-500 transition-all"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                              ))}
                           </div>
                         </section>

                         {/* Equipment List */}
                         <section className="space-y-6 bg-slate-50 p-8 rounded-[3rem] border border-slate-200">
                           <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Truck className="w-4 h-4 text-slate-400" />
                                Equipment Inventory
                              </h3>
                              <button 
                                onClick={() => setFormData({ 
                                    ...formData, 
                                    equipmentList: [...(formData.equipmentList || []), { companyId: allCompanies[0]?.id || '', companyName: allCompanies[0]?.name || '', count: 0, equipmentType: '' }] 
                                })}
                                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-blue-50 text-blue-600 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="space-y-3">
                              {formData.equipmentList?.map((eq, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                   <div className="flex items-center justify-between gap-3">
                                       <select 
                                         value={eq.companyId}
                                         onChange={(e) => {
                                            const c = allCompanies.find(x => x.id === e.target.value);
                                            const newList = [...(formData.equipmentList || [])];
                                            newList[idx] = { ...eq, companyId: c?.id || '', companyName: c?.name || '' };
                                            setFormData({ ...formData, equipmentList: newList });
                                         }}
                                         className="flex-1 bg-transparent text-[10px] font-bold text-slate-400 uppercase outline-none"
                                       >
                                          {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                       </select>
                                       <button 
                                          onClick={() => setFormData({ ...formData, equipmentList: formData.equipmentList?.filter((_, i) => i !== idx) })}
                                          className="text-slate-300 hover:text-rose-500 transition-all"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <input 
                                         type="text"
                                         value={eq.equipmentType}
                                         onChange={(e) => {
                                             const newList = [...(formData.equipmentList || [])];
                                             newList[idx].equipmentType = e.target.value;
                                             setFormData({ ...formData, equipmentList: newList });
                                         }}
                                         placeholder="Machine Type"
                                         className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                      />
                                      <input 
                                         type="number"
                                         value={eq.count}
                                         onChange={(e) => {
                                             const newList = [...(formData.equipmentList || [])];
                                             newList[idx].count = parseInt(e.target.value) || 0;
                                             const total = newList.reduce((sum, x) => sum + x.count, 0);
                                             setFormData({ ...formData, equipmentList: newList, equipmentTotal: total });
                                         }}
                                         className="w-14 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-blue-600 text-center outline-none"
                                      />
                                   </div>
                                </div>
                              ))}
                           </div>
                         </section>

                         {/* Materials Received */}
                         <section className="space-y-6 bg-slate-50 p-8 rounded-[3rem] border border-slate-200 md:col-span-2">
                           <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package className="w-4 h-4 text-slate-400" />
                                Materials Received on Site
                              </h3>
                              <button 
                                onClick={() => setFormData({ 
                                    ...formData, 
                                    materialsReceived: [...(formData.materialsReceived || []), { materialName: '', quantity: 0, unit: '', supplier: '' }] 
                                })}
                                className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-emerald-50 text-emerald-600 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {formData.materialsReceived?.map((mat, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                   <div className="flex items-center justify-between gap-2">
                                       <input 
                                          type="text"
                                          value={mat.materialName}
                                          onChange={(e) => {
                                              const newList = [...(formData.materialsReceived || [])];
                                              newList[idx].materialName = e.target.value;
                                              setFormData({ ...formData, materialsReceived: newList });
                                          }}
                                          placeholder="Material Name"
                                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                       />
                                       <button 
                                          onClick={() => setFormData({ ...formData, materialsReceived: formData.materialsReceived?.filter((_, i) => i !== idx) })}
                                          className="text-slate-200 hover:text-rose-500 p-1"
                                       >
                                          <X className="w-4 h-4" />
                                       </button>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <input 
                                          type="number"
                                          value={mat.quantity}
                                          onChange={(e) => {
                                              const newList = [...(formData.materialsReceived || [])];
                                              newList[idx].quantity = parseFloat(e.target.value) || 0;
                                              setFormData({ ...formData, materialsReceived: newList });
                                          }}
                                          className="w-20 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-emerald-600 outline-none"
                                       />
                                       <input 
                                          type="text"
                                          value={mat.unit}
                                          onChange={(e) => {
                                              const newList = [...(formData.materialsReceived || [])];
                                              newList[idx].unit = e.target.value;
                                              setFormData({ ...formData, materialsReceived: newList });
                                          }}
                                          placeholder="Unit"
                                          className="w-16 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-400 outline-none"
                                       />
                                       <input 
                                          type="text"
                                          value={mat.supplier}
                                          onChange={(e) => {
                                              const newList = [...(formData.materialsReceived || [])];
                                              newList[idx].supplier = e.target.value;
                                              setFormData({ ...formData, materialsReceived: newList });
                                          }}
                                          placeholder="Supplier / Origin"
                                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-900 outline-none"
                                       />
                                   </div>
                                </div>
                              ))}
                           </div>
                         </section>
                      </div>
                    </section>
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
                        <h3 className="text-sm font-black uppercase tracking-widest text-rose-900 italic">{t('incident_log')}</h3>
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
                  discipline: 'General',
                  weather: 'Sunny',
                  temperature: '',
                  manpowerTotal: 0,
                  equipmentTotal: 0,
                  incidentSummary: '',
                  status: 'Draft',
                  progressSummary: '',
                  companies: [],
                  equipmentList: [],
                  materialsReceived: [],
                  poProgress: [],
                  departmentOutputs: []
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
