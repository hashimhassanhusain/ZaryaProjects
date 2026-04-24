import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Users,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  Search,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Page, Activity, Task } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { StandardProcessPage } from './StandardProcessPage';
import { ProjectScheduleView } from './ProjectScheduleView';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleCadenceDashboardProps {
  page: Page;
}

export const ScheduleCadenceDashboard: React.FC<ScheduleCadenceDashboardProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const qAct = query(collection(db, 'activities'), where('projectId', '==', selectedProject.id), where('status', '==', 'In Progress'));
    const unsubAct = onSnapshot(qAct, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    const qTask = query(collection(db, 'tasks'), where('projectId', '==', selectedProject.id));
    const unsubTask = onSnapshot(qTask, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    return () => {
      unsubAct();
      unsubTask();
    };
  }, [selectedProject?.id]);

  const [showGantt, setShowGantt] = useState(false);

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.3.3', title: 'Schedule Baseline', status: 'Approved' },
        { id: '2.6.21', title: 'Task Register', status: 'Live' }
      ]}
      outputs={[
        { id: '3.5.1-OUT', title: 'Daily Cadence Report', status: 'Ready' }
      ]}
    >
      <div className="space-y-8 pb-20">
        {/* Domain Tool: Gantt Chart Accordion */}
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
          <button 
            onClick={() => setShowGantt(!showGantt)}
            className="w-full px-8 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest">Gantt Chart Tool</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Interactive Cadence Visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {showGantt ? 'Hide Tool' : 'Launch Tool'}
              </span>
              <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", showGantt && "rotate-90")} />
            </div>
          </button>
          
          <AnimatePresence>
            {showGantt && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '600px', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 overflow-hidden"
              >
                <ProjectScheduleView page={page} hideHeader={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <header className="flex items-center justify-between">
           <div className="space-y-1">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Zap className="w-5 h-5 animate-pulse" />
                 </div>
                 <h2 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none italic">Cadence Dashboard</h2>
              </div>
              <p className="text-sm text-slate-500 font-medium ml-13">Monitoring daily work flow and execution synchronization.</p>
           </div>
           
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">Live Sync Active</span>
           </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Active Work Flow */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Current Work Flow (Active Activities)</h3>
                 <span className="text-[9px] font-bold text-slate-400">{activities.length} ACTIVE</span>
              </div>

              <div className="space-y-4">
                 {activities.map(act => (
                   <div key={act.id} className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-blue-500/5 transition-all">
                      <div className="flex items-start justify-between mb-6">
                         <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">{act.id}</span>
                            <h4 className="text-xl font-semibold text-slate-900 tracking-tight italic">{act.description}</h4>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-semibold uppercase">
                               {act.workPackage}
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6 mb-8">
                         <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Progress</p>
                            <p className="text-xl font-semibold text-slate-900 italic tracking-tighter">{act.percentComplete || 0}%</p>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Planned Finish</p>
                            <p className="text-sm font-semibold text-slate-900">{act.finishDate || '---'}</p>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Criticality</p>
                            <span className={cn(
                              "text-[9px] font-semibold uppercase",
                              act.isCritical ? "text-rose-500" : "text-emerald-500"
                            )}>
                               {act.isCritical ? 'Critical' : 'Standard'}
                            </span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                         <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                               <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 shadow-sm" />
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[8px] text-white font-semibold">
                               +5
                            </div>
                         </div>
                         <button className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-blue-600 hover:gap-3 transition-all">
                            View Child Tasks
                            <ArrowRight className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 ))}
                 
                 {activities.length === 0 && (
                   <div className="py-20 text-center space-y-4 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                      <Clock className="w-12 h-12 text-slate-200 mx-auto" />
                      <p className="text-slate-500 font-medium italic">No activities currently in progress.</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Side Panel: Daily Sync */}
           <div className="space-y-8">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold tracking-tight italic">Daily Sync Log</h3>
                    <Plus className="w-5 h-5 text-blue-400 cursor-pointer" />
                 </div>
                 
                 <div className="space-y-4">
                    {[
                      { topic: 'Morning Toolbox Talk', time: '07:30', status: 'Done' },
                      { topic: 'Concrete Pour Setup', time: '09:00', status: 'Done' },
                      { topic: 'Site Safety Walk', time: '13:00', status: 'Pending' },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                         <div className="space-y-1">
                            <p className="text-xs font-semibold">{log.topic}</p>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{log.time}</span>
                         </div>
                         <div className={cn(
                           "px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase",
                           log.status === 'Done' ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"
                         )}>
                            {log.status}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                 <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Live Coordination
                 </h3>
                 <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-2xl rounded-tl-none">
                       <p className="text-xs text-blue-900 leading-relaxed font-medium">Engineer: Team, ensure the curing agent is applied immediately after the morning pour.</p>
                       <span className="text-[8px] text-blue-400 font-bold uppercase mt-1 block">10:45 AM</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl rounded-tr-none ml-4">
                       <p className="text-xs text-slate-600 leading-relaxed font-medium">Supervisor: Copy that. Material is on-site.</p>
                       <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 block">10:52 AM</span>
                    </div>
                 </div>
                 <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Type a message..."
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
              </div>
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
