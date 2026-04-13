import React, { useState, useEffect } from 'react';
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

type MainTab = 'schedule' | 'charter' | 'policies' | 'plans';
type PlanSubTab = 'pmp' | 'cmp' | 'qmp' | 'comm' | 'smp' | 'rmp' | 'scope' | 'hrmp' | 'schedule' | 'cost' | 'procurement' | 'risk' | 'quality';
type LogSubTab = 'stakeholders' | 'assumptions' | 'decisions' | 'lessons';

export const GovernanceHubView: React.FC<GovernanceHubViewProps> = ({ page }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('schedule');
  const [activePlan, setActivePlan] = useState<PlanSubTab>('pmp');
  const [activeLog, setActiveLog] = useState<LogSubTab>('stakeholders');
  const [viewMode, setViewMode] = useState<'plan' | 'log'>('plan');

  // Sync active tab with page.id if needed
  useEffect(() => {
    if (page.id === '1.1.1') setActiveTab('charter');
    if (page.id === '1.1.2') setActiveTab('policies');
    if (page.id === '2.3') setActiveTab('schedule');
    if (['1.2.1', '2.1.5', '3.1.3', '5.1.1'].includes(page.id)) {
      setActiveTab('plans');
      setViewMode('log');
      if (page.id === '1.2.1') setActiveLog('stakeholders');
      if (page.id === '2.1.5') setActiveLog('assumptions');
      if (page.id === '3.1.3') setActiveLog('decisions');
      if (page.id === '5.1.1') setActiveLog('lessons');
    }
    if (page.id.startsWith('2.1') && page.id !== '2.1.5') {
      if (page.id === '2.1.2') {
        setActiveTab('schedule');
        setViewMode('plan');
      } else {
        setActiveTab('plans');
        setViewMode('plan');
      }
      if (page.id === '2.1.2') setActivePlan('pmp');
      if (page.id === '2.1.1') setActivePlan('cmp');
      if (page.id === '2.1.3') setActivePlan('qmp');
      if (page.id === '2.1.6') setActivePlan('comm');
      if (page.id === '2.1.7') setActivePlan('smp');
      if (page.id === '2.1.8') setActivePlan('rmp');
      if (page.id === '2.1.9') setActivePlan('scope');
      if (page.id === '2.1.10') setActivePlan('hrmp');
      if (page.id === '2.1.11') setActivePlan('schedule');
      if (page.id === '2.1.12') setActivePlan('cost');
      if (page.id === '2.1.13') setActivePlan('procurement');
      if (page.id === '2.1.14') setActivePlan('risk');
      if (page.id === '2.1.4') setActivePlan('quality');
    }
  }, [page.id]);

  const mainTabs = [
    { id: 'charter', title: 'Project Charter', icon: Award, pageId: '1.1.1' },
    { id: 'policies', title: 'Policies & Procedures', icon: Gavel, pageId: '1.1.2' },
    { id: 'plans', title: 'Management Plans', icon: Layers, pageId: '2.1.2' },
    { id: 'schedule', title: 'Schedule', icon: Calendar, pageId: '2.3' }
  ];

  const managementPlans = [
    { id: 'pmp', title: 'Project Management Plan', icon: FileText, pageId: '2.1.2' },
    { id: 'cmp', title: 'Change Management Plan', icon: Zap, pageId: '2.1.1' },
    { id: 'qmp', title: 'Quality Management Plan', icon: ShieldCheck, pageId: '2.1.3' },
    { id: 'comm', title: 'Communications Plan', icon: MessageSquare, pageId: '2.1.6' },
    { id: 'smp', title: 'Stakeholder Plan', icon: Users, pageId: '2.1.7' },
    { id: 'rmp', title: 'Requirements Plan', icon: ClipboardList, pageId: '2.1.8' },
    { id: 'scope', title: 'Scope Plan', icon: Box, pageId: '2.1.9' },
    { id: 'hrmp', title: 'HR Management Plan', icon: Briefcase, pageId: '2.1.10' },
    { id: 'schedule', title: 'Schedule Plan', icon: Activity, pageId: '2.1.11' },
    { id: 'cost', title: 'Cost Plan', icon: DollarSign, pageId: '2.1.12' },
    { id: 'procurement', title: 'Procurement Plan', icon: ShoppingCart, pageId: '2.1.13' },
    { id: 'risk', title: 'Risk Plan', icon: ShieldAlert, pageId: '2.1.14' },
    { id: 'quality', title: 'Quality Metrics', icon: ClipboardCheck, pageId: '2.1.4' }
  ];

  const logTabs = [
    { id: 'stakeholders', title: 'Stakeholder Register', icon: Users, pageId: '1.2.1' },
    { id: 'assumptions', title: 'Assumptions Log', icon: ClipboardList, pageId: '2.1.5' },
    { id: 'decisions', title: 'Decision Log', icon: Gavel, pageId: '3.1.3' },
    { id: 'lessons', title: 'Lessons Learned', icon: Award, pageId: '5.1.1' }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation Bar */}
      <nav className="bg-white rounded-[2rem] border border-slate-200 p-2 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as MainTab)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blue-400" : "text-slate-400")} />
            {tab.title}
          </button>
        ))}
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Management Plans Side Menu */}
        {activeTab === 'plans' && (
          <aside className="lg:w-72 space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-4 shadow-sm">
              <div className="px-4 py-3 mb-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Governance Plans</h3>
              </div>
              {managementPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setActivePlan(plan.id as PlanSubTab);
                    setViewMode('plan');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all text-left",
                    (activePlan === plan.id && viewMode === 'plan')
                      ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" 
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <plan.icon className={cn("w-4 h-4", (activePlan === plan.id && viewMode === 'plan') ? "text-blue-600" : "text-slate-400")} />
                  {plan.title}
                </button>
              ))}
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
              <Settings className="w-8 h-8 mb-4 opacity-50" />
              <h4 className="font-bold mb-2">Plan Integration</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Management plans are integrated to ensure consistent baseline management across all project domains.
              </p>
            </div>
          </aside>
        )}

        {/* Content Area */}
        <main className={cn("flex-1", (activeTab !== 'plans') && "w-full")}>
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
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
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
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
