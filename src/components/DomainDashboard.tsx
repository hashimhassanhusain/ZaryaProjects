import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package,
  LayoutDashboard, FileText, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { DashboardView } from './DashboardView';
import { DetailView } from './DetailView';
import { ProjectScheduleView } from './ProjectScheduleView';
import { ResourceOptimizationHub } from './ResourceOptimizationHub';
import { ResourceRequirementsTab } from './resource/ResourceRequirementsTab';
import { RBSTab } from './resource/RBSTab';
import { RAMTab } from './resource/RAMTab';
import { RolesResponsibilitiesTab } from './resource/RolesResponsibilitiesTab';
import { SelectionCriteriaTab } from './resource/SelectionCriteriaTab';
import { TeamGovernanceTab } from './resource/TeamGovernanceTab';
import { ProcessImprovementTab } from './resource/ProcessImprovementTab';
import { PerformanceStatusTab } from './resource/PerformanceStatusTab';
import { TeamDirectoryTab } from './resource/TeamDirectoryTab';
import { ContactsView } from './ContactsView';
import { CompaniesView } from './CompaniesView';
import { HumanResourceManagementPlanView } from './HumanResourceManagementPlanView';
import { TasksView } from './TasksView';
import { ZaryaPOTracker } from './ZaryaPOTracker';
import { BOQView } from './BOQView';
import { WBSView } from './WBSView';
import { WorkPackagesView } from './WorkPackagesView';
import { EVMReportView } from './EVMReportView';
import { ProgressReportView } from './ProgressReportView';
import { AssumptionConstraintView } from './AssumptionConstraintView';
import { QualityMetricsRegisterView } from './QualityMetricsRegisterView';
import { RiskRegisterView } from './RiskRegisterView';
import { RiskOpportunityHub } from './RiskOpportunityHub';
import { GovernanceHubView } from './GovernanceHubView';
import { StakeholderRegisterView } from './StakeholderRegisterView';
import { LessonsLearnedView } from './LessonsLearnedView';
import { ChangeRequestView } from './ChangeRequestView';
import { ChangeManagementHubView } from './ChangeManagementHubView';
import { DecisionLogView } from './DecisionLogView';
import { VendorMasterRegister } from './VendorMasterRegister';
import { LogManagementView } from './LogManagementView';
import { FormalAcceptanceView } from './FormalAcceptanceView';

import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';

