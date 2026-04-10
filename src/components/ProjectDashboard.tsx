import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { motion } from 'motion/react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  Users,
  ShieldCheck,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  DraftingCompass,
  Banknote,
  Package,
  Building,
  MapPin
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { AIAssistant } from './AIAssistant';

const KPICard = ({ title, value, subValue, trend, trendValue, icon: Icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
          trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
        {subValue && <span className="text-sm font-medium text-slate-400">{subValue}</span>}
      </div>
    </div>
  </motion.div>
);

export const ProjectDashboard: React.FC = () => {
  const { selectedProject, setSelectedProject, projects, loading } = useProject();
  const { projectId } = useParams();
  const [boqTotal, setBoqTotal] = useState(0);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project && (!selectedProject || selectedProject.id !== project.id)) {
        setSelectedProject(project);
      }
    }
  }, [projectId, projects, selectedProject, setSelectedProject]);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(collection(db, 'boq'), where('projectId', '==', selectedProject.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      setBoqTotal(total);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 font-medium">Loading project data...</div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-slate-400 font-medium">No project selected or found.</div>
        <p className="text-sm text-slate-500">Please select a project from the header or create a new one.</p>
      </div>
    );
  }

  // Dynamic data based on project
  const getProjectData = (id: string) => {
    return {
      kpis: [
        { title: 'Governance', value: '0%', subValue: 'N/A', icon: Shield, color: 'bg-slate-400' },
        { title: 'Scope', value: '0%', subValue: 'N/A', icon: DraftingCompass, color: 'bg-slate-400' },
        { title: 'Schedule', value: '0%', subValue: 'N/A', icon: Calendar, color: 'bg-slate-400' },
        { title: 'Finance', value: formatCurrency(boqTotal), subValue: 'BOQ Total', icon: Banknote, color: 'bg-blue-600' },
      ],
      alerts: []
    };
  };

  const data = getProjectData(selectedProject.id);

  return (
    <div className="space-y-10">
      <header className="flex flex-col xl:flex-row xl:items-start justify-between gap-8">
        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-widest">
              <Target className="w-4 h-4" />
              Project Executive Dashboard
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              {selectedProject.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium text-sm">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{selectedProject.code}</span>
              {selectedProject.customer && <span className="flex items-center gap-1.5"><Building className="w-4 h-4 text-slate-400" /> {selectedProject.customer}</span>}
              {selectedProject.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {selectedProject.location}</span>}
            </div>
          </div>
          <p className="text-slate-500 max-w-2xl font-medium leading-relaxed">
            {selectedProject.description || `Real-time performance metrics and strategic indicators for ${selectedProject.name}.`}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-blue-500" />
              <div className="text-sm font-semibold text-slate-800">
                {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString('en-GB') : 'N/A'} 
                {selectedProject.endDate && ` - ${new Date(selectedProject.endDate).toLocaleDateString('en-GB')}`}
              </div>
            </div>
            {selectedProject.sponsor && (
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div className="text-sm font-semibold text-slate-800">{selectedProject.sponsor}</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="shrink-0 flex justify-center xl:justify-end">
          <AIAssistant compact />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map((kpi: any, idx: number) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Strategic Performance
            </h2>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View Full Report</button>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="text-2xl font-bold text-slate-900">92.4%</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Overall Completion</div>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              </div>
            </div>
            <div className="p-8 space-y-8">
              {[
                { label: 'Engineering & Design', progress: 100, color: 'bg-emerald-500' },
                { label: 'Procurement & Logistics', progress: 85, color: 'bg-blue-600' },
                { label: 'Site Preparation', progress: 95, color: 'bg-emerald-500' },
                { label: 'Main Construction', progress: 42, color: 'bg-orange-500' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="text-slate-900">{item.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      className={cn("h-full rounded-full", item.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Critical Alerts
          </h2>
          <div className="space-y-4">
            {data.alerts.map((alert: any, idx: number) => (
              <div key={idx} className={cn(
                "p-4 rounded-2xl border flex gap-4",
                alert.type === 'error' ? "bg-rose-50 border-rose-100" : "bg-orange-50 border-orange-100"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  alert.type === 'error' ? "bg-rose-500 text-white" : "bg-orange-500 text-white"
                )}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">
                    {alert.type === 'error' ? 'Critical Action Required' : 'Project Warning'}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {alert.msg}
                  </p>
                </div>
              </div>
            ))}
            {data.alerts.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">All systems operational</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
