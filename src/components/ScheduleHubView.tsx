import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { 
  Calendar, 
  ChevronRight,
  Flag,
  LayoutGrid,
  Settings,
  BarChart3,
  Clock,
  Activity,
  GitBranch,
  TrendingUp,
  Target,
  FileCheck,
  Archive,
  Search,
  Database,
  Cpu,
  Zap,
  ShieldCheck,
  FileText,
  ListTodo,
  History,
  Play,
  Gauge,
  Settings2,
  CheckCircle2,
  Library
} from 'lucide-react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';

// Sub-views
import { ScheduleMilestoneOverview } from './ScheduleMilestoneOverview';
import { ScheduleActivityDefinition } from './ScheduleActivityDefinition';
import { ScheduleLogicEstimation } from './ScheduleLogicEstimation';
import { ProjectScheduleView } from './ProjectScheduleView';
import { ScheduleCadenceDashboard } from './ScheduleCadenceDashboard';
import { ScheduleProgressTracking } from './ScheduleProgressTracking';
import { ScheduleForecasting } from './ScheduleForecasting';
import { ScheduleLessonsLearned } from './ScheduleLessonsLearned';
import { ScheduleManagementPlanView } from './ScheduleManagementPlanView';

interface ScheduleHubViewProps {
  page: Page;
}

