import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  LayoutTemplate, 
  Lightbulb, 
  UserRound, 
  Users, 
  Calculator, 
  Search, 
  Layers, 
  Box, 
  GitBranch, 
  Zap, 
  History, 
  PieChart, 
  FileSearch, 
  Table2, 
  Network, 
  LineChart, 
  ListTodo, 
  AlertTriangle,
  Brain,
  MessageSquare,
  Map,
  ClipboardList
} from 'lucide-react';

export interface ProjectTool {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: any;
  component: string;
}

export interface OutputMapping {
  outputId: string; // Corresponds to page ID or domain ID
  tools: ProjectTool[];
}

export const TOOLS_LIBRARY: Record<string, ProjectTool> = {
  project_canvas: {
    id: 'project_canvas',
    name: 'Project Canvas',
    nameAr: 'مخطط المشروع',
    description: 'Visual framework for defining goals and scope',
    descriptionAr: 'إطار عمل بصرى لتحديد الأهداف والنطاق',
    icon: LayoutTemplate,
    component: 'ProjectCanvasWidget'
  },
  brainstorming: {
    id: 'brainstorming',
    name: 'Brainstorming',
    nameAr: 'عصف ذهني',
    description: 'Digital space for ideation',
    descriptionAr: 'مساحة رقمية لتوليد الأفكار',
    icon: Lightbulb,
    component: 'BrainstormingWidget'
  },
  expert_judgment: {
    id: 'expert_judgment',
    name: 'Expert Judgment',
    nameAr: 'استشارة الخبراء',
    description: 'Review lessons learned and expert opinions',
    descriptionAr: 'مراجعة الدروس المستفادة وآراء الخبراء',
    icon: UserRound,
    component: 'ExpertJudgmentWidget'
  },
  raci_matrix: {
    id: 'raci_matrix',
    name: 'RACI Matrix',
    nameAr: 'مصفوفة RACI',
    description: 'Define roles and responsibilities',
    descriptionAr: 'تحديد الأدوار والمسؤوليات',
    icon: Users,
    component: 'RACIWidget'
  },
  make_buy: {
    id: 'make_buy',
    name: 'Make-or-Buy Analysis',
    nameAr: 'تحليل الصنع أو الشراء',
    description: 'Financial calculator for sourcing decisions',
    descriptionAr: 'آلة حاسبة مالية لقرارات التوريد',
    icon: Calculator,
    component: 'MakeBuyWidget'
  },
  source_selection: {
    id: 'source_selection',
    name: 'Source Selection Analysis',
    nameAr: 'تحليل اختيار المصدر',
    description: 'Supplier evaluation matrix',
    descriptionAr: 'مصفوفة تقييم الموردين',
    icon: Table2,
    component: 'SourceSelectionWidget'
  },
  market_research: {
    id: 'market_research',
    name: 'Market Research',
    nameAr: 'أبحاث السوق',
    description: 'Industry and vendor trends analysis',
    descriptionAr: 'تحليل اتجاهات الصناعة والموردين',
    icon: Search,
    component: 'MarketResearchWidget'
  },
  decomposition: {
    id: 'decomposition',
    name: 'Decomposition',
    nameAr: 'التجزئة',
    description: 'Break down scope into manageable parts',
    descriptionAr: 'تفكيك النطاق إلى أجزاء سهلة الإدارة',
    icon: Layers,
    component: 'DecompositionWidget'
  },
  product_analysis: {
    id: 'product_analysis',
    name: 'Product Analysis',
    nameAr: 'تحليل المنتج',
    description: 'Analyze end product characteristics',
    descriptionAr: 'تحليل خصائص المنتج النهائي',
    icon: Box,
    component: 'ProductAnalysisWidget'
  },
  decision_making: {
    id: 'decision_making',
    name: 'Decision Making',
    nameAr: 'اتخاذ القرار',
    description: 'Structured decision techniques',
    descriptionAr: 'تقنيات اتخاذ القرار المهيكلة',
    icon: GitBranch,
    component: 'DecisionMakingWidget'
  },
  schedule_network: {
    id: 'schedule_network',
    name: 'Schedule Network Diagram',
    nameAr: 'مخطط الشبكة',
    description: 'Precedence diagramming and lags analysis',
    descriptionAr: 'رسم بياني للعلاقات والتبكير والتأخير',
    icon: Network,
    component: 'ScheduleNetworkWidget'
  },
  critical_path: {
    id: 'critical_path',
    name: 'Critical Path Method',
    nameAr: 'طريقة المسار الحرج',
    description: 'Identify longest duration path',
    descriptionAr: 'تحديد أطول مسار زمني للمشروع',
    icon: Zap,
    component: 'CriticalPathWidget'
  },
  compression: {
    id: 'compression',
    name: 'Schedule Compression',
    nameAr: 'ضغط الجدول الزمني',
    description: 'Crashing and fast tracking analysis',
    descriptionAr: 'تحليلات تسريع الجدول الزمني',
    icon: ListTodo,
    component: 'CompressionWidget'
  },
  what_if: {
    id: 'what_if',
    name: 'What-if Analysis',
    nameAr: 'تحليل ماذا لو',
    description: 'Simulate delay impact scenarios',
    descriptionAr: 'محاكاة سيناريوهات تأثير التأخيرات',
    icon: History,
    component: 'WhatIfWidget'
  },
  cost_aggregation: {
    id: 'cost_aggregation',
    name: 'Cost Aggregation',
    nameAr: 'تجميع التكاليف',
    description: 'Roll up individual activity costs',
    descriptionAr: 'تجميع تكاليف الأنشطة إلى حزم العمل',
    icon: Calculator,
    component: 'CostAggregationWidget'
  },
  reserve_analysis: {
    id: 'reserve_analysis',
    name: 'Reserve Analysis',
    nameAr: 'تحليل الاحتياطي',
    description: 'Calculate contingency and management reserves',
    descriptionAr: 'حساب احتياطي الطوارئ والإدارة',
    icon: PieChart,
    component: 'ReserveAnalysisWidget'
  },
  funding_reconciliation: {
    id: 'funding_reconciliation',
    name: 'Funding Limit Reconciliation',
    nameAr: 'تسوية حدود التمويل',
    description: 'Match spending with cash flows',
    descriptionAr: 'مطابقة الإنفاق مع التدفقات النقدية',
    icon: ClipboardList,
    component: 'FundingReconciliationWidget'
  },
  stakeholder_mapping: {
    id: 'stakeholder_mapping',
    name: 'Stakeholder Mapping',
    nameAr: 'رسم خرائط المعنيين',
    description: 'Power/Interest Grid analysis',
    descriptionAr: 'تحليل شبكة (سلطة/اهتمام)',
    icon: Map,
    component: 'StakeholderMappingWidget'
  },
  questionnaires: {
    id: 'questionnaires',
    name: 'Questionnaires',
    nameAr: 'الاستبيانات',
    description: 'Collect stakeholder expectations',
    descriptionAr: 'أداة لجمع تطلعات المعنيين',
    icon: MessageSquare,
    component: 'QuestionnairesWidget'
  },
  prompt_lists: {
    id: 'prompt_lists',
    name: 'Prompt Lists',
    nameAr: 'قوائم التلقين',
    description: 'Frameworks like PESTLE/TECOP for risks',
    descriptionAr: 'أطر عمل (PESTLE/TECOP) لتوليد أفكار المخاطر',
    icon: ListTodo,
    component: 'PromptListsWidget'
  },
  swot_analysis: {
    id: 'swot_analysis',
    name: 'SWOT Analysis',
    nameAr: 'تحليل SWOT',
    description: 'Strengths, Weaknesses, Opportunities, Threats',
    descriptionAr: 'تحليل نقاط القوة والضعف والفرص والتهديدات',
    icon: FileSearch,
    component: 'SWOTWidget'
  },
  root_cause: {
    id: 'root_cause',
    name: 'Root Cause Analysis',
    nameAr: 'تحليل السبب الجذري',
    description: 'Fishbone or 5 Whys analysis',
    descriptionAr: 'أداة عظم السمكة أو لماذا 5 مرات',
    icon: GitBranch,
    component: 'RootCauseWidget'
  },
  ai_prediction: {
    id: 'ai_prediction',
    name: 'AI Risk Prediction',
    nameAr: 'الذكاء الاصطناعي للمخاطر',
    description: 'Suggest risks based on historical data',
    descriptionAr: 'اقتراح مخاطر محتملة بناءً على البيانات السابقة',
    icon: Brain,
    component: 'AIPredictionWidget'
  }
};

