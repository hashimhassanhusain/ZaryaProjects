import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Page } from '../types';
import { ProjectCharterView } from './ProjectCharterView';
import { GovernancePoliciesView } from './GovernancePoliciesView';
import { ProjectManagementPlanView } from './ProjectManagementPlanView';
import { ProjectScheduleView } from './ProjectScheduleView';
import { ChangeManagementPlanView } from './ChangeManagementPlanView';
import { QualityManagementPlanView } from './QualityManagementPlanView';
import { CommunicationsManagementPlanView } from './CommunicationsManagementPlanView';
import { StakeholderManagementPlanView } from './StakeholderManagementPlanView';
import { RequirementsManagementPlanView } from './RequirementsManagementPlanView';
import { ScopeManagementPlanView } from './ScopeManagementPlanView';
import { HumanResourceManagementPlanView } from './HumanResourceManagementPlanView';
import { ScheduleManagementPlanView } from './ScheduleManagementPlanView';
import { CostManagementPlanView } from './CostManagementPlanView';
import { ProcurementManagementPlanView } from './ProcurementManagementPlanView';
import { RiskManagementPlanView } from './RiskManagementPlanView';
import { RiskOpportunityHub } from './RiskOpportunityHub';
import { QualityMetricsRegisterView } from './QualityMetricsRegisterView';
import { DecisionLogView } from './DecisionLogView';
import { StakeholderRegisterView } from './StakeholderRegisterView';
import { AssumptionConstraintView } from './AssumptionConstraintView';
import { LessonsLearnedView } from './LessonsLearnedView';
import { ResourceOptimizationHub } from './ResourceOptimizationHub';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface GovernanceHubViewProps {
  page: Page;
}

type PlanSubTab = 'pmp' | 'cmp' | 'qmp' | 'comm' | 'smp' | 'rmp' | 'scope' | 'hrmp' | 'schedule' | 'cost' | 'procurement' | 'risk' | 'quality';
type LogSubTab = 'stakeholders' | 'assumptions' | 'decisions' | 'lessons';

