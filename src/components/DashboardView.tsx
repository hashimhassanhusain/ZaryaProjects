import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Shield,
  DraftingCompass,
  Calendar,
  Banknote,
  Users,
  Package,
  AlertTriangle,
  Target
} from 'lucide-react';
import { Page } from '../types';
import { getChildren, getParent } from '../data';
import { motion } from 'motion/react';
import { DomainDashboard } from './DomainDashboard';

interface DashboardViewProps {
  page: Page;
  overrideChildren?: Page[];
}

const StatusIcon = ({ status }: { status?: string }) => {
  switch (status) {
    case 'Completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'In Progress': return <Clock className="w-5 h-5 text-blue-500" />;
    case 'Delayed': return <AlertCircle className="w-5 h-5 text-rose-500" />;
    default: return <Clock className="w-4 h-4 text-slate-300" />;
  }
};

const getDomainIcon = (domain?: string, title?: string) => {
  if (title?.toLowerCase().includes('focus area')) return Target;
  
  switch (domain) {
    case 'governance': return Shield;
    case 'scope': return DraftingCompass;
    case 'schedule': return Calendar;
    case 'finance': return Banknote;
    case 'stakeholders': return Users;
    case 'resources': return Package;
    case 'risk': return AlertTriangle;
    default: return Info;
  }
};

export const DashboardView: React.FC<DashboardViewProps> = ({ page, overrideChildren }) => {
  const children = overrideChildren || getChildren(page.id);
  const parent = getParent(page.id);
  const hasDashboard = (page.kpis && page.kpis.length > 0) || (page.alerts && page.alerts.length > 0);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">
          {parent && <span className="text-slate-400 font-medium">{parent.title} &gt; </span>}
          <span>{page.title}</span>
        </h2>
        <p className="text-slate-500 max-w-2xl font-medium">{page.summary}</p>
      </header>

      {hasDashboard && <DomainDashboard page={page} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.map((child, idx) => {
          const Icon = getDomainIcon(child.domain, child.title);
          return (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link
                to={`/page/${child.id}`}
                className="group block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <StatusIcon status={child.status} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {child.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                  {child.summary || child.content}
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600">
                  View Details
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {children.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400">No sub-domains found for this area.</p>
        </div>
      )}
    </div>
  );
};
