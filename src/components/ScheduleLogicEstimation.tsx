import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  GitBranch, 
  Link2, 
  Clock, 
  ChevronRight, 
  Settings,
  Target,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  LayoutGrid,
  Calendar
} from 'lucide-react';
import { Page, Activity, ActivityDependency, DependencyType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { StandardProcessPage } from './StandardProcessPage';
import { ProjectScheduleView } from './ProjectScheduleView';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

interface ScheduleLogicEstimationProps {
  page: Page;
}

export const ScheduleLogicEstimation: React.FC<ScheduleLogicEstimationProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'activities'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  const updateActivityDependency = async (dependency: ActivityDependency) => {
    if (!selectedActivity) return;
    
    const existingDeps = selectedActivity.predecessors || [];
    const updatedDeps = [...existingDeps, dependency];
    
    try {
      await setDoc(doc(db, 'activities', selectedActivity.id), { predecessors: updatedDeps }, { merge: true });
      toast.success('Logic tie added');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `activities/${selectedActivity.id}`);
    }
  };

  const removeDependency = async (id: string) => {
    if (!selectedActivity) return;
    const updatedDeps = (selectedActivity.predecessors || []).filter(d => d.id !== id);
    try {
      await setDoc(doc(db, 'activities', selectedActivity.id), { predecessors: updatedDeps }, { merge: true });
      toast.success('Tie removed');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `activities/${selectedActivity.id}`);
    }
  };

  const [showGantt, setShowGantt] = useState(false);

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.3.1', title: 'Activity List', status: 'Approved' },
        { id: '2.1.11', title: 'Schedule Plan', status: 'Final' }
      ]}
      outputs={[
        { id: '2.3.2-OUT', title: 'Schedule Logic Matrix', status: 'Draft' }
      ]}
      onSave={() => setIsSaving(true)}
      isSaving={isSaving}
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
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Gantt Chart Tool</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Interactive Schedule Visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
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

        <header className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-400 shadow-xl shadow-slate-900/10 transition-transform hover:rotate-12">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic">Logic Builder</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Sequence & Estimate Duration Engine</p>
              </div>
            </div>
        </header>

        <section className="grid grid-cols-12 gap-8">
           {/* Activity List */}
           <div className="col-span-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Sequence</h3>
                <span className="text-[9px] font-bold text-slate-400 px-2 py-0.5 bg-slate-50 rounded-md ring-1 ring-slate-100">
                  {activities.length} ITEMS
                </span>
              </div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                {activities.map(act => (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivityId(act.id)}
                    className={cn(
                      "w-full px-5 py-4 rounded-[1.5rem] border text-left transition-all relative overflow-hidden group",
                      selectedActivityId === act.id 
                        ? "bg-white border-blue-500 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500" 
                        : "bg-white border-slate-100 text-slate-600 hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                       <span className={cn("text-[9px] font-black uppercase tracking-widest", selectedActivityId === act.id ? "text-blue-500" : "text-slate-400")}>{act.id}</span>
                       <div className="flex items-center gap-1.5">
                          <Link2 className={cn("w-3 h-3", (act.predecessors?.length || 0) > 0 ? "text-emerald-500" : "text-slate-200")} />
                          <span className="text-[9px] font-bold text-slate-400">{(act.predecessors?.length || 0)}</span>
                       </div>
                    </div>
                    <h4 className="text-sm font-black tracking-tight mb-3 line-clamp-1">{act.description}</h4>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase">{act.duration}d</span>
                       </div>
                       <div className="flex items-center gap-1 text-slate-400">
                          <LayoutGrid className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase">{act.workPackage}</span>
                       </div>
                    </div>
                  </button>
                ))}
              </div>
           </div>

           {/* Logic Editor */}
           <div className="col-span-8">
              {!selectedActivity ? (
                 <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 shadow-sm">
                       <Link2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Select a Lead activity</h3>
                       <p className="text-sm text-slate-500 max-w-sm mx-auto">Map the logical predecessors and estimate exact durations based on scope requirements.</p>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-8">
                    {/* Activity Title Block */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-10 -translate-y-10 blur-2xl" />
                       <div className="relative z-10 flex items-center justify-between">
                          <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">ACTIVE TARGET</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-1 bg-white/5 rounded-full border border-white/10">{selectedActivity.id}</span>
                             </div>
                             <h2 className="text-3xl font-black italic tracking-tighter leading-tight max-w-lg">
                                {selectedActivity.description}
                             </h2>
                          </div>
                          <div className="text-right space-y-2">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Phase</p>
                             <div className="px-4 py-2 bg-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest italic group hover:scale-105 transition-transform cursor-default">
                                {selectedActivity.workPackage}
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       {/* Duration Estimation */}
                       <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="w-3.5 h-3.5 bg-blue-500 rounded-full animate-pulse" />
                             <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Duration Estimation</h3>
                          </div>
                          
                          <div className="space-y-4">
                             <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Planned Days</label>
                                <div className="flex items-center gap-4">
                                   <input 
                                     type="number"
                                     value={selectedActivity.duration}
                                     onChange={(e) => {
                                       const d = parseInt(e.target.value) || 0;
                                       setDoc(doc(db, 'activities', selectedActivity.id), { duration: d }, { merge: true });
                                     }}
                                     className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-black italic focus:ring-4 focus:ring-blue-500/10 transition-all"
                                   />
                                   <div className="space-y-1">
                                      <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                                         <TrendingUp className="w-4 h-4" />
                                      </button>
                                      <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                                         <TrendingDown className="w-4 h-4" />
                                      </button>
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-4 p-4 border border-rose-100 bg-rose-50 rounded-2xl">
                                <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                                <p className="text-[10px] font-medium text-rose-900 leading-relaxed">
                                   Ensure duration estimates include buffers for material delivery (e.g. Concrete setting time).
                                </p>
                             </div>
                          </div>
                       </div>

                       {/* Predecessors Logic */}
                       <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                          <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full" />
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Predecessor Logic</h3>
                             </div>
                             <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                                Visual Engine
                             </button>
                          </div>

                          <div className="space-y-4">
                             {(selectedActivity.predecessors || []).map((dep) => (
                                <div key={dep.id} className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                                         <Link2 className="w-4 h-4" />
                                      </div>
                                      <div>
                                         <p className="text-[10px] font-black text-emerald-900 uppercase tracking-tighter">
                                            {activities.find(a => a.id === dep.activityId)?.description || 'Unknown'}
                                         </p>
                                         <span className="text-[9px] font-bold text-emerald-600/60 uppercase">{dep.type}</span>
                                      </div>
                                   </div>
                                   <button 
                                      onClick={() => removeDependency(dep.id || '')}
                                      className="text-emerald-300 hover:text-rose-500 transition-colors"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             ))}

                             <button className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all group">
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest group-hover:tracking-[0.15em] transition-all">Add Logic Tie</span>
                             </button>
                          </div>
                       </div>
                    </div>

                    {/* Logic Ties Details (Hidden/Collapsed) */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 flex items-center justify-between">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                             <LayoutGrid className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="text-sm font-black text-slate-900">Advanced Logic Settings</h4>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Leads, Lags, and Relationship Constraints</p>
                          </div>
                       </div>
                       <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
                          Open Logic Matrix
                       </button>
                    </div>
                 </div>
              )}
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};

const Plus: React.FC<{ className?: string }> = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>;
const Trash2: React.FC<{ className?: string }> = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
