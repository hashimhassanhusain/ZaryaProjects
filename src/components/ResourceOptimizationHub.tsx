import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { 
  Users, 
  BarChart3, 
  ChevronRight,
  Layers,
  Target,
  Zap,
  Package,
  FileText,
  Clock,
  Activity,
  User,
  Users2,
  GitBranch,
  ShieldCheck,
  Grid,
  ListChecks,
  Building2,
  CheckSquare
} from 'lucide-react';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TeamDirectoryTab } from './resource/TeamDirectoryTab';
import { TeamGovernanceTab } from './resource/TeamGovernanceTab';
import { PerformanceStatusTab } from './resource/PerformanceStatusTab';
import { LessonsLearnedView } from './LessonsLearnedView';
import { ResourceRequirementsTab } from './resource/ResourceRequirementsTab';
import { RBSTab } from './resource/RBSTab';
import { RAMTab } from './resource/RAMTab';
import { RolesResponsibilitiesTab } from './resource/RolesResponsibilitiesTab';
import { SelectionCriteriaTab } from './resource/SelectionCriteriaTab';
import { ProcessImprovementTab } from './resource/ProcessImprovementTab';
import { ResourcesView } from './ResourcesView';
import { TasksView } from './TasksView';
import { ProgressReportView } from './ProgressReportView';
import { SupplierMasterRegister } from './SupplierMasterRegister';
import { DetailView } from './DetailView';
import { ContactsView } from './ContactsView';
import { CompaniesView } from './CompaniesView';
import { ResourceManagementPlanView } from './ResourceManagementPlanView';
import { pages } from '../data';

interface ResourceOptimizationHubProps {
  page: Page;
}

type TabType = 
  | 'contacts'
  | 'companies'
  | 'team-directory'
  | 'hrmp'
  | 'resource-plan' 
  | 'resource-structure' 
  | 'responsibility-matrix' 
  | 'job-descriptions' 
  | 'vendor-evaluation' 
  | 'tasks'
  | 'meetings'
  | 'operating-agreement'
  | 'inventory-3m'
  | 'optimization'
  | 'performance'
  | 'progress';

import { Ribbon, RibbonGroup } from './Ribbon';

