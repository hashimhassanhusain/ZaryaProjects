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
      label: 'Identification & Priority',
      tabs: [
        { id: 'analysis', label: 'Power/Interest Matrix', icon: LayoutGrid },
        { id: 'register', label: 'Stakeholder Register', icon: Users },
      ]
    },
    {
      id: 'strategy',
      label: 'Engagement & Planning',
      tabs: [
        { id: 'engagement', label: 'Engagement Strategy', icon: Target },
        { id: 'comms', label: 'Communications Plan', icon: MessageSquare },
      ]
    },
    {
      id: 'monitoring',
      label: 'Relationship Monitoring',
      tabs: [
        { id: 'sentiment', label: 'Sentiment Monitor', icon: Activity },
        { id: 'nps', label: 'Satisfaction Trends', icon: TrendingUp },
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
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#fcfcfc]">
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1", isRtl && "flex-row-reverse")}>
             <span>{page.domain}</span>
             <ChevronRight className={cn("w-3 h-3", isRtl && "rotate-180")} />
             <span className="text-slate-900">{page.focusArea}</span>
          </div>
          <h1 className={cn("text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2", isRtl && "flex-row-reverse")}>
            {parentPage && (
              <>
                <span className="text-slate-400 font-medium">{stripNumericPrefix(parentPage.title)}</span>
                <ChevronRight className={cn("w-5 h-5 text-slate-300 stroke-[3]", isRtl && "rotate-180")} />
              </>
            )}
            {stripNumericPrefix(page.title)}
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
