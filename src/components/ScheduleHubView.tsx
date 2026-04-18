import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, 
  FileText,
  ChevronRight,
  Target,
  List
} from 'lucide-react';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectScheduleView } from './ProjectScheduleView';
import { ScheduleManagementPlanView } from './ScheduleManagementPlanView';

interface ScheduleHubViewProps {
  page: Page;
}

type TabType = 'plan' | 'gantt' | 'milestones' | 'activities';

export const ScheduleHubView: React.FC<ScheduleHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('gantt');

  const tabs = [
    { id: 'plan', label: t('schedule') || 'Schedule', icon: FileText, color: 'purple' },
    { id: 'gantt', label: t('project_schedule') || 'Project Schedule', icon: Calendar, color: 'blue' },
    { id: 'milestones', label: t('milestones') || 'Milestones', icon: Target, color: 'emerald' },
    { id: 'activities', label: t('activities') || 'Activities', icon: List, color: 'amber' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#fcfcfc]">
      {/* Navigation Tabs */}
      <div className="px-6 py-4 shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative overflow-hidden group whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-300",
                activeTab === tab.id ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
              )}>
                <tab.icon className="w-3.5 h-3.5" />
              </div>
              <span className="uppercase tracking-wider">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabSchedule"
                  className="absolute inset-0 bg-white -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'plan' && (
              <div className="h-full overflow-y-auto px-6 py-6 custom-scrollbar bg-slate-50/30">
                <ScheduleManagementPlanView page={page} />
              </div>
            )}
            {(activeTab === 'gantt' || activeTab === 'milestones' || activeTab === 'activities') && (
              <ProjectScheduleView page={page} initialTab={activeTab as any} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