export const ResourceOptimizationHub: React.FC<ResourceOptimizationHubProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const projectId = selectedProject?.id || '';
  
  const allTabs = [
    // PLANNING
    { id: 'hrmp', pageId: '2.1.10', label: t('hr_plan'), icon: FileText, group: 'planning' },
    { id: 'resource-plan', pageId: '2.6.1', label: t('plan'), icon: Layers, group: 'planning' },
    { id: 'resource-structure', pageId: '2.6.4', label: t('wbs_r'), icon: GitBranch, group: 'planning' },
    { id: 'responsibility-matrix', pageId: '2.6.5', label: t('ram'), icon: Grid, group: 'planning' },
    { id: 'job-descriptions', pageId: '2.6.6', label: t('jds'), icon: ListChecks, group: 'planning' },
    
    // EVALUATION
    { id: 'vendor-evaluation', pageId: '2.6.7', label: t('eval'), icon: Target, group: 'evaluation' },
    { id: 'operating-agreement', pageId: '3.3.5', label: t('rules'), icon: ShieldCheck, group: 'evaluation' },
    
    // STAFFING
    { id: 'contacts', pageId: 'contacts', label: t('team'), icon: Users, group: 'staffing' },
    { id: 'companies', pageId: 'companies', label: t('orgs'), icon: Building2, group: 'staffing' },
    { id: 'team-directory', pageId: '3.3.1', label: t('staff'), icon: User, group: 'staffing' },
    { id: 'tasks', pageId: '2.6.21', label: t('tasks'), icon: CheckSquare, group: 'staffing' },
    { id: 'meetings', pageId: '2.6.22', label: t('meetings'), icon: Clock, group: 'staffing' },
    
    // ASSETS
    { id: 'inventory-3m', pageId: '3.3.4', label: t('inventory'), icon: Package, group: 'assets' },
    { id: 'optimization', pageId: '3m_resources', label: t('optimization'), icon: Zap, group: 'assets' },
    
    // ANALYTICS
    { id: 'performance', pageId: '3.3.2', label: t('performance'), icon: Activity, group: 'analytics' },
    { id: 'progress', pageId: '3.3.3', label: t('status'), icon: BarChart3, group: 'analytics' },
  ];

  const filteredTabs = allTabs.filter(tab => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(tab.pageId);
  });

  const [activeTab, setActiveTab] = useState<TabType>(
    (filteredTabs.length > 0 ? filteredTabs[0].id : 'hrmp') as TabType
  );

  const ribbonGroups: RibbonGroup[] = [
    { id: 'planning', label: t('planning'), tabs: filteredTabs.filter(t => t.group === 'planning').map(t => ({ id: t.id, label: t.label, icon: t.icon })) },
    { id: 'evaluation', label: t('evaluation'), tabs: filteredTabs.filter(t => t.group === 'evaluation').map(t => ({ id: t.id, label: t.label, icon: t.icon })) },
    { id: 'staffing', label: t('staffing'), tabs: filteredTabs.filter(t => t.group === 'staffing').map(t => ({ id: t.id, label: t.label, icon: t.icon })) },
    { id: 'assets', label: t('assets'), tabs: filteredTabs.filter(t => t.group === 'assets').map(t => ({ id: t.id, label: t.label, icon: t.icon })) },
    { id: 'analytics', label: t('analytics'), tabs: filteredTabs.filter(t => t.group === 'analytics').map(t => ({ id: t.id, label: t.label, icon: t.icon })) },
  ].filter(g => g.tabs.length > 0);

  useEffect(() => {
    if (filteredTabs.length > 0 && !filteredTabs.find(t => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id as TabType);
    }
  }, [filteredTabs, activeTab]);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] overflow-hidden">
        {/* Ribbon Navigation */}
        <Ribbon 
          groups={ribbonGroups}
          activeTabId={activeTab}
          onTabChange={(id) => setActiveTab(id as TabType)}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-[600px]"
        >
          {activeTab === 'contacts' && <ContactsView />}
          {activeTab === 'companies' && <CompaniesView />}
          {activeTab === 'team-directory' && <TeamDirectoryTab projectId={projectId} />}
          {activeTab === 'hrmp' && <ResourceManagementPlanView page={pages.find(p => p.id === '2.1.10')!} />}
          {activeTab === 'resource-plan' && <ResourceRequirementsTab projectId={projectId} />}
          {activeTab === 'resource-structure' && <RBSTab projectId={projectId} />}
          {activeTab === 'responsibility-matrix' && <RAMTab projectId={projectId} />}
          {activeTab === 'job-descriptions' && <RolesResponsibilitiesTab projectId={projectId} />}
          {activeTab === 'vendor-evaluation' && <SelectionCriteriaTab projectId={projectId} />}
          {activeTab === 'tasks' && <TasksView page={pages.find(p => p.id === '2.6.21')!} />}
          {activeTab === 'meetings' && <DetailView page={pages.find(p => p.id === '2.6.22')!} />}
          {activeTab === 'operating-agreement' && <TeamGovernanceTab projectId={projectId} />}
          {activeTab === 'inventory-3m' && <SupplierMasterRegister page={pages.find(p => p.id === '3.3.4')!} />}
          {activeTab === 'optimization' && <ProcessImprovementTab projectId={projectId} />}
          {activeTab === 'performance' && <PerformanceStatusTab projectId={projectId} />}
          {activeTab === 'progress' && <ProgressReportView page={pages.find(p => p.id === '3.3.3')!} />}
        </motion.div>
      </div>
    </div>
  );
};
