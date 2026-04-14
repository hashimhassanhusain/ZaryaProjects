import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
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
import { VendorMasterRegister } from './VendorMasterRegister';
import { DetailView } from './DetailView';
import { pages, getFocusArea } from '../data';

interface ResourceOptimizationHubProps {
  page: Page;
}

type TabType = 
  | 'resource-plan' 
  | 'resource-structure' 
  | 'responsibility-matrix' 
  | 'job-descriptions' 
  | 'vendor-evaluation' 
  | 'inventory-3m'
  | 'optimization'
  | 'team-directory'
  | 'operating-agreement'
  | 'performance'
  | 'tasks'
  | 'meetings'
  | 'progress';

export const ResourceOptimizationHub: React.FC<ResourceOptimizationHubProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const projectId = selectedProject?.id || '';
  const [activeTab, setActiveTab] = useState<TabType>('resource-plan');

  const tabs = [
    { id: 'resource-plan', label: t('resource_plan'), icon: Users, color: 'blue' },
    { id: 'resource-structure', label: t('resource_structure'), icon: Layers, color: 'purple' },
    { id: 'responsibility-matrix', label: t('responsibility_matrix'), icon: Grid3X3, color: 'amber' },
    { id: 'job-descriptions', label: t('job_descriptions'), icon: Briefcase, color: 'slate' },
    { id: 'vendor-evaluation', label: t('vendor_evaluation'), icon: Target, color: 'emerald' },
    { id: 'inventory-3m', label: t('inventory_3m'), icon: Package, color: 'orange' },
    { id: 'optimization', label: t('optimization'), icon: Zap, color: 'rose' },
    { id: 'team-directory', label: t('team_directory'), icon: Users2, color: 'indigo' },
    { id: 'operating-agreement', label: t('operating_agreement'), icon: FileText, color: 'cyan' },
    { id: 'performance', label: t('performance_assessment'), icon: BarChart3, color: 'violet' },
    { id: 'tasks', label: t('task_management'), icon: LayoutDashboard, color: 'sky' },
    { id: 'meetings', label: t('meeting_management'), icon: Calendar, color: 'pink' },
    { id: 'progress', label: t('progress_reports'), icon: FileText, color: 'teal' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer transition-colors">{t('finance')}</span>
          <ChevronRight className={cn("w-3 h-3", isRtl && "rotate-180")} />
          <span className="text-slate-900">{t('resource_optimization_hub')}</span>
        </nav>

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
          {activeTab === 'resource-plan' && <ResourceRequirementsTab projectId={projectId} />}
          {activeTab === 'resource-structure' && <RBSTab projectId={projectId} />}
          {activeTab === 'responsibility-matrix' && <RAMTab projectId={projectId} />}
          {activeTab === 'job-descriptions' && <RolesResponsibilitiesTab projectId={projectId} />}
          {activeTab === 'vendor-evaluation' && <SelectionCriteriaTab projectId={projectId} />}
          {activeTab === 'inventory-3m' && <VendorMasterRegister page={pages.find(p => p.id === '3.3.4')!} />}
          {activeTab === 'optimization' && <ProcessImprovementTab projectId={projectId} />}
          {activeTab === 'team-directory' && <TeamDirectoryTab projectId={projectId} />}
          {activeTab === 'operating-agreement' && <TeamGovernanceTab projectId={projectId} />}
          {activeTab === 'performance' && <PerformanceStatusTab projectId={projectId} />}
          {activeTab === 'tasks' && <TasksView page={pages.find(p => p.id === '2.6.21')!} />}
          {activeTab === 'meetings' && <DetailView page={pages.find(p => p.id === '2.6.22')!} />}
          {activeTab === 'progress' && <ProgressReportView page={pages.find(p => p.id === '3.3.3')!} />}
        </motion.div>
      </div>
    </div>
  );
};
