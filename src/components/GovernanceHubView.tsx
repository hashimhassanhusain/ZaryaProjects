import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { 
  Award, 
  Gavel, 
  Layers, 
  DraftingCompass,
  Calendar,
  ChevronRight, 
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Zap,
  Settings,
  Menu,
  X,
  MessageSquare,
  Users,
  ClipboardList,
  Box,
  Briefcase,
  Activity,
  DollarSign,
  ShoppingCart,
  ShieldAlert,
  ClipboardCheck,
  GitBranch,
  AlertTriangle,
  Target,
  Info,
  GraduationCap,
  ListChecks
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';
import { UniversalManager } from './common/UniversalManager';
import { DomainDashboard } from './DomainDashboard';

import { ProjectCharterView } from './ProjectCharterView';
import { GovernancePoliciesView } from './GovernancePoliciesView';
import { AssumptionConstraintView } from './AssumptionConstraintView';
import { ProjectManagementPlanView } from './ProjectManagementPlanView';
import { SourcingStrategyView } from './SourcingStrategyView';
import { ExecutionQAView } from './ExecutionQAView';
import { PerformanceMonitoringView } from './PerformanceMonitoringView';

interface GovernanceHubViewProps {
  page: Page;
}

export const GovernanceHubView: React.FC<GovernanceHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Initialize tab based on page.id
  const getInitialTab = (): string => {
    if (page.id === 'gov') return 'overview';
    return page.id;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  
  const allManagementPlans = [
    { id: '1.1.1', title: t('1.1.1'), icon: Target, desc: 'Project authorization and high-level vision hub.', focusArea: 'Initiating' },
    { id: '1.1.3', title: t('1.1.3'), icon: ListChecks, desc: 'Detailed log for tracking assumptions and constraints.', focusArea: 'Initiating' },
    { id: '1.1.2', title: t('1.1.2'), icon: ShieldCheck, desc: 'Core management policies and governance guidelines.', focusArea: 'Initiating' },
    { id: '2.1.2', title: t('2.1.2'), icon: FileText, desc: 'Assembly of all subsidiary plans into a cohesive blueprint.', focusArea: 'Planning' },
    { id: '2.1.13', title: t('2.1.13'), icon: ShoppingCart, desc: 'Strategic methodology for vendor and resource acquisition.', focusArea: 'Planning' },
    { id: '3.1.3', title: t('3.1.3'), icon: ShieldCheck, desc: 'Formal execution oversight and quality assurance verification.', focusArea: 'Executing' },
    { id: '4.1.1', title: t('4.1.1'), icon: Activity, desc: 'Real-time tracking of governance KPIs and plan variances.', focusArea: 'Monitoring & Controlling' }
  ];

  const accessiblePlans = allManagementPlans.filter(p => isAdmin || userProfile?.accessiblePages?.includes(p.id));

  // Group plans by focus area
  const initiatingPlans = accessiblePlans.filter(p => p.focusArea === 'Initiating');
  const planningPlans = accessiblePlans.filter(p => p.focusArea === 'Planning');
  const otherPlans = accessiblePlans.filter(p => !['Initiating', 'Planning'].includes(p.focusArea));

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'domain-overview',
      label: t('navigation'),
      tabs: [
        { 
          id: 'overview', 
          label: t('overview'),
          icon: Gavel, 
          size: 'large'
        }
      ]
    },
    {
      id: 'initiating',
      label: t('1.0'), // Initiating Focus Area
      tabs: initiatingPlans.map(p => ({
        id: p.id,
        label: stripNumericPrefix(t(p.id) === p.id ? p.title : t(p.id)),
        icon: p.icon,
        size: 'large'
      }))
    },
    {
      id: 'planning',
      label: t('2.0'), // Planning Focus Area
      tabs: planningPlans.map(p => ({
        id: p.id,
        label: stripNumericPrefix(t(p.id) === p.id ? p.title : t(p.id)),
        icon: p.icon,
        size: 'large'
      }))
    },
    {
      id: 'performance-logs',
      label: t('monitoring'),
      tabs: [
        { id: 'risks', label: t('risk_register'), icon: AlertTriangle },
        { id: 'issues', label: t('issue_log'), icon: Activity },
        { id: 'changes', label: t('change_log'), icon: Layers },
        { id: 'lessons', label: t('lessons_learned'), icon: GraduationCap },
      ]
    }
  ];

  // Helper to get current target page object
  const targetPage = pages.find(p => p.id === activeTab) || page;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="pb-20 space-y-12 px-6 pt-6">
            <header className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">{t('governance_hub')}</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">PMO Performance Standards</p>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {accessiblePlans.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => setActiveTab(plan.id)}
                  className="group bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-blue-50 transition-colors" />
                  
                  <div className="relative z-10 space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-600/30 transition-all duration-500">
                      <plan.icon className="w-7 h-7" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {stripNumericPrefix(t(plan.id) === plan.id ? plan.title : t(plan.id))}
                      </h3>
                      <p className="text-sm text-slate-500 font-semibold leading-relaxed line-clamp-2">
                        {plan.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Active</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                        {t('view_details')} <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        );
      
      // Management Plans
      case '1.1.1': return <ProjectCharterView page={targetPage} embedded={true} />;
      case '1.1.2': return <GovernancePoliciesView page={targetPage} embedded={true} />;
      case '1.1.3':
      case '2.1.5':
      case '2.2.1': 
        return <AssumptionConstraintView page={targetPage} embedded={true} />;
      case '2.1.2': return <ProjectManagementPlanView page={targetPage} embedded={true} />;
      case '2.1.13': return <SourcingStrategyView page={targetPage} embedded={true} />;
      case '3.1.3': return <ExecutionQAView page={targetPage} embedded={true} />;
      case '4.1.1': return <PerformanceMonitoringView page={targetPage} embedded={true} />;
      
      // Logs
      case 'risks': return <UniversalManager entityType="risks" />;
      case 'issues': return <UniversalManager entityType="issues" />;
      case 'changes': return <UniversalManager entityType="changes" />;
      case 'lessons': return <UniversalManager entityType="lessons" />;
      default: return <DomainDashboard page={page} childrenPages={accessiblePlans.map(p => ({ ...pages.find(p2 => p2.id === p.id), ...p } as any))} initialTab="overview" />;
    }
  };

  useEffect(() => {
    // If external page changes, update internal tab
    if (page.id !== 'gov' && page.id !== activeTab) {
      setActiveTab(page.id);
    }
  }, [page.id]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#fcfcfc]">
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as string)}
      />
      <div className="flex-1 overflow-y-auto">
        {activeTab !== 'overview' && (
          <header className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <Gavel className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1.5">
                  <span>{stripNumericPrefix(t(page.id === 'gov' ? 'governance' : page.title))}</span>
                  <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                  <span className="text-blue-600">{stripNumericPrefix(t(activeTab))}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  {stripNumericPrefix(t(activeTab))}
                </h2>
              </div>
            </div>
          </header>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
