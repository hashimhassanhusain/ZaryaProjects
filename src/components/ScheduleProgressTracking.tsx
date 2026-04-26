import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Activity as ActivityIcon, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Timer,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Page, Activity, PurchaseOrder } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { StandardProcessPage } from './StandardProcessPage';
import { ProjectScheduleView } from './ProjectScheduleView';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ScheduleProgressTrackingProps {
  page: Page;
}

export const ScheduleProgressTracking: React.FC<ScheduleProgressTrackingProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    
    const qAct = query(collection(db, 'activities'), where('projectId', '==', selectedProject.id));
    const unsubAct = onSnapshot(qAct, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
      const deDuped: Activity[] = [];
      const seen = new Set<string>();
      data.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deDuped.push(item);
        }
      });
      setActivities(deDuped);
    });

    const qPo = query(collection(db, 'purchase-orders'), where('projectId', '==', selectedProject.id));
    const unsubPo = onSnapshot(qPo, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));
      const deDuped: PurchaseOrder[] = [];
      const seen = new Set<string>();
      data.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deDuped.push(item);
        }
      });
      setPurchaseOrders(deDuped);
    });

    return () => {
      unsubAct();
      unsubPo();
    };
  }, [selectedProject?.id]);

  // Calculations
  const today = new Date();
  
  const calculateMetrics = (act: Activity) => {
    if (!act.startDate || !act.finishDate) return { timeProgress: 0, costProgress: 0 };
    
    const start = new Date(act.startDate);
    const finish = new Date(act.finishDate);
    const totalDuration = (finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    let timeProgress = 0;
    if (today > start) {
      if (today > finish) {
        timeProgress = 100;
      } else {
        const elapsed = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        timeProgress = Math.min(99, Math.round((elapsed / totalDuration) * 100));
      }
    }
    
    const costProgress = act.percentComplete || 0;
    
    return { timeProgress, costProgress };
  };

  const projectMetrics = activities.map(calculateMetrics);
  const avgTimeProgress = projectMetrics.length > 0 
    ? Math.round(projectMetrics.reduce((acc, m) => acc + m.timeProgress, 0) / projectMetrics.length) 
    : 0;
  const avgCostProgress = projectMetrics.length > 0 
    ? Math.round(projectMetrics.reduce((acc, m) => acc + m.costProgress, 0) / projectMetrics.length) 
    : 0;

  const slippageValue = avgTimeProgress - avgCostProgress;
  const isSlipping = slippageValue > 15;

  const [showGantt, setShowGantt] = useState(false);

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.3.3', title: 'Schedule Baseline', status: 'Approved' },
        { id: '4.2.6', title: 'PO Tracking', status: 'Active' }
      ]}
      outputs={[
        { id: '4.5.1-OUT', title: 'Schedule Variance Report', status: 'Ready' }
      ]}
    >
      <div className="space-y-8 pb-20">
        {/* Domain Tool: Gantt Chart Accordion */}
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
          <button 
            onClick={() => setShowGantt(!showGantt)}
            className="w-full px-8 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest">Gantt Chart Tool</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Interactive Monitoring Visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {showGantt ? 'Hide Tool' : 'Launch Tool'}
              </span>
              <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", showGantt && "rotate-90")} />
            </div>
          </button>
          
          <AnimatePresence>
            {showGantt && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '600px', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 overflow-hidden"
              >
                <ProjectScheduleView page={page} hideHeader={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <header className="flex items-center justify-between">
           <div className="space-y-1">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                    <Timer className="w-5 h-5" />
                 </div>
                 <h2 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none italic">Progress Tracker</h2>
              </div>
              <p className="text-sm text-slate-500 font-medium ml-13">Analyzing Time Elapsed vs. Physical Accomplishment.</p>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-0.5">
                 <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Project Health</p>
                 <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", isSlipping ? "text-rose-600" : "text-emerald-600")}>
                      {isSlipping ? 'At Risk' : 'Healthy'}
                    </span>
                    <div className={cn("w-2 h-2 rounded-full", isSlipping ? "bg-rose-500 animate-ping" : "bg-emerald-500")} />
                 </div>
              </div>
           </div>
        </header>

        {/* Global Pulse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-10 -translate-y-10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
              <div className="relative z-10 space-y-6">
                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                    <Clock className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Time Elapsed</p>
                    <div className="flex items-end gap-2">
                       <span className="text-4xl font-semibold italic tracking-tighter">{avgTimeProgress}%</span>
                       <span className="text-[10px] font-bold text-slate-400 mb-2">AVG</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm relative group overflow-hidden">
              <div className="relative z-10 space-y-6">
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Physical Work (% Cost)</p>
                    <div className="flex items-end gap-2">
                       <span className="text-4xl font-semibold italic tracking-tighter text-slate-900">{avgCostProgress}%</span>
                       <span className="text-[10px] font-bold text-slate-400 mb-2">COMPLETE</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className={cn(
             "rounded-[2.5rem] p-8 border relative overflow-hidden group",
             isSlipping ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
           )}>
              <div className="relative z-10 space-y-6">
                 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", isSlipping ? "bg-white text-rose-600" : "bg-white text-slate-400")}>
                    <TrendingUp className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Schedule Variance</p>
                    <div className="flex items-end gap-2">
                       <span className={cn("text-4xl font-semibold italic tracking-tighter", isSlipping ? "text-rose-600" : "text-slate-900")}>
                        {slippageValue}%
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 mb-2">DELAY</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10 blur-2xl group-hover:bg-white/20 transition-all" />
              <div className="relative z-10 space-y-6">
                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <Calendar className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200 mb-1">Items at Risk</p>
                    <div className="flex items-end gap-2">
                       <span className="text-4xl font-semibold italic tracking-tighter">
                          {activities.filter(a => {
                            const { timeProgress, costProgress } = calculateMetrics(a);
                            return timeProgress - costProgress > 15;
                          }).length}
                       </span>
                       <span className="text-[10px] font-bold text-blue-100 mb-2">TASKS</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-xl font-semibold text-slate-900 tracking-tight leading-none italic">S-Curve Analysis</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Progression vs Real Accomplishment</p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Planned (Time)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Actual (Cost)</span>
                 </div>
              </div>
           </div>

           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={[
                   { name: 'Month 1', planned: 20, actual: 15 },
                   { name: 'Month 2', planned: 45, actual: 35 },
                   { name: 'Month 3', planned: 70, actual: 55 },
                   { name: 'Today', planned: avgTimeProgress, actual: avgCostProgress },
                 ]}>
                    <defs>
                       <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                       dy={10}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                       unit="%"
                    />
                    <Tooltip 
                       contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                       itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    />
                    <Area type="monotone" dataKey="planned" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorPlanned)" />
                    <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Activity Breakdown Table */}
        <section className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
           <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-xl font-semibold text-slate-900 tracking-tight leading-none italic">Activity Tracking Matrix</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail view of all scheduled tasks</p>
              </div>
              {isSlipping && (
                <button className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest animate-pulse">
                   <ShieldAlert className="w-4 h-4" />
                   Create Change Request
                </button>
              )}
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50/50">
                       <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Activity</th>
                       <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Work Package</th>
                       <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">Time Progress</th>
                       <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">Physical (% Cost)</th>
                       <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-right">Variance</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {activities.map(act => {
                       const { timeProgress, costProgress } = calculateMetrics(act);
                       const variance = timeProgress - costProgress;
                       
                       return (
                          <tr key={act.id} className="group hover:bg-slate-50/50 transition-all">
                             <td className="px-10 py-6">
                                <div className="space-y-1">
                                   <p className="text-[10px] font-semibold text-slate-400 uppercase">{act.id}</p>
                                   <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{act.description}</h4>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <div className="px-3 py-1 bg-slate-100 rounded-lg inline-block">
                                   <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-tighter">{act.workPackage}</span>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <div className="flex flex-col items-center gap-2">
                                   <span className="text-xs font-semibold text-slate-600">{timeProgress}%</span>
                                   <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${timeProgress}%` }} />
                                   </div>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <div className="flex flex-col items-center gap-2">
                                   <span className="text-xs font-semibold text-emerald-600">{costProgress}%</span>
                                   <div className="w-24 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${costProgress}%` }} />
                                   </div>
                                </div>
                             </td>
                             <td className="px-10 py-6 text-right">
                                <div className={cn(
                                   "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase",
                                   variance > 15 ? "bg-rose-50 text-rose-600" : variance > 5 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                   {variance > 0 ? `+${variance}%` : `${variance}%`}
                                   {variance > 10 ? <ArrowUpRight className="w-3.5 h-3.5" /> : variance < -10 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </section>

        <section className="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
           <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-8">
                 <div className="w-16 h-16 rounded-[1.5rem] bg-white text-blue-600 flex items-center justify-center shadow-xl">
                    <TrendingUp className="w-8 h-8" />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-2xl font-semibold italic tracking-tighter">Forecast Completion</h3>
                    <p className="text-sm text-blue-100 font-medium">Based on current performance, projected finish is <span className="text-white font-semibold underline decoration-white/30 underline-offset-4">Oct 12, 2026</span></p>
                 </div>
              </div>
              <button className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-semibold uppercase shadow-xl shadow-slate-900/40">
                 Run Forecasting
                 <ArrowRight className="w-4 h-4" />
              </button>
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
