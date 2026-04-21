import React from 'react';
import { Page } from '../types';
import { pages } from '../data';
import { DomainId, FocusAreaId, PERFORMANCE_DOMAINS, FOCUS_AREAS } from '../constants/navigation';
import { Link } from 'react-router-dom';
import { cn, stripNumericPrefix } from '../lib/utils';
import * as LucideIcons from 'lucide-react';
import { motion } from 'motion/react';

interface MatrixDashboardProps {
  domainId: DomainId;
  focusAreaId: FocusAreaId;
}

export const MatrixDashboard: React.FC<MatrixDashboardProps> = ({ domainId, focusAreaId }) => {
  const domain = PERFORMANCE_DOMAINS.find(d => d.id === domainId);
  const area = FOCUS_AREAS.find(a => a.id === focusAreaId);
  
  const filteredPages = pages.filter(p => p.domain === domainId && p.focusArea === focusAreaId);

  const renderIcon = (name: string, className?: string) => {
    const Icon = (LucideIcons as any)[name] || LucideIcons.FileText;
    return <Icon className={className || "w-5 h-5"} />;
  };

  if (!domain || !area) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Dynamic Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white" style={{ backgroundColor: domain.color }}>
            <domain.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                {domain.title}
              </span>
              <LucideIcons.ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                {area.title}
              </span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mt-1">
              Process Hub
            </h1>
          </div>
        </div>
        <p className="text-slate-500 max-w-2xl text-lg font-medium leading-relaxed">
          {domain.description} This intersection focuses on <span className="text-slate-900 font-bold underline decoration-blue-500/30 underline-offset-4">{area.title}</span> activities within the project lifecycle.
        </p>
      </div>

      {/* Process Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPages.length > 0 ? (
          filteredPages.map((page, index) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/page/${page.id}`}
                className="group relative flex flex-col h-full bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Status Badge */}
                <div className="absolute top-6 right-6">
                   <div className={cn(
                     "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter",
                     page.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                   )}>
                     {page.status || 'Draft'}
                   </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm mb-6">
                  {renderIcon(page.icon || 'FileText', "w-6 h-6")}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{page.id}</div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                    {stripNumericPrefix(page.title)}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {page.summary || `Execute and manage ${page.title} processes.`}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Process</span>
                  <LucideIcons.ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-24 text-center space-y-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
               <LucideIcons.SearchX className="w-10 h-10 text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">No processes at this intersection</h3>
              <p className="text-slate-500 max-w-sm mx-auto text-sm">
                Try selecting a different Focus Area or Domain to find the project management tool you're looking for.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions / Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
         <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                <LucideIcons.Info className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Domain Insights</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Governance & <br/> Compliance Checks
              </h2>
              <p className="text-slate-400 text-lg">
                Ensure all initiating processes have signed-off charters before moving to detailed planning.
              </p>
              <button className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-500 hover:text-white transition-all">
                Run Compliance Check
                <LucideIcons.ChevronRight className="w-4 h-4" />
              </button>
            </div>
         </div>

         <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                <LucideIcons.BarChart3 className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest">Quick View</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Process <br/> Completion
              </h2>
              <div className="flex items-end gap-2">
                 <span className="text-6xl font-black tracking-tighter">64%</span>
                 <span className="text-blue-100 font-bold uppercase tracking-widest text-xs mb-2">Total Progress</span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                 <div className="h-full bg-white rounded-full" style={{ width: '64%' }} />
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};
