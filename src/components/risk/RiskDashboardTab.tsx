import React from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { RiskEntry, ProjectIssue, RiskAuditEntry } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface RiskDashboardTabProps {
  risks: RiskEntry[];
  issues: ProjectIssue[];
  audits: RiskAuditEntry[];
}

export const RiskDashboardTab: React.FC<RiskDashboardTabProps> = ({ risks, issues, audits }) => {
  const highRisks = risks.filter(r => r.score >= 15);
  const activeRisks = risks.filter(r => r.status === 'Active');
  const occurredRisks = risks.filter(r => r.status === 'Occurred');
  const openIssues = issues.filter(i => i.status === 'Open');

  const stats = [
    { label: 'Total Risks', value: risks.length, icon: AlertTriangle, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'High Priority', value: highRisks.length, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Active Risks', value: activeRisks.length, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Risks Occurred', value: occurredRisks.length, icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Open Issues', value: openIssues.length, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const categories = Array.from(new Set(risks.map(r => r.category)));
  const categoryData = categories.map(cat => ({
    name: cat,
    count: risks.filter(r => r.category === cat).length
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div className="text-2xl font-semibold text-slate-900 mb-1">{stat.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Distribution Chart (Simplified) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Risk Category Distribution
            </h3>
          </div>
          <div className="space-y-6">
            {categoryData.map((cat, i) => (
              <div key={cat.name} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">{cat.name}</span>
                  <span className="text-slate-900">{cat.count} Risks</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.count / risks.length) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={cn(
                      "h-full rounded-full",
                      i === 0 ? "bg-blue-600" : i === 1 ? "bg-amber-500" : "bg-slate-400"
                    )}
                  />
                </div>
              </div>
            ))}
            {categoryData.length === 0 && (
              <div className="py-20 text-center text-slate-400 italic">No risk data available.</div>
            )}
          </div>
        </div>

        {/* Recent Activity / Critical Risks */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-red-400" />
            Critical Risks
          </h3>
          <div className="space-y-4">
            {highRisks.slice(0, 5).map((risk) => (
              <div key={risk.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md">
                    {risk.riskId}
                  </span>
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                    Score: {risk.score}
                  </span>
                </div>
                <p className="text-xs font-bold text-white line-clamp-2 mb-2">{risk.description}</p>
                <div className="flex items-center gap-2 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  {risk.status}
                </div>
              </div>
            ))}
            {highRisks.length === 0 && (
              <div className="py-20 text-center text-white/20 italic">No high priority risks.</div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Performance Domain Summary (Image 6 style) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-8">Risk Performance Domain Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">Effectiveness</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Risk responses are being implemented according to plan. Effectiveness rate is stable.
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-blue-900">Monitoring</span>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              Weekly risk reviews are being conducted. Audit compliance is at 95%.
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-bold text-slate-900">Emergent Risks</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              3 new risks identified this month. Most related to supply chain volatility.
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-rose-600" />
              <span className="text-sm font-bold text-rose-900">Triggers</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              2 risk triggers were activated. Issues have been logged and responses initiated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
