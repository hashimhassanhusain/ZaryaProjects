import React, { useMemo, useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingDown, 
  Activity, 
  AlertCircle, 
  ShieldCheck, 
  ChevronRight, 
  Zap,
  Info
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';

interface Risk {
  id: string;
  probability: number;
  impact: number;
  status: string;
  category: string;
}

interface RiskDashboardViewProps {
  page: Page;
}

export const RiskDashboardView: React.FC<RiskDashboardViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatCurrency } = useCurrency();
  const [risks, setRisks] = useState<Risk[]>([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'risks'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snap) => setRisks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Risk))));
    return () => unsub();
  }, [selectedProject?.id]);

  const stats = useMemo(() => {
    const total = risks.length;
    const high = risks.filter(r => r.probability * r.impact >= 12).length;
    const emv = risks.reduce((acc, r) => acc + (r.probability * r.impact * 1000), 0); // Simplified EMV logic
    const closed = risks.filter(r => r.status === 'Retired').length;
    return { total, high, emv, closed };
  }, [risks]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    risks.forEach(r => {
      cats[r.category] = (cats[r.category] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [risks]);

  // Mock burn-down data for visualization
  const burnDownData = [
    { name: 'Month 1', reserve: 100000, risks: 80000 },
    { name: 'Month 2', reserve: 95000, risks: 75000 },
    { name: 'Month 3', reserve: 90000, risks: 85000 },
    { name: 'Month 4', reserve: 80000, risks: 60000 },
    { name: 'Month 5', reserve: 75000, risks: 45000 },
  ];

  const COLORS = ['#e11d48', '#f59e0b', '#0d9488', '#3b82f6', '#8b5cf6'];

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.4.3', title: 'Reserve Analysis', status: 'Approved' },
        { id: '2.7.5', title: 'Risk Register', status: 'Live' }
      ]}
      outputs={[
        { id: '4.7.1-OUT', title: 'Safety Compliance Report', status: 'Generated' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg text-white">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Contingency Burn-down</h2>
            <p className="text-sm text-slate-500 font-medium">Tracking reserve depletion against emergent project uncertainty.</p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5">Critical Risks</p>
                 <p className="text-xl font-semibold text-slate-900">{stats.high}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Zap className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5">Total Exposure (EMV)</p>
                 <p className="text-xl font-semibold text-slate-900">{formatCurrency(stats.emv)}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5">Retired Risks</p>
                 <p className="text-xl font-semibold text-slate-900">{stats.closed}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Activity className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest mb-0.5">Alert Level</p>
                 <p className="text-xl font-semibold text-slate-900">{stats.high > 10 ? 'CRITICAL' : stats.high > 5 ? 'ELEVATED' : 'STABLE'}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Burn-down Chart */}
           <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">Financial Safety Monitor</h3>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-rose-500" />
                       <span className="text-[8px] font-semibold text-slate-400 uppercase">Exposure</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-slate-200" />
                       <span className="text-[8px] font-semibold text-slate-400 uppercase">Reserve</span>
                    </div>
                 </div>
              </div>
              <div className="h-[350px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={burnDownData}>
                       <defs>
                          <linearGradient id="colorReserve" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#f1f5f9" stopOpacity={0.8}/>
                             <stop offset="95%" stopColor="#f1f5f9" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }} />
                       <YAxis hide />
                       <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                       <Area type="monotone" dataKey="reserve" stroke="#e2e8f0" strokeWidth={3} fillOpacity={1} fill="url(#colorReserve)" />
                       <Area type="monotone" dataKey="risks" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" dot={{ fill: '#e11d48', strokeWidth: 2, r: 4 }} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* AI Insight / Distribution */}
           <div className="space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-rose-900/10">
                 <div className="relative z-10 space-y-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                       <Activity className="w-6 h-6 text-rose-400" />
                    </div>
                    <h3 className="text-2xl font-semibold italic tracking-tighter leading-none">Risk Sensitivity<br/>Trend Analysis</h3>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                       PMIS AI detects an increasing trend in **Supply Chain** risks. Historical data suggests a 14% chance of cost escalation in Q4 due to regional logistics volatility.
                    </p>
                    <button className="flex items-center gap-2 group text-[9px] font-semibold uppercase text-rose-400 tracking-widest pt-4">
                       Deep Scan Analysis
                       <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
                 <div className="absolute right-[-10%] bottom-[-10%] opacity-5 rotate-12">
                    <Activity className="w-64 h-64" />
                 </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-6 text-center">
                 <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">Portfolio Distribution</h3>
                 <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie 
                            data={categoryData} 
                            innerRadius={60} 
                            outerRadius={80} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                             {categoryData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px' }} />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {categoryData.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                         <span className="text-[8px] font-semibold text-slate-500 uppercase truncate">{c.name}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </StandardProcessPage>
  );
};
