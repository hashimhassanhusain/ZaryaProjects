import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DetailView } from './components/DetailView';
import { ZaryaPOTracker } from './components/ZaryaPOTracker';
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
import { LogManagementView } from './components/LogManagementView';
import { FormalAcceptanceView } from './components/FormalAcceptanceView';
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
import { cn, sortDomainPages, stripNumericPrefix } from './lib/utils';

import { DomainDashboard } from './components/DomainDashboard';
import { DriveFolderView } from './components/DriveFolderView';
import { Breadcrumbs } from './components/Breadcrumbs';

import { ErrorBoundary } from './components/ErrorBoundary';

import { ProjectProvider, useProject } from './context/ProjectContext';
import { UIProvider, useUI } from './context/UIContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { UserProvider, useAuth } from './context/UserContext';
import { ProjectDashboard } from './components/ProjectDashboard';
import { Toaster } from 'react-hot-toast';

const PageRenderer = () => {
  const { t } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { selectedProject, selectedCompanyId, companies } = useProject();
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name || 'Zarya';
  
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
    document.title = `${projectPrefix}${pageTitle} | ${selectedCompanyName} PMIS`;
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('access_denied')}</h2>
          <p className="text-slate-500 max-w-md">
            {t('no_permission_access')} <strong>{t(page.id) || page.title}</strong> {t('page')} 
            {t('contact_admin_access')}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            {t('go_back')}
          </button>
        </div>
      );
    }
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

  const isZaryaPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6', '3.4.3', '3.4.4'].includes(page.id);
  const isTasksPage = page.id === '3.6.3';
  const isMeetingsPage = page.id === '3.6.4' || page.id === '3.5.2';
  const isFilesPage = page.id === 'files';
  const isBOQPage = page.id === '2.4.1';
  const isWBSPage = page.id === '2.2.5';
  const isWorkPackagesPage = page.id === '2.2.7';
  const isEVMPage = page.id === '4.2.2';
  const isProgressReportPage = page.id === '3.3.3' || page.id === 'dailylogs';
  const isAssumptionLogPage = page.id === '2.1.5';
  const isVendorRegisterPage = page.id === '3.3.4';
  const isQualityMetricsPage = page.id === '2.1.4';
  const isStakeholderRegisterPage = page.id === '1.2.1';
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
  const isProjectManagementPlanPage = page.id === '2.1.2';
  const isGovernanceHubPage = [
    'gov', '1.1.2', // Hub, Policies
    '2.1.1', '2.1.3', '2.1.4', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12', '2.1.14', // Plans
    '2.1.5', '1.2.1', '5.1.1' // Logs
  ].includes(page.id);
  const isChangeRequestPage = page.id === '3.1.1';
  const isChangeManagementHubPage = page.id === '3.4';
  const isStakeholdersPage = page.domain === 'stakeholders' || [
    '1.2.1', '1.2.5', '2.5.1', '2.5.2', '3.5.1_sh', '4.5.1_sh'
  ].includes(page.id);
  const isLogManagementPage = ['1.2.1', '2.7.5', '5.1.1', 'logs'].includes(page.id);
  const isFinancePage = page.domain === 'finance' || [
    '1.4.1', '2.4.1', '2.4.2', '2.4.3', '2.4.4', '4.4.1', '4.4.2', '5.4.1', '4.2.2', '4.2.6', '5.2.1'
  ].includes(page.id);
  const isFormalAcceptancePage = page.id === '4.1.2';

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
        <div className={cn(isSchedulePage || isResourcesPage || isRiskPage || isMasterPlanPage ? "px-6 pt-6" : "px-4 md:px-8 lg:px-12", "mb-4")}>
          <div className="mt-8 mb-6 border-b border-slate-100 pb-6">
            <Breadcrumbs currentPageId={page.id} />
          </div>
        </div>
        {isTasksPage ? (
          <TasksView />
        ) : isMeetingsPage ? (
          <MeetingsArchiveView 
            project={selectedProject!} 
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
        ) : isZaryaPage ? (
          <ZaryaPOTracker page={page} />
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
        ) : isProjectManagementPlanPage ? (
          <ProjectManagementPlanView page={page} />
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
        ) : isFormalAcceptancePage ? (
          <FormalAcceptanceView page={page} />
        ) : (
          <DetailView page={page} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

import { AIAssistant } from './components/AIAssistant';

const AppLayout = () => {
  const { t, isRtl } = useLanguage();
  const { isSidebarOpen, closeSidebar, sidebarWidth, selectedDomain, selectedFocusArea, setSelectedFocusArea } = useUI();
  const location = useLocation();

  useEffect(() => {
    const pageId = location.pathname.split('/').pop();
    if (pageId) {
      if (pageId === 'profile') {
        document.title = `${t('my_profile')} | ZARYA PMIS`;
        return;
      }
      const page = pages.find(p => p.id === pageId);
      if (page) {
        document.title = `${stripNumericPrefix(t(pageId) === pageId ? page.title : t(pageId))} | ZARYA PMIS`;
      } else {
        document.title = 'ZARYA PMIS';
      }
    } else {
      document.title = 'ZARYA PMIS';
    }
  }, [location.pathname, t]);

  return (
    <div className="flex h-screen bg-[#fcfcfc] overflow-hidden font-sans relative" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mobile Sidebar Overlay - Only on mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar removed as per user request */}

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <Header />
        
        <main 
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            "flex-1 overflow-y-auto no-scrollbar bg-[#f8fafc]",
            "p-0"
          )}
        >
          <div className="max-w-[1600px] mx-auto w-full">
            <Routes>
              <Route path="/page/:id" element={<PageRenderer />} />
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
              <div className="min-h-full bg-slate-50 p-6 lg:p-10 space-y-10">
                {/* AI Assistant Section - Expanded */}
                <div className="max-w-full mx-auto">
                  <AIAssistant />
                </div>

                {/* Dashboard Grid - Real KPIs */}
                <div className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Progress Tracker */}
                   <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Project Health Index</h3>
                         <div className="flex gap-2">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">On Schedule</span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">In Budget</span>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {[
                           { label: 'Overall Progress', value: '68%', color: 'blue' },
                           { label: 'Schedule Variance', value: '+4 Days', color: 'emerald' },
                           { label: 'Cost Variance', value: '-12%', color: 'emerald' },
                           { label: 'Quality Index', value: '98.5%', color: 'indigo' }
                         ].map(stat => (
                           <div key={stat.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                              <div className={`text-xl font-black text-${stat.color}-600 tracking-tighter`}>{stat.value}</div>
                           </div>
                         ))}
                      </div>

                      <div className="h-48 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
                         <div className="absolute inset-x-8 bottom-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: '0%' }}
                              animate={{ width: '68%' }}
                              className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                            />
                         </div>
                         <div className="text-4xl font-black text-slate-900 italic tracking-tighter opacity-10">ZARYA PERFORMANCE ENGINE</div>
                      </div>
                   </div>

                   {/* Quick Actions / Recent Activity */}
                   <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl -mr-24 -mt-24" />
                      <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-blue-400">Critical Alerts</h3>
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
                      <button className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all">
                        View Audit Log
                      </button>
                   </div>
                </div>

                {/* Performance Domains Grid */}
                <div className="max-w-full mx-auto space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">{t('performance_domains')}</h3>
                    <div className="flex gap-2">
                      <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold uppercase tracking-widest border border-blue-100">
                        8 Active Domains
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
                          className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left flex flex-col justify-between h-[220px]"
                        >
                           <div className="flex justify-between items-start">
                             <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 shadow-inner group-hover:bg-blue-50 transition-colors">
                               <d.icon className="w-7 h-7 transition-all group-hover:scale-110 group-hover:text-blue-600 text-slate-400" />
                             </div>
                             <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                               <TrendingUp className="w-4 h-4" />
                             </div>
                           </div>
                           <div className="space-y-1">
                             <h3 className="text-xl font-bold text-slate-900 tracking-tight transition-colors group-hover:text-blue-600">{t(d.id)}</h3>
                             <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                               {t(d.id + '_desc') || 'Standardized performance management and reporting.'}
                             </p>
                           </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Stats Banner */}
                <div className="max-w-7xl mx-auto">
                   <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-wrap items-center justify-around gap-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                      
                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-white tracking-tighter italic">94.2%</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('utilization')}</div>
                      </div>
                      
                      <div className="w-px h-12 bg-slate-800 hidden md:block" />

                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-emerald-400 tracking-tighter italic">0.98 <span className="text-xs font-normal text-slate-500 not-italic ml-1">CPI</span></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('efficiency')}</div>
                      </div>

                      <div className="w-px h-12 bg-slate-800 hidden md:block" />

                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-blue-400 tracking-tighter italic">12 <span className="text-xs font-normal text-slate-500 not-italic ml-1">Days</span></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('milestones_ahead')}</div>
                      </div>

                      <div className="w-px h-12 bg-slate-800 hidden md:block" />

                      <div className="text-center space-y-1 relative z-10">
                        <div className="text-3xl font-bold text-amber-400 tracking-tighter italic">0 <span className="text-xs font-normal text-slate-500 not-italic ml-1">Issues</span></div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('critical')}</div>
                      </div>
                   </div>
                </div>
              </div>
            } />
            </Routes>
          </div>
        </main>
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <img src="https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7" alt="Zarya Logo" className="h-32 mb-8 mx-auto" referrerPolicy="no-referrer" />
        <div className="flex items-center gap-3 text-white/50 font-semibold text-sm uppercase tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin" />
          Initializing Zarya...
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
                  <Router>
                    <AppLayout />
                    <Toaster position="top-right" />
                  </Router>
                </CurrencyProvider>
              </UIProvider>
            </ProjectProvider>
          )}
        </UserProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
