import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ProjectSelectionView } from './components/ProjectSelectionView';
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
import { cn, sortDomainPages, stripNumericPrefix, toSlug } from './lib/utils';

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
  const { companySlug, projectSlug, domainSlug, pageSlug } = useParams<{ 
    companySlug: string; 
    projectSlug: string; 
    domainSlug: string; 
    pageSlug: string; 
  }>();
  const { selectedProject, selectedCompany, resolveContext, loading: contextLoading } = useProject();
  
  // Resolve context when slugs change
  useEffect(() => {
    if (companySlug && projectSlug) {
      resolveContext(companySlug, projectSlug);
    }
  }, [companySlug, projectSlug, resolveContext]);

  const page = pageSlug === 'logs' 
    ? { id: 'logs', title: t('project_logs'), type: 'hub' as const, domain: '', parentId: '' } 
    : pageSlug === 'files'
      ? { id: 'files', title: t('project_files'), type: 'terminal' as const, parentId: '' }
      : pages.find(p => p.id === pageSlug || toSlug(p.title) === pageSlug);

  const parent = (page as any)?.parentId ? pages.find(p => p.id === (page as any).parentId) : null;

  useEffect(() => {
    if (!page) return;
    const projectPrefix = selectedProject ? `[${selectedProject.code}] ` : '';
    document.title = `${projectPrefix}${page.title} | PMISPro`;
  }, [page, selectedProject]);

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!selectedCompany || !selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Project or Company not found</h2>
        <p className="text-slate-500 max-w-md">
          The requested URL does not match any valid PMISPro project or company context.
        </p>
        <Link 
          to="/"
          className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!page) return <Navigate to={`/${companySlug}/${projectSlug}/governance/gov`} />;

  // Permission Check
  if (!isAdmin && userProfile) {
    const isAccessible = userProfile.accessiblePages?.includes(page.id);
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

  const isZaryaPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6', '3.4.3', '3.4.4'].includes(page.id);
  const isTasksPage = page.id === '3.6.3';
  const isMeetingsPage = page.id === '3.6.4' || page.id === '3.5.2';
  const isFilesPage = page.id === 'files';
  const isFinancePage = page.domain === 'finance' || [
    '1.4.1', '2.4.1', '2.4.2', '2.4.3', '2.4.4', '4.4.1', '4.4.2', '5.4.1', '4.2.2', '4.2.6', '5.2.1'
  ].includes(page.id);
  const isResourcesPage = page.domain === 'resources' || [
    '2.1.10', '2.6.5', '2.6.6', '3.3.1', '3.3.4_res', '3.3.6', '5.3.1', '3.6.1', '3.6.2', '4.6.1'
  ].includes(page.id);
  const isStakeholdersPage = page.domain === 'stakeholders' || [
    '1.2.1', '1.2.5', '2.5.1', '2.5.2', '3.5.1_sh', '4.5.1_sh'
  ].includes(page.id);
  const isRiskPage = page.domain === 'risk' || [
    '2.1.14', '2.7.5', '2.7.6', '4.7.1', '4.7.2', '5.7.1', '2.7.3', '4.7.3'
  ].includes(page.id);
  const isSchedulePage = page.domain === 'schedule' || [
    '1.3.1', '2.3.1', '2.3.2', '2.3.3', '2.3.4', '2.3.5', '3.3.2', '3.5.1', '4.5.1', '4.5.2', '5.5.1', 'sched'
  ].includes(page.id);

  // Hub Pages
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
  const isCharterPage = page.id === '1.1.1';
  const isProjectManagementPlanPage = page.id === '2.1.2';
  const isGovernanceHubPage = [
    'gov', '1.1.2', // Hub, Policies
    '2.1.1', '2.1.3', '2.1.4', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12', '2.1.14', // Plans
    '2.1.5', '1.2.1', '5.1.1' // Logs
  ].includes(page.id);
  const isChangeRequestPage = page.id === '3.1.1';
  const isChangeManagementHubPage = page.id === '3.4';
  const isLogManagementPage = ['1.2.1', '2.7.5', '5.1.1', 'logs'].includes(page.id);
  const isFormalAcceptancePage = page.id === '4.1.2';

  // Handle Specialized Hub pages (These have their own Ribbons/Layouts)
  if (isFinancePage) return <FinanceHubView page={page} />;
  if (isResourcesPage) return <ResourcesHubView page={page} />;
  if (isStakeholdersPage) return <StakeholdersHubView page={page} />;
  if (isSchedulePage) return <ScheduleHubView page={page} />;
  if (isRiskPage) return <RiskOpportunityHub page={page} />;

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
          initialTab={pageSlug === page.id ? 'overview' : pageSlug}
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
        <div className={cn(isMasterPlanPage ? "px-6 pt-4" : "px-4 md:px-8 lg:px-12", "mb-2")}>
          <div className="mt-6 mb-4 border-b border-slate-100 pb-4">
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

  return (
    <div className="flex h-screen bg-[#fcfcfc] overflow-hidden font-sans relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <Sidebar />
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

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <Header />
        
        <main 
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            "flex-1 overflow-y-auto no-scrollbar",
            "p-0"
          )}
        >
          <Routes>
            <Route path="/:companySlug/:projectSlug/:domainSlug/:pageSlug" element={<PageRenderer />} />
            <Route path="/explorer/:folderId" element={<DriveFolderView />} />
            <Route path="/profile" element={<UserFormView />} />
            <Route path="/admin/users" element={<AdminSettings />} />
            <Route path="/admin/users/new" element={<UserFormView />} />
            <Route path="/admin/users/:uid" element={<UserFormView />} />
            <Route path="/admin/companies" element={<CompaniesView />} />
            <Route path="/admin/projects" element={<AdminSettings />} />
            <Route path="/admin/projects/:id" element={<ProjectFormView />} />
            <Route path="/project/:projectId" element={<ProjectDashboard />} />
            <Route path="/" element={<ProjectSelectionView />} />

          </Routes>
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
        const institutionsRef = collection(db, 'institutions');
        const instSnapshot = await getDocs(institutionsRef);
        if (instSnapshot.empty) {
          const { initialInstitutions, initialCompanies } = await import('./data');
          await Promise.all(initialInstitutions.map(i => setDoc(doc(db, 'institutions', i.id), i)));
          await Promise.all(initialCompanies.map(c => setDoc(doc(db, 'companies', c.id), c)));
          console.log('Corporate seeds planted successfully');
        }

        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        if (snapshot.empty) {
          const { users: mockUsers } = await import('./data');
          await Promise.all(mockUsers.map(u => setDoc(doc(db, 'users', u.uid), u)));
          console.log('Mock users seeded successfully');
        }
      } catch (err) {
        console.error('Failed to seed mock data:', err);
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
