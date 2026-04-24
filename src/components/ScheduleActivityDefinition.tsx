import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  List, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Layers, 
  Target,
  Search,
  Filter,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Calendar
} from 'lucide-react';
import { Page, Activity, WBSLevel } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { StandardProcessPage } from './StandardProcessPage';
import { ProjectScheduleView } from './ProjectScheduleView';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

interface ScheduleActivityDefinitionProps {
  page: Page;
}

export const ScheduleActivityDefinition: React.FC<ScheduleActivityDefinitionProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id) return;

    const qWbs = query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id), where('type', '==', 'Work Package'));
    const unsubWbs = onSnapshot(qWbs, (snapshot) => {
      setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
    });

    const qAct = query(collection(db, 'activities'), where('projectId', '==', selectedProject.id));
    const unsubAct = onSnapshot(qAct, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    return () => {
      unsubWbs();
      unsubAct();
    };
  }, [selectedProject?.id]);

  const filteredActivities = activities.filter(a => 
    (!selectedWbsId || a.wbsId === selectedWbsId) &&
    (a.description.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addActivity = async () => {
    if (!selectedProject || !selectedWbsId) {
      toast.error('Please select a Work Package first');
      return;
    }

    const newId = `ACT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const newActivity: Activity = {
      id: newId,
      projectId: selectedProject.id,
      wbsId: selectedWbsId,
      workPackage: wbsLevels.find(w => w.id === selectedWbsId)?.title || '',
      description: 'New Activity',
      unit: 'Each',
      quantity: 1,
      rate: 0,
      amount: 0,
      status: 'Not Started',
      activityType: 'Task',
      startDate: new Date().toISOString().split('T')[0],
      duration: 1,
      finishDate: new Date().toISOString().split('T')[0],
      percentComplete: 0
    };

    try {
      await setDoc(doc(db, 'activities', newId), newActivity);
      toast.success('Activity added');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `activities/${newId}`);
    }
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      await setDoc(doc(db, 'activities', id), { ...activities.find(a => a.id === id), ...updates }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `activities/${id}`);
    }
  };

  const deleteActivity = async (id: string) => {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await deleteDoc(doc(db, 'activities', id));
      toast.success('Activity deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `activities/${id}`);
    }
  };

  const [showGantt, setShowGantt] = useState(false);

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.2.5', title: 'WBS', status: 'Approved' },
        { id: '2.2.7', title: 'Work Packages', status: 'Ready' }
      ]}
      outputs={[
        { id: '2.3.1-OUT', title: 'Activity List', status: 'Draft' }
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
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest">Gantt Chart Tool</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Interactive Schedule Visualization</p>
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
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10 text-xl font-semibold italic">
                A
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Define Activities</h2>
            </div>
            <p className="text-sm text-slate-500 font-medium ml-13">Breaking down Work Packages into executable tasks.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all w-64"
              />
            </div>
            <button
               onClick={addActivity}
               className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
               <Plus className="w-4 h-4" />
               New Activity
            </button>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-8">
          {/* WP Selector Side */}
          <div className="col-span-4 space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Work Packages</h3>
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
              {wbsLevels.map(wp => (
                <button
                  key={wp.id}
                  onClick={() => setSelectedWbsId(wp.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                    selectedWbsId === wp.id 
                      ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10" 
                      : "bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[8px] font-semibold uppercase tracking-widest", selectedWbsId === wp.id ? "text-blue-400" : "text-slate-400")}>
                      {wp.code}
                    </span>
                    {selectedWbsId === wp.id && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                  </div>
                  <h4 className="text-sm font-semibold truncate">{stripNumericPrefix(wp.title)}</h4>
                  <div className="flex items-center gap-2 mt-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full", selectedWbsId === wp.id ? "bg-blue-400 animate-pulse" : "bg-slate-200")} />
                    <span className={cn("text-[9px] font-bold uppercase", selectedWbsId === wp.id ? "text-slate-400" : "text-slate-400")}>
                      {activities.filter(a => a.wbsId === wp.id).length} Activities
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Activity List Side */}
          <div className="col-span-8 space-y-6">
            {!selectedWbsId ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-sm ring-1 ring-slate-100">
                  <Target className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Select a Work Package</h3>
                  <p className="text-xs text-slate-500 max-w-xs">You must choose a WBS Work Package from the left to start defining detailed activities.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-900">Activity Breakdown</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                    {filteredActivities.length} FOUND
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredActivities.map((act) => (
                    <motion.div 
                      layout
                      key={act.id}
                      className="group p-5 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:shadow-blue-500/5 transition-all flex items-center gap-6"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <Clock className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <input 
                            type="text"
                            value={act.description}
                            onChange={(e) => updateActivity(act.id, { description: e.target.value })}
                            className="text-lg font-semibold text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full"
                          />
                          <span className="text-[9px] font-semibold text-slate-300 uppercase shrink-0">{act.id}</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Duration:</span>
                            <input 
                              type="number"
                              value={act.duration}
                              onChange={(e) => updateActivity(act.id, { duration: parseInt(e.target.value) || 0 })}
                              className="w-12 h-7 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-center focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Days</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Status:</span>
                            <select 
                              value={act.status}
                              onChange={(e) => updateActivity(act.id, { status: e.target.value as any })}
                              className="h-7 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-semibold uppercase focus:ring-1 focus:ring-blue-500"
                            >
                              <option>Not Started</option>
                              <option>In Progress</option>
                              <option>Completed</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteActivity(act.id)}
                        className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}

                  {filteredActivities.length === 0 && (
                    <div className="py-20 text-center space-y-4 bg-white border border-slate-100 rounded-[3rem]">
                       <Plus className="w-12 h-12 text-slate-100 mx-auto" />
                       <div className="space-y-1">
                          <p className="text-slate-900 font-bold italic">No activities yet.</p>
                          <button 
                            onClick={addActivity}
                            className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 hover:underline"
                          >
                            Click to add your first activity
                          </button>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10">
                 <Settings className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                 <h4 className="text-xl font-semibold tracking-tight">Consolidation Phase</h4>
                 <p className="text-sm text-slate-400 font-medium">Once all activities are defined, link them in the <span className="text-white underline underline-offset-4 font-bold">Sequence & Estimate</span> tool.</p>
              </div>
           </div>
           
           <div className="flex items-center gap-8">
              <div className="text-right">
                 <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Project Tasks</p>
                 <p className="text-3xl font-semibold italic tracking-tighter">{activities.length}</p>
              </div>
              <button className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-[11px] font-semibold uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                 Link Logic Ties
                 <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
