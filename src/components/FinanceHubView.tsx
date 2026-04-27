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
  ChevronRight,
  Info
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';
import { DomainDashboard } from './DomainDashboard';

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

const ICON_MAP: Record<string, any> = {
  'feasibility': Calculator,
  'plan': Settings,
  'budget': FileText,
  'reserves': ShieldCheck,
  'evm': TrendingUp,
  'pos': Package,
  'closing': Banknote,
};

export const FinanceHubView: React.FC<FinanceHubViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'domain-overview',
      label: t('navigation'),
      tabs: [
        { 
          id: 'overview', 
          label: (() => {
            const translated = t(page.domain || 'finance');
            const stripped = stripNumericPrefix(translated);
            if (stripped && stripped.trim() !== '' && stripped !== translated) return stripped;
            return stripNumericPrefix(page.title).replace(/\s*Hub$/i, '').replace(/\s*Domain$/i, '');
          })(),
          icon: Banknote, // Finance Domain Icon
          description: t('domain_overview_desc'),
          size: 'large'
        }
      ]
    },
    {
      id: 'planning',
      label: t('Planning'),
      tabs: [
        { id: 'feasibility', label: t('feasibility'), icon: Calculator, size: 'small', focusArea: 'Planning' },
        { id: 'plan', label: t('plan'), icon: Settings, size: 'small', focusArea: 'Planning' },
        { id: 'budget', label: t('budget'), icon: FileText, size: 'large', focusArea: 'Planning' },
        { id: 'reserves', label: t('reserves'), icon: ShieldCheck, size: 'small', focusArea: 'Planning' },
      ]
    },
    {
      id: 'execution',
      label: t('Executing'),
      tabs: [
        { id: 'evm', label: t('evm'), icon: TrendingUp, size: 'large', focusArea: 'Executing' },
        { id: 'pos', label: t('pos'), icon: Package, size: 'large', focusArea: 'Executing' },
      ]
    },
    {
      id: 'closing',
      label: t('Closing'),
      tabs: [
        { id: 'closing', label: t('closing'), icon: Banknote, size: 'small', focusArea: 'Closing' },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <DomainDashboard page={page} childrenPages={pages.filter(p => p.domain === 'finance')} initialTab="overview" />;
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
    <div className="flex flex-col h-full w-full bg-[#fcfcfc]">
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <span>{stripNumericPrefix(t(page.domain || 'finance'))}</span>
               <ChevronRight className="w-3 h-3" />
               <span className="text-blue-600">{t(page.focusArea)}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {parentPage && (
                <>
                  <span className="text-slate-400 font-medium">{stripNumericPrefix(t(parentPage.id) || parentPage.title)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 stroke-[3]" />
                </>
              )}
              {stripNumericPrefix(t(page.id) || page.title)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest">
              Live Context
            </div>
          </div>
        </div>
      </div>

      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as string)}
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
