import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  FileText, 
  ClipboardList, 
  Activity,
  Plus,
  Search,
  Filter,
  Plus as PlusIcon,
  Download,
  Printer,
  Save,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Shield,
  User,
  Calendar,
  Database,
  Grid,
  LayoutDashboard,
  ListChecks,
  ShieldCheck
} from 'lucide-react';
import { Page, RiskEntry, ProjectIssue, RiskAuditEntry, Stakeholder, User as UserType, PurchaseOrder, Activity as ProjectActivity } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- SUB-COMPONENTS ---
import { RiskRegisterTab } from './risk/RiskRegisterTab';
import { RiskAssessmentTab } from './risk/RiskAssessmentTab';
import { RiskDataSheetTab } from './risk/RiskDataSheetTab';
import { IssueLogTab } from './risk/IssueLogTab';
import { RiskAuditTab } from './risk/RiskAuditTab';
import { RiskDashboardTab } from './risk/RiskDashboardTab';
import { RiskPlanTab } from './risk/RiskPlanTab';
import { RiskMatrixTab } from './risk/RiskMatrixTab';
import { AssumptionConstraintView } from './AssumptionConstraintView';

interface RiskOpportunityHubProps {
  page: Page;
}

type RiskSubTab = 'dashboard' | 'plan' | 'register' | 'assumptions' | 'assessment' | 'matrix' | 'issues' | 'audit';

import { Ribbon, RibbonGroup } from './Ribbon';

export const RiskOpportunityHub: React.FC<RiskOpportunityHubProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const { t, isRtl } = useLanguage();
  
  const allTabs = [
    { id: 'dashboard', pageId: 'risk', title: t('dashboard'), icon: LayoutDashboard, group: 'overview' },
    { id: 'plan', pageId: '2.1.14', title: t('mgmt_plan'), icon: ShieldAlert, group: 'overview' },
    { id: 'register', pageId: '2.7.5', title: t('risk_register'), icon: ListChecks, group: 'tracking' },
    { id: 'assumptions', pageId: '2.1.5', title: t('assumptions'), icon: ClipboardList, group: 'tracking' },
    { id: 'assessment', pageId: '2.7.1', title: t('assessment'), icon: Activity, group: 'analysis' },
    { id: 'matrix', pageId: '2.7.2', title: t('risk_matrix'), icon: Grid, group: 'analysis' },
    { id: 'issues', pageId: '2.7.3', title: t('issue_log'), icon: AlertTriangle, group: 'governance' },
    { id: 'audit', pageId: '4.4.1', title: t('risk_audit'), icon: ShieldCheck, group: 'governance' }
  ];

  const filteredTabs = allTabs.filter(tab => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(tab.pageId);
  });

  const [activeTab, setActiveTab] = useState<RiskSubTab>(
    (filteredTabs.length > 0 ? filteredTabs[0].id : 'dashboard') as RiskSubTab
  );

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'overview',
      label: t('overview'),
      tabs: filteredTabs.filter(t => t.group === 'overview').map(t => ({ id: t.id, label: t.title, icon: t.icon }))
    },
    {
      id: 'tracking',
      label: t('tracking'),
      tabs: filteredTabs.filter(t => t.group === 'tracking').map(t => ({ id: t.id, label: t.title, icon: t.icon }))
    },
    {
      id: 'analysis',
      label: t('analysis'),
      tabs: filteredTabs.filter(t => t.group === 'analysis').map(t => ({ id: t.id, label: t.title, icon: t.icon }))
    },
    {
      id: 'governance',
      label: t('governance'),
      tabs: filteredTabs.filter(t => t.group === 'governance').map(t => ({ id: t.id, label: t.title, icon: t.icon }))
    }
  ].filter(g => g.tabs.length > 0);

  useEffect(() => {
    if (filteredTabs.length > 0 && !filteredTabs.find(t => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id as RiskSubTab);
    }
  }, [filteredTabs, activeTab]);

  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [audits, setAudits] = useState<RiskAuditEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProject) return;

    const risksUnsub = onSnapshot(
      query(collection(db, 'risks'), where('projectId', '==', selectedProject.id)),
      (snap) => setRisks(snap.docs.map(d => ({ id: d.id, ...d.data() } as RiskEntry)))
    );

    const issuesUnsub = onSnapshot(
      query(collection(db, 'issues'), where('projectId', '==', selectedProject.id)),
      (snap) => setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectIssue)))
    );

    const auditsUnsub = onSnapshot(
      query(collection(db, 'risk_audits'), where('projectId', '==', selectedProject.id)),
      (snap) => setAudits(snap.docs.map(d => ({ id: d.id, ...d.data() } as RiskAuditEntry)))
    );

    const stakeholdersUnsub = onSnapshot(
      query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id)),
      (snap) => setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)))
    );

    const usersUnsub = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserType)))
    );

    setLoading(false);

    return () => {
      risksUnsub();
      issuesUnsub();
      auditsUnsub();
      stakeholdersUnsub();
      usersUnsub();
    };
  }, [selectedProject?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{t('loading_risk_hub')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Ribbon Navigation */}
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && (
            <RiskDashboardTab risks={risks} issues={issues} audits={audits} />
          )}
          {activeTab === 'plan' && (
            <RiskPlanTab projectId={selectedProject?.id || ''} />
          )}
          {activeTab === 'register' && (
            <RiskRegisterTab 
              risks={risks} 
              stakeholders={stakeholders} 
              users={users}
              projectId={selectedProject?.id || ''} 
            />
          )}
          {activeTab === 'assumptions' && (
            <AssumptionConstraintView page={{ id: '2.1.5', title: 'Assumption Log', type: 'terminal' }} />
          )}
          {activeTab === 'assessment' && (
            <RiskAssessmentTab 
              risks={risks} 
              projectId={selectedProject?.id || ''} 
            />
          )}
          {activeTab === 'matrix' && (
            <RiskMatrixTab risks={risks} />
          )}
          {activeTab === 'issues' && (
            <IssueLogTab 
              issues={issues} 
              users={users}
              projectId={selectedProject?.id || ''} 
            />
          )}
          {activeTab === 'audit' && (
            <RiskAuditTab 
              audits={audits} 
              projectId={selectedProject?.id || ''} 
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
};