export const GovernanceHubView: React.FC<GovernanceHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  
  const allManagementPlans = [
    { id: 'pmp', title: t('2.1.2'), icon: FileText, pageId: '2.1.2' },
    { id: 'comm', title: t('2.1.6'), icon: MessageSquare, pageId: '2.1.6' },
    { id: 'smp', title: t('2.1.7'), icon: Users, pageId: '2.1.7' },
    { id: 'rmp', title: t('2.1.8'), icon: ClipboardList, pageId: '2.1.8' },
    { id: 'scope', title: t('2.1.9'), icon: Box, pageId: '2.1.9' },
    { id: 'hrmp', title: t('2.1.10'), icon: Briefcase, pageId: '2.1.10' },
    { id: 'schedule', title: t('2.1.11'), icon: Activity, pageId: '2.1.11' },
    { id: 'cost', title: t('2.1.12'), icon: DollarSign, pageId: '2.1.12' },
    { id: 'procurement', title: t('2.1.13'), icon: ShoppingCart, pageId: '2.1.13' },
    { id: 'risk', title: t('2.1.14'), icon: ShieldAlert, pageId: '2.1.14' },
    { id: 'quality', title: t('2.1.4'), icon: ClipboardCheck, pageId: '2.1.4' }
  ];

  const allLogTabs = [
    { id: 'stakeholders', title: t('1.2.1'), icon: Users, pageId: '1.2.1' },
    { id: 'assumptions', title: t('2.1.5'), icon: ClipboardList, pageId: '2.1.5' },
    { id: 'decisions', title: t('3.1.3'), icon: Gavel, pageId: '3.1.3' },
    { id: 'lessons', title: t('5.1.1'), icon: Award, pageId: '5.1.1' }
  ];

  const managementPlans = allManagementPlans.filter(p => isAdmin || userProfile?.accessiblePages?.includes(p.pageId));
  const logTabs = allLogTabs.filter(p => isAdmin || userProfile?.accessiblePages?.includes(p.pageId));

  const [activeTab, setActiveTab] = useState<'schedule' | 'charter' | 'policies' | 'plans'>('schedule');
  const [activePlan, setActivePlan] = useState<PlanSubTab>(
    (managementPlans.length > 0 ? managementPlans[0].id : 'pmp') as PlanSubTab
  );
  const [activeLog, setActiveLog] = useState<LogSubTab>(
    (logTabs.length > 0 ? logTabs[0].id : 'stakeholders') as LogSubTab
  );
  const [viewMode, setViewMode] = useState<'plan' | 'log'>('plan');

  // Check which main tabs are accessible
  const isCharterAccessible = isAdmin || userProfile?.accessiblePages?.includes('1.1.1');
  const isPoliciesAccessible = isAdmin || userProfile?.accessiblePages?.includes('1.1.2');
  const isScheduleAccessible = isAdmin || userProfile?.accessiblePages?.includes('2.3');
  const isPlansAccessible = managementPlans.length > 0 || logTabs.length > 0;

  // Sync active tab with page.id if needed
  useEffect(() => {
    if (page.id === '1.1.1' && isCharterAccessible) setActiveTab('charter');
    if (page.id === '1.1.2' && isPoliciesAccessible) setActiveTab('policies');
    if (page.id === '2.3' && isScheduleAccessible) setActiveTab('schedule');
    
    const isLogPage = ['1.2.1', '2.1.5', '3.1.3', '5.1.1'].includes(page.id);
    if (isLogPage && isPlansAccessible) {
      setActiveTab('plans');
      setViewMode('log');
      if (page.id === '1.2.1') {
        const hasAccess = isAdmin || userProfile?.accessiblePages?.includes('1.2.1');
        if (hasAccess) setActiveLog('stakeholders');
      }
      if (page.id === '2.1.5') {
        const hasAccess = isAdmin || userProfile?.accessiblePages?.includes('2.1.5');
        if (hasAccess) setActiveLog('assumptions');
      }
      if (page.id === '3.1.3') {
        const hasAccess = isAdmin || userProfile?.accessiblePages?.includes('3.1.3');
        if (hasAccess) setActiveLog('decisions');
      }
      if (page.id === '5.1.1') {
        const hasAccess = isAdmin || userProfile?.accessiblePages?.includes('5.1.1');
        if (hasAccess) setActiveLog('lessons');
      }
    }

    if (page.id.startsWith('2.1') && page.id !== '2.1.5' && isPlansAccessible) {
      setActiveTab('plans');
      setViewMode('plan');
      
      const planMap: Record<string, PlanSubTab> = {
        '2.1.2': 'pmp',
        '2.1.1': 'cmp',
        '2.1.3': 'qmp',
        '2.1.6': 'comm',
        '2.1.7': 'smp',
        '2.1.8': 'rmp',
        '2.1.9': 'scope',
        '2.1.10': 'hrmp',
        '2.1.11': 'schedule',
        '2.1.12': 'cost',
        '2.1.13': 'procurement',
        '2.1.14': 'risk',
        '2.1.4': 'quality'
      };

      if (planMap[page.id]) {
        const hasAccess = isAdmin || userProfile?.accessiblePages?.includes(page.id);
        if (hasAccess) setActivePlan(planMap[page.id]);
      }
    }
  }, [page.id, isCharterAccessible, isPoliciesAccessible, isScheduleAccessible, isPlansAccessible, isAdmin, userProfile?.accessiblePages]);

  return (
    <div className={cn("pb-20", activeTab === 'schedule' ? "space-y-0" : "space-y-6")}>
      <div className="flex flex-col gap-8">
        {/* Content Area */}
        <main className={cn("flex-1 w-full", activeTab !== 'schedule' && "px-6")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${activePlan}-${activeLog}-${viewMode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'charter' && <ProjectCharterView page={page} />}
              {activeTab === 'policies' && <GovernancePoliciesView page={page} />}
              {activeTab === 'schedule' && <ProjectScheduleView page={{ ...page, id: '2.3', title: 'Project Schedule' }} />}
              {activeTab === 'plans' && (
                <div className="space-y-4">
                  {/* Top Tabs for Plans */}
                  {viewMode === 'plan' && (
                    <div className="flex flex-wrap items-center gap-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-200 w-full overflow-x-auto no-scrollbar">
                      {managementPlans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => {
                            setActivePlan(plan.id as PlanSubTab);
                            setViewMode('plan');
                          }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                            (activePlan === plan.id && viewMode === 'plan')
                              ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                              : "text-slate-400 hover:bg-white hover:text-slate-600"
                          )}
                        >
                          <plan.icon className={cn("w-3.5 h-3.5", (activePlan === plan.id && viewMode === 'plan') ? "text-blue-600" : "text-slate-400")} />
                          {plan.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="bg-white rounded-lg border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="p-10">
                    {viewMode === 'plan' ? (
                      <>
                        {activePlan === 'pmp' && <ProjectManagementPlanView page={page} />}
                        {activePlan === 'cmp' && <ChangeManagementPlanView page={page} />}
                        {activePlan === 'qmp' && <QualityManagementPlanView page={page} />}
                        {activePlan === 'comm' && <CommunicationsManagementPlanView page={page} />}
                        {activePlan === 'smp' && <StakeholderManagementPlanView page={page} />}
                        {activePlan === 'rmp' && <RequirementsManagementPlanView page={page} />}
                        {activePlan === 'scope' && <ScopeManagementPlanView page={page} />}
                        {activePlan === 'hrmp' && <HumanResourceManagementPlanView page={page} />}
                        {activePlan === 'schedule' && <ScheduleManagementPlanView page={page} />}
                        {activePlan === 'cost' && <CostManagementPlanView page={page} />}
                        {activePlan === 'procurement' && <ProcurementManagementPlanView page={page} />}
                        {activePlan === 'risk' && <RiskManagementPlanView page={page} />}
                        {activePlan === 'quality' && <QualityMetricsRegisterView page={page} />}
                      </>
                    ) : (
                      <>
                        {activeLog === 'stakeholders' && <StakeholderRegisterView page={{ ...page, id: '1.2.1' }} />}
                        {activeLog === 'assumptions' && <AssumptionConstraintView page={{ ...page, id: '2.1.5' }} />}
                        {activeLog === 'decisions' && <DecisionLogView page={{ ...page, id: '3.1.3' }} />}
                        {activeLog === 'lessons' && <LessonsLearnedView page={{ ...page, id: '5.1.1' }} />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