export const INPUTS_LIBRARY: Record<string, ProjectTool> = {
  business_case: {
    id: 'business_case',
    name: 'Business Case',
    nameAr: 'حالة العمل',
    description: 'Economic feasibility and justification',
    descriptionAr: 'الجدوى الاقتصادية والمبررات',
    icon: FileSearch,
    component: 'BusinessCaseWidget'
  },
  agreements: {
    id: 'agreements',
    name: 'Agreements',
    nameAr: 'الاتفاقيات',
    description: 'Contracts, MoUs, and SLAs',
    descriptionAr: 'العقود ومذكرات التفاهم واتفاقيات مستوى الخدمة',
    icon: ClipboardList,
    component: 'AgreementsWidget'
  },
  eefs: {
    id: 'eefs',
    name: 'EEFs',
    nameAr: 'العوامل المحيطة بالمؤسسة',
    description: 'Enterprise Environmental Factors',
    descriptionAr: 'العوامل البيئية المحيطة بالمؤسسة',
    icon: Box,
    component: 'EEFWidget'
  },
  opas: {
    id: 'opas',
    name: 'OPAs',
    nameAr: 'أصول عمليات المؤسسة',
    description: 'Organizational Process Assets',
    descriptionAr: 'أصول العمليات والسياسات الخاصة بالمؤسسة',
    icon: History,
    component: 'OPAWidget'
  },
  procurement_docs: {
    id: 'procurement_docs',
    name: 'Procurement Docs',
    nameAr: 'وثائق المشتريات',
    description: 'Bidding documents and requirements',
    descriptionAr: 'وثائق العطاءات والمتطلبات',
    icon: Search,
    component: 'ProcurementDocsWidget'
  },
  scope_baseline: {
    id: 'scope_baseline',
    name: 'Scope Baseline',
    nameAr: 'الخط المرجعي للنطاق',
    description: 'Scope statement, WBS and dictionary',
    descriptionAr: 'بيان النطاق وهيكل تجزئة العمل والقواميس',
    icon: Layers,
    component: 'ScopeBaselineWidget'
  },
  requirements_doc: {
    id: 'requirements_doc',
    name: 'Requirements Doc',
    nameAr: 'وثائق المتطلبات',
    description: 'Detailed project requirements',
    descriptionAr: 'متطلبات المشروع التفصيلية',
    icon: ListTodo,
    component: 'RequirementsDocWidget'
  },
  project_schedule: {
    id: 'project_schedule',
    name: 'Project Schedule',
    nameAr: 'الجدول الزمني',
    description: 'Detailed activity list and timeline',
    descriptionAr: 'قائمة الأنشطة والجدول الزمني التفصيلي',
    icon: Network,
    component: 'ProjectScheduleWidget'
  },
  risk_register_input: {
    id: 'risk_register_input',
    name: 'Risk Register',
    nameAr: 'سجل المخاطر',
    description: 'Identified project risks',
    descriptionAr: 'مخاطر المشروع المحددة',
    icon: AlertTriangle,
    component: 'RiskRegisterWidget'
  }
};

