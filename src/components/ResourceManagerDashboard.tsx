import React, { useState, useEffect, useMemo } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { 
  Users, 
  Activity, 
  AlertCircle, 
  TrendingUp, 
  Package, 
  Wrench, 
  UserCheck, 
  Calendar,
  Search,
  Plus
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion } from 'motion/react';
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

interface Resource {
  id: string;
  name: string;
  type: 'Labor' | 'Material' | 'Equipment';
  unit: string;
  unitCost: number;
  capacity: number;
  utilized: number;
  status: 'Available' | 'Busy' | 'Maintenance';
}

interface ResourceManagerDashboardProps {
  page: Page;
}

export const ResourceManagerDashboard: React.FC<ResourceManagerDashboardProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatCurrency } = useCurrency();
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<'All' | 'Labor' | 'Material' | 'Equipment'>('All');

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'resources'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resource)));
    });

    // Mock initial data if none exists
    return () => unsub();
  }, [selectedProject?.id]);

  const stats = useMemo(() => {
    const total = resources.length;
    const busy = resources.filter(r => r.status === 'Busy').length;
    const utilization = resources.reduce((acc, r) => acc + (r.utilized / r.capacity), 0) / (total || 1);
    const critical = resources.filter(r => (r.utilized / r.capacity) > 0.9).length;

    return { total, busy, utilization: (utilization * 100).toFixed(1), critical };
  }, [resources]);

  const chartData = useMemo(() => {
    return resources.map(r => ({
      name: r.name,
      usage: (r.utilized / r.capacity) * 100,
      type: r.type
    })).sort((a,b) => b.usage - a.usage).slice(0, 8);
  }, [resources]);

  const filteredResources = resources.filter(r => filter === 'All' || r.type === filter);

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.1.10', title: 'Resource Mgmt Plan', status: 'Approved' }
      ]}
      outputs={[
        { id: '3.3.6-OUT', title: 'Utilization Report', status: 'Real-time' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Utilization Tracker</h2>
              <p className="text-sm text-slate-500 font-medium">Real-time performance monitoring of project assets and capacity.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
             {['All', 'Labor', 'Material', 'Equipment'].map((t) => (
               <button
                 key={t}
                 onClick={() => setFilter(t as any)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${filter === t ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 {t}
               </button>
             ))}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <StatCard icon={<Users className="w-5 h-5" />} label="Total Pool" value={stats.total} color="bg-blue-600" />
           <StatCard icon={<Calendar className="w-5 h-5" />} label="Currently Busy" value={stats.busy} color="bg-amber-500" />
           <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg Utilization" value={`${stats.utilization}%`} color="bg-teal-500" />
           <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Over-Utilized" value={stats.critical} color="bg-rose-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Chart */}
           <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">Top 8 Resource Load</h3>
              <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                       <XAxis type="number" hide />
                       <YAxis 
                         dataKey="name" 
                         type="category" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                       />
                       <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                       <Bar dataKey="usage" radius={[0, 4, 4, 0]} barSize={20}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.usage > 90 ? '#e11d48' : entry.usage > 70 ? '#f59e0b' : '#0d9488'} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Quick Actions / Alerts */}
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 shadow-xl shadow-emerald-900/10">
              <div>
                 <h4 className="text-xl font-semibold italic tracking-tighter mb-2">Inventory Alerts</h4>
                 <p className="text-sm text-slate-400 font-medium">Auto-scanned discrepancies from site logs.</p>
              </div>

              <div className="space-y-4">
                 {resources.filter(r => (r.utilized / r.capacity) > 0.95).map(r => (
                   <div key={r.id} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                         <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                         <p className="text-xs font-semibold italic">{r.name}</p>
                         <p className="text-[10px] font-bold text-slate-500">UTILIZATION: {((r.utilized/r.capacity)*100).toFixed(0)}%</p>
                      </div>
                   </div>
                 ))}
                 {resources.filter(r => (r.utilized / r.capacity) > 0.95).length === 0 && (
                   <p className="text-[10px] font-semibold uppercase text-center py-10 opacity-30 tracking-widest">No Alerts</p>
                 )}
              </div>

              <button className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-semibold text-[11px] uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                 <Plus className="w-4 h-4" />
                 Procure Material
              </button>
           </div>
        </div>

        {/* Master Pool Table */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 italic">Resource Master Pool</h3>
              <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <input placeholder="Search pool..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-semibold uppercase tracking-widest w-48" />
              </div>
           </div>
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Resource Identity</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Category</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest text-center">Rate</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest text-center">Status</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Load</th>
                    <th className="px-8 py-4"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filteredResources.map(r => (
                   <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                               r.type === 'Labor' ? 'bg-blue-50 text-blue-600' :
                               r.type === 'Material' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                               {r.type === 'Labor' ? <UserCheck className="w-5 h-5" /> : 
                                r.type === 'Material' ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                            </div>
                            <p className="text-sm font-semibold text-slate-900 italic">{r.name}</p>
                         </div>
                      </td>
                      <td className="px-8 py-6 uppercase text-[9px] font-semibold text-slate-400 tracking-widest">{r.type}</td>
                      <td className="px-8 py-6 text-center text-xs font-bold text-slate-700">
                         {formatCurrency(r.unitCost)} / {r.unit}
                      </td>
                      <td className="px-8 py-6 text-center">
                         <span className={`text-[8px] font-semibold px-2 py-0.5 rounded uppercase ${
                            r.status === 'Available' ? 'bg-emerald-50 text-emerald-600' :
                            r.status === 'Busy' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                         }`}>
                            {r.status}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="w-32 space-y-1">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                               <div className={`h-full rounded-full transition-all duration-1000 ${
                                  (r.utilized/r.capacity) > 0.9 ? 'bg-rose-500' : 'bg-emerald-500'
                               }`} style={{ width: `${(r.utilized/r.capacity)*100}%` }} />
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                               {r.utilized} / {r.capacity} {r.unit}
                            </p>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <button className="opacity-0 group-hover:opacity-100 text-[9px] font-semibold text-emerald-600 uppercase tracking-widest transition-all">Details</button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </StandardProcessPage>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
     <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
     </div>
     <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className="text-xl font-semibold text-slate-900 tracking-tight">{value}</p>
     </div>
  </div>
);
