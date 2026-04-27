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

interface StakeholdersHubViewProps {
  page: Page;
}

type TabType = 'analysis' | 'register' | 'engagement' | 'comms' | 'sentiment' | 'nps';

export const StakeholdersHubView: React.FC<StakeholdersHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'identification',
      label: t('identification_priority'),
      tabs: [
        { id: 'analysis', label: t('power_interest_matrix'), icon: LayoutGrid },
        { id: 'register', label: t('stakeholder_register'), icon: Users },
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
      case 'analysis': return <StakeholderMatrixView page={page} />;
      case 'register': return <StakeholderRegisterView page={page} />;
      case 'engagement': return <StakeholderEngagementView page={page} />;
      case 'comms': return <CommunicationsPlanView page={page} />;
      case 'sentiment': return <StakeholderEngagementView page={page} defaultTab="sentiment" />;
      case 'nps': return <StakeholderEngagementView page={page} defaultTab="nps" />;
      default: return <StakeholderMatrixView page={page} />;
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
