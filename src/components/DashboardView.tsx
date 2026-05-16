import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
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
import { getChildren, getParent } from '../data';
import { motion } from 'motion/react';
import { DomainDashboard } from './DomainDashboard';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/UserContext';
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
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const { formatAmount, convertToBase } = useCurrency();
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  const allChildren = overrideChildren || getChildren(page.id);
  const children = allChildren.filter(child => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(child.id);
  });
  const parent = getParent(page.id);
  const hasDashboard = (page.kpis && page.kpis.length > 0) || (page.alerts && page.alerts.length > 0);

  useEffect(() => {
    if (!selectedProject || !['plan', 'mon'].includes(page.id)) return;

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
        .reduce((sum, item) => sum + item.amount, 0);
      return { ...level, total };
    })
    .filter(l => l.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      {hasDashboard ? (
        <DomainDashboard page={page} childrenPages={children} />
      ) : (
        <>
          {/* BOQ Summary by Location - Only on planning/monitoring dashboards */}
          {['plan', 'mon'].includes(page.id) && locationTotals.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">{t('boq_value_by_location')}</h3>
                </div>
                {(isAdmin || userProfile?.accessiblePages?.includes('2.4.1')) && (
                  <Link to="/page/2.4.1" className="text-[10px] font-black text-brand hover:opacity-80 flex items-center gap-1 uppercase tracking-widest">
                    {t('view_all_boq')} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {locationTotals.map((loc, idx) => (
                  <motion.div
                    key={loc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="sticky-note group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        loc.type === 'Zone' ? "bg-purple-100 text-purple-600" :
                        loc.type === 'Building' ? "bg-brand/10 text-brand" :
                        "bg-amber-100 text-amber-600"
                      )}>
                        {t(loc.type.toLowerCase())}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 group-hover:text-brand transition-colors uppercase italic tracking-tighter line-clamp-1 mb-1">{loc.title}</div>
                      <div className="text-xs font-black text-emerald-600 font-mono tracking-tight">{formatAmount(loc.total, 'IQD')}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Schedule Summary - Only on planning/monitoring dashboards */}
          {['plan', 'mon'].includes(page.id) && activities.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand/10 text-brand rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">{t('project_schedule_summary')}</h3>
                </div>
                {(isAdmin || userProfile?.accessiblePages?.includes('2.3')) && (
                  <Link to="/page/2.3" className="text-[10px] font-black text-brand hover:opacity-80 flex items-center gap-1 uppercase tracking-widest">
                    {t('view_full_schedule')} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm overflow-hidden">
                <div className="space-y-8">
                  {activities.filter(a => a.startDate && a.finishDate).slice(0, 5).map((act, idx) => {
                    const start = new Date(act.startDate!);
                    const finish = new Date(act.finishDate!);
                    const today = new Date();
                    const total = finish.getTime() - start.getTime();
                    const current = today.getTime() - start.getTime();
                    const progress = Math.min(100, Math.max(0, (current / total) * 100));

                    return (
                      <div key={act.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-sm font-black text-text-primary italic uppercase tracking-tighter">{act.description}</div>
                            <div className="text-[10px] text-text-secondary font-black opacity-40 uppercase tracking-widest">{act.startDate} — {act.finishDate}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-brand">{Math.round(progress)}%</div>
                            <div className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">{act.status}</div>
                          </div>
                        </div>
                        <div className="h-2.5 bg-app-bg rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className={cn(
                              "h-full rounded-full transition-all",
                              progress === 100 ? "bg-emerald-500" : "bg-brandShadow bg-brand"
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
              const translatedTitle = t(child.id);
              const isIdTranslation = translatedTitle === child.id || stripNumericPrefix(translatedTitle) === '';
              const displayTitle = stripNumericPrefix(isIdTranslation ? child.title : translatedTitle);
              
              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                    <Link
                      to={`/page/${child.id}`}
                      className="group h-full flex flex-col p-8 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-brand/5 hover:border-brand/30 transition-all border-b-4 hover:border-brand"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 flex items-center justify-center bg-app-bg dark:bg-white/5 rounded-[1.25rem] group-hover:bg-text-primary transition-colors shadow-inner">
                          <Icon className="w-6 h-6 text-text-secondary group-hover:text-white transition-transform group-hover:scale-110" />
                        </div>
                        <StatusIcon status={child.status} />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <h3 className="text-xl font-black text-text-primary dark:text-white leading-tight group-hover:text-brand transition-colors uppercase italic tracking-tighter">
                          {displayTitle}
                        </h3>
                        <p className="text-xs text-text-secondary dark:text-slate-400 leading-relaxed line-clamp-3 font-medium opacity-80">
                          {child.summary || child.content || 'Standard project artifact and management documentation.'}
                        </p>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center text-[10px] font-black text-brand uppercase tracking-[0.2em]">
                          {t('view_artifact')}
                          <ArrowRight className="w-4 h-4 ms-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="w-2 h-2 rounded-full bg-slate-100 dark:bg-white/10 group-hover:bg-brand transition-colors" />
                      </div>
                    </Link>
                </motion.div>
              );
            })}
          </div>

          {children.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">{t('no_sub_domains_found')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
