import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DetailView } from './components/DetailView';
import { FoundationCenterView } from './components/FoundationCenterView';
import { POTracker } from './components/POTracker';
import { BOQView } from './components/BOQView';
import { WBSView } from './components/WBSView';
import { EVMReportView } from './components/EVMReportView';
import { ProgressReportView } from './components/ProgressReportView';
import { UserFormView } from './components/UserFormView';
import { QualityMetricsRegisterView } from './components/QualityMetricsRegisterView';
import { ChangeManagementHubView } from './components/ChangeManagementHubView';
import { DecisionLogView } from './components/DecisionLogView';
import { RiskRegisterView } from './components/RiskRegisterView';
import { StakeholderRegisterView } from './components/StakeholderRegisterView';
import { LessonsLearnedView } from './components/LessonsLearnedView';
import { ClosureReportView } from './components/ClosureReportView';
import { ChangeRequestView } from './components/ChangeRequestView';
import { ProjectCharterView } from './components/ProjectCharterView';
import { GovernanceHubView } from './components/GovernanceHubView';
import { AdminSettings } from './components/AdminSettings';
import { ProjectFormView } from './components/ProjectFormView';
import { TasksView } from './components/TasksView';
import { FileExplorer } from './components/FileExplorer';
import { Login } from './components/Login';
import { ProjectScheduleView } from './components/ProjectScheduleView';
import { MeetingsArchiveView } from './components/MeetingsArchiveView';
import { DailyReportView } from './components/DailyReportView';
import { AssumptionConstraintView } from './components/AssumptionConstraintView';
import { GovernancePoliciesView } from './components/GovernancePoliciesView';
import { SupplierMasterRegister } from './components/SupplierMasterRegister';
import { ProjectManagementPlanView } from './components/ProjectManagementPlanView';
import { StakeholderManagementPlanView } from './components/StakeholderManagementPlanView';
import { CommunicationsManagementPlanView } from './components/CommunicationsManagementPlanView';
import { LogManagementView } from './components/LogManagementView';
import { FormalAcceptanceView } from './components/FormalAcceptanceView';
import { CorrespondenceLogView } from './components/CorrespondenceLogView';
import { DesignHubView } from './components/DesignHubView';
import { MasterPlanAssemblyView } from './components/MasterPlanAssemblyView';
import { SourcingStrategyView } from './components/SourcingStrategyView';
import { ExecutionQAView } from './components/ExecutionQAView';
import { PerformanceMonitoringView } from './components/PerformanceMonitoringView';
import { ScheduleMilestoneOverview } from './components/ScheduleMilestoneOverview';
import { ScheduleActivityDefinition } from './components/ScheduleActivityDefinition';
import { ScheduleLogicEstimation } from './components/ScheduleLogicEstimation';
import { ScheduleProgressTracking } from './components/ScheduleProgressTracking';
import { ScheduleCadenceDashboard } from './components/ScheduleCadenceDashboard';
import { ScheduleForecasting } from './components/ScheduleForecasting';
import { ScheduleLessonsLearned } from './components/ScheduleLessonsLearned';
import { CompaniesView } from './components/CompaniesView';
import { ResourcesView } from './components/ResourcesView';
import { ContactsView } from './components/ContactsView';
import { WorkPackagesView } from './components/WorkPackagesView';
import { EnterpriseStructure } from './components/EnterpriseStructure';
import { pages } from './data';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

import { ResourceOptimizationHub } from './components/ResourceOptimizationHub';
import { ScheduleHubView } from './components/ScheduleHubView';
import { FinanceHubView } from './components/FinanceHubView';
import { StakeholdersHubView } from './components/StakeholdersHubView';
import { ResourcesHubView } from './components/ResourcesHubView';
import { RiskOpportunityHub } from './components/RiskOpportunityHub';
import { PERFORMANCE_DOMAINS } from './constants/navigation';
import { MatrixDashboard } from './components/MatrixDashboard';
import { Loader2, ShieldAlert, ChevronRight, LayoutDashboard, TrendingUp } from 'lucide-react';
import { cn, sortDomainPages, stripNumericPrefix, getISODate } from './lib/utils';

import { DomainDashboard } from './components/DomainDashboard';
import { DriveFolderView } from './components/DriveFolderView';

import { ErrorBoundary } from './components/ErrorBoundary';

