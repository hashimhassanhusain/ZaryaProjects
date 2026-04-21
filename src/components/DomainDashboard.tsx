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
  LayoutDashboard, FileText, ChevronRight, Zap, Activity,
  Flag, BookOpen, ClipboardList, BarChart3, List, Table,
  LayoutGrid, Layers, Briefcase, User, Users2,
  ShieldCheck, Award, ShoppingCart, GitBranch, MessageSquare,
  ListChecks, Grid, Building2, CheckSquare, ListChecks as TableAlt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, RiskEntry, ProjectIssue, RiskAuditEntry, Stakeholder, User as UserType } from '../types';
import { pages, getChildren } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  setDoc,
  doc
} from 'firebase/firestore';
import { DashboardView } from './DashboardView';
import { DetailView } from './DetailView';
import { ProjectManagementPlanView } from './ProjectManagementPlanView';
import { ChangeManagementPlanView } from './ChangeManagementPlanView';
import { QualityManagementPlanView } from './QualityManagementPlanView';
import { CommunicationsManagementPlanView } from './CommunicationsManagementPlanView';
import { StakeholderManagementPlanView } from './StakeholderManagementPlanView';
import { RequirementsManagementPlanView } from './RequirementsManagementPlanView';
import { ScopeManagementPlanView } from './ScopeManagementPlanView';
import { ScheduleManagementPlanView } from './ScheduleManagementPlanView';
import { CostManagementPlanView } from './CostManagementPlanView';
import { ProcurementManagementPlanView } from './ProcurementManagementPlanView';
import { RiskManagementPlanView } from './RiskManagementPlanView';
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
import { ProjectCharterView } from './ProjectCharterView';
import { GovernancePoliciesView } from './GovernancePoliciesView';
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
import { SupplierMasterRegister } from './SupplierMasterRegister';
import { LogManagementView } from './LogManagementView';
import { FormalAcceptanceView } from './FormalAcceptanceView';

// Risk Components
import { RiskRegisterTab } from './risk/RiskRegisterTab';
import { RiskAssessmentTab } from './risk/RiskAssessmentTab';
import { RiskAuditTab } from './risk/RiskAuditTab';
import { RiskDashboardTab } from './risk/RiskDashboardTab';
import { RiskPlanTab } from './risk/RiskPlanTab';
import { RiskMatrixTab } from './risk/RiskMatrixTab';
import { IssueLogTab } from './risk/IssueLogTab';

import { useAuth } from '../context/UserContext';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useFocusArea } from '../context/FocusAreaContext';

interface DomainDashboardProps {
  page: Page;
  childrenPages?: Page[];
  initialTab?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ICON_MAP: Record<string, any> = {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package,
  Zap, Activity, Flag, BookOpen, ClipboardList, BarChart3,
  List, Table, LayoutGrid, Layers, Briefcase, User, Users2,
  ShieldCheck, Award, ShoppingCart, GitBranch, MessageSquare,
  ListChecks, Grid, Building2, CheckSquare, TableAlt
};

export const DomainDashboard: React.FC<DomainDashboardProps> = ({ page, childrenPages = [], initialTab }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const { activeFocusArea } = useFocusArea();
  const projectId = selectedProject?.id || '';
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');
  const domainKey = page.domain || 'governance';
  const Icon = ICON_MAP[page.icon || 'Info'] || Info;

  // Filter children based on permissions
  const filteredChildren = childrenPages.filter(child => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(child.id);
  });

  const focusChildren = filteredChildren.filter(child =>
    child.focusArea?.includes(activeFocusArea)
  );

  // Risk Data State
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [audits, setAudits] = useState<RiskAuditEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

