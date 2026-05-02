import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  FileText, 
  Download, 
  Save, 
  Target, 
  ShieldCheck, 
  GitBranch, 
  Layers,
  History,
  Box,
  MessageSquare,
  Activity,
  DollarSign,
  ShoppingCart,
  Users,
  ShieldAlert,
  ClipboardList,
  Briefcase
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { StandardProcessPage } from './StandardProcessPage';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MasterPlanAssemblyViewProps {
  page: Page;
}

export const MasterPlanAssemblyView: React.FC<MasterPlanAssemblyViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [data, setData] = useState({
    executiveSummary: '',
    integrationStrategy: '',
    dependencyMapping: '',
    baselines: {
       scope: '',
       schedule: '',
       cost: ''
    },
    subsidiaryPlans: [
      { id: '2.1.9', title: 'Scope Management', status: 'Draft' },
      { id: '2.1.11', title: 'Schedule Management', status: 'Pending' },
      { id: '2.1.12', title: 'Cost Management', status: 'Draft' },
      { id: '2.1.3', title: 'Quality Management', status: 'Draft' },
      { id: '2.1.13', title: 'Procurement Strategy', status: 'Pending' }
    ]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);

  useEffect(() => {
    if (!selectedProject) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const proj = snap.data() as Project;
        if (proj.masterPlanData) setData(proj.masterPlanData as any);
        if (proj.masterPlanHistory) setVersions(proj.masterPlanHistory);
      }
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || 'System';
      const timestamp = new Date().toISOString();
      const nextVersion = (versions[0]?.version || 1.0) + 0.1;
      
      const newVersion: PageVersion = {
        version: Number(nextVersion.toFixed(1)),
        date: timestamp,
        author: user,
        data: data as any
      };

      await updateDoc(doc(db, 'projects', selectedProject.id), {
        masterPlanData: data,
        masterPlanHistory: [newVersion, ...versions],
        updatedAt: timestamp
      });
      toast.success('Master Plan Updated Successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update Master Plan');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT MASTER PLAN ASSEMBLY', pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Project Code: ${selectedProject.code}`, margin, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });

    autoTable(doc, {
      startY: 55,
      head: [['Section', 'Details']],
      body: [
        ['Executive Summary', data.executiveSummary],
        ['Integration Strategy', data.integrationStrategy],
        ['Dependency Mapping', data.dependencyMapping],
        ['Scope Baseline', data.baselines.scope],
        ['Schedule Baseline', data.baselines.schedule],
        ['Cost Baseline', data.baselines.cost]
      ],
      theme: 'grid',
      headStyles: { fillColor: [48, 48, 48] }
    });

    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-PMIS-GOV-MPA-V${vStr}.pdf`);
  };

  return (
    <StandardProcessPage
      page={page}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '1.1.1', title: 'Project Charter', status: 'Approved' },
        { id: '2.1.1', title: 'Governance Approach', status: 'Baselined' },
        { id: '2.1.5', title: 'Assumption Log' }
      ]}
      outputs={[
        { id: '2.1.2_out', title: 'Project Master Plan', status: 'Active' },
        { id: '2.1.2_schedule', title: 'Integrated Schedule', status: 'Baselined' }
      ]}
    >
      <div className="space-y-12">
        {/* Executive Mapping */}
        <section className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                 <GitBranch className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Integration Command Hub</h3>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">PMBOK Standard: Plan Alignment</p>
              </div>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Integration Strategy</label>
                 <textarea 
                    value={data.integrationStrategy}
                    onChange={(e) => setData({ ...data, integrationStrategy: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="Describe how subsidiary plans interact and integrate."
                    rows={3}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Cross-Domain Dependency Mapping</label>
                 <textarea 
                    value={data.dependencyMapping}
                    onChange={(e) => setData({ ...data, dependencyMapping: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="Identify critical interdependencies between schedule, cost, and scope."
                    rows={3}
                 />
              </div>
           </div>
        </section>

        {/* Triple Constraint Baselines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm transition-all hover:shadow-xl group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                 <Box className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">Scope Baseline</h4>
              <textarea 
                value={data.baselines.scope}
                onChange={(e) => setData({ ...data, baselines: { ...data.baselines, scope: e.target.value }})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Final scope statement summary"
                rows={4}
              />
           </div>
           <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm transition-all hover:shadow-xl group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                 <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">Schedule Baseline</h4>
              <textarea 
                value={data.baselines.schedule}
                onChange={(e) => setData({ ...data, baselines: { ...data.baselines, schedule: e.target.value }})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 outline-none"
                placeholder="Critical path and milestone lock"
                rows={4}
              />
           </div>
           <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm transition-all hover:shadow-xl group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                 <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">Cost Baseline</h4>
              <textarea 
                value={data.baselines.cost}
                onChange={(e) => setData({ ...data, baselines: { ...data.baselines, cost: e.target.value }})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="Budget allocation and spending curve"
                rows={4}
              />
           </div>
        </div>

        {/* Subsidiary Plan Status Matrix */}
        <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 backdrop-blur-sm">
                    <Layers className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-semibold tracking-tight leading-none">SUBSIDIARY COMPONENT MATRIX</h3>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-2">Inventory of 13 Management Components</p>
                 </div>
              </div>
              <button 
                 onClick={handleSave}
                 className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
              >
                 <History className="w-4 h-4" />
                 Refresh Status
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.subsidiaryPlans.map((plan, idx) => (
                 <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                       <span className="text-[10px] font-semibold text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">{idx + 1}</span>
                       <span className="text-sm font-bold tracking-tight">{plan.title}</span>
                    </div>
                    <div className={cn(
                       "px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest",
                       plan.status === 'Baselined' ? "bg-emerald-500/20 text-emerald-400" :
                       plan.status === 'Pending' ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                    )}>
                       {plan.status}
                    </div>
                 </div>
              ))}
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
