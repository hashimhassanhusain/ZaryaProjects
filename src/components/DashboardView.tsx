import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
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
  Target,
  Database,
  TrendingUp
} from 'lucide-react';
import { Page, BOQItem, WBSLevel, Activity } from '../types';
import { getChildren, getParent, getFocusArea } from '../data';
import { motion } from 'motion/react';
import { DomainDashboard } from './DomainDashboard';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { cn, stripNumericPrefix } from '../lib/utils';

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
  const { selectedProject } = useProject();
  const { formatAmount, convertToIQD } = useCurrency();
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const children = overrideChildren || getChildren(page.id);
  const parent = getParent(page.id);
  const hasDashboard = (page.kpis && page.kpis.length > 0) || (page.alerts && page.alerts.length > 0);

  useEffect(() => {
    if (!selectedProject || page.id !== '2.0') return;

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
      }
    );

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      }
    );

    return () => {
      boqUnsubscribe();
      wbsUnsubscribe();
      actUnsubscribe();
    };
  }, [selectedProject, page.id]);

  const locationTotals = wbsLevels
    .filter(level => ['Zone', 'Building', 'Area'].includes(level.type))
    .map(level => {
      const total = boqItems
        .filter(item => item.wbsId === level.id)
        .reduce((sum, item) => sum + (item.currency === 'USD' ? convertToIQD(item.amount, 'USD') : item.amount), 0);
      return { ...level, total };
    })
    .filter(l => l.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <header>
          {(() => {
            const focusArea = getFocusArea(page.id);
            const parent = getParent(page.id);
            return (
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-1 uppercase tracking-wider">
                {focusArea && focusArea.id !== page.id && (
                  <>
                    <span>{stripNumericPrefix(focusArea.title)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </>
                )}
                {parent && parent.id !== focusArea?.id && parent.id !== page.id && (
                  <>
                    <span>{stripNumericPrefix(parent.title)}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </>
                )}
              </div>
            );
          })()}
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {stripNumericPrefix(page.title)}
          </h2>
        <p className="text-slate-500 max-w-2xl font-medium">{page.summary}</p>
      </header>

      {hasDashboard && <DomainDashboard page={page} />}

      {/* BOQ Summary by Location - Only on main dashboard */}
      {page.id === '2.0' && locationTotals.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">BOQ Value by Location</h3>
            </div>
            <Link to="/page/2.4.0" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All BOQ <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {locationTotals.map((loc, idx) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={cn(
                    "p-2 rounded-xl text-xs font-bold",
                    loc.type === 'Zone' ? "bg-purple-50 text-purple-600" :
                    loc.type === 'Building' ? "bg-blue-50 text-blue-600" :
                    "bg-amber-50 text-amber-600"
                  )}>
                    {loc.type}
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{loc.title}</div>
                <div className="text-sm font-bold text-emerald-600 font-mono">{formatAmount(loc.total, 'IQD')}</div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Schedule Summary - Only on main dashboard */}
      {page.id === '2.0' && activities.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Project Schedule Summary</h3>
            </div>
            <Link to="/page/2.3.7" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Full Schedule <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="space-y-6">
              {activities.filter(a => a.startDate && a.finishDate).slice(0, 5).map((act, idx) => {
                const start = new Date(act.startDate!);
                const finish = new Date(act.finishDate!);
                const today = new Date();
                const total = finish.getTime() - start.getTime();
                const current = today.getTime() - start.getTime();
                const progress = Math.min(100, Math.max(0, (current / total) * 100));

                return (
                  <div key={act.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{act.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{act.startDate} — {act.finishDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-blue-600">{Math.round(progress)}%</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">{act.status}</div>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
                <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {stripNumericPrefix(child.title)}
                </h3>
                <div className="text-[10px] text-slate-400 font-medium mb-3 uppercase tracking-wider">
                  {stripNumericPrefix(getFocusArea(child.id)?.title || '')}
                </div>
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
