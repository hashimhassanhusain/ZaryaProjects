import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calculator, 
  Settings, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  Package, 
  Banknote,
  ChevronRight
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';

// Sub-views
import { FinancialFeasibilityView } from './FinancialFeasibilityView';
import { CostManagementPlanView } from './CostManagementPlanView';
import { BOQView } from './BOQView';
import { ReserveAnalysisView } from './ReserveAnalysisView';
import { EVMReportView } from './EVMReportView';
import { ZaryaPOTracker } from './ZaryaPOTracker';
import { FinancialCloseOutView } from './FinancialCloseOutView';

interface FinanceHubViewProps {
  page: Page;
}

type TabType = 'feasibility' | 'plan' | 'budget' | 'reserves' | 'evm' | 'pos' | 'closing';

export const FinanceHubView: React.FC<FinanceHubViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('evm');

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'planning',
      label: 'Financial Planning',
      tabs: [
        { id: 'feasibility', label: 'Feasibility', icon: Calculator },
        { id: 'plan', label: 'Cost Plan', icon: Settings },
        { id: 'budget', label: 'Budgeting (BOQ)', icon: FileText },
        { id: 'reserves', label: 'Reserves', icon: ShieldCheck },
      ]
    },
    {
      id: 'monitoring',
      label: 'Performance Tracking',
      tabs: [
        { id: 'evm', label: 'EVM Dashboard', icon: TrendingUp },
        { id: 'pos', label: 'PO Tracking', icon: Package },
      ]
    },
    {
      id: 'closing',
      label: 'Closure',
      tabs: [
        { id: 'closing', label: 'Final Close-out', icon: Banknote },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'feasibility': return <FinancialFeasibilityView page={page} />;
      case 'plan': return <CostManagementPlanView page={page} />;
      case 'budget': return <BOQView />;
      case 'reserves': return <ReserveAnalysisView page={page} />;
      case 'evm': return <EVMReportView page={page} />;
      case 'pos': return <ZaryaPOTracker page={page} />;
      case 'closing': return <FinancialCloseOutView page={page} />;
      default: return <EVMReportView page={page} />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#fcfcfc]">
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
             <span>{page.domain}</span>
             <ChevronRight className="w-3 h-3" />
             <span className="text-slate-900">{page.focusArea}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {parentPage && (
              <>
                <span className="text-slate-400 font-medium">{stripNumericPrefix(parentPage.title)}</span>
                <ChevronRight className="w-5 h-5 text-slate-300 stroke-[3]" />
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

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-slate-50/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
