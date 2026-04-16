import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, 
  FileText,
  ChevronRight
} from 'lucide-react';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectScheduleView } from './ProjectScheduleView';
import { ScheduleManagementPlanView } from './ScheduleManagementPlanView';

interface ScheduleHubViewProps {
  page: Page;
}

type TabType = 'schedule' | 'plan';

export const ScheduleHubView: React.FC<ScheduleHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  const tabs = [
    { id: 'schedule', label: t('project_schedule'), icon: Calendar, color: 'blue' },
    { id: 'plan', label: t('schedule_management_plan'), icon: FileText, color: 'purple' },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Navigation Tabs */}
      <div className="px-6">
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
                  layoutId="activeTabSchedule"
                  className="absolute inset-0 bg-slate-900 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[600px]"
      >
        {activeTab === 'schedule' && <ProjectScheduleView page={page} />}
        {activeTab === 'plan' && (
          <div className="px-6">
            <ScheduleManagementPlanView page={page} />
          </div>
        )}
      </motion.div>
    </div>
  );
};
