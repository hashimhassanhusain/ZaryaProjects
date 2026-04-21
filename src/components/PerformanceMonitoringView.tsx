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
  Briefcase
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { StandardProcessPage } from './StandardProcessPage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';
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
  const { t } = useLanguage();
  const { selectedProject } = useProject();
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
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);

  useEffect(() => {
    if (!selectedProject) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const proj = snap.data() as Project;
        if (proj.performanceMonitoringData) setData(proj.performanceMonitoringData as any);
        if (proj.performanceMonitoringHistory) setVersions(proj.performanceMonitoringHistory);
        
        // In a real scenario, we would also fetch latest EVM data from '4.2.2' subcollection or doc
        if (proj.evmData) {
           // Sync dynamic EVM data if available
        }
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
        performanceMonitoringData: data,
        performanceMonitoringHistory: [newVersion, ...versions],
        updatedAt: timestamp
      });
      toast.success('Performance Monitoring Updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update monitoring data');
    } finally {
      setIsSaving(false);
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

    doc.text('Key Performance Indicators:', margin, 55);
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Planned', 'Actual', 'Variance']],
      body: data.governanceKPIs.map(k => [k.name, `${k.planned} ${k.unit}`, `${k.actual} ${k.unit}`, `${(k.actual - k.planned).toFixed(1)}`]),
      theme: 'grid',
      headStyles: { fillColor: [48, 48, 48] }
    });

    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-GOV-MON-V${vStr}.pdf`);
  };

  return (
    <StandardProcessPage
      page={page}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '2.1.2', title: 'Master Plan', status: 'Baselined' },
        { id: '4.2.2', title: 'EVM Reports', status: 'Live Data' },
        { id: 'logs', title: 'Change Requests', status: 'Active' }
      ]}
      outputs={[
        { id: 'performance-report', title: 'Performance Status', status: 'Validated' },
        { id: 'corrective-actions', title: 'Corrective Actions', status: 'Required' }
      ]}
    >
      <div className="space-y-16">
        {/* Governance KPI Dashboard */}
        <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
           <div className="relative z-10 flex flex-col md:flex-row gap-12">
              <div className="flex-1 space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400">
                       <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black tracking-tight leading-none">GOVERNANCE ANALYTICS</h3>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Planned vs. Actual Performance</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    {data.governanceKPIs.map((kpi, idx) => (
                       <div key={idx} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 hover:bg-white/10 transition-all group">
                          <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-400">{kpi.name}</span>
                             {kpi.actual > kpi.planned ? (
                                <ArrowUpRight className="w-4 h-4 text-red-400" />
                             ) : (
                                <Zap className="w-4 h-4 text-emerald-400" />
                             )}
                          </div>
                          <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-black">{kpi.actual}</span>
                             <span className="text-xs text-slate-500 font-bold">{kpi.unit}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                   className={cn(
                                      "h-full rounded-full",
                                      kpi.actual > kpi.planned ? "bg-red-500" : "bg-emerald-500"
                                   )}
                                   style={{ width: `${Math.min(100, (kpi.actual / Math.max(kpi.planned, 1)) * 100)}%` }}
                                />
                             </div>
                             <span className="text-[9px] font-black text-slate-400">Target: {kpi.planned}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="w-full md:w-80 space-y-6">
                 <div className="bg-blue-600 rounded-[2rem] p-8 shadow-xl shadow-blue-900/40">
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Financial Health (EVM)</h4>
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-100">SPI (Schedule)</span>
                          <span className={cn("text-xl font-black", data.evmSnapshot.spi >= 1 ? "text-white" : "text-amber-200")}>
                             {data.evmSnapshot.spi.toFixed(2)}
                          </span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-100">CPI (Cost)</span>
                          <span className={cn("text-xl font-black", data.evmSnapshot.cpi >= 1 ? "text-white" : "text-red-200")}>
                             {data.evmSnapshot.cpi.toFixed(2)}
                          </span>
                       </div>
                       <div className="pt-4 border-t border-white/20">
                          <div className="p-3 bg-white/10 rounded-xl flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4 text-amber-300" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Action Required</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-800 rounded-[2rem] p-8 border border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-4">Baseline Trend</h4>
                    <div className="h-24 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.governanceKPIs}>
                             <Bar dataKey="actual">
                                {data.governanceKPIs.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.actual > entry.planned ? '#f87171' : '#10b981'} />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Monitoring & Status Validation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                       <Activity className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Performance Summary</h4>
                 </div>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Governance performance is currently displaying a negative schedule variance in approval cycles. The average approval velocity is 4 days against a target of 2 days. Corrective actions must focus on streamlining the Integrated Change Control process.
                 </p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Verification</span>
              </div>
           </div>

           <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                    <Target className="w-5 h-5" />
                 </div>
                 <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-widest">Critical Actions</h4>
              </div>
              <div className="space-y-4">
                 {[
                    'Escalate Resource Approval Delay to Project Sponsor',
                    'Recalibrate Schedule Baseline in Planning Domain',
                    'Conduct Root Cause Analysis for Variance Approval Speed'
                 ].map((action, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:translate-x-1 group cursor-pointer">
                       <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                          <CheckCircle2 className="w-3 h-3 text-white group-hover:text-blue-500" />
                       </div>
                       <span className="text-xs font-bold text-slate-700">{action}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </StandardProcessPage>
  );
};