export const ScheduleHubView: React.FC<ScheduleHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(page.id === 'sched' ? 'overview' : page.id);

  // Sync activeTab with URL changes
  useEffect(() => {
    setActiveTab(page.id === 'sched' ? 'overview' : page.id);
  }, [page.id]);

  const schedulePages = [
    { id: '1.3.1', group: 'initiating', icon: Clock, title: t('1.3.1') || 'Define Timeline', desc: 'Define high-level roadmap and major project milestones.' },
    { id: '1.3.2', group: 'initiating', icon: ListTodo, title: t('1.3.2') || 'Identify Activities', desc: 'Decompose core deliverables into primary activities.' },
    { id: '2.3.1', group: 'planning', icon: Database, title: t('2.3.1') || 'Activity Definition', desc: 'Granular breakdown of project work into trackable activities.' },
    { id: '2.3.2', group: 'planning', icon: GitBranch, title: t('2.3.2') || 'Sequence Activities', desc: 'Link activities and establish logical progression.' },
    { id: '2.3.3', group: 'planning', icon: BarChart3, title: t('view_gantt'), desc: 'Master schedule visual timeline.', size: 'large' as const },
    { id: '2.3.4', group: 'planning', icon: History, title: t('2.3.4') || 'Estimate Durations', desc: 'Determine time required for each activity.' },
    { id: '2.3.5', group: 'planning', icon: Calendar, title: t('2.3.5') || 'Develop Baseline', desc: 'Establish the formal Project Schedule and Baseline.' },
    { id: '3.3.1', group: 'executing', icon: Play, title: t('3.3.1') || 'Manage Execution', desc: 'Coordinate team actions and track daily progress.' },
    { id: '3.3.2', group: 'executing', icon: TrendingUp, title: t('3.3.2') || 'Progress Gantt', desc: 'Executive schedule view with actual progress.' },
    { id: '3.3.3', group: 'executing', icon: FileText, title: t('3.3.3') || 'Daily Reports', desc: 'Formal daily logs of site activities.' },
    { id: '4.3.1', group: 'monitoring', icon: Gauge, title: t('4.3.1') || 'Monitor Performance', desc: 'Analyze schedule variance and utilize EVM.' },
    { id: '4.3.2', group: 'monitoring', icon: Settings2, title: t('4.3.2') || 'Control Changes', desc: 'Manage modifications to the schedule baseline.' },
    { id: '5.3.1', group: 'closing', icon: CheckCircle2, title: t('5.3.1') || 'Final Validation', desc: 'Obtain stakeholder acceptance for final performance.' },
    { id: '5.3.2', group: 'closing', icon: Library, title: t('5.3.2') || 'Archive Records', desc: 'Consolidate and archive all schedule artifacts.' }
  ];

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'navigation',
      label: t('navigation'),
      tabs: [
        { id: 'overview', label: t('overview'), icon: LayoutGrid, size: 'large', description: 'Schedule Domain Control Center' }
      ]
    },
    {
      id: 'initiating',
      label: t('initiating'),
      tabs: schedulePages.filter(p => p.group === 'initiating').map(p => ({
        id: p.id,
        label: stripNumericPrefix(p.title),
        icon: p.icon,
        description: p.desc,
        size: 'small'
      }))
    },
    {
      id: 'planning',
      label: t('planning'),
      tabs: schedulePages.filter(p => p.group === 'planning').map(p => ({
        id: p.id,
        label: stripNumericPrefix(p.title),
        icon: p.icon,
        description: p.desc,
        size: p.size || 'small'
      }))
    },
    {
      id: 'executing',
      label: t('executing'),
      tabs: schedulePages.filter(p => p.group === 'executing').map(p => ({
        id: p.id,
        label: stripNumericPrefix(p.title),
        icon: p.icon,
        description: p.desc,
        size: 'small'
      }))
    },
    {
      id: 'monitoring',
      label: t('monitoring'),
      tabs: schedulePages.filter(p => p.group === 'monitoring').map(p => ({
        id: p.id,
        label: stripNumericPrefix(p.title),
        icon: p.icon,
        description: p.desc,
        size: 'small'
      }))
    },
    {
      id: 'closing',
      label: t('closing'),
      tabs: schedulePages.filter(p => p.group === 'closing').map(p => ({
        id: p.id,
        label: stripNumericPrefix(p.title),
        icon: p.icon,
        description: p.desc,
        size: 'small'
      }))
    }
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    if (id === 'overview') {
      navigate('/page/sched');
    } else {
      navigate(`/page/${id}`);
    }
  };

  const renderOverview = () => (
    <div className="pb-20 space-y-12 px-6 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Master Schedule Hub</h2>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">PMBOK Phase Alignment Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search schedule artifacts..." 
              className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Archive className="w-4 h-4" />
            Archive Ready
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -mr-[200px] -mt-[200px]" />
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* Input Arsenal */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                     <Database className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Input Arsenal</h4>
               </div>
               <div className="space-y-4">
                  {['Activity List', 'Activity Attributes', 'Project Network Diagram', 'Resource Calendars'].map(item => (
                     <div key={item} className="group p-5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-2xl transition-all cursor-pointer flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{item}</span>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-all" />
                     </div>
                  ))}
               </div>
            </div>

            {/* Processing Logic */}
            <div className="flex flex-col items-center">
               <div className="w-20 h-20 bg-amber-500/20 rounded-[2rem] flex items-center justify-center mb-6 relative group">
                  <div className="absolute inset-0 bg-amber-500/10 blur-xl group-hover:blur-2xl transition-all" />
                  <Cpu className="w-10 h-10 text-amber-400 relative z-10" />
               </div>
               <h4 className="text-sm font-black uppercase tracking-[0.3em] text-amber-400 mb-2">Processing Logic</h4>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Schedule Compression Engine</p>
               <div className="mt-12 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                  <div className="w-12 h-px bg-slate-800" />
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
               </div>
            </div>

            {/* Output Tier */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 mb-8 justify-end">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Output Tier</h4>
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                     <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
               </div>
               <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                           <FileText className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="text-lg font-bold">Project Schedule</div>
                           <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Project Schedule</div>
                        </div>
                     </div>
                     <span className="px-3 py-1 bg-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg">Baseline</span>
                  </div>
                  <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Export PDF Deliverable</button>
               </div>
            </div>
         </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {schedulePages.map((p) => (
          <div 
            key={p.id}
            onClick={() => handleTabChange(p.id)}
            className="group bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-indigo-50 transition-colors" />
            <div className="relative z-10 space-y-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-white transition-all duration-500",
                p.size === 'large' ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:shadow-indigo-600/30" : "group-hover:bg-slate-900 group-hover:shadow-slate-900/30"
              )}>
                <p.icon className={cn("w-7 h-7", p.size === 'large' && "w-8 h-8")} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {stripNumericPrefix(p.title)}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                  {p.group}
                </p>
                <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 mt-2">
                  {p.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case '1.3.1':
        return <ScheduleMilestoneOverview page={page} />;
      case '2.3.1':
        return <ScheduleActivityDefinition page={page} />;
      case '2.3.2':
        return <ScheduleLogicEstimation page={page} />;
      case '2.3.3':
      case '3.3.2':
        return <ProjectScheduleView page={page} initialTab="gantt" />;
      case '3.5.1':
        return <ScheduleCadenceDashboard page={page} />;
      case '4.5.1':
        return <ScheduleProgressTracking page={page} />;
      case '4.5.2':
        return <ScheduleForecasting page={page} />;
      case '5.5.1':
        return <ScheduleLessonsLearned page={page} />;
      case '2.1.11':
        return <ScheduleManagementPlanView page={page} />;
      default:
        // Use default renderer if specific logic is missing but it's a schedule page
        const p = schedulePages.find(sp => sp.id === activeTab);
        if (p) return <div className="p-8">Rendering {p.title}... (Dynamic sub-view pending)</div>;
        return renderOverview();
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#fcfcfc]">
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={handleTabChange}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar">
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
