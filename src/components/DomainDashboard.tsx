import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package
} from 'lucide-react';
import { motion } from 'motion/react';
import { Page } from '../types';

interface DomainDashboardProps {
  page: Page;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ICON_MAP: Record<string, any> = {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package
};

export const DomainDashboard: React.FC<DomainDashboardProps> = ({ page }) => {
  const domainKey = page.domain || 'governance';
  
  // Mock chart data based on domain since we don't have real historical data yet
  const getChartData = () => {
    switch (domainKey) {
      case 'governance':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Initiating', val: 100 },
              { name: 'Planning', val: 85 },
              { name: 'Executing', val: 45 },
              { name: 'Monitoring', val: 30 },
              { name: 'Closing', val: 5 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'schedule':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { name: 'W1', planned: 10, actual: 8 },
              { name: 'W2', planned: 25, actual: 20 },
              { name: 'W3', planned: 45, actual: 42 },
              { name: 'W4', planned: 70, actual: 65 },
              { name: 'W5', planned: 90, actual: 82 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="planned" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'finance':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[
              { name: 'Jan', budget: 200, actual: 180 },
              { name: 'Feb', budget: 400, actual: 390 },
              { name: 'Mar', budget: 600, actual: 620 },
              { name: 'Apr', budget: 800, actual: 750 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="budget" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'risk':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Low', value: 45 },
                  { name: 'Medium', value: 30 },
                  { name: 'High', value: 15 },
                  { name: 'Critical', value: 10 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {COLORS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const kpis = page.kpis || [];
  const alerts = page.alerts || [];

  return (
    <div className="space-y-6 mb-10">
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = ICON_MAP[kpi.icon || 'Info'] || Info;
            const colorClass = 
              kpi.status === 'success' ? 'text-emerald-600' :
              kpi.status === 'warning' ? 'text-amber-600' :
              kpi.status === 'danger' ? 'text-rose-600' :
              'text-blue-600';

            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-xl bg-slate-50 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {kpi.trend && (
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-full">
                      {kpi.trend}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">{kpi.label}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Domain Performance</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-medium text-slate-500">Planned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-slate-500">Actual</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full" style={{ minHeight: 256, minWidth: 0 }}>
            {getChartData() || (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No chart data available for this domain.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Domain Alerts</h3>
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-xl text-xs flex gap-3 items-start",
                    alert.type === 'danger' ? "bg-rose-50 text-rose-700 border border-rose-100" :
                    alert.type === 'warning' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    "bg-blue-50 text-blue-700 border border-blue-100"
                  )}
                >
                  {alert.type === 'danger' || alert.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 shrink-0" />
                  )}
                  <p className="leading-relaxed">{alert.msg}</p>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No active alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
