import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  ShieldCheck,
  DraftingCompass,
  Banknote,
  Building,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn, stripNumericPrefix } from '../lib/utils';
import { AIAssistant } from './AIAssistant';
import { BOQItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

const KPICard = ({ title, value, subValue, trend, trendValue, icon: Icon, color }: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stripNumericPrefix(title)}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight">{value}</span>
          {subValue && <span className="text-[11px] font-bold text-slate-400 uppercase">{subValue}</span>}
        </div>
      </div>
    </motion.div>
  );
};

export const ProjectDashboard: React.FC = () => {
  const { selectedProject, setSelectedProject, projects, loading } = useProject();
  const { formatAmount, convertToBase } = useCurrency();
  const { t, language } = useLanguage();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [boqTotal, setBoqTotal] = useState(0);
  const [complianceRate, setComplianceRate] = useState<number | null>(null);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project && (!selectedProject || selectedProject.id !== project.id)) {
        // Use a timeout to avoid dispatching during render if necessary, 
        // though setSelectedProject from context should be stable.
        setSelectedProject(project);
      }
    }
  }, [projectId, projects, selectedProject, setSelectedProject]);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(collection(db, 'boq'), where('projectId', '==', selectedProject.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as BOQItem);
      const total = items.reduce((sum, item) => {
        const amount = item.amount || 0;
        const itemCurrency = item.inputCurrency || 'IQD';
        return sum + (itemCurrency === 'USD' ? convertToBase(amount, 'USD') : amount);
      }, 0);
      setBoqTotal(total);
    });

    return () => unsubscribe();
  }, [selectedProject, convertToBase]);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'quality_audits'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setComplianceRate(snap.docs[0].data().complianceRate);
      } else {
        setComplianceRate(null);
      }
    });

    return () => unsubscribe();
  }, [selectedProject]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-slate-400 font-black uppercase tracking-widest text-[10px]">{t('loading_project')}</div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-xl">
           <Building className="w-10 h-10 text-slate-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('no_project_selected')}</h2>
          <p className="text-slate-500 font-bold max-w-sm mx-auto">{t('select_project_hint')}</p>
        </div>
      </div>
    );
  }

  const kpis = [
    { 
      title: 'Compliance Rate', 
      value: complianceRate !== null ? `${complianceRate}%` : '85%', 
      subValue: 'Governance', 
      icon: ShieldCheck, 
      color: 'bg-emerald-500',
      trend: 'up',
      trendValue: '2.4%'
    },
    { 
      title: 'Plan Variance', 
      value: '-3.2%', 
      subValue: 'Schedule', 
      icon: Clock, 
      color: 'bg-amber-500',
      trend: 'down',
      trendValue: '1.2%'
    },
    { 
      title: 'Budget Utilized', 
      value: formatAmount(boqTotal * 0.42, 'IQD'), 
      subValue: 'Finance', 
      icon: Banknote, 
      color: 'bg-blue-600' 
    },
    { 
      title: 'Total Value', 
      value: formatAmount(boqTotal, 'IQD'), 
      subValue: 'Contracts', 
      icon: FileText, 
      color: 'bg-slate-900' 
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-20">
      {/* Header Section */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              {t('executive_summary')}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">
              {stripNumericPrefix(selectedProject.name)}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Target className="w-3 h-3 text-blue-400" />
                {selectedProject.code}
             </div>
             {selectedProject.customer && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                  <Building className="w-3 h-3" />
                  {selectedProject.customer}
               </div>
             )}
             {selectedProject.location && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                  <MapPin className="w-3 h-3" />
                  {selectedProject.location}
               </div>
             )}
          </div>

          <p className="text-slate-500 max-w-3xl font-bold leading-relaxed text-sm">
            {selectedProject.description || `Comprehensive PMIS visibility for ${selectedProject.name}. Tracking all governance outputs, financial performance, and resource utilization in real-time.`}
          </p>
        </div>
        
        <div className="shrink-0">
          <AIAssistant compact />
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Progress Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Strategic Milestones
            </h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-baseline gap-4">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">92.4%</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Progress</div>
              </div>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-lg shadow-blue-600/30"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              </div>
            </div>
            
            <div className="p-10 space-y-10">
              {[
                { label: 'Engineering & Design', progress: 100, color: 'bg-emerald-500' },
                { label: 'Procurement & Logistics', progress: 85, color: 'bg-blue-600' },
                { label: 'Site Mobilization', progress: 95, color: 'bg-emerald-500' },
                { label: 'Main Construction', progress: 42, color: 'bg-orange-500' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">{item.label}</span>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{item.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn("h-full rounded-full shadow-lg transition-all", item.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Center / Data Hub Links */}
        <div className="space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Critical Insights
            </h2>
          </div>
          
          <div className="space-y-4">
             {[
               { id: 'scop', label: 'Scope Baseline', icon: DraftingCompass, status: 'Completed', color: 'text-emerald-500' },
               { id: 'boq', label: 'Bill of Quantities', icon: Banknote, status: 'In Review', color: 'text-blue-500' },
               { id: 'risk', label: 'Risk Register', icon: AlertTriangle, status: 'Needs Action', color: 'text-rose-500' },
             ].map((output) => (
               <button 
                 key={output.id}
                 onClick={() => navigate(`/project/${selectedProject.id}/page/${output.id}`)}
                 className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-md transition-all group"
               >
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
                       <output.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <div className="text-[11px] font-black uppercase tracking-tight text-slate-900">{output.label}</div>
                       <div className={cn("text-[9px] font-black uppercase tracking-[0.2em]", output.color)}>{output.status}</div>
                    </div>
                 </div>
                 <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
               </button>
             ))}

             <div className="p-8 text-center bg-slate-950 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group mt-10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                   <Target className="w-20 h-20 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                   <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Health Score: 98</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">All systems operational. Governance frameworks fully implemented.</p>
                   </div>
                   <button className="w-full py-3 bg-white text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-400 hover:text-white transition-all active:scale-95 shadow-xl">
                      Generate Status Report
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
