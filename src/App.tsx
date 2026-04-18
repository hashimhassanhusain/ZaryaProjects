import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Breadcrumbs } from './components/Breadcrumbs';
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
import { RiskOpportunityHub } from './components/RiskOpportunityHub';
import { Loader2 } from 'lucide-react';
import { cn, sortDomainPages, stripNumericPrefix } from './lib/utils';

import { DomainDashboard } from './components/DomainDashboard';
import { DriveFolderView } from './components/DriveFolderView';

import { ErrorBoundary } from './components/ErrorBoundary';

import { ProjectProvider, useProject } from './context/ProjectContext';
import { UIProvider, useUI } from './context/UIContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ProjectDashboard } from './components/ProjectDashboard';
import { Toaster } from 'react-hot-toast';

const PageRenderer = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { selectedProject } = useProject();
  
  // Handle domain and focus area IDs
  const hubIds = [
    'gov', 'scope', 'fin', 'stak', 'res', 'risk', '2.1.2'
  ];

  const page = id === 'logs' 
    ? { id: 'logs', title: t('project_logs'), type: 'hub' as const } 
    : id === 'files'
      ? { id: 'files', title: t('project_files'), type: 'terminal' as const }
      : pages.find(p => p.id === id);

  if (!page) return <Navigate to="/page/gov" />;

  // If it's a risk domain page, always render DomainDashboard with the correct tab
  const isRiskDomain = 'domain' in page && page.domain === 'risk';
  if (isRiskDomain || page.id === 'risk') {
    const hubPage = pages.find(p => p.id === 'risk');
    if (hubPage) {
      const children = sortDomainPages(pages.filter(p => p.parentId === 'risk'), 'risk');
      return (
        <div className="w-full">
          <DomainDashboard 
            page={hubPage} 
            childrenPages={children} 
            initialTab={page.id === 'risk' ? 'overview' : page.id} 
          />
        </div>
      );
    }
  }

  if (id && hubIds.includes(id)) {
    const hubPage = pages.find(p => p.id === id);
    if (hubPage) {
      const children = sortDomainPages(pages.filter(p => p.parentId === id), hubPage.domain || '');

      return (
        <div className="w-full">
          <DomainDashboard page={hubPage} childrenPages={children} />
        </div>
      );
    }
  }

  const isZaryaPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6'].includes(page.id);
  const isTasksPage = page.id === '2.6.21';
  const isMeetingsPage = page.id === '2.6.22';
  const isFilesPage = page.id === 'files';
  const isBOQPage = page.id === '2.4.0';
  const isWBSPage = page.id === '2.2.9';
  const isWorkPackagesPage = page.id === '2.2.10';
  const isEVMPage = page.id === '4.2.2';
  const isProgressReportPage = page.id === '3.3.3';
  const isSchedulePage = page.id === '2.3' || page.id === 'sched';
  const isAssumptionLogPage = page.id === '2.1.5';
  const isVendorRegisterPage = page.id === '3.3.4';
  const isQualityMetricsPage = page.id === '2.1.4';
  const isRiskRegisterPage = page.id === '2.7.5';
  const isRiskHubPage = page.id === 'risk';
  const isStakeholderRegisterPage = page.id === '1.2.1';
  const isLessonsLearnedPage = page.id === '5.1.1';
  const isResourceOptimizationPage = [
    '2.6', '2.6.1', '2.6.21', '2.6.22', '2.6.4', '2.6.5', '2.6.6', '2.6.7',
    '3.3', '3.3.1', '3.3.2', '3.3.3', '3.3.5', '3.3.6'
  ].includes(page.id);
  const isGovernanceHubPage = [
    'gov', '1.1.1', '1.1.2', // Charter, Policies
    '2.1.1', '2.1.3', '2.1.4', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12', '2.1.13', '2.1.14', // Plans
    '2.1.5', '1.2.1', '3.1.3', '5.1.1' // Logs
  ].includes(page.id) && page.id !== '2.1.2';
  const isChangeRequestPage = page.id === '3.1.1';
  const isDecisionLogPage = page.id === '3.1.3';
  const isChangeManagementHubPage = page.id === '3.4';
  const isLogManagementPage = ['1.2.1', '2.7.5', '5.1.1', 'logs'].includes(page.id);
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
        <div className={cn(isSchedulePage || isResourceOptimizationPage || page.id === '2.1.2' ? "px-6 pt-6" : "px-4 md:px-8 lg:px-12")}>
          <Breadcrumbs currentPageId={page.id} />
        </div>
        {isTasksPage ? (
          <TasksView />
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
          <ProgressReportView page={page} />
        ) : isSchedulePage ? (
          <ScheduleHubView page={page} />
        ) : isAssumptionLogPage ? (
          <AssumptionConstraintView page={page} />
        ) : isQualityMetricsPage ? (
          <QualityMetricsRegisterView page={page} />
        ) : isRiskRegisterPage ? (
          <RiskRegisterView page={page} />
        ) : isRiskHubPage ? (
          <RiskOpportunityHub page={page} />
        ) : isGovernanceHubPage ? (
          <GovernanceHubView page={page} />
        ) : isStakeholderRegisterPage ? (
          <StakeholderRegisterView page={page} />
        ) : isLessonsLearnedPage ? (
          <LessonsLearnedView page={page} />
        ) : isResourceOptimizationPage ? (
          <ResourceOptimizationHub page={page} />
        ) : isDecisionLogPage ? (
          <DecisionLogView page={page} />
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
        ) : page.type === 'hub' ? (
          <DashboardView page={page} />
        ) : (
          <DetailView page={page} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const AppLayout = () => {
  const { isRtl } = useLanguage();
  const { isSidebarOpen, closeSidebar, sidebarWidth } = useUI();
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
        <main 
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            "flex-1 overflow-y-auto",
            // Remove padding for schedule and governance hub to allow full width as requested
            (location.pathname.includes('/page/2.3') || 
             location.pathname.includes('/page/2.1.2') || 
             location.pathname.includes('/page/2.6') || 
             location.pathname.includes('/page/3.3')) ? "p-0" : "pt-1 pb-6 px-4 md:px-8 lg:px-12"
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
            <Route path="/" element={<ProjectDashboard />} />
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
        } catch (err: any) {
          console.error("Failed to sync user to Firestore:", err);
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
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
      </LanguageProvider>
    </ErrorBoundary>
  );
}
