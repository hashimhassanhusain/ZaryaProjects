import React, { useState } from 'react';
import { 
  Users, 
  LayoutGrid, 
  Target, 
  MessageSquare, 
  Activity, 
  TrendingUp,
  ChevronRight,
  Settings
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';
import { useLanguage } from '../context/LanguageContext';

// Sub-views
import { StakeholderMatrixView } from './StakeholderMatrixView';
import { StakeholderRegisterView } from './StakeholderRegisterView';
import { StakeholderEngagementView } from './StakeholderEngagementView';
import { CommunicationsPlanView } from './CommunicationsPlanView';

import { DomainDashboard } from './DomainDashboard';

interface StakeholdersHubViewProps {
  page: Page;
}

type TabType = 'overview' | 'analysis' | 'register' | 'engagement' | 'comms' | 'sentiment' | 'nps';

export const StakeholdersHubView: React.FC<StakeholdersHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  
  // Initialize tab based on page.id
  const getInitialTab = (): TabType => {
    if (page.id === '1.5.1' || page.id === '2.5.1' || page.id === '3.5.1' || page.id === '4.5.1') return 'register';
    if (page.id === '1.2.5' || page.id === '2.5.2') return 'analysis';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'domain-overview',
      label: t('navigation'),
      tabs: [
        { id: 'overview', label: t('overview'), icon: LayoutGrid, size: 'large' },
      ]
    },
    {
      id: 'strategy',
      label: t('engagement_planning'),
      tabs: [
        { id: 'engagement', label: t('engagement_strategy'), icon: Target },
        { id: 'comms', label: t('communications_plan'), icon: MessageSquare },
      ]
    },
    {
      id: 'monitoring',
      label: t('relationship_monitoring'),
      tabs: [
        { id: 'sentiment', label: t('sentiment_monitor'), icon: Activity },
        { id: 'nps', label: t('satisfaction_trends'), icon: TrendingUp },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <DomainDashboard page={page} childrenPages={pages.filter(p => p.domain === 'stakeholders' && p.id !== page.id && p.id !== '1.5.1' && p.id !== '1.5.2')} initialTab="overview" />;
      case 'analysis': return <StakeholderMatrixView page={page} embedded={true} />;
      case 'register': return <StakeholderRegisterView page={page} embedded={true} />;
      case 'engagement': return <StakeholderEngagementView page={page} />;
      case 'comms': return <CommunicationsPlanView page={page} />;
      case 'sentiment': return <StakeholderEngagementView page={page} defaultTab="sentiment" />;
      case 'nps': return <StakeholderEngagementView page={page} defaultTab="nps" />;
      default: return <StakeholderMatrixView page={page} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#fcfcfc]">
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5", isRtl && "flex-row-reverse")}>
             <span>{stripNumericPrefix(t(page.domain || 'stakeholders'))}</span>
             <ChevronRight className={cn("w-2.5 h-2.5", isRtl && "rotate-180")} />
             <span className="text-slate-900">{stripNumericPrefix(t(page.focusArea))}</span>
             {activeTab !== 'overview' && (
               <>
                 <ChevronRight className={cn("w-2.5 h-2.5", isRtl && "rotate-180")} />
                 <span className="text-blue-600">{stripNumericPrefix(t(activeTab))}</span>
               </>
             )}
          </div>
          <h1 className={cn("text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase italic", isRtl && "flex-row-reverse")}>
            {activeTab === 'overview' ? (
              <>
                {parentPage && (
                  <>
                    <span className="text-slate-400 font-medium text-lg md:text-xl">{stripNumericPrefix(t(parentPage.id) || parentPage.title)}</span>
                    <ChevronRight className={cn("w-4 h-4 text-slate-300 stroke-[3]", isRtl && "rotate-180")} />
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
            className="p-8"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
