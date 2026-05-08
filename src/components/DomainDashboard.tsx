import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package, Box,
  LayoutDashboard, FileText, ChevronRight, Zap, Activity,
  Flag, BookOpen, ClipboardList, BarChart3, List, Table,
  LayoutGrid, Layers, Briefcase, User, Users2,
  ShieldCheck, Award, ShoppingCart, GitBranch, MessageSquare,
  ListChecks, Grid, Building2, CheckSquare, ListChecks as TableAlt,
  UserSearch, Layout, Coins, Receipt, Wallet, Landmark, Eye, MessageCircleWarning,
  Smile, Archive, Calculator, Lock, FilePlus, History, CalendarDays,
  Play, Gauge, Settings2, Library, Network, Search, UserPlus, Handshake, MessagesSquare,
  FolderArchive, ListTodo, ArrowRightLeft, FileSearch, HelpCircle, Star, FolderOpen, Printer,
  ArrowRight
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
import { ResourceManagementPlanView } from './ResourceManagementPlanView';
import { TasksView } from './TasksView';
import { ProjectCharterView } from './ProjectCharterView';
import { BusinessCaseView } from './BusinessCaseView';
import { GovernancePoliciesView } from './GovernancePoliciesView';
import { POTracker } from './POTracker';
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
import { DesignHubView } from './DesignHubView';

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

