import React, { useState } from 'react';
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

import { DomainDashboard } from './DomainDashboard';
import { SupplierMasterRegister } from './SupplierMasterRegister';

interface ResourcesHubViewProps {
  page: Page;
}

type TabType = 'overview' | 'raci' | 'rbs' | 'acquisition' | 'assignments' | 'utilization' | 'release' | 'plan' | 'suppliers';

export const ResourcesHubView: React.FC<ResourcesHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'domain-overview',
      label: t('navigation'),
      tabs: [
        { id: 'overview', label: t('overview'), icon: Grid, size: 'large' },
      ]
    },
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
        { id: 'assignments', label: t('calendars'), icon: Calendar },
        { id: 'suppliers', label: t('supplier_master'), icon: Users2 },
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
      case 'overview': return <DomainDashboard page={page} childrenPages={pages.filter(p => p.domain === 'resources' && p.id !== page.id && p.id !== '1.6.1' && p.id !== '1.6.2')} initialTab="overview" />;
      case 'raci': return <RACIMatrixView page={page} />;
      case 'utilization': return <ResourceManagerDashboard page={page} />;
      case 'acquisition': return <ResourceAcquisitionView page={page} />;
      case 'suppliers': return <SupplierMasterRegister page={page} />;
      case 'release': return <ResourceReleaseView page={page} />;
      default: return <ResourceManagerDashboard page={page} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-background transition-colors">
      <div className="bg-white dark:bg-surface border-b border-slate-100 dark:border-white/5 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5", isRtl && "flex-row-reverse")}>
             <span>{stripNumericPrefix(t(page.domain || 'resources'))}</span>
             <ChevronRight className={cn("w-2.5 h-2.5", isRtl && "rotate-180")} />
             <span className="text-slate-900 dark:text-white/60">{stripNumericPrefix(t(page.focusArea))}</span>
             {activeTab !== 'overview' && (
               <>
                 <ChevronRight className={cn("w-2.5 h-2.5", isRtl && "rotate-180")} />
                 <span className="text-brand">{stripNumericPrefix(t(activeTab))}</span>
               </>
             )}
          </div>
          <h1 className={cn("text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 uppercase italic", isRtl && "flex-row-reverse")}>
            {activeTab === 'overview' ? (
              <>
                {parentPage && (
                  <>
                    <span className="text-slate-400 dark:text-slate-500 font-medium text-lg md:text-xl">{stripNumericPrefix(t(parentPage.id) || parentPage.title)}</span>
                    <ChevronRight className={cn("w-4 h-4 text-slate-300 dark:text-slate-600 stroke-[3]", isRtl && "rotate-180")} />
                  </>
                )}
                {stripNumericPrefix(t(page.id) || page.title)}
              </>
            ) : (
              stripNumericPrefix(t(activeTab))
            )}
          </h1>
        </div>
      </div>

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
            className="p-6"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
