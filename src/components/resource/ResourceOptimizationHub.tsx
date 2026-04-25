import React, { useState } from 'react';
import { 
  Users, 
  Layers, 
  Grid3X3, 
  Briefcase, 
  Target, 
  Zap,
  ChevronRight
} from 'lucide-react';
import { ResourceRequirementsTab } from './ResourceRequirementsTab';
import { RBSTab } from './RBSTab';
import { RAMTab } from './RAMTab';
import { RolesResponsibilitiesTab } from './RolesResponsibilitiesTab';
import { SelectionCriteriaTab } from './SelectionCriteriaTab';
import { ProcessImprovementTab } from './ProcessImprovementTab';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ResourceOptimizationHubProps {
  projectId: string;
}

type TabType = 'requirements' | 'rbs' | 'ram' | 'roles' | 'selection' | 'improvement';

export const ResourceOptimizationHub: React.FC<ResourceOptimizationHubProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('requirements');

  const tabs = [
    { id: 'requirements', label: 'Resource Requirements', icon: Users, color: 'blue' },
    { id: 'rbs', label: 'RBS Structure', icon: Layers, color: 'purple' },
    { id: 'ram', label: 'RAM / RACI Matrix', icon: Grid3X3, color: 'amber' },
    { id: 'roles', label: 'Roles & Responsibilities', icon: Briefcase, color: 'slate' },
    { id: 'selection', label: 'Selection Criteria', icon: Target, color: 'emerald' },
    { id: 'improvement', label: 'Process Improvement', icon: Zap, color: 'rose' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-[3rem] border border-slate-200 overflow-hidden">
      {/* Sub-navigation */}
      <div className="px-8 pt-8 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-slate-900 rounded-xl">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Resource & Optimization Hub</h1>
          <ChevronRight className="w-5 h-5 text-slate-300" />
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2",
                  isActive 
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                    : "bg-white text-slate-500 border-transparent hover:border-slate-100 hover:bg-slate-50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'requirements' && <ResourceRequirementsTab projectId={projectId} />}
          {activeTab === 'rbs' && <RBSTab projectId={projectId} />}
          {activeTab === 'ram' && <RAMTab projectId={projectId} />}
          {activeTab === 'roles' && <RolesResponsibilitiesTab projectId={projectId} />}
          {activeTab === 'selection' && <SelectionCriteriaTab projectId={projectId} />}
          {activeTab === 'improvement' && <ProcessImprovementTab projectId={projectId} />}
        </motion.div>
      </div>
    </div>
  );
};
