import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Grid, 
  Layers, 
  UserPlus, 
  Calendar, 
  Activity, 
  CheckCircle,
  ChevronRight,
  Settings
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';
import { useLanguage } from '../context/LanguageContext';

// Sub-views (Placeholder or to be created)
import { RACIMatrixView } from './RACIMatrixView';
import { ResourceManagerDashboard } from './ResourceManagerDashboard';
import { ResourceAcquisitionView } from './ResourceAcquisitionView';
import { ResourceReleaseView } from './ResourceReleaseView';

interface ResourcesHubViewProps {
  page: Page;
}

type TabType = 'raci' | 'rbs' | 'acquisition' | 'assignments' | 'utilization' | 'release' | 'plan';

export const ResourcesHubView: React.FC<ResourcesHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('utilization');

  useEffect(() => {
    if (page.id === '3.6.1') setActiveTab('acquisition');
    else if (page.id === '2.6.5') setActiveTab('raci');
    else if (page.id === '2.6.4') setActiveTab('rbs');
    else if (page.id === '2.1.10') setActiveTab('plan');
    else if (page.id === '3.3.6' || page.id === '3.3.2') setActiveTab('utilization');
    else if (page.id === '5.3.1' || page.id === '5.6.1') setActiveTab('release');
  }, [page.id]);

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'planning',
      label: t('strategy_structure'),
      tabs: [
        { id: 'plan', label: t('setup_plan'), icon: Settings },
        { id: 'raci', label: t('ram_raci_matrix'), icon: Grid },
        { id: 'rbs', label: t('resource_breakdown_structure_short'), icon: Layers },
      ]
    },
    {
      id: 'execution',
      label: t('acquisition_booking'),
      tabs: [
        { id: 'acquisition', label: t('resource_acquisition'), icon: UserPlus },
        { id: 'assignments', label: t('calendars'), icon: Calendar },
      ]
    },
    {
      id: 'control',
      label: t('performance_release'),
      tabs: [
        { id: 'utilization', label: t('utilization'), icon: Activity },
        { id: 'release', label: t('release_close'), icon: CheckCircle },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'raci': return <RACIMatrixView page={page} />;
      case 'utilization': return <ResourceManagerDashboard page={page} />;
      case 'acquisition': return <ResourceAcquisitionView page={page} />;
      case 'release': return <ResourceReleaseView page={page} />;
      default: return <ResourceManagerDashboard page={page} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#fcfcfc]">
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