export const OUTPUT_INPUT_MAPPINGS: Record<string, string[]> = {
  'project_charter': ['business_case', 'agreements', 'eefs', 'opas'],
  'sourcing_strategy': ['requirements_doc', 'procurement_docs', 'eefs'],
  'scope_statement': ['project_charter', 'requirements_doc', 'opas'],
  'schedule': ['scope_baseline', 'requirements_doc', 'eefs'],
  'budget': ['project_schedule', 'risk_register_input', 'opas'],
  'stakeholder_register': ['project_charter', 'agreements', 'eefs'],
  'risk_register': ['scope_baseline', 'stakeholder_mapping', 'eefs']
};

export const OUTPUT_TOOL_MAPPINGS: Record<string, string[]> = {
  'project_charter': ['project_canvas', 'brainstorming', 'expert_judgment', 'raci_matrix'],
  'sourcing_strategy': ['make_buy', 'source_selection', 'market_research'],
  'scope_statement': ['decomposition', 'product_analysis', 'decision_making'],
  'schedule': ['schedule_network', 'critical_path', 'compression', 'what_if'],
  'budget': ['cost_aggregation', 'reserve_analysis', 'funding_reconciliation'],
  'stakeholder_register': ['stakeholder_mapping', 'questionnaires'],
  'risk_register': ['prompt_lists', 'swot_analysis', 'root_cause', 'ai_prediction']
};

interface ToolsContextType {
  activeOutput: string | null;
  setActiveOutput: (id: string | null) => void;
  openTool: (toolId: string) => void;
  activeToolId: string | null;
  closeTool: () => void;
  openInput: (inputId: string) => void;
  activeInputId: string | null;
  closeInput: () => void;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export const ToolsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeOutput, setActiveOutput] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);

  const openTool = (toolId: string) => {
    setActiveInputId(null);
    setActiveToolId(toolId);
  };
  const closeTool = () => setActiveToolId(null);

  const openInput = (inputId: string) => {
    setActiveToolId(null);
    setActiveInputId(inputId);
  };
  const closeInput = () => setActiveInputId(null);

  return (
    <ToolsContext.Provider value={{ 
      activeOutput, 
      setActiveOutput, 
      activeToolId, 
      openTool, 
      closeTool,
      activeInputId,
      openInput,
      closeInput
    }}>
      {children}
    </ToolsContext.Provider>
  );
};

export const useProjectTools = () => {
  const context = useContext(ToolsContext);
  if (!context) throw new Error('useProjectTools must be used within a ToolsProvider');
  return context;
};
