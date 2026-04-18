import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { 
  Users, 
  Shield, 
  BarChart3, 
  Lightbulb,
  ChevronRight,
  LayoutDashboard,
  Users2,
  Layers,
  Grid3X3,
  Briefcase,
  Target,
  Zap,
  Package,
  FileText,
  Calendar
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
import { HumanResourceManagementPlanView } from './HumanResourceManagementPlanView';
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

export const ResourceOptimizationHub: React.FC<ResourceOptimizationHubProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const projectId = selectedProject?.id || '';
  
  const allTabs = [
    // PLAN
    { id: 'hrmp', pageId: '2.1.10', label: t('hrmp'), icon: Briefcase, color: 'slate' },
    { id: 'resource-plan', pageId: '2.6.1', label: t('resource_plan'), icon: Layers, color: 'blue' },
    { id: 'resource-structure', pageId: '2.6.4', label: t('resource_structure'), icon: Layers, color: 'purple' },
    { id: 'responsibility-matrix', pageId: '2.6.5', label: t('responsibility_matrix'), icon: Grid3X3, color: 'amber' },
    { id: 'job-descriptions', pageId: '2.6.6', label: t('job_descriptions'), icon: Briefcase, color: 'slate' },
    { id: 'vendor-evaluation', pageId: '2.6.7', label: t('vendor_evaluation'), icon: Target, color: 'emerald' },
    { id: 'operating-agreement', pageId: '3.3.5', label: t('operating_agreement'), icon: FileText, color: 'cyan' },
    
    // EXECUTE
    { id: 'contacts', pageId: 'contacts', label: t('contacts'), icon: Users, color: 'blue' },
    { id: 'companies', pageId: 'companies', label: t('companies'), icon: Users2, color: 'indigo' },
    { id: 'team-directory', pageId: '3.3.1', label: t('team_directory'), icon: Users2, color: 'indigo' },
    { id: 'tasks', pageId: '2.6.21', label: t('task_management'), icon: LayoutDashboard, color: 'sky' },
    { id: 'meetings', pageId: '2.6.22', label: t('meeting_management'), icon: Calendar, color: 'pink' },
    { id: 'inventory-3m', pageId: '3.3.4', label: t('inventory_3m'), icon: Package, color: 'orange' },
    { id: 'optimization', pageId: '3m_resources', label: t('optimization'), icon: Zap, color: 'rose' },
    
    // MONITOR
    { id: 'performance', pageId: '3.3.2', label: t('performance_assessment'), icon: BarChart3, color: 'violet' },
    { id: 'progress', pageId: '3.3.3', label: t('progress_reports'), icon: FileText, color: 'teal' },
  ];

  const tabs = allTabs.filter(tab => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(tab.pageId);
  });

  const [activeTab, setActiveTab] = useState<TabType>(
    (tabs.length > 0 ? tabs[0].id : 'hrmp') as TabType
  );

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id as TabType);
    }
  }, [tabs, activeTab]);

  return (
    <div className="w-full space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm w-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-3 px-6 py-3.5 rounded-[1.25rem] text-sm font-bold transition-all relative overflow-hidden group whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn(
                "w-4 h-4 transition-colors",
                activeTab === tab.id ? "text-white" : `text-${tab.color}-500`
              )} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-slate-900 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
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
          {activeTab === 'hrmp' && <HumanResourceManagementPlanView page={pages.find(p => p.id === '2.1.10')!} />}
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
  );
};
