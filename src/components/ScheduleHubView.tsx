import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, 
  ChevronRight,
  Flag,
  LayoutGrid,
  Settings
} from 'lucide-react';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectScheduleView } from './ProjectScheduleView';
import { ScheduleManagementPlanView } from './ScheduleManagementPlanView';

import { Ribbon, RibbonGroup } from './Ribbon';

interface ScheduleHubViewProps {
  page: Page;
}

type TabType = 'plan' | 'gantt' | 'milestones' | 'activities';

export const ScheduleHubView: React.FC<ScheduleHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('gantt');

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'execution',
      label: t('execution'),
      tabs: [
        { id: 'gantt', label: t('view_gantt'), icon: Calendar },
        { id: 'activities', label: t('view_activities'), icon: LayoutGrid },
        { id: 'milestones', label: t('view_milestones'), icon: Flag },
      ]
    },
    {
      id: 'config',
      label: t('configuration'),
      tabs: [
        { id: 'plan', label: t('setup_plan'), icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#fcfcfc]">
      {/* Ribbon Navigation */}
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
      />

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
