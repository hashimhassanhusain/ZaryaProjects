import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { AdminUsersView } from './components/AdminUsersView';
import { AdminProjectsView } from './components/AdminProjectsView';
import { ProjectFormView } from './components/ProjectFormView';
import { TasksView } from './components/TasksView';
import { MeetingsView } from './components/MeetingsView';
import { FileExplorer } from './components/FileExplorer';
import { Login } from './components/Login';
import { ProjectScheduleView } from './components/ProjectScheduleView';
import { AssumptionConstraintView } from './components/AssumptionConstraintView';
import { GovernancePoliciesView } from './components/GovernancePoliciesView';
import { VendorMasterRegister } from './components/VendorMasterRegister';
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
import { doc, setDoc, getDoc } from 'firebase/firestore';

import { ResourceOptimizationHub } from './components/ResourceOptimizationHub';
import { RiskOpportunityHub } from './components/RiskOpportunityHub';
import { Loader2 } from 'lucide-react';
import { cn, sortDomainPages, stripNumericPrefix } from './lib/utils';

import { DomainDashboard } from './components/DomainDashboard';
import { DriveFolderView } from './components/DriveFolderView';

import { ErrorBoundary } from './components/ErrorBoundary';

import { ProjectProvider, useProject } from './context/ProjectContext';
import { UIProvider, useUI } from './context/UIContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ProjectDashboard } from './components/ProjectDashboard';

