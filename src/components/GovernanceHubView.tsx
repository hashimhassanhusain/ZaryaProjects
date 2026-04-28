import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { 
  Award, 
  Gavel, 
  Layers, 
  DraftingCompass,
  Calendar,
  ChevronRight, 
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Zap,
  Settings,
  Menu,
  X,
  MessageSquare,
  Users,
  ClipboardList,
  Box,
  Briefcase,
  Activity,
  DollarSign,
  ShoppingCart,
  ShieldAlert,
  ClipboardCheck,
  GitBranch,
  AlertTriangle,
  Target,
  Info,
  GraduationCap
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';
import { UniversalManager } from './common/UniversalManager';
import { DomainDashboard } from './DomainDashboard';

interface GovernanceHubViewProps {
  page: Page;
}

export const GovernanceHubView: React.FC<GovernanceHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  const allManagementPlans = [
    { id: '2.1.2', title: t('2.1.2'), icon: FileText, desc: 'Assembly of all subsidiary plans into a cohesive blueprint.', focusArea: 'Planning' },
    { id: '2.1.13', title: t('2.1.13'), icon: ShoppingCart, desc: 'Strategic methodology for vendor and resource acquisition.', focusArea: 'Planning' },
    { id: '3.1.3', title: t('3.1.3'), icon: ShieldCheck, desc: 'Formal execution oversight and quality assurance verification.', focusArea: 'Executing' },
    { id: '4.1.1', title: t('4.1.1'), icon: Activity, desc: 'Real-time tracking of governance KPIs and plan variances.', focusArea: 'Monitoring & Controlling' },
    { id: '1.1.1', title: t('1.1.1'), icon: Target, desc: 'Project authorization and high-level vision hub.', focusArea: 'Initiating' },
    { id: '1.1.2', title: t('1.1.2'), icon: ShieldCheck, desc: 'Core management policies and governance guidelines.', focusArea: 'Initiating' }
  ];

  const accessiblePlans = allManagementPlans.filter(p => isAdmin || userProfile?.accessiblePages?.includes(p.id));

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'domain-overview',
      label: t('navigation'),
      tabs: [
        { 
          id: 'overview', 
          label: (() => {
            const translated = t(page.domain || 'governance');
            const stripped = stripNumericPrefix(translated);
            if (stripped && stripped.trim() !== '' && stripped !== translated) return stripped;
            return stripNumericPrefix(page.title).replace(/\s*Hub$/i, '').replace(/\s*Domain$/i, '');
          })(),
          icon: Gavel, 
          description: t('domain_overview_desc'),
          size: 'large'
        }
      ]
    },
    {
      id: 'performance-logs',
      label: 'Performance Logs & Registers',
      tabs: [
        { id: 'risks', label: 'Risk Register', icon: AlertTriangle, size: 'large' },
        { id: 'issues', label: 'Issue Log', icon: Activity, size: 'small' },
        { id: 'changes', label: 'Change Log', icon: Layers, size: 'small' },
        { id: 'stakeholders', label: 'Stakeholders', icon: Users, size: 'small' },
        { id: 'assumptions', label: 'Assumptions', icon: ClipboardList, size: 'small' },
        { id: 'lessons', label: 'Lessons Learned', icon: GraduationCap, size: 'small' },
      ]
    },
    {
      id: 'governance-processes',
      label: t('governance'),
      tabs: allManagementPlans.map(p => {
        const translated = p.title;
        const stripped = stripNumericPrefix(translated);
        return {
          id: p.id,
          label: (stripped && stripped.trim() !== '') ? stripped : p.title,
          icon: p.icon,
          description: p.desc,
          size: 'large',
          focusArea: p.focusArea
        };
      })
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="pb-20 space-y-12 px-6 pt-6">
            <header className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">Governance Control Center</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">PMBOK 8 Standard Framework</p>
                </div>
              </div>
            </header>

            {/* Domain Status Matrix */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {accessiblePlans.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => navigate(`/page/${plan.id}`)}
                  className="group bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-blue-50 transition-colors" />
                  
                  <div className="relative z-10 space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-600/30 transition-all duration-500">
                      <plan.icon className="w-7 h-7" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {stripNumericPrefix(plan.title)}
                      </h3>
                      <p className="text-sm text-slate-500 font-semibold leading-relaxed line-clamp-2">
                        {plan.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Baselined</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                        Open Hub <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        );
      case 'risks': return <UniversalManager entityType="risks" />;
      case 'issues': return <UniversalManager entityType="issues" />;
      case 'changes': return <UniversalManager entityType="changes" />;
      case 'stakeholders': return <UniversalManager entityType="stakeholders" />;
      case 'assumptions': return <UniversalManager entityType="assumptions" />;
      case 'lessons': return <UniversalManager entityType="lessons" />;
      default: return null;
    }
  };

  useEffect(() => {
    // Navigate only if it's a specific plan ID (not one of our logs)
    const logs = ['risks', 'issues', 'changes', 'stakeholders', 'assumptions', 'lessons'];
    if (activeTab !== 'overview' && activeTab !== '' && !logs.includes(activeTab)) {
      navigate(`/page/${activeTab}`);
    }
  }, [activeTab, navigate]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#fcfcfc]">
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as string)}
      />
      <div className="flex-1 overflow-y-auto">
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