interface DomainDashboardProps {
  page: Page;
  childrenPages?: Page[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ICON_MAP: Record<string, any> = {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package
};

export const DomainDashboard: React.FC<DomainDashboardProps> = ({ page, childrenPages = [] }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || '';
  const [activeTab, setActiveTab] = useState<string>('overview');
  const domainKey = page.domain || 'governance';
  const Icon = ICON_MAP[page.icon || 'Info'] || Info;

  // Reset tab when page changes to avoid "Cannot read properties of undefined" errors
  React.useEffect(() => {
    setActiveTab('overview');
  }, [page.id]);
  
  // Mock chart data based on domain since we don't have real historical data yet
  const getChartData = () => {
    switch (domainKey) {
      case 'governance':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Initiating', val: 100 },
              { name: 'Planning', val: 85 },
              { name: 'Executing', val: 45 },
              { name: 'Monitoring', val: 30 },
              { name: 'Closing', val: 5 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} reversed={isRtl} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'schedule':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { name: 'W1', planned: 10, actual: 8 },
              { name: 'W2', planned: 25, actual: 20 },
              { name: 'W3', planned: 45, actual: 42 },
              { name: 'W4', planned: 70, actual: 65 },
              { name: 'W5', planned: 90, actual: 82 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} reversed={isRtl} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="planned" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'finance':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[
              { name: 'Jan', budget: 200, actual: 180 },
              { name: 'Feb', budget: 400, actual: 390 },
              { name: 'Mar', budget: 600, actual: 620 },
              { name: 'Apr', budget: 800, actual: 750 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} reversed={isRtl} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="budget" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'risk':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Low', value: 45 },
                  { name: 'Medium', value: 30 },
                  { name: 'High', value: 15 },
                  { name: 'Critical', value: 10 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {COLORS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'resources':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Labor', val: 85 },
              { name: 'Material', val: 65 },
              { name: 'Equipment', val: 45 },
              { name: 'Subcon', val: 75 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} reversed={isRtl} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const kpis = page.kpis || [];
  const alerts = page.alerts || [];

  const renderPageContent = (p: Page) => {
    if (!p) return null;
    const isZaryaPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6'].includes(p.id);
    const isTasksPage = p.id === '2.6.21';
    const isMeetingsPage = p.id === '2.6.22';
    const isBOQPage = p.id === '2.4.0';
    const isWBSPage = p.id === '2.2.9';
    const isWorkPackagesPage = p.id === '2.2.10';
    const isEVMPage = p.id === '4.2.2';
    const isProgressReportPage = p.id === '3.3.3';
    const isSchedulePage = p.id === '2.3';
    const isAssumptionLogPage = ['2.1.5', '2.2.1'].includes(p.id);
    const isVendorRegisterPage = p.id === '3.3.4';
    const isQualityMetricsPage = p.id === '2.1.4';
    const isRiskRegisterPage = p.id === '2.7.5';
    const isRiskHubPage = p.id === '2.7';
    const isStakeholderRegisterPage = p.id === '1.2.1';
    const isLessonsLearnedPage = p.id === '5.1.1';
    const isResourceOptimizationPage = [
      '2.6', '2.6.1', '2.6.21', '2.6.22', '2.6.4', '2.6.5', '2.6.6', '2.6.7',
      '3.3', '3.3.1', '3.3.2', '3.3.3', '3.3.5', '3.3.6', '2.4.7'
    ].includes(p.id);
    const isGovernanceHubPage = [
      '1.1.1', '1.1.2',
      '2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12', '2.1.13', '2.1.14',
      '2.1.5', '1.2.1', '3.1.3', '5.1.1'
    ].includes(p.id);
    const isChangeRequestPage = p.id === '3.1.1';
    const isDecisionLogPage = p.id === '3.1.3';
    const isChangeManagementHubPage = p.id === '3.4';
    const isLogManagementPage = ['1.2.1', '2.7.5', '5.1.1', 'logs'].includes(p.id);
    const isFormalAcceptancePage = p.id === '4.1.2';

    if (isTasksPage) return <TasksView />;
    if (isMeetingsPage) return <DetailView page={pages.find(p => p.id === '2.6.22')!} />;
    if (isZaryaPage) return <ZaryaPOTracker page={p} />;
    if (isBOQPage) return <BOQView />;
    if (isWBSPage) return <WBSView />;
    if (isWorkPackagesPage) return <WorkPackagesView />;
    if (isEVMPage) return <EVMReportView page={p} />;
    if (isProgressReportPage) return <ProgressReportView page={p} />;
    if (isSchedulePage) return <ProjectScheduleView page={p} />;
    if (isAssumptionLogPage) return <AssumptionConstraintView page={p} />;
    if (isQualityMetricsPage) return <QualityMetricsRegisterView page={p} />;
    if (isRiskRegisterPage) return <RiskRegisterView page={p} />;
    if (isRiskHubPage) return <RiskOpportunityHub page={p} />;
    if (isGovernanceHubPage) return <GovernanceHubView page={p} />;
    if (isStakeholderRegisterPage) return <StakeholderRegisterView page={p} />;
    if (isLessonsLearnedPage) return <LessonsLearnedView page={p} />;
    if (isDecisionLogPage) return <DecisionLogView page={p} />;
    if (isChangeManagementHubPage) return <ChangeManagementHubView page={p} />;
    if (isChangeRequestPage) return <ChangeRequestView page={p} />;
    if (isVendorRegisterPage) return <VendorMasterRegister page={p} />;
    if (isLogManagementPage) return <LogManagementView page={p} />;
    if (isFormalAcceptancePage) return <FormalAcceptanceView page={p} />;
    
    // Resource specific terminal views
    if (p.id === 'contacts') return <ContactsView />;
    if (p.id === 'companies') return <CompaniesView />;
    if (p.id === '2.1.10') return <HumanResourceManagementPlanView page={p} />;
    if (p.id === '2.6.1') return <ResourceRequirementsTab projectId={projectId} />;
    if (p.id === '2.6.4') return <RBSTab projectId={projectId} />;
    if (p.id === '2.6.5') return <RAMTab projectId={projectId} />;
    if (p.id === '2.6.6') return <RolesResponsibilitiesTab projectId={projectId} />;
    if (p.id === '2.6.7') return <SelectionCriteriaTab projectId={projectId} />;
    if (p.id === '3.3.1') return <TeamDirectoryTab projectId={projectId} />;
    if (p.id === '3.3.5') return <TeamGovernanceTab projectId={projectId} />;
    if (p.id === '3.3.2') return <PerformanceStatusTab projectId={projectId} />;
    if (p.id === '3.3.6') return <PerformanceStatusTab projectId={projectId} />;
    
    if (p.type === 'hub') return <DashboardView page={p} />;
    return <DetailView page={p} />;
  };

  return (
    <div className="flex flex-col">
      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-stretch gap-2 bg-slate-50/50 p-1 rounded-t-3xl border-t border-x border-slate-200 w-full overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative overflow-hidden group whitespace-nowrap min-w-max",
            activeTab === 'overview' 
              ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" 
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-all duration-300",
            activeTab === 'overview' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="leading-tight font-semibold uppercase tracking-tight">
            {stripNumericPrefix(t(page.id) || page.title).replace(/\s*DOMAIN$/i, '')}
          </span>
          {activeTab === 'overview' && (
            <motion.div 
              layoutId="activeDomainTab"
              className="absolute inset-0 bg-white -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>

        {childrenPages.map((child) => {
          const ChildIcon = ICON_MAP[child.icon || 'FileText'] || FileText;
          const focusAreaColor = 
            child.focusArea?.includes('Initiating') ? 'bg-blue-500' :
            child.focusArea?.includes('Planning') ? 'bg-indigo-500' :
            child.focusArea?.includes('Executing') ? 'bg-emerald-500' :
            child.focusArea?.includes('Monitoring') ? 'bg-amber-500' :
            child.focusArea?.includes('Closing') ? 'bg-rose-500' :
            'bg-slate-300';

          return (
            <button
              key={child.id}
              onClick={() => setActiveTab(child.id)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative overflow-hidden group whitespace-nowrap min-w-max",
                activeTab === child.id 
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-300 relative",
                activeTab === child.id ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
              )}>
                <ChildIcon className="w-4 h-4" />
                {child.focusArea && (
                  <div className={cn(
                    "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white shadow-sm",
                    focusAreaColor
                  )} title={child.focusArea} />
                )}
              </div>
              <span className="leading-tight font-semibold uppercase tracking-tight">
                {stripNumericPrefix(t(child.id) || child.title)}
              </span>
              {activeTab === child.id && (
                <motion.div 
                  layoutId="activeDomainTab"
                  className="absolute inset-0 bg-white -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-b-3xl p-4 shadow-sm -mt-px">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' ? (
              <div className="space-y-6">
                {kpis.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpis.map((kpi, idx) => {
                      const Icon = ICON_MAP[kpi.icon || 'Info'] || Info;
                      const colorClass = 
                        kpi.status === 'success' ? 'text-emerald-600' :
                        kpi.status === 'warning' ? 'text-amber-600' :
                        kpi.status === 'danger' ? 'text-rose-600' :
                        'text-blue-600';

                      return (
                        <motion.div
                          key={kpi.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-slate-50/50 p-5 rounded-xl border border-slate-100"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className={`p-2 rounded-lg bg-white shadow-sm ${colorClass}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            {kpi.trend && (
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-full shadow-sm">
                                {kpi.trend}
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-semibold text-slate-900">{kpi.value}</div>
                          <div className="text-xs font-medium text-slate-500 mt-1">{kpi.label}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-slate-50/30 p-6 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t('domain_performance')}</h3>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-medium text-slate-500">{t('planned')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-medium text-slate-500">{t('actual')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      {getChartData() || (
                        <div className="h-full flex items-center justify-center bg-white rounded-xl border border-dashed border-slate-200">
                          <p className="text-slate-400 text-sm">{t('no_chart_data')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50/30 p-6 rounded-xl border border-slate-100 h-full">
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('domain_alerts')}</h3>
                      <div className="space-y-3">
                        {alerts.length > 0 ? alerts.map((alert, idx) => (
                          <div 
                            key={idx}
                            className={cn(
                              "p-3 rounded-lg text-xs flex gap-3 items-start bg-white shadow-sm",
                              alert.type === 'danger' ? "text-rose-700 border border-rose-100" :
                              alert.type === 'warning' ? "text-amber-700 border border-amber-100" :
                              "text-blue-700 border border-blue-100"
                            )}
                          >
                            {alert.type === 'danger' || alert.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                            ) : (
                              <Info className="w-4 h-4 shrink-0" />
                            )}
                            <p className="leading-relaxed">{alert.msg}</p>
                          </div>
                        )) : (
                          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">{t('no_active_alerts')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                {(() => {
                  const activePage = childrenPages.find(cp => cp.id === activeTab);
                  return activePage ? renderPageContent(activePage) : (
                    <div className="p-12 text-center text-slate-400">
                      {t('page_not_found')}
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