const PageRenderer = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedProject } = useProject();
  
  // Handle virtual domain IDs
  if (id?.startsWith('dom_')) {
    const CANONICAL_DOMAINS = [
      { id: 'dom_gov', title: 'Governance Domain', searchKey: 'governance' },
      { id: 'dom_scope', title: 'Scope Domain', searchKey: 'scope' },
      { id: 'dom_sched', title: 'Schedule Domain', searchKey: 'schedule' },
      { id: 'dom_fin', title: 'Finance Domain', searchKey: 'finance' },
      { id: 'dom_stake', title: 'Stakeholders Domain', searchKey: 'stakeholders' },
      { id: 'dom_res', title: 'Resources Domain', searchKey: 'resources' },
      { id: 'dom_risk', title: 'Risk Domain', searchKey: 'risk' },
    ];
    const domain = CANONICAL_DOMAINS.find(d => d.id === id);
    if (domain) {
      // Special case for Schedule Domain to show Gantt directly as requested
      if (domain.id === 'dom_sched') {
        const schedulePage = pages.find(p => p.id === '2.3');
        if (schedulePage) {
          return (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="mx-auto"
            >
              <ProjectScheduleView page={schedulePage} initialTab="milestones" />
            </motion.div>
          );
        }
      }

      // Special case for Resources Domain to show Hub directly
      if (domain.id === 'dom_res') {
        const resPage = pages.find(p => p.id === '2.6');
        if (resPage) {
          return (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-none"
            >
              <ResourceOptimizationHub page={resPage} />
            </motion.div>
          );
        }
      }

      // Find all pages that belong to this domain to list them below the dashboard
      const domainHubs = pages.filter(p => 
        p.type === 'hub' && 
        p.domain === domain.searchKey
      );
      const hubIds = domainHubs.map(h => h.id);
      const children = sortDomainPages(pages.filter(p => p.parentId && hubIds.includes(p.parentId)), domain.searchKey);

      // Aggregate KPIs and alerts from all hubs in this domain
      const aggregatedKpis = domainHubs.flatMap(h => h.kpis || []);
      const aggregatedAlerts = domainHubs.flatMap(h => h.alerts || []);

      const virtualPage = {
        id: domain.id,
        title: domain.title,
        type: 'hub' as const,
        domain: domain.searchKey as any,
        kpis: aggregatedKpis,
        alerts: aggregatedAlerts
      };

      return (
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">{stripNumericPrefix(domain.title)}</h2>
            <p className="text-slate-500">Overview of performance and documentation for the {stripNumericPrefix(domain.title)}.</p>
          </header>
          <DomainDashboard page={virtualPage} />
          <div className="mt-12">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Domain Documentation & Forms</h3>
            <DashboardView page={{ id: domain.id, title: domain.title, type: 'hub', summary: '' }} overrideChildren={children} />
          </div>
        </div>
      );
    }
  }

  const page = id === 'logs' ? { id: 'logs', title: 'Project Logs', type: 'hub' as const } : pages.find(p => p.id === id);

  if (!page) return <Navigate to="/page/planning" />;

  const isZaryaPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6'].includes(page.id);
  const isTasksPage = page.id === '2.6.21';
  const isMeetingsPage = page.id === '2.6.22';
  const isFilesPage = page.id === 'files';
  const isBOQPage = page.id === '2.4.0';
  const isWBSPage = page.id === '2.2.9';
  const isEVMPage = page.id === '4.2.2';
  const isProgressReportPage = page.id === '3.3.3';
  const isSchedulePage = page.id === '2.3';
  const isAssumptionLogPage = ['2.1.5', '2.2.1'].includes(page.id);
  const isVendorRegisterPage = page.id === '3.3.4';
  const isQualityMetricsPage = page.id === '2.1.4';
  const isRiskRegisterPage = page.id === '2.7.5';
  const isRiskHubPage = page.id === '2.7';
  const isStakeholderRegisterPage = page.id === '1.2.1';
  const isLessonsLearnedPage = page.id === '5.1.1';
  const isResourceOptimizationPage = [
    '2.6', '2.6.1', '2.6.21', '2.6.22', '2.6.4', '2.6.5', '2.6.6', '2.6.7',
    '3.3', '3.3.1', '3.3.2', '3.3.3', '3.3.5', '3.3.6', '2.4.7'
  ].includes(page.id);
  const isGovernanceHubPage = [
    '1.1.1', '1.1.2', // Charter, Policies
    '2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12', '2.1.13', '2.1.14', // Plans
    '2.1.5', '1.2.1', '3.1.3', '5.1.1' // Logs
  ].includes(page.id);
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
        className={cn("mx-auto", !isSchedulePage && "max-w-6xl")}
      >
        <Breadcrumbs currentPageId={page.id} />
        {isTasksPage ? (
          <TasksView />
        ) : isMeetingsPage ? (
          <MeetingsView />
        ) : isFilesPage ? (
          <FileExplorer projectId={selectedProject?.id || ''} />
        ) : isZaryaPage ? (
          <ZaryaPOTracker page={page} />
        ) : isBOQPage ? (
          <BOQView />
        ) : isWBSPage ? (
          <WBSView />
        ) : isEVMPage ? (
          <EVMReportView page={page} />
        ) : isProgressReportPage ? (
          <ProgressReportView page={page} />
        ) : isSchedulePage ? (
          <ProjectScheduleView page={page} />
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
          <VendorMasterRegister page={page} />
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
  const { isSidebarOpen, closeSidebar, sidebarWidth } = useUI();

  return (
    <div className="flex h-screen bg-[#fcfcfc] overflow-hidden font-sans relative">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <Routes>
            <Route path="/page/:id" element={<PageRenderer />} />
            <Route path="/explorer/:folderId" element={<DriveFolderView />} />
            <Route path="/profile" element={<UserFormView />} />
            <Route path="/admin/users" element={<AdminUsersView />} />
            <Route path="/admin/users/:uid" element={<UserFormView />} />
            <Route path="/admin/contacts" element={<ContactsView />} />
            <Route path="/admin/companies" element={<CompaniesView />} />
            <Route path="/admin/resources" element={<ResourcesView />} />
            <Route path="/admin/work-packages" element={<WorkPackagesView />} />
            <Route path="/admin/projects" element={<AdminProjectsView />} />
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
        <div className="flex items-center gap-3 text-white/50 font-bold text-sm uppercase tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin" />
          Initializing Zarya...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <ProjectProvider>
        <UIProvider>
          <CurrencyProvider>
            <Router>
              <AppLayout />
            </Router>
          </CurrencyProvider>
        </UIProvider>
      </ProjectProvider>
    </ErrorBoundary>
  );
}
