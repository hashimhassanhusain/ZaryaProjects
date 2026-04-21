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
  Target
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
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface GovernanceHubViewProps {
  page: Page;
}

type PlanSubTab = 'pmp' | 'cmp' | 'qmp' | 'comm' | 'smp' | 'rmp' | 'scope' | 'hrmp' | 'schedule' | 'cost' | 'procurement' | 'risk' | 'quality';
type LogSubTab = 'stakeholders' | 'assumptions' | 'decisions' | 'lessons';

export const GovernanceHubView: React.FC<GovernanceHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const allManagementPlans = [
    { id: '2.1.2', title: t('2.1.2'), icon: FileText, desc: 'Assembly of all subsidiary plans into a cohesive blueprint.' },
    { id: '2.1.13', title: t('2.1.13'), icon: ShoppingCart, desc: 'Strategic methodology for vendor and resource acquisition.' },
    { id: '3.1.3', title: t('3.1.3'), icon: ShieldCheck, desc: 'Formal execution oversight and quality assurance verification.' },
    { id: '4.1.1', title: t('4.1.1'), icon: Activity, desc: 'Real-time tracking of governance KPIs and plan variances.' },
    { id: '1.1.1', title: t('1.1.1'), icon: Target, desc: 'Project authorization and high-level vision hub.' },
    { id: '1.1.2', title: t('1.1.2'), icon: ShieldCheck, desc: 'Core management policies and governance guidelines.' }
  ];

  const accessiblePlans = allManagementPlans.filter(p => isAdmin || userProfile?.accessiblePages?.includes(p.id));

  return (
    <div className="pb-20 space-y-12 px-6">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Governance Control Center</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">PMBOK 8 Standard Framework</p>
          </div>
        </div>
      </header>

      {/* Domain Status Matrix */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accessiblePlans.map((plan) => (
          <div 
            key={plan.id}
            onClick={() => navigate(`/page/${plan.id}`)}
            className="group bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-blue-50 transition-colors" />
            
            <div className="relative z-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-600/30 transition-all duration-500">
                <plan.icon className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  {stripNumericPrefix(plan.title)}
                </h3>
                <p className="text-sm text-slate-500 font-semibold leading-relaxed line-clamp-2">
                  {plan.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Baselined</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                  Open Hub <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Governance Insights Summary */}
      <section className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Compliance & Health Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decision Velocity</p>
                <p className="text-4xl font-black italic tracking-tighter">4.2 <span className="text-xs uppercase text-slate-500 not-italic">Days</span></p>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[80%] bg-blue-500" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Process Consistency</p>
                <p className="text-4xl font-black italic tracking-tighter">98%</p>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Critical Blockers (2 Active)</h4>
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-xs font-bold text-red-100">Sourcing Strategy for heavy machinery requires Project Sponsor signature.</p>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-xs font-bold text-amber-100">Quality Metrics baseline exceeds standard variance; readjustment required.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
