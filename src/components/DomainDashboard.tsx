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
import { useUI } from '../context/UIContext';

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
  const projectId = selectedProject?.id || '';
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');
  const domainKey = page.domain || 'governance';
  const { selectedFocusArea } = useUI();
  const activeFocusArea = selectedFocusArea;

  // Filter children based on permissions
  const filteredChildren = childrenPages.filter(child => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(child.id);
  });

  const focusChildren = filteredChildren.filter(child =>
    child.focusArea?.includes(activeFocusArea)
  );

  // Auto-select overview when domain or focus area changes, unless we are specifically on a terminal tab
  React.useEffect(() => {
    // If the active tab is not one of the children for the new focus area, go to overview
    if (activeTab !== 'overview' && !focusChildren.some(c => c.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeFocusArea, page.id]);

  const Icon = ICON_MAP[page.icon || 'Info'] || Info;

  // Risk Data State
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [audits, setAudits] = useState<RiskAuditEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

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
    const isTasksPage = p.id === '3.6.3';
    const isMeetingsPage = p.id === '3.6.4';
    const isBOQPage = p.id === '2.4.1';
    const isWBSPage = p.id === '2.2.5';
    const isWorkPackagesPage = p.id === '2.2.7';
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
    if (isMeetingsPage) return <DetailView page={pages.find(p => p.id === '3.6.4')!} />;
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
    <div className="w-full">
      {/* ── Domain Metadata Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Icon className="w-5 h-5" />
           </div>
           <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-900 leading-none">{t(domainKey)} {t('dashboard')}</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{t('active_phase')}: {t(activeFocusArea)}</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn("px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all", 
                activeTab === 'overview' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}
            >
              {t('overview')}
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            {focusChildren.map(child => (
              <button 
                key={child.id}
                onClick={() => setActiveTab(child.id)}
                className={cn("px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all", 
                  activeTab === child.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}
              >
                {t(child.id)}
              </button>
            ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab + activeFocusArea}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.2 }} 
          className="w-full"
        >
          {activeTab === 'overview' ? (
            <div className="p-10 space-y-12 bg-slate-50/30">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10 space-y-4">
                       <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-blue-600" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('total_processes')}</span>
                       </div>
                       <div className="text-5xl font-semibold text-slate-900">{focusChildren.length}</div>
                    </div>
                 </div>
                 
                 <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10 space-y-4">
                       <div className="flex items-center gap-3">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('baseline_status')}</span>
                       </div>
                       <div className="text-3xl font-semibold text-white">{t('healthy')}</div>
                       <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                          <Zap className="w-3 h-3" />
                          98% {t('compliance')}
                       </div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-center min-h-[160px]">
                    {getChartData()}
                 </div>
              </div>

              {/* Processes Grid */}
              <div className="space-y-6">
                 <h3 className="text-xl font-semibold text-slate-900 tracking-tight uppercase tracking-widest px-2">{t('processes_for')} {t(activeFocusArea)}</h3>
                 {focusChildren.length === 0 ? (
                   <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold uppercase tracking-widest">No terminal processes defined for this lifecycle stage.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {focusChildren.map(child => {
                        const ChildIcon = ICON_MAP[child.icon || 'FileText'] || FileText;
                        return (
                          <button 
                            key={child.id}
                            onClick={() => setActiveTab(child.id)}
                            className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-left"
                          >
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                   <ChildIcon className="w-6 h-6" />
                                </div>
                                <div className="text-[10px] font-semibold text-slate-300 group-hover:text-blue-600 transition-colors">ID: {child.id}</div>
                             </div>
                             <h4 className="text-lg font-semibold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors rtl:text-right">{t(child.id)}</h4>
                             <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-6 rtl:text-right">{t(child.id + '_summary') !== (child.id + '_summary') ? t(child.id + '_summary') : child.summary || 'Detail view of process activities, inputs, and outputs.'}</p>
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">{t('view_process')}</span>
                                <ChevronRight className={cn("w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all", isRtl ? "rotate-180" : "")} />
                             </div>
                          </button>
                        );
                      })}
                   </div>
                 )}
              </div>
            </div>
          ) : (
            <div className="w-full">
              {(() => {
                const p = focusChildren.find(c => c.id === activeTab) ?? focusChildren.find(c => c.id === initialTab);
                return p ? renderPageContent(p) : <DetailView page={pages.find(pg => pg.id === activeTab) || page} />;
              })()}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