const COLORS = ['#FF5C00', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ICON_MAP: Record<string, any> = {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, 
  DollarSign, Users, ShieldAlert, Target, Info,
  Shield, DraftingCompass, Calendar, Banknote, Package, Box,
  Zap, Activity, Flag, BookOpen, ClipboardList, BarChart3,
  List, Table, LayoutGrid, Layers, Briefcase, User, Users2,
  ShieldCheck, Award, ShoppingCart, GitBranch, MessageSquare,
  ListChecks, Grid, Building2, CheckSquare, TableAlt,
  UserSearch, Layout, Coins, Receipt, Wallet, Landmark, Eye, MessageCircleWarning,
  Smile, Archive, Calculator, Lock, FilePlus, History, CalendarDays,
  Play, Gauge, Settings2, Library, Network, Search, UserPlus, Handshake, MessagesSquare,
  FolderArchive, ListTodo, ArrowRightLeft, FileSearch, HelpCircle
};

import { Ribbon, RibbonGroup } from './Ribbon';

export const DomainDashboard: React.FC<DomainDashboardProps> = ({ page, childrenPages = [], initialTab }) => {
  const { t, th, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const projectId = selectedProject?.id || '';
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');
  const domainKey = page.domain || 'governance';
  const { selectedFocusArea } = useUI();
  const activeFocusArea = selectedFocusArea;
  const navigate = useNavigate();

  const handleTabChange = (id: string) => {
    if (id === 'generate-pdf') {
      toast.success(t('pdf_saved_to_drive'));
      return;
    }
    if (id === 'push-baseline') {
      toast.success(t('update_success'));
      return;
    }
    if (id === 'explorer') {
      navigate('/explorer/root');
      return;
    }
    if (id === 'admin') {
      navigate('/admin/users');
      return;
    }
    setActiveTab(id);
  };

  // Focus area colors for indicators
  const focusAreaColors: Record<string, string> = {
    'Initiating': 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    'Planning': 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    'Executing': 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    'Monitoring & Controlling': 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]',
    'Closing': 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
  };

  // Filter children based on permissions
  const filteredChildren = childrenPages.filter(child => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(child.id);
  });

  // Artifact-based mapping for each domain
  const ARTIFACT_MAPPING: Record<string, { primary: string[], secondary: string[] }> = {
    'governance': {
      primary: ['1.1.1', '1.1.3', '1.1.2', '3.1.2'], // Charter, Assumption Log, Business Case, Correspondence
      secondary: ['3.1.1', '5.1.1', '4.1.2', '2.1.1', '2.1.2', '4.1.1', '5.1.2'] // MOM, Lessons, Change Log, etc.
    },
    'stakeholders': {
      primary: ['1.5.1', '2.5.1'],
      secondary: ['1.5.2', '2.5.2', '3.5.1', '4.5.1', '5.5.1']
    },
    'delivery': { // Refers to Scope & Delivery
      primary: ['design_hub', '2.2.2', '2.2.5', '2.2.7', '3.2.1'], 
      secondary: ['1.2.1', '1.2.2', '2.2.1', '2.2.3', '3.2.2', '4.2.1', '4.2.2', '5.2.1', '5.2.2']
    },
    'schedule': {
      primary: ['2.3.3', '3.3.3', '2.3.1'],
      secondary: ['1.3.1', '1.3.2', '2.3.2', '2.3.4', '2.3.5', '3.3.1', '3.3.2', '4.3.1', '4.3.2', '5.3.1', '5.3.2']
    },
    'finance': {
      primary: ['2.4.1', '3.4.3', '1.4.2'],
      secondary: ['1.4.1', '2.4.2', '2.4.3', '3.4.1', '3.4.2', '3.4.4', '4.4.1', '4.4.2', '5.4.1', '5.4.2']
    },
    'resources': {
      primary: ['2.6.1', '2.6.2', '3.6.3'],
      secondary: ['1.6.1', '1.6.2', '2.6.3', '3.6.1', '3.6.2', '3.6.4', '4.6.1', '4.6.2', '5.6.1', '5.6.2']
    },
    'risk': {
      primary: ['1.7.1', '2.7.2', '4.7.1'],
      secondary: ['1.7.2', '2.7.1', '2.7.3', '3.7.1', '4.7.2', '5.7.1', '5.7.2']
    }
  };

  // Define high-usage processes for large icons
  const domainArtifacts = ARTIFACT_MAPPING[domainKey];
  const highUsageIds = domainArtifacts ? domainArtifacts.primary : [
    '2.6.21', '3.3.3', '3.6.4', 
    'daily-reports', '3.6.3', '3.1.3',
    '2.4.1', '5.2.1', '3.1.1',
    '2.7.5', '2.1.6', '2.3.3', '3.3.2'
  ];

  // Filter children to ONLY show artifacts if mapped, otherwise show all
  const ribbonChildren = domainArtifacts 
    ? filteredChildren.filter(c => [...domainArtifacts.primary, ...domainArtifacts.secondary].includes(c.id))
    : filteredChildren;

  // Filter children based on permissions
  const finalChildren = ribbonChildren;

  const Icon = ICON_MAP[page.icon || 'Info'] || Info;

  // Always use Focus Area division for the ribbon as per user request
  const ribbonGroups: RibbonGroup[] = [];

  // Group processes by focus area for the ribbon
  const focusAreas = ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'];
  const areas = focusAreas; 

  // Add the "Overview" tab first
  ribbonGroups.push({
    id: 'general',
    tabs: [
      { 
        id: 'overview', 
        label: stripNumericPrefix(t(domainKey)) === domainKey 
          ? stripNumericPrefix(page.title).replace(/\s*Hub$/i, '').replace(/\s*Domain$/i, '') 
          : stripNumericPrefix(t(domainKey)), 
        icon: Icon,
        description: th('overview_summary'),
        size: 'large'
      }
    ]
  });

  // Group children by focus area
  focusAreas.forEach(area => {
    const areaChildren = finalChildren.filter(c => c.focusArea?.includes(area));
    if (areaChildren.length > 0) {
      ribbonGroups.push({
        id: area.toLowerCase().replace(/\s+/g, '_'),
        label: t(area),
        tabs: areaChildren
          .sort((a, b) => {
            // Sort by primary vs secondary within the same focus area
            if (domainArtifacts) {
              const aPrimary = domainArtifacts.primary.includes(a.id);
              const bPrimary = domainArtifacts.primary.includes(b.id);
              if (aPrimary && !bPrimary) return -1;
              if (!aPrimary && bPrimary) return 1;
              return domainArtifacts.primary.indexOf(a.id) - domainArtifacts.primary.indexOf(b.id);
            }
            return 0;
          })
          .map(child => {
            const translatedLabel = t(child.id);
            const label = translatedLabel === child.id ? child.title : translatedLabel;
            
            return {
              id: child.id,
              label: stripNumericPrefix(label),
              icon: ICON_MAP[child.icon || 'FileText'] || FileText,
              description: th(child.id + '_summary') || child.summary,
              focusArea: area, 
              size: highUsageIds.includes(child.id) ? 'large' : 'small'
            };
          })
      });
    }
  });

  // Auto-select overview when domain changes
  React.useEffect(() => {
    setActiveTab('overview');
  }, [page.id]);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('pmis_favorites');
    return saved ? JSON.parse(saved) : ['3.6.3', '3.6.4', '2.4.1'];
  });

  const [isFavorite, setIsFavorite] = useState(() => {
    return favorites.includes(page.id);
  });

  useEffect(() => {
    const syncFavorites = () => {
      const saved = localStorage.getItem('pmis_favorites');
      const favs = saved ? JSON.parse(saved) : ['3.6.3', '3.6.4', '2.4.1'];
      setFavorites(favs);
      setIsFavorite(favs.includes(page.id));
    };
    window.addEventListener('storage', syncFavorites);
    return () => window.removeEventListener('storage', syncFavorites);
  }, [page.id]);

  const toggleFavorite = () => {
    const saved = localStorage.getItem('pmis_favorites');
    let favs = saved ? JSON.parse(saved) : ['3.6.3', '3.6.4', '2.4.1'];
    
    if (favs.includes(page.id)) {
      favs = favs.filter((id: string) => id !== page.id);
      toast.success(t('removed_from_favorites'));
    } else {
      favs.push(page.id);
      toast.success(t('added_to_favorites'));
    }
    
    localStorage.setItem('pmis_favorites', JSON.stringify(favs));
    setFavorites(favs);
    setIsFavorite(favs.includes(page.id));
    window.dispatchEvent(new Event('storage'));
  };
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
    const isPOPage = ['4.2.3', '4.2.4', '4.2.5', '4.2.6', '3.4.3', '3.4.4'].includes(p.id);
    const isTasksPage = p.id === '3.6.3';
    const isMeetingsPage = p.id === '3.6.4';
    const isBOQPage = p.id === '2.4.1';
    const isWBSPage = p.id === '2.2.5';
    const isWorkPackagesPage = p.id === '2.2.7';
    const isEVMPage = p.id === '4.2.2';
    const isProgressReportPage = p.id === '3.3.3';
    const isSchedulePage = p.id === '2.3';
    const isAssumptionLogPage = ['1.1.3', '2.1.5', '2.2.1'].includes(p.id);
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
    const isDesignHubPage = p.id === 'design_hub';

    if (p.id === '1.1.1') return <ProjectCharterView page={p} />;
    if (p.id === '1.1.2') return <BusinessCaseView page={p} />;
    if (isTasksPage) return <TasksView />;
    if (isMeetingsPage) return <DetailView page={pages.find(p => p.id === '3.6.4')!} />;
    if (isPOPage) return <POTracker page={p} />;
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
    if (p.id === '2.1.1') return <GovernancePoliciesView page={p} />;
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
    if (isDesignHubPage) return <DesignHubView page={p} />;
    
    // Resource specific terminal views
    if (p.id === 'contacts') return <ContactsView />;
    if (p.id === 'companies') return <CompaniesView />;
    if (p.id === '2.1.10') return <ResourceManagementPlanView page={p} />;
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
    <div className="w-full flex flex-col h-full bg-app-bg transition-colors duration-300">
      {/* ── Office-Style Ribbon ── */}
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={handleTabChange}
        focusAreaColors={focusAreaColors}
      />

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="w-full h-full"
          >
            {activeTab === 'overview' ? (
              <div className="p-10 space-y-12">
                {/* Domain Header Card */}
                <div className="bg-white dark:bg-surface p-12 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden flex items-center justify-between border-b-8 border-app-bg">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-32 -mt-32" />
                   <div className="relative z-10 flex items-center gap-10">
                       <div className="w-24 h-24 rounded-[3rem] bg-text-primary dark:bg-brand-dark flex items-center justify-center text-white shadow-2xl">
                           <Icon className="w-12 h-12" strokeWidth={1} />
                       </div>
                      <div className="space-y-1">
                         <div className="flex items-center gap-4">
                           <h1 className="text-2xl md:text-3xl font-black text-text-primary dark:text-white tracking-tight italic uppercase">{stripNumericPrefix(t(domainKey))} {t('overview')}</h1>
                           <button 
                             onClick={toggleFavorite}
                             className={cn(
                               "p-3 rounded-2xl transition-all shadow-sm border",
                               isFavorite ? "bg-amber-50 border-amber-200 text-amber-500" : "bg-white dark:bg-neutral-800 border-slate-100 text-slate-300 hover:text-slate-400"
                             )}
                           >
                             <Star className={cn("w-5 h-5", isFavorite && "fill-amber-500")} />
                           </button>
                         </div>
                         <p className="text-sm font-black text-text-secondary dark:text-neutral-400 uppercase tracking-[0.2em] leading-none opacity-60">
                           {t('project_context')}: {selectedProject?.name} • {t('active_processes')}: {filteredChildren.length}
                         </p>
                      </div>
                   </div>
                   <div className="relative z-10 flex items-center gap-3">
                      <div className="px-6 py-2.5 bg-brand text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 italic">
                         {t('enterprise_standard')}
                      </div>
                   </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                   <div className="bg-white dark:bg-surface p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 border-b-4">
                      <div className="flex items-center gap-3 text-text-secondary opacity-40">
                         <Activity className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{t('status')}</span>
                      </div>
                      <div className="text-3xl font-black text-text-primary dark:text-white uppercase italic tracking-tighter">{t('healthy')}</div>
                      <div className="h-2 w-full bg-app-bg rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-[94%]" />
                      </div>
                   </div>
                   
                   <div className="bg-white dark:bg-surface p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 border-b-4">
                      <div className="flex items-center gap-3 text-text-secondary opacity-40">
                         <CheckCircle2 className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{t('compliance')}</span>
                      </div>
                      <div className="text-3xl font-black text-text-primary dark:text-white italic tracking-tighter">98.2%</div>
                      <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">↑ 2.1% {t('this_month')}</div>
                   </div>

                    <div className="col-span-2 bg-text-primary dark:bg-brand-dark p-10 rounded-[3rem] shadow-xl relative overflow-hidden border-b-4 border-brand">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      <div className="relative z-10 flex items-center justify-between h-full">
                         <div className="space-y-3">
                            <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{t('domain_kpi_index')}</h4>
                            <div className="text-5xl font-black text-white tracking-tighter italic">A+ <span className="text-[10px] font-black opacity-40 not-italic ml-4 uppercase tracking-widest">{t('standard_compliance')}</span></div>
                         </div>
                         <div className="w-40 h-20 opacity-80">
                            {getChartData()}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Focus Areas Visualization */}
                <div className="space-y-8">
                   <div className="flex items-center justify-between px-4">
                      <h3 className="text-xs font-black text-text-primary dark:text-white uppercase tracking-[0.4em]">{t('process_lifecycle')}</h3>
                      <div className="flex gap-6">
                         {areas.map(area => (
                           <div key={area} className="flex items-center gap-2.5">
                              <div className={cn("w-2.5 h-2.5 rounded-full", focusAreaColors[area])} />
                              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest opacity-60">{t(area)}</span>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                      {areas.map(area => {
                        const areaChildren = filteredChildren.filter(c => c.focusArea?.includes(area));
                        return (
                          <div key={area} className="bg-white/40 rounded-[3rem] p-8 space-y-6 border border-white/60 backdrop-blur-sm shadow-inner">
                             <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">{t(area)}</span>
                                <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow-lg", focusAreaColors[area])}>
                                   {areaChildren.length}
                                </span>
                             </div>
                             <div className="space-y-3">
                                {areaChildren.map(child => (
                                  <button 
                                    key={child.id}
                                    onClick={() => handleTabChange(child.id)}
                                    className="w-full p-5 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-[1.5rem] text-[11px] font-black text-text-primary dark:text-neutral-300 text-left hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 hover:-translate-y-1 transition-all flex items-center justify-between group border-b-4 hover:border-brand"
                                  >
                                     <span className="truncate pr-4 italic uppercase tracking-tighter">{stripNumericPrefix(t(child.id)) || child.title}</span>
                                     <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-brand transition-all group-hover:translate-x-1" />
                                  </button>
                                ))}
                                {areaChildren.length === 0 && (
                                  <div className="p-6 border-2 border-dashed border-slate-100 rounded-[1.5rem] text-[9px] font-black text-slate-200 text-center uppercase tracking-widest">
                                     {t('no_processes')}
                                  </div>
                                )}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>
            ) : activeTab === 'favorites' ? (
              <div className="p-8 space-y-8 h-full bg-neutral-50">
                <div className="bg-white p-10 rounded-[3rem] border border-neutral-200 shadow-sm relative overflow-hidden flex items-center justify-between">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -mr-20 -mt-20" />
                   <div className="relative z-10 flex items-center gap-8">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-amber-500 flex items-center justify-center text-white shadow-2xl shadow-amber-200">
                         <Star className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                         <h1 className="text-4xl font-bold text-neutral-900 tracking-tighter uppercase">{t('favorites')}</h1>
                         <p className="text-sm font-semibold text-neutral-400 uppercase tracking-widest leading-loose">
                           {t('quick_access_favorites')}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {pages.filter(p => favorites.includes(p.id)).map((p, idx) => (
                     <motion.button 
                       key={p.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: idx * 0.1 }}
                       onClick={() => handleTabChange(p.id)}
                       className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left space-y-4 group h-[180px] flex flex-col justify-between"
                     >
                        <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                           {React.createElement(ICON_MAP[p.icon || 'FileText'] || FileText, { className: "w-7 h-7 text-neutral-400 group-hover:text-blue-500" })}
                        </div>
                        <div className="space-y-1">
                           <h3 className="font-bold text-neutral-900 text-lg tracking-tight">{stripNumericPrefix(th(p.id)) || p.title}</h3>
                           <p className="text-xs text-neutral-400 line-clamp-2">{th(p.id + '_summary') || p.summary}</p>
                        </div>
                     </motion.button>
                   ))}
                   {favorites.length === 0 && (
                     <div className="col-span-full py-20 text-center space-y-4">
                        <Star className="w-12 h-12 text-neutral-200 mx-auto" />
                        <p className="text-neutral-400 font-medium">{t('no_favorites')}</p>
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-app-bg h-full relative z-10">
                {(() => {
                  const p = filteredChildren.find(c => c.id === activeTab);
                  return p ? renderPageContent(p) : <DetailView page={pages.find(pg => pg.id === activeTab) || page} />;
                })()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

