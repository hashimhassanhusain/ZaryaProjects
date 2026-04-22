import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
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
import { FocusAreaBar } from './components/FocusAreaBar';
import { MatrixDashboard } from './components/MatrixDashboard';
import { Loader2, ShieldAlert, ChevronRight, LayoutDashboard } from 'lucide-react';
import { cn, sortDomainPages, stripNumericPrefix } from './lib/utils';

import { DomainDashboard } from './components/DomainDashboard';
import { DriveFolderView } from './components/DriveFolderView';

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
  const { selectedProject } = useProject();
  
  const page = id === 'logs' 
    ? { id: 'logs', title: t('project_logs'), type: 'hub' as const, domain: '', parentId: '' } 
    : id === 'files'
      ? { id: 'files', title: t('project_files'), type: 'terminal' as const, parentId: '' }
      : pages.find(p => p.id === id);

  const parent = (page as any)?.parentId ? pages.find(p => p.id === (page as any).parentId) : null;
  const grandParent = parent?.parentId ? pages.find(p => p.id === parent.parentId) : null;
  const pageTitle = page ? stripNumericPrefix(t(page.id) || page.title) : '';
  const parentTitle = parent ? stripNumericPrefix(t(parent.id) || parent.title) : '';
  const grandParentTitle = grandParent ? stripNumericPrefix(t(grandParent.id) || grandParent.title) : '';

  useEffect(() => {
    if (!pageTitle) return;
    const projectPrefix = selectedProject ? `[${selectedProject.code}] ` : '';
    document.title = `${projectPrefix}${pageTitle} | ZARYA`;
  }, [pageTitle, selectedProject]);

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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 max-w-md">
            You do not have permission to access the <strong>{page.title}</strong> page. 
            Please contact your administrator for access.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Go Back
          </button>
        </div>
      );
    }
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
  const isTasksPage = page.id === '2.6.21' || page.id === '3.6.21';
  const isMeetingsPage = page.id === '2.6.22' || page.id === '3.6.22';
  const isFilesPage = page.id === 'files';
  const isBOQPage = page.id === '2.4.0';
  const isWBSPage = page.id === '2.2.9';
  const isWorkPackagesPage = page.id === '2.2.10';
  const isEVMPage = page.id === '4.2.2';
  const isProgressReportPage = page.id === '3.3.3';
  const isSchedulePage = page.id === '2.3' || page.id === 'sched' || [
    '1.3.1', '2.3.1', '2.3.2', '2.3.3', '3.5.1', '4.5.1', '4.5.2', '5.5.1', '3.3.2'
  ].includes(page.id);
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
    '1.4.1', '2.4.1', '2.4.2', '2.4.3', '4.4.1', '4.4.2', '5.4.1', '2.4.0', '4.2.2', '4.2.6', '5.2.1'
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
            <h1 className="flex items-center flex-wrap gap-2 text-2xl font-black text-slate-900 tracking-tight">
              {grandParent && (
                <>
                  <span className="text-slate-400 font-medium text-lg">{grandParentTitle}</span>
                  <ChevronRight className="w-5 h-5 text-slate-300 stroke-[3]" />
                </>
              )}
              {parent && (
                <>
                  <span className="text-slate-400 font-medium text-lg">{parentTitle}</span>
                  <ChevronRight className="w-5 h-5 text-slate-300 stroke-[3]" />
                </>
              )}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {pageTitle}
              </span>
            </h1>
          </div>
        </div>
        {isTasksPage ? (
          <TasksView />
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
          <ProgressReportView page={page} />
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

const AppLayout = () => {
  const { isRtl } = useLanguage();
  const { isSidebarOpen, closeSidebar, sidebarWidth, selectedDomain, selectedFocusArea, setSelectedFocusArea } = useUI();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#fcfcfc] overflow-hidden font-sans relative" dir="ltr">
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

      {/* Sidebar Container */}
      <motion.div
        initial={false}
        animate={{ 
          width: isSidebarOpen ? sidebarWidth : 0,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          "fixed inset-y-0 left-0 z-[60] lg:relative lg:z-0 bg-white border-r border-slate-200 overflow-hidden transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full lg:translate-x-0 opacity-0 lg:opacity-0"
        )}
      >
        <div style={{ width: sidebarWidth }} className="h-full shrink-0">
          <Sidebar />
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <Header />
        <FocusAreaBar />
        
        <main 
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            "flex-1 overflow-y-auto no-scrollbar",
            "p-0"
          )}
        >
          <Routes>
            <Route path="/page/:id" element={<PageRenderer />} />
            <Route path="/explorer/:folderId" element={<DriveFolderView />} />
            <Route path="/profile" element={<UserFormView />} />
            <Route path="/admin/users" element={<AdminSettings />} />
            <Route path="/admin/users/new" element={<UserFormView />} />
            <Route path="/admin/users/:uid" element={<UserFormView />} />
            <Route path="/admin/projects" element={<AdminSettings />} />
            <Route path="/admin/projects/:id" element={<ProjectFormView />} />
            <Route path="/project/:projectId" element={<ProjectDashboard />} />
            <Route path="/" element={
              selectedDomain ? (
                <MatrixDashboard domainId={selectedDomain} focusAreaId={selectedFocusArea} />
              ) : (
                <div className="p-8 max-w-7xl mx-auto space-y-8">
                  <div className="bg-white rounded-[3rem] p-16 border border-slate-100 shadow-sm text-center space-y-8">
                    <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                      <LayoutDashboard className="w-10 h-10" />
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-5xl font-black text-slate-900 tracking-tighter">PROJECT MATRIX</h2>
                       <p className="text-slate-500 max-w-lg mx-auto text-xl font-medium">
                          Select a Performance Domain from the sidebar to visualize project processes across the lifecycle.
                       </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto pt-12">
                      {PERFORMANCE_DOMAINS.map(d => (
                        <div key={d.id} className="group p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-default">
                           <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm ring-1 ring-slate-100 group-hover:ring-blue-100">
                             <d.icon className="w-6 h-6 transition-transform group-hover:scale-110" style={{ color: d.color }} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">{d.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            } />
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
