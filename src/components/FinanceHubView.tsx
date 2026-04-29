import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { 
  Calculator, 
  Settings, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  Package, 
  Banknote,
  ChevronRight,
  Info,
  Plus,
  Database,
  Upload
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
import { UniversalManager } from './common/UniversalManager';

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
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('evm');

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
      id: 'financial-controls',
      label: 'Financial Controls',
      tabs: [
        { id: 'evm', label: 'EVM Dashboard', icon: TrendingUp, size: 'large' },
        { id: 'reserves', label: 'Reserves', icon: ShieldCheck, size: 'small' },
        { id: 'feasibility', label: 'Feasibility', icon: Calculator, size: 'small' },
      ]
    },
    {
      id: 'procurement',
      label: 'Procurement & Contracts',
      tabs: [
        { id: 'pos', label: 'PO Tracker', icon: Package, size: 'large' },
        { id: 'contracts', label: 'Contracts Archive', icon: ShieldCheck, size: 'large' },
        { id: 'new-po', label: 'New PO', icon: Plus, size: 'small' },
        { id: 'new-rfq', label: 'New RFQ', icon: FileText, size: 'small' },
      ]
    },
    {
      id: 'suppliers',
      label: 'Vendors Hub',
      tabs: [
        { id: 'supplier-register', label: 'Supplier Register', icon: Database, size: 'large' },
      ]
    },
    {
      id: 'archive',
      label: 'Archive',
      tabs: [
        { id: 'drive-archive', label: 'Drive Archive', icon: Upload, size: 'large' },
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
      case 'contracts': return <UniversalManager entityType="contracts" />;
      case 'new-po': return <ZaryaPOTracker page={{ ...page, details: { ...page.details, initialView: 'form' } }} />;
      case 'supplier-register': navigate('/page/companies'); return null;
      case 'drive-archive': 
        if (selectedProject?.driveFolderId) {
          window.open(`https://drive.google.com/drive/folders/${selectedProject.driveFolderId}`, '_blank');
        }
        return <div className="p-8 text-center text-slate-500">Opening Google Drive...</div>;
      case 'closing': return <FinancialCloseOutView page={page} />;
      default: return <EVMReportView page={page} />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#fcfcfc]">
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
             <span>{stripNumericPrefix(t(page.domain || 'finance'))}</span>
             <ChevronRight className="w-3 h-3" />
             <span className="text-slate-900">{t(page.focusArea)}</span>
             {activeTab !== 'overview' && (
               <>
                 <ChevronRight className="w-3 h-3" />
                 <span className="text-blue-600">{stripNumericPrefix(t(activeTab))}</span>
               </>
             )}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            {activeTab === 'overview' ? (
              <>
                {parentPage && (
                  <>
                    <span className="text-slate-400 font-medium">{stripNumericPrefix(t(parentPage.id) || parentPage.title)}</span>
                    <ChevronRight className="w-5 h-5 text-slate-300 stroke-[3]" />
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