  // Reset tab when page changes to avoid "Cannot read properties of undefined" errors
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('overview');
    }
  }, [page.id, initialTab]);

  // Fetch Risk Data if in Risk or Governance Domain (since plans are consolidated there)
  React.useEffect(() => {
    if (!['risk', 'governance'].includes(domainKey) || !projectId) return;

    // Seed mock users if empty
    const seedUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (snap.empty) {
          const mockUsers = [
            { name: 'Hashim Husain', email: 'hashim.h.husain@gmail.com', role: 'admin', uid: 'u1' },
            { name: 'Ahmed Hassan', email: 'ahmed@zarya.com', role: 'engineer', uid: 'u2' },
            { name: 'Sarah Jones', email: 'sarah@zarya.com', role: 'engineer', uid: 'u3' },
            { name: 'Michael Chen', email: 'michael@zarya.com', role: 'engineer', uid: 'u4' }
          ];
          for (const u of mockUsers) {
            await setDoc(doc(db, 'users', u.uid), u);
          }
        }
      } catch (error) {
        console.error("Error seeding users:", error);
      }
    };
    seedUsers();

    const risksUnsub = onSnapshot(
      query(collection(db, 'risks'), where('projectId', '==', projectId)),
      (snap) => setRisks(snap.docs.map(d => ({ id: d.id, ...d.data() } as RiskEntry)))
    );

    const issuesUnsub = onSnapshot(
      query(collection(db, 'issues'), where('projectId', '==', projectId)),
      (snap) => setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectIssue)))
    );

    const auditsUnsub = onSnapshot(
      query(collection(db, 'risk_audits'), where('projectId', '==', projectId)),
      (snap) => setAudits(snap.docs.map(d => ({ id: d.id, ...d.data() } as RiskAuditEntry)))
    );

    const stakeholdersUnsub = onSnapshot(
      query(collection(db, 'stakeholders'), where('projectId', '==', projectId)),
      (snap) => setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)))
    );

    const usersUnsub = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserType)))
    );

    return () => {
      risksUnsub();
      issuesUnsub();
      auditsUnsub();
      stakeholdersUnsub();
      usersUnsub();
    };
  }, [domainKey, projectId]);
  
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
    const isRiskHubPage = p.id === '2.7' || p.id === 'risk';
    const isRiskPlanPage = p.id === '2.1.14';
    const isRiskAssessmentPage = p.id === '2.7.1';
    const isRiskMatrixPage = p.id === '2.7.2';
    const isRiskAuditPage = p.id === '4.4.1';
    const isIssueLogPage = p.id === '2.7.3';
    const isStakeholderRegisterPage = p.id === '1.2.1';
    const isLessonsLearnedPage = p.id === '5.1.1';
    const isGovernanceHubPage = p.id === 'gov' || p.type === 'hub' && p.domain === 'governance';
    const isChangeRequestPage = p.id === '3.1.1';
    const isDecisionLogPage = p.id === '3.1.3';
    const isChangeManagementHubPage = p.id === '3.4';
    const isLogManagementPage = ['1.2.1', '2.7.5', '5.1.1', 'logs'].includes(p.id);
    const isFormalAcceptancePage = p.id === '4.1.2';

    if (p.id === '1.1.1') return <ProjectCharterView page={p} />;
    if (p.id === '1.1.2') return <GovernancePoliciesView page={p} />;
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
    
    // New Risk Components Mapping
    if (isRiskPlanPage) return <RiskManagementPlanView page={p} />;
    if (isRiskRegisterPage) return (
      <RiskRegisterTab 
        risks={risks} 
        stakeholders={stakeholders} 
        users={users} 
        projectId={projectId} 
      />
    );
    if (isRiskAssessmentPage) return <RiskAssessmentTab risks={risks} projectId={projectId} />;
    if (isRiskMatrixPage) return <RiskMatrixTab risks={risks} />;
    if (isRiskAuditPage) return <RiskAuditTab audits={audits} projectId={projectId} />;
    if (isIssueLogPage) return (
      <IssueLogTab 
        issues={issues} 
        users={users} 
        projectId={projectId} 
      />
    );
    
    if (p.id === '2.1.2') return <ProjectManagementPlanView page={p} />;
    if (p.id === '2.1.1') return <ChangeManagementPlanView page={p} />;
    if (p.id === '2.1.3') return <QualityManagementPlanView page={p} />;
    if (p.id === '2.1.6') return <CommunicationsManagementPlanView page={p} />;
    if (p.id === '2.1.7') return <StakeholderManagementPlanView page={p} />;
    if (p.id === '2.1.8') return <RequirementsManagementPlanView page={p} />;
    if (p.id === '2.1.9') return <ScopeManagementPlanView page={p} />;
    if (p.id === '2.1.11') return <ScheduleManagementPlanView page={p} />;
    if (p.id === '2.1.12') return <CostManagementPlanView page={p} />;
    if (p.id === '2.1.13') return <ProcurementManagementPlanView page={p} />;

    if (isRiskHubPage) return <RiskOpportunityHub page={p} />;
    if (isGovernanceHubPage) return <GovernanceHubView page={p} />;
    if (isStakeholderRegisterPage) return <StakeholderRegisterView page={p} />;
    if (isLessonsLearnedPage) return <LessonsLearnedView page={p} />;
    if (isDecisionLogPage) return <DecisionLogView page={p} />;
    if (isChangeManagementHubPage) return <ChangeManagementHubView page={p} />;
    if (isChangeRequestPage) return <ChangeRequestView page={p} />;
    if (isVendorRegisterPage) return <SupplierMasterRegister page={p} />;
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

  const activeHubId = null;

  return (
    <div className="flex flex-col h-full"> {/* Added h-full for layout stability */}
      {/* Focus Area content header */}
      {focusChildren.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
          {focusChildren.map(child => {
            const ChildIcon = ICON_MAP[child.icon || 'FileText'] || FileText;
            const isSelected = activeTab === child.id;
            return (
              <button
                key={child.id}
                onClick={() => setActiveTab(child.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                )}
              >
                <ChildIcon className="w-3.5 h-3.5" />
                {child.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-b-3xl p-2 shadow-sm -mt-px flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full">
              {focusChildren.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">No processes defined for this intersection yet.</p>
                </div>
              ) : (
                (() => {
                  const pageToShow = focusChildren.find(c => c.id === activeTab) || focusChildren[0];
                  // auto-select first if activeTab not in this focus area
                  // Note: setState during render is generally bad, but we are inside an IIFE mapped to content
                  // For now we'll just show it.
                  return (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="p-0 flex-1 overflow-visible">
                        {renderPageContent(pageToShow)}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

