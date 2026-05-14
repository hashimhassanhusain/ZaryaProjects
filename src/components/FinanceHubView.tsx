import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { 
  Calculator, 
  TrendingUp, 
  Package, 
  Banknote,
  ShieldCheck,
  Target,
  BookOpen,
  Lock,
  BarChart3,
  List,
  FileText,
  Briefcase,
  ShoppingCart,
  PieChart,
  ArrowRightLeft,
  CheckCircle2,
  Settings,
  Users,
  ClipboardCheck,
  Gavel
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
import { POTracker } from './POTracker';
import { ProcurementWorkflowCenter } from './ProcurementWorkflowCenter';
import { FinancialCloseOutView } from './FinancialCloseOutView';
import { UniversalManager } from './common/UniversalManager';

interface FinanceHubViewProps {
  page: Page;
}

// -------------------------------------------------------------
// Container 1: Estimates Container (📊 التقديرات والكميات)
// -------------------------------------------------------------
const EstimatesContainer: React.FC<{ page: Page }> = ({ page }) => {
  const [subTab, setSubTab] = useState<'boq' | 'estimates'>('boq');

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b border-slate-100 bg-slate-50">
        <button 
          onClick={() => setSubTab('boq')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'boq' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <List className="w-4 h-4 inline-block mr-2" />
          جدول الكميات (BOQ)
        </button>
        <button 
          onClick={() => setSubTab('estimates')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'estimates' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <Calculator className="w-4 h-4 inline-block mr-2" />
          تقديرات التكلفة
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50/20 relative">
        {/* تضمين صفحة BOQ الأصلية بدون تعديل */}
        {subTab === 'boq' && <BOQView />}
        {subTab === 'estimates' && (
          <div className="p-8">
            <h3 className="text-lg font-bold">Cost Estimates & Basis</h3>
            <p className="text-sm text-slate-500 mt-2">
              هنا يتم سحب بيانات BOQ برمجياً وإضافة هوامش المخاطر.
              {/*
                 Data Fetching Logic Example:
                 const fetchBOQData = async () => {
                   const qs = await getDocs(collection(db, `projects/${projectId}/boq`));
                   // Aggregate base cost
                 }
              */}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Container 2: Funding Container (💼 خطة التمويل)
// -------------------------------------------------------------
const FundingContainer: React.FC<{ page: Page }> = ({ page }) => {
  const [subTab, setSubTab] = useState<'feasibility' | 'strategy'>('feasibility');

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b border-slate-100 bg-slate-50">
        <button 
          onClick={() => setSubTab('feasibility')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'feasibility' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <PieChart className="w-4 h-4 inline-block mr-2" />
          الجدوى المالية
        </button>
        <button 
          onClick={() => setSubTab('strategy')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'strategy' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <TrendingUp className="w-4 h-4 inline-block mr-2" />
          استراتيجية التمويل
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50/20 relative">
        {subTab === 'feasibility' && <FinancialFeasibilityView page={page} />}
        {subTab === 'strategy' && (
          <div className="p-8">
            <h3 className="text-lg font-bold">Funding Strategy</h3>
            <p className="text-sm text-slate-500 mt-2">
              هنا يتم تحديد مصادر التمويل (نسب الممولين، الدفعات المستهدفة) لتغطية التكلفة الإجمالية المسحوبة من شاشة التقديرات.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Container 3: Baseline Container (🎯 الخط المرجعي)
// -------------------------------------------------------------
const BaselineContainer: React.FC<{ page: Page }> = ({ page }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tighter italic">COST BASELINE</h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">الخط المرجعي المعتمد للتكلفة</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-blue-500" />
          <div>
            <div className="text-[10px] font-black text-blue-500 uppercase">Status</div>
            <div className="text-lg font-black italic">APPROVED</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Planned Value (PV)</div>
          <div className="text-2xl font-black italic">IQD 1,250,000,000</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contingency Reserve</div>
          <div className="text-2xl font-black italic text-brand">IQD 125,000,000</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Management Reserve</div>
          <div className="text-2xl font-black italic text-rose-500">IQD 50,000,000</div>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <TrendingUp className="w-24 h-24 text-white/5" />
        </div>
        <h4 className="text-white/60 text-xs font-black uppercase tracking-[0.2em] mb-8">Cumulative S-Curve ( المخطط الإس مئوي)</h4>
        
        {/* Placeholder for real S-Curve chart */}
        <div className="h-[300px] w-full flex items-center justify-center border border-white/10 rounded-2xl bg-white/5">
           <p className="text-white/40 text-sm font-medium">S-Curve Visualization (Data driven from Estimates)</p>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Container 5: Ledger Container (📒 الدفتر المالي)
// -------------------------------------------------------------
const LedgerContainer: React.FC<{ page: Page }> = ({ page }) => {
  const [subTab, setSubTab] = useState<'ledger' | 'disbursements' | 'advances'>('ledger');

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b border-slate-100 bg-slate-50">
        <button 
          onClick={() => setSubTab('ledger')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'ledger' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <BookOpen className="w-4 h-4 inline-block mr-2" />
          دفتر التكاليف
        </button>
        <button 
          onClick={() => setSubTab('disbursements')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'disbursements' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <ArrowRightLeft className="w-4 h-4 inline-block mr-2" />
          سجلات الصرف
        </button>
        <button 
          onClick={() => setSubTab('advances')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'advances' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <Banknote className="w-4 h-4 inline-block mr-2" />
          سلف المقاولين
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50/20 relative">
        <UniversalManager entityType="finance" />
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Container 6: Performance Container (📈 أداء الميزانية)
// -------------------------------------------------------------
const PerformanceContainer: React.FC<{ page: Page }> = ({ page }) => {
  const [subTab, setSubTab] = useState<'evm' | 'changes'>('evm');

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b border-slate-100 bg-slate-50">
        <button 
          onClick={() => setSubTab('evm')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'evm' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <TrendingUp className="w-4 h-4 inline-block mr-2" />
          مؤشرات EVM
        </button>
        <button 
          onClick={() => setSubTab('changes')}
          className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", subTab === 'changes' ? "bg-brand text-white shadow-md shadow-brand/20" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200")}
        >
          <List className="w-4 h-4 inline-block mr-2" />
          تغييرات الميزانية
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50/20 relative">
        {subTab === 'evm' && <EVMReportView page={page} />}
        {subTab === 'changes' && (
          <div className="p-8">
            <h3 className="text-lg font-bold">Budget Change Log</h3>
            <p className="text-sm text-slate-500 mt-2">
              سجل التغييرات المالية المعتمدة التي تؤثر على الخط المرجعي.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Container 7: Closure Container (🔐 الإغلاق المالي)
// -------------------------------------------------------------
const ClosureContainer: React.FC<{ page: Page }> = ({ page }) => {
  const isProjectComplete = true; // Placeholder for project completion check

  if (!isProjectComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 rounded-3xl border border-dashed border-slate-300 p-12 text-center">
        <Lock className="w-16 h-16 text-slate-300 mb-6" />
        <h2 className="text-xl font-bold text-slate-900">هذه الشاشة غير متاحة حالياً</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">تظهر شاشة الإغلاق المالي فقط عند وصول نسبة إنجاز المشروع إلى 100% لمطابقة الميزانية وأرشفة السجلات.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter italic">FINANCIAL RECONCILIATION</h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">التسوية المالية النهائية والأرشفة</p>
        </div>
        <button className="px-8 py-3 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-brand/20">
          <CheckCircle2 className="w-4 h-4" />
          إتمام التسوية النهائية
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50/20 relative">
        <FinancialCloseOutView page={page} />
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Main Hub Component
// -------------------------------------------------------------
export const FinanceHubExecutiveDashboard: React.FC<FinanceHubViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Sync with page.id if it matches a known tab
    if (page.id === '2.4.1' || page.id === 'boq') return 'boq';
    if (page.id === 'cost-ledger') return 'ledger';
    if (page.id === '4.2.2' || page.id === 'performance') return 'performance';
    return 'cost-plan'; // default
  });

  React.useEffect(() => {
    if (page.id === '2.4.1' || page.id === 'boq') setActiveTab('boq');
    else if (page.id === 'cost-ledger') setActiveTab('ledger');
    else if (page.id === '4.2.2' || page.id === 'performance') setActiveTab('performance');
    else setActiveTab('cost-plan');
  }, [page.id]);

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'planning-zone',
      tabs: [
        { 
          id: 'cost-plan', 
          label: 'خطة الإدارة المالية', 
          icon: Settings, 
          description: 'يحتوي على: خطة إدارة التكلفة + خطة التمويل والخط المرجعي (Cost Baseline/Funding Plan)',
          size: 'large' 
        },
        { 
          id: 'boq', 
          label: 'جدول الكميات (BOQ)', 
          icon: List, 
          description: 'يحتوي على: جدول الكميات (BOQ) + تقديرات التكلفة وأسسها (Cost Estimates & Basis)',
          size: 'large' 
        },
      ]
    },
    {
      id: 'execution-zone',
      tabs: [
        { 
          id: 'ledger', 
          label: 'Project Cost Ledger', 
          icon: Banknote, 
          description: 'Project Cost Ledger & Disbursements (سجل التكاليف والمصروفات)',
          size: 'large' 
        },
      ]
    },
    {
      id: 'monitoring-zone',
      tabs: [
        { 
          id: 'performance', 
          label: 'الأداء والتحكم (EVM)', 
          icon: TrendingUp, 
          description: 'يحتوي على: تقارير أداء التكلفة (EVM) + سجل تغيير الميزانية (Budget Change Log)',
          size: 'large' 
        },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'cost-plan': 
        return (
          <div className="flex flex-col h-full gap-6">
            <CostManagementPlanView page={page} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              <FundingContainer page={page} />
              <BaselineContainer page={page} />
            </div>
          </div>
        );
      case 'boq': 
        return <EstimatesContainer page={page} />;
      case 'ledger': 
        return (
          <div className="flex items-center justify-center h-full p-12">
            <div className="text-center p-12 bg-white rounded-3xl border border-slate-200">
              <Banknote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold">Project Cost Ledger</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">This pure financial view tracks disbursements and actual cost aggregations separately from procurement and contracts.</p>
            </div>
          </div>
        );
      case 'performance': 
        return <PerformanceContainer page={page} />;
      default: 
        return <CostManagementPlanView page={page} />;
    }
  };

  return (
    <div key="finance-hub-v4-force" className="flex flex-col h-full w-full bg-slate-50 dark:bg-app-bg">
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
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
