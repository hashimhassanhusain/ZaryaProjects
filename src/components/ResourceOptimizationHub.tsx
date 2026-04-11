import React, { useState } from 'react';
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
  Zap
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

interface ResourceOptimizationHubProps {
  page: Page;
}

type TabType = 
  | 'resource-plan' 
  | 'resource-structure' 
  | 'responsibility-matrix' 
  | 'job-descriptions' 
  | 'vendor-evaluation' 
  | 'optimization';

export const ResourceOptimizationHub: React.FC<ResourceOptimizationHubProps> = ({ page }) => {
  const [activeTab, setActiveTab] = useState<TabType>('resource-plan');

  const tabs = [
    { id: 'resource-plan', label: 'Resource Plan', icon: Users, color: 'blue' },
    { id: 'resource-structure', label: 'Resource Structure', icon: Layers, color: 'purple' },
    { id: 'responsibility-matrix', label: 'Responsibility Matrix', icon: Grid3X3, color: 'amber' },
    { id: 'job-descriptions', label: 'Job Descriptions', icon: Briefcase, color: 'slate' },
    { id: 'vendor-evaluation', label: 'Vendor Evaluation', icon: Target, color: 'emerald' },
    { id: 'optimization', label: 'Optimization', icon: Zap, color: 'rose' },
  ];

  const projectId = page.id.split('-')[0] || 'P16314';

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Finance Domain</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">Resources & Optimization Hub</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Resources & Optimization</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl ml-1">
              Comprehensive resource management: requirements, structure, assignments, performance, and knowledge optimization.
            </p>
          </div>
        </header>

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
          {activeTab === 'optimization' && <ProcessImprovementTab projectId={projectId} />}
        </motion.div>
      </div>
    </div>
  );
};
