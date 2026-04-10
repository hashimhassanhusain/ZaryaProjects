import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Calendar,
  Layers
} from 'lucide-react';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface ChangeManagementHubViewProps {
  page: Page;
}

export const ChangeManagementHubView: React.FC<ChangeManagementHubViewProps> = ({ page }) => {
  const navigate = useNavigate();

  const kpis = [
    { label: 'Total Change Requests', value: '24', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Approved Variations', value: '15', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Review', value: '6', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Cost Impact', value: '142.5M', icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' }
  ];

  const actions = [
    { 
      title: 'Change Request Register', 
      desc: 'View and manage all project change requests and variations.',
      icon: Layers,
      pageId: '3.4.1',
      color: 'bg-slate-900'
    },
    { 
      title: 'Change Management Plan', 
      desc: 'Review the governance rules and thresholds for project changes.',
      icon: ShieldCheck,
      pageId: '2.1.1',
      color: 'bg-blue-600'
    }
  ];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-slate-200">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Change Management Hub</h1>
            <p className="text-slate-500 font-medium">Centralized control for project variations, scope changes, and impact assessments.</p>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", kpi.bg)}>
              <kpi.icon className={cn("w-6 h-6", kpi.color)} />
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{kpi.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {actions.map((action, idx) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(`/page/${action.pageId}`)}
            className="group relative bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left overflow-hidden"
          >
            <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 transition-transform group-hover:scale-110 group-hover:-rotate-12", action.color)}>
              <action.icon className="w-full h-full" />
            </div>
            
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-slate-200", action.color)}>
              <action.icon className="w-7 h-7 text-white" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{action.title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8 max-w-xs">{action.desc}</p>
            
            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
              Access Module
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Recent Activity / Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Change Requests</h3>
            <button 
              onClick={() => navigate('/page/3.4.1')}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {[
                { id: 'ZRY-CR-024', desc: 'Replace Gypsum Plaster with Cement Plaster', status: 'Approved', date: '2026-03-19' },
                { id: 'ZRY-CR-023', desc: 'Additional MEP Support Structures', status: 'Pending', date: '2026-03-15' },
                { id: 'ZRY-CR-022', desc: 'Revised Landscape Lighting Layout', status: 'In Review', date: '2026-03-10' }
              ].map((cr) => (
                <div key={cr.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{cr.desc}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{cr.id} • {cr.date}</div>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    cr.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    cr.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {cr.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <ShieldCheck className="w-12 h-12 mb-8 text-blue-400" />
          <h3 className="text-2xl font-black mb-4 tracking-tight">Governance & Control</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            All changes must be assessed for impact on the project baselines. Approved variations will trigger a baseline update prompt to ensure the PO and Schedule domains remain synchronized.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Strict Version Control
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Automated Impact Formulas
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              CCB Approval Workflow
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