import { ProjectProvider, useProject } from './context/ProjectContext';
import { UIProvider, useUI } from './context/UIContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { UserProvider, useAuth } from './context/UserContext';
import { ToolsProvider } from './context/ToolsContext';
import { ProjectDashboard } from './components/ProjectDashboard';
import { RightRibbonBar } from './components/RightRibbonBar';
import { LeftRibbonBar } from './components/LeftRibbonBar';
import { ToolWorkspace } from './components/ToolWorkspace';
import { ProjectSelectorView } from './components/ProjectSelectorView';
import { Toaster } from 'react-hot-toast';

const PageRenderer = () => {
  const { t } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { selectedProject, selectedCompanyId, companies } = useProject();
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name || 'PMIS';
  
  const page = id === 'logs' 
    ? { id: 'logs', title: t('project_logs'), type: 'hub' as const, domain: '', parentId: '' } 
    : id === 'files'
      ? { id: 'files', title: t('project_files'), type: 'terminal' as const, parentId: '' }
      : pages.find(p => p.id === id);

  const parent = (page as any)?.parentId ? pages.find(p => p.id === (page as any).parentId) : null;
  const grandParent = parent?.parentId ? pages.find(p => p.id === parent.parentId) : null;
  const getDisplayTitle = (p: any) => {
    if (!p) return '';
    const translated = t(p.id);
    const isIdTranslation = translated === p.id || stripNumericPrefix(translated) === '';
    const display = isIdTranslation ? p.title : translated;
    return stripNumericPrefix(display);
  };

  const pageTitle = getDisplayTitle(page);
  const parentTitle = getDisplayTitle(parent);
  const grandParentTitle = getDisplayTitle(grandParent);

  useEffect(() => {
    if (!pageTitle) return;
    const projectPrefix = selectedProject ? `[${selectedProject.code}] ` : '';
    const cleanTitle = stripNumericPrefix(pageTitle);
    document.title = `${projectPrefix}${cleanTitle} | ${selectedCompanyName} PMIS`;
  }, [pageTitle, selectedProject, selectedCompanyName]);

  if (!page) return <Navigate to="/page/gov" />;

  // Permission Check
  if (!isAdmin && userProfile) {
    const isAccessible = userProfile.accessiblePages?.includes(page.id);
    
    // Also consider domain hubs accessible if any child is accessible
    const hasAccessibleChild = page.type === 'hub' && pages.filter(p => p.parentId === page.id).some(p => userProfile.accessiblePages?.includes(p.id));
    
    if (!isAccessible && !hasAccessibleChild) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('access_denied')}</h2>
          <p className="text-neutral-500 max-w-md">
            {t('no_permission_access')} <strong>{t(page.id) || page.title}</strong> {t('page')} 
            {t('contact_admin_access')}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-8 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all"
          >
            {t('go_back')}
          </button>
        </div>
      );
    }
  }

  // --- PROJECT SELECTION REQUIREMENT ---
  // Most pages (except global ones like companies or admin) require a selected project.
  const globalPages = ['companies', 'explorer', 'profile'];
  if (!selectedProject && !globalPages.includes(page.id)) {
    return <ProjectSelectorView />;
  }

  // If it's a schedule page, always use ScheduleHubView or the direct view
  const isSchedulePage = page.domain === 'schedule' || page.id === 'sched';

  if (isSchedulePage) {
    return (
      <div className="w-full">
        <ScheduleHubView page={page} />
      </div>
    );
  }

  // Handle Hub pages (Focus Areas and Domains)
  if (page.type === 'hub') {
    const allChildren = pages.filter(p => p.parentId === page.id || (page.domain && p.domain === page.domain && p.id !== page.id));
    const accessibleChildren = allChildren.filter(child => {
      if (isAdmin) return true;
      if (!userProfile) return false;
      return userProfile.accessiblePages?.includes(child.id);
    });
    const children = sortDomainPages(accessibleChildren, page.domain || '');

    return (
      <div className="w-full">
        <DomainDashboard 
          page={page} 
          childrenPages={children} 
          initialTab={id === page.id ? 'overview' : id}
        />
      </div>
    );
  }

  // If the current page is a terminal page but belongs to a Hub that should be rendered as a dashboard
  const parentHub = pages.find(p => p.id === (page as any).parentId && p.type === 'hub');
  if (parentHub) {
    const allChildren = pages.filter(p => p.parentId === parentHub.id || (parentHub.domain && p.domain === parentHub.domain && p.id !== parentHub.id));
    const accessibleChildren = allChildren.filter(child => {
      if (isAdmin) return true;
      if (!userProfile) return false;
      return userProfile.accessiblePages?.includes(child.id);
    });
    const children = sortDomainPages(accessibleChildren, parentHub.domain || '');

    return (
      <div className="w-full">
        <DomainDashboard 
          page={parentHub} 
          childrenPages={children} 
          initialTab={page.id}
        />
      </div>
    );
  }

  const isPOTrackerPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6', '3.4.3', '3.4.4'].includes(page.id);
  const isTasksPage = page.id === '3.6.3';
  const isMeetingsPage = page.id === '3.6.4' || page.id === '3.5.2';
  const isFilesPage = page.id === 'files';
  const isBOQPage = page.id === '2.4.1';
  const isWBSPage = page.id === '2.2.5';
  const isWorkPackagesPage = page.id === '2.2.7';
  const isEVMPage = page.id === '4.2.2';
  const isProgressReportPage = page.id === '3.3.3' || page.id === 'dailylogs';
  const isAssumptionLogPage = ['1.1.3', '2.1.5', '2.2.1'].includes(page.id);
  const isVendorRegisterPage = page.id === '3.3.4';
  const isQualityMetricsPage = page.id === '2.1.4';
  const isStakeholderRegisterPage = page.id === '1.5.1';
  const isLessonsLearnedPage = page.id === '5.1.1';
  const isMasterPlanPage = page.id === '2.1.2';
  const isSourcingStrategyPage = page.id === '2.1.13';
  const isExecutionQAPage = page.id === '3.1.3';
  const isPerformanceMonitoringPage = page.id === '4.1.1';
  const isRiskPage = page.domain === 'risk' || [
    '2.1.14', '2.7.5', '2.7.6', '4.7.1', '4.7.2', '5.7.1', '2.7.3', '4.7.3'
  ].includes(page.id);
  const isResourcesPage = page.domain === 'resources' || [
    '2.1.10', '2.6.5', '2.6.6', '3.3.1', '3.3.4_res', '3.3.6', '5.3.1'
  ].includes(page.id);
  const isCharterPage = page.id === '1.1.1';
  const isProjectPoliciesPage = page.id === '1.1.2';
  const isProjectManagementPlanPage = page.id === '2.1.2';
  const isGovernanceHubPage = [
    'gov', // Hub
    '1.1.1', '1.1.2', '1.1.3', // Initiating
    '2.1.1', '2.1.3', '2.1.4', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12', '2.1.14', // Plans
    '2.1.5', '1.5.1', '5.1.1' // Logs
  ].includes(page.id);
  const isChangeRequestPage = page.id === '3.1.1';
  const isChangeManagementHubPage = page.id === '3.4';
  const isStakeholdersPage = page.domain === 'stakeholders' || [
    '3.5.1_sh', '4.5.1_sh'
  ].includes(page.id);
  const isLogManagementPage = ['1.5.1', '2.7.5', '5.1.1', 'logs'].includes(page.id);
  const isCorrespondenceLogPage = page.id === '3.1.2';
  const isFinancePage = page.domain === 'finance' || [
    '1.4.1', '2.4.1', '2.4.2', '2.4.3', '2.4.4', '4.4.1', '4.4.2', '5.4.1', '4.2.2', '4.2.6', '5.2.1'
  ].includes(page.id);
  const isFormalAcceptancePage = page.id === '4.1.2';
  const isClosureReportPage = page.id === '5.1.2';
  const isFoundationPage = page.id === 'foundation';
  const isDesignHubPage = page.id === 'design_hub';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <div className={cn(isSchedulePage || isResourcesPage || isRiskPage || isMasterPlanPage ? "px-6 pt-6" : "px-0", "mb-4")}>
        </div>
        {isTasksPage ? (
          <TasksView />
        ) : isPOTrackerPage ? (
          <POTracker page={page} />
        ) : isMeetingsPage ? (
          <MeetingsArchiveView 
            project={selectedProject} 
            onNewMeeting={() => {}} 
            onViewMeeting={() => {}} 
          />
        ) : isFilesPage ? (
          <FileExplorer projectId={selectedProject?.id || ''} />
        ) : isFinancePage ? (
          <FinanceHubView page={page} />
        ) : isResourcesPage ? (
          <ResourcesHubView page={page} />
        ) : isStakeholdersPage ? (
          <StakeholdersHubView page={page} />
        ) : isBOQPage ? (
          <BOQView />
        ) : isWBSPage ? (
          <WBSView />
        ) : isWorkPackagesPage ? (
          <WorkPackagesView />
        ) : isEVMPage ? (
          <EVMReportView page={page} />
        ) : isProgressReportPage ? (
          <DailyReportView page={page} />
        ) : page.id === '1.3.1' ? (
          <ScheduleMilestoneOverview page={page} />
        ) : page.id === '2.3.1' ? (
          <ScheduleActivityDefinition page={page} />
        ) : page.id === '2.3.2' ? (
          <ScheduleLogicEstimation page={page} />
        ) : (page.id === '2.3.3' || page.id === '3.3.2') ? (
          <ProjectScheduleView page={page} />
        ) : page.id === '3.5.1' ? (
          <ScheduleCadenceDashboard page={page} />
        ) : page.id === '4.5.1' ? (
          <ScheduleProgressTracking page={page} />
        ) : page.id === '4.5.2' ? (
          <ScheduleForecasting page={page} />
        ) : page.id === '5.5.1' ? (
          <ScheduleLessonsLearned page={page} />
        ) : isSchedulePage ? (
          <ScheduleHubView page={page} />
        ) : isAssumptionLogPage ? (
          <AssumptionConstraintView page={page} />
        ) : isQualityMetricsPage ? (
          <QualityMetricsRegisterView page={page} />
        ) : isRiskPage ? (
          <RiskOpportunityHub page={page} />
        ) : isMasterPlanPage ? (
          <MasterPlanAssemblyView page={page} />
        ) : isSourcingStrategyPage ? (
          <SourcingStrategyView page={page} />
        ) : isExecutionQAPage ? (
           <ExecutionQAView page={page} />
        ) : isCharterPage ? (
          <ProjectCharterView page={page} />
        ) : isProjectPoliciesPage ? (
          <GovernancePoliciesView page={page} />
        ) : isProjectManagementPlanPage ? (
          <ProjectManagementPlanView page={page} />
        ) : page.id === '2.5.1' ? (
          <StakeholderManagementPlanView page={page} />
        ) : page.id === '2.5.2' ? (
          <CommunicationsManagementPlanView page={page} />
        ) : isPerformanceMonitoringPage ? (
           <PerformanceMonitoringView page={page} />
        ) : isGovernanceHubPage ? (
          <GovernanceHubView page={page} />
        ) : isStakeholderRegisterPage ? (
          <StakeholderRegisterView page={page} />
        ) : isLessonsLearnedPage ? (
          <LessonsLearnedView page={page} />
        ) : isChangeManagementHubPage ? (
          <ChangeManagementHubView page={page} />
        ) : isChangeRequestPage ? (
          <ChangeRequestView page={page} />
        ) : isVendorRegisterPage ? (
          <SupplierMasterRegister page={page} />
        ) : isLogManagementPage ? (
          <LogManagementView page={page} />
        ) : isCorrespondenceLogPage ? (
          <CorrespondenceLogView page={page} />
        ) : isFormalAcceptancePage ? (
          <FormalAcceptanceView page={page} />
        ) : isClosureReportPage ? (
          <ClosureReportView page={page} />
        ) : isFoundationPage ? (
          <FoundationCenterView page={page} />
        ) : isDesignHubPage ? (
          <DesignHubView page={page} />
        ) : (
          <DetailView page={page} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

import { AIAssistant } from './components/AIAssistant';
import { FoundationInsights } from './components/FoundationInsights';

import { Breadcrumbs } from './components/Breadcrumbs';

const AppLayout = () => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const location = useLocation();

  useEffect(() => {
    const pageId = location.pathname.split('/').pop();
    if (pageId) {
      if (pageId === 'profile') {
        document.title = `${t('my_profile')} | PMIS`;
        return;
      }
      const page = pages.find(p => p.id === pageId);
      if (page) {
        document.title = `${stripNumericPrefix(t(pageId) === pageId ? page.title : t(pageId))} | PMIS`;
      } else {
        document.title = 'PMIS';
      }
    } else {
      document.title = 'PMIS';
    }
  }, [location.pathname, t]);

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden font-sans relative no-print-bg" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <div className="no-print">
          <Header />
          <Breadcrumbs />
        </div>
        
        <main 
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            "flex-1 overflow-y-auto no-scrollbar bg-app-bg",
            "p-0 print:overflow-visible printable-content"
          )}
        >
          <div className="max-w-[1600px] mx-auto w-full">
            <Routes>
              <Route path="/page/:id" element={<PageRenderer />} />
          <Route path="/project/:projectId/page/:id" element={<PageRenderer />} />
            <Route path="/explorer/:folderId" element={<DriveFolderView />} />
            <Route path="/profile" element={<UserFormView />} />
            <Route path="/admin/users" element={<AdminSettings />} />
            <Route path="/admin/users/new" element={<UserFormView />} />
            <Route path="/admin/users/:uid" element={<UserFormView />} />
            <Route path="/admin/enterprise" element={<EnterpriseStructure />} />
            <Route path="/admin/projects" element={<AdminSettings />} />
            <Route path="/admin/projects/:id" element={<ProjectFormView />} />
            <Route path="/project/:projectId" element={<ProjectDashboard />} />
            <Route path="/" element={
              !selectedProject ? <ProjectSelectorView /> : (
              <div className="min-h-full bg-app-bg p-6 lg:p-10 space-y-10 transition-colors duration-300">
                {/* AI Assistant Section - Expanded */}
                <div className="max-w-full mx-auto">
                  <AIAssistant />
                </div>

                {/* Dashboard Grid - Real KPIs */}
                <div className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Progress Tracker */}
                   <div className="lg:col-span-2 bg-white dark:bg-surface p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-black text-text-primary dark:text-neutral-100 uppercase tracking-widest italic">Project Health Index</h3>
                         <div className="flex gap-2">
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold">On Schedule</span>
                            <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-[10px] font-bold">In Budget</span>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {[
                           { label: 'Overall Progress', value: '68%', color: 'brand' },
                           { label: 'Schedule Variance', value: '+4 Days', color: 'emerald' },
                           { label: 'Cost Variance', value: '-12%', color: 'emerald' },
                           { label: 'Quality Index', value: '98.5%', color: 'charcoal' }
                         ].map(stat => (
                           <div key={stat.label} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                              <div className="text-[9px] font-bold text-text-secondary dark:text-neutral-500 uppercase tracking-widest mb-1">{stat.label}</div>
                              <div className={cn(
                                "text-xl font-black tracking-tighter",
                                stat.color === 'brand' ? 'text-brand' : stat.color === 'charcoal' ? 'text-text-primary' : `text-${stat.color}-600 dark:text-${stat.color}-400`
                              )}>{stat.value}</div>
                           </div>
                         ))}
                      </div>

                      <div className="h-48 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-center relative overflow-hidden">
                         <div className="absolute inset-x-8 bottom-12 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: '0%' }}
                               animate={{ width: '68%' }}
                               className="h-full bg-brand shadow-[0_0_25px_rgba(255,109,0,0.5)]" 
                            />
                         </div>
                         <div className="text-4xl font-black text-text-primary dark:text-white italic tracking-tighter opacity-5 uppercase">Kinetic Performance Engine</div>
                      </div>
                   </div>

                   {/* Quick Actions / Recent Activity */}
                   <div className="bg-text-primary dark:bg-[#1a1a1a] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-colors border border-white/5">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-brand/10 rounded-full blur-3xl -mr-24 -mt-24" />
                      <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-brand">Critical System Alerts</h3>
                      <div className="space-y-4">
                         {[
                           { msg: '3 POs awaiting approval', type: 'warning' },
                           { msg: 'Daily report missing for Zone A', type: 'error' },
                           { msg: 'New blueprint uploaded (Div 05)', type: 'info' }
                         ].map((alert, i) => (
                           <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                 alert.type === 'error' ? 'bg-rose-500 animate-pulse' :
                                 alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                               )} />
                               <span className="text-[11px] font-bold text-slate-300">{alert.msg}</span>
                            </div>
                         ))}
                      </div>
                      <button className="w-full mt-8 py-4 bg-brand hover:opacity-90 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-brand/20">
                        View Audit Log
                      </button>
                   </div>
                </div>

                {/* Performance Domains Grid */}
                <div className="max-w-full mx-auto space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-black text-text-primary dark:text-white uppercase tracking-[0.3em] italic">{t('performance_domains')}</h3>
                    <div className="flex gap-2">
                      <div className="px-3 py-1 bg-brand/10 text-brand rounded-full text-[9px] font-bold uppercase tracking-widest border border-brand/20">
                        8 Active Industrial Domains
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PERFORMANCE_DOMAINS.map(d => {
                      const hubId = {
                        'governance': 'gov',
                        'delivery': 'scope',
                        'schedule': 'sched',
                        'finance': 'fin',
                        'stakeholders': 'stak',
                        'resources': 'res',
                        'risk': 'risk'
                      }[d.id] || 'gov';
                      
                      return (
                        <Link 
                          key={d.id} 
                          to={`/page/${hubId}`}
                          className="group bg-white dark:bg-surface p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 transition-all text-left flex flex-col justify-between h-[220px]"
                        >
                           <div className="flex justify-between items-start">
                             <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-white/5 shadow-inner group-hover:bg-brand/10 transition-colors">
                               <d.icon className="w-7 h-7 transition-all group-hover:scale-110 group-hover:text-brand text-text-secondary dark:text-neutral-400" />
                             </div>
                             <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                               <TrendingUp className="w-4 h-4" />
                             </div>
                           </div>
                           <div className="space-y-1">
                             <h3 className="text-xl font-bold text-text-primary dark:text-white tracking-tight transition-colors group-hover:text-brand">{stripNumericPrefix(t(d.id))}</h3>
                             <p className="text-xs text-text-secondary dark:text-neutral-400 font-bold leading-relaxed line-clamp-2">
                               {t(d.id + '_desc') || 'Standardized performance management and reporting.'}
                             </p>
                           </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Stats Banner */}
                <div className="max-w-full mx-auto">
                   <div className="bg-text-primary dark:bg-ribbon rounded-[3rem] p-10 flex flex-wrap items-center justify-around gap-8 shadow-2xl shadow-text-primary/20 relative overflow-hidden transition-colors border border-white/5">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                      
                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-white tracking-tighter italic">94.2%</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('utilization')}</div>
                      </div>
                      
                      <div className="w-px h-12 bg-white/10 hidden md:block" />

                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-emerald-400 tracking-tighter italic">0.98 <span className="text-xs font-normal text-slate-500 not-italic ml-1">CPI</span></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('efficiency')}</div>
                      </div>

                      <div className="w-px h-12 bg-white/10 hidden md:block" />

                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-brand tracking-tighter italic">12 <span className="text-xs font-normal text-slate-500 not-italic ml-1">Days</span></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('milestones_ahead')}</div>
                      </div>

                      <div className="w-px h-12 bg-white/10 hidden md:block" />

                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-amber-400 tracking-tighter italic">0 <span className="text-xs font-normal text-slate-500 not-italic ml-1">Issues</span></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('critical')}</div>
                      </div>
                   </div>
                </div>
              </div>
              )
            } />
            </Routes>
          </div>
        </main>
        <FoundationInsights />
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seedUsers = async () => {
      // Only attempt to seed if authenticated and admin, to avoid permission errors
      if (!user || user.email !== 'hashim.h.husain@gmail.com') return;
      
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        if (snapshot.empty) {
          const { users: mockUsers } = await import('./data');
          await Promise.all(mockUsers.map(u => setDoc(doc(db, 'users', u.uid), u)));
          console.log('Mock users seeded successfully');
        }
      } catch (err) {
        console.error('Failed to seed mock users:', err);
      }
    };
    seedUsers();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Retry logic for initial connection
        let retries = 3;
        while (retries > 0) {
          try {
            // Sync user to Firestore
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              const isAdminEmail = user.email === 'hashim.h.husain@gmail.com';
              await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || 'New User',
                email: user.email || '',
                role: isAdminEmail ? 'admin' : 'engineer',
                photoURL: user.photoURL || '',
                accessiblePages: [],
                accessibleProjects: []
              });
            }
            break; // Success
          } catch (err: any) {
            console.warn(`Initial sync attempt failed (${retries} left):`, err.message);
            retries--;
            if (retries === 0) {
              console.error("Failed to sync user to Firestore after multiple attempts:", err);
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
            }
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-black/5 mb-4 animate-pulse border border-neutral-100">
          <span className="text-brand font-black text-2xl italic tracking-tighter">PMIS</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-neutral-400 font-bold text-[10px] uppercase tracking-[0.3em]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
            Initializing System...
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <UserProvider>
          {!user ? (
            <Login />
          ) : (
            <ProjectProvider>
              <UIProvider>
                <CurrencyProvider>
                  <ToolsProvider>
                    <Router>
                      <AppLayout />
                      <div className="no-print">
                        <LeftRibbonBar />
                        <RightRibbonBar />
                        <ToolWorkspace />
                      </div>
                      <Toaster position="top-right" />
                    </Router>
                  </ToolsProvider>
                </CurrencyProvider>
              </UIProvider>
            </ProjectProvider>
          )}
        </UserProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
