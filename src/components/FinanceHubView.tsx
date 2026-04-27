import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import {
  Calculator,
  FileText,
  ShieldCheck,
  TrendingUp,
  Package,
  Banknote,
  LayoutGrid,
  ChevronRight,
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

// Map page IDs to tab IDs and vice versa
const PAGE_TO_TAB: Record<string, string> = {
  '1.4.1': 'feasibility',
  '2.4.1': 'budget',
  '2.4.2': 'plan',
  '2.4.3': 'reserves',
  '2.4.4': 'reserves',
  '4.2.2': 'evm',
  '4.4.1': 'evm',
  '4.4.2': 'evm',
  '4.2.6': 'pos',
  '5.2.1': 'closing',
  '5.4.1': 'closing',
  'fin':   'overview',
};

export const FinanceHubView: React.FC<FinanceHubViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getPath } = useProject();

  const derivedTab = PAGE_TO_TAB[page.id] || 'overview';
  const [activeTab, setActiveTab] = useState<string>(derivedTab);

  useEffect(() => {
    setActiveTab(PAGE_TO_TAB[page.id] || 'overview');
  }, [page.id]);

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'domain-overview',
      label: t('navigation'),
      tabs: [
        {
          id: 'overview',
          label: t('finance'),
          icon: Banknote,
          description: t('domain_overview_desc'),
          size: 'large',
        },
      ],
    },
    {
      id: 'planning',
      label: t('Planning'),
      tabs: [
        { id: 'feasibility', label: t('feasibility'), icon: Calculator,   size: 'small', focusArea: 'Planning' },
        { id: 'plan',        label: t('plan'),        icon: FileText,     size: 'small', focusArea: 'Planning' },
        { id: 'budget',      label: t('boq'),         icon: LayoutGrid,   size: 'large', focusArea: 'Planning' },
        { id: 'reserves',    label: t('reserves'),    icon: ShieldCheck,  size: 'small', focusArea: 'Planning' },
      ],
    },
    {
      id: 'execution',
      label: t('Executing'),
      tabs: [
        { id: 'evm', label: t('evm'), icon: TrendingUp, size: 'large', focusArea: 'Executing' },
        { id: 'pos', label: t('pos'), icon: Package,    size: 'large', focusArea: 'Executing' },
      ],
    },
    {
      id: 'closing',
      label: t('Closing'),
      tabs: [
        { id: 'closing', label: t('closing'), icon: Banknote, size: 'small', focusArea: 'Closing' },
      ],
    },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    const destinations: Record<string, string> = {
      overview:    'fin',
      feasibility: '1.4.1',
      plan:        '2.4.2',
      budget:      '2.4.1',
      reserves:    '2.4.3',
      evm:         '4.2.2',
      pos:         '4.2.6',
      closing:     '5.4.1',
    };
    const dest = destinations[id];
    if (dest) navigate(getPath('finance', dest));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':    return <DomainDashboard page={page} childrenPages={pages.filter(p => p.domain === 'finance')} initialTab="overview" showRibbon={false} />;
      case 'feasibility': return <FinancialFeasibilityView page={page} />;
      case 'plan':        return <CostManagementPlanView page={page} />;
      case 'budget':      return <BOQView />;
      case 'reserves':    return <ReserveAnalysisView page={page} />;
      case 'evm':         return <EVMReportView page={page} />;
      case 'pos':         return <ZaryaPOTracker page={page} />;
      case 'closing':     return <FinancialCloseOutView page={page} />;
      default:            return <EVMReportView page={page} />;
    }
  };

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#fcfcfc]">
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
            <span>{stripNumericPrefix(t(page.domain || 'finance'))}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">{t(page.focusArea)}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            {parentPage && (
              <>
                <span className="text-slate-400 font-medium">{stripNumericPrefix(t(parentPage.id) || parentPage.title)}</span>
                <ChevronRight className="w-5 h-5 text-slate-300 stroke-[3]" />
              </>
            )}
            {stripNumericPrefix(t(page.id) || page.title)}
          </h1>
        </div>
      </div>

      <Ribbon
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={handleTabChange}
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
