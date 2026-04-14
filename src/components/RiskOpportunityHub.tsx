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
  Grid
} from 'lucide-react';
import { Page, RiskEntry, ProjectIssue, RiskAuditEntry, Stakeholder, PurchaseOrder, Activity as ProjectActivity } from '../types';
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

interface RiskOpportunityHubProps {
  page: Page;
}

type RiskSubTab = 'register' | 'assessment' | 'sheets' | 'issues' | 'audit';

export const RiskOpportunityHub: React.FC<RiskOpportunityHubProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<RiskSubTab>('register');
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [audits, setAudits] = useState<RiskAuditEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
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

    setLoading(false);

    return () => {
      risksUnsub();
      issuesUnsub();
      auditsUnsub();
      stakeholdersUnsub();
    };
  }, [selectedProject?.id]);

  const tabs = [
    { id: 'register', title: t('risk_register'), icon: ShieldAlert },
    { id: 'assessment', title: t('risk_assessment'), icon: Grid },
    { id: 'sheets', title: t('detailed_risk_sheets'), icon: FileText },
    { id: 'issues', title: t('issue_log'), icon: AlertTriangle },
    { id: 'audit', title: t('risk_audit'), icon: ClipboardList }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{t('loading_risk_hub')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sub-Navigation */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-2 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as RiskSubTab)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-red-600 text-white shadow-lg shadow-red-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : "text-slate-400")} />
            {tab.title}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'register' && (
            <RiskRegisterTab 
              risks={risks} 
              stakeholders={stakeholders} 
              projectId={selectedProject?.id || ''} 
            />
          )}
          {activeTab === 'assessment' && (
            <RiskAssessmentTab 
              risks={risks} 
              projectId={selectedProject?.id || ''} 
            />
          )}
          {activeTab === 'sheets' && (
            <RiskDataSheetTab 
              risks={risks} 
              stakeholders={stakeholders}
              projectId={selectedProject?.id || ''} 
            />
          )}
          {activeTab === 'issues' && (
            <IssueLogTab 
              issues={issues} 
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
  );
};
