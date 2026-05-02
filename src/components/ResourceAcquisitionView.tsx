import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { UserPlus, Calendar, ShoppingCart, UserCheck, CheckCircle2, ChevronRight, LayoutGrid, Info, Search } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Resource {
  id: string;
  name: string;
  type: string;
  status: string;
  unitCost: number;
  unit: string;
}

interface Assignment {
  id: string;
  resourceId: string;
  taskId: string;
  startDate: string;
  endDate: string;
  status: 'Assigned' | 'Released';
}

interface ResourceAcquisitionViewProps {
  page: Page;
}

export const ResourceAcquisitionView: React.FC<ResourceAcquisitionViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatCurrency } = useCurrency();
  const [resources, setResources] = useState<Resource[]>([]);
  const [tasks, setTasks] = useState<{id: string, title: string}[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    resourceId: '',
    taskId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!selectedProject?.id) return;

    const qRes = query(collection(db, 'resources'), where('projectId', '==', selectedProject.id));
    const unsubRes = onSnapshot(qRes, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource))));

    const qTasks = query(collection(db, 'tasks'), where('projectId', '==', selectedProject.id));
    const unsubTasks = onSnapshot(qTasks, (snap) => setTasks(snap.docs.map(d => ({ id: d.id, title: d.data().title }))));

    const qAsgn = query(collection(db, 'resource-assignments'), where('projectId', '==', selectedProject.id));
    const unsubAsgn = onSnapshot(qAsgn, (snap) => setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment))));

    return () => {
      unsubRes();
      unsubTasks();
      unsubAsgn();
    };
  }, [selectedProject?.id]);

  const handleAssign = async () => {
    if (!newAssignment.resourceId || !newAssignment.taskId || !selectedProject) return;

    try {
      await addDoc(collection(db, 'resource-assignments'), {
        ...newAssignment,
        projectId: selectedProject.id,
        status: 'Assigned',
        createdAt: serverTimestamp()
      });

      // Update resource status to Busy
      await updateDoc(doc(db, 'resources', newAssignment.resourceId), { status: 'Busy' });

      setNewAssignment({ resourceId: '', taskId: '', startDate: '', endDate: '' });
      setIsAssigning(false);
      toast.success("Resource assigned successfully");
    } catch (err) {
      console.error(err);
      toast.error("Assignment failed");
    }
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.3.3', title: 'Schedule Baseline', status: 'Approved' },
        { id: '2.1.13', title: 'Sourcing Strategy', status: 'Approved' }
      ]}
      outputs={[
        { id: '3.3.1-OUT', title: 'Assignment Letter', status: 'Generated' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg text-white">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Resource Acquisition</h2>
              <p className="text-sm text-slate-500 font-medium">Securing and assigning project assets to specific activities.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAssigning(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Book Resource
          </button>
        </header>

        <AnimatePresence>
          {isAssigning && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white border-2 border-emerald-100 p-8 rounded-[2.5rem] shadow-2xl space-y-6"
            >
               <h3 className="text-lg font-semibold text-slate-900 italic">Booking Request</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                     <label className="text-[9px] font-semibold uppercase text-slate-400">Resource</label>
                     <select 
                       value={newAssignment.resourceId}
                       onChange={e => setNewAssignment({...newAssignment, resourceId: e.target.value})}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/10"
                     >
                        <option value="">Select Resource...</option>
                        {resources.filter(r => r.status === 'Available').map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-semibold uppercase text-slate-400">Project Task</label>
                     <select 
                       value={newAssignment.taskId}
                       onChange={e => setNewAssignment({...newAssignment, taskId: e.target.value})}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/10"
                     >
                        <option value="">Select Task...</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-semibold uppercase text-slate-400">Start Date</label>
                     <input type="date" value={newAssignment.startDate} onChange={e => setNewAssignment({...newAssignment, startDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-semibold uppercase text-slate-400">End Date</label>
                     <input type="date" value={newAssignment.endDate} onChange={e => setNewAssignment({...newAssignment, endDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                  </div>
               </div>
               <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                  <button onClick={() => setIsAssigning(false)} className="px-6 py-2 text-[10px] font-semibold uppercase text-slate-400">Cancel</button>
                  <button onClick={handleAssign} className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest shadow-lg shadow-emerald-600/20">Confirm Assignment</button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Current Jobs */}
           <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">Active Assignments</h3>
              <div className="space-y-4">
                 {assignments.filter(a => a.status === 'Assigned').map((asgn) => {
                   const res = resources.find(r => r.id === asgn.resourceId);
                   const tsk = tasks.find(t => t.id === asgn.taskId);
                   return (
                     <div key={asgn.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-emerald-50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 font-semibold shadow-sm group-hover:scale-110 transition-transform">
                              {res?.name[0]}
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">{res?.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 line-clamp-1">TASK: {tsk?.title}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-semibold text-slate-900 uppercase">{asgn.startDate}</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">UNTIL {asgn.endDate}</p>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>

           {/* Market / Acquisition Strategy */}
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-emerald-900/10">
              <div className="space-y-6 relative z-10">
                 <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-7 h-7 text-emerald-400" />
                 </div>
                 <h3 className="text-3xl font-semibold italic tracking-tighter leading-none">Internal vs External<br/>Acquisition</h3>
                 <p className="text-sm text-slate-400 font-medium leading-relaxed">
                   Project "PMIS" automates the **Make-or-Buy** evaluation. If internal resources are busy, it automatically pulls external pricing from the Sourcing Strategy hub.
                 </p>
              </div>

              <div className="pt-10 flex gap-4 relative z-10">
                 <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-semibold uppercase text-emerald-400 mb-1">Availability</p>
                    <p className="text-xl font-semibold">74%</p>
                 </div>
                 <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-semibold uppercase text-emerald-400 mb-1">Acquisition Speed</p>
                    <p className="text-xl font-semibold">2.4d</p>
                 </div>
              </div>
              
              <div className="absolute right-[-10%] bottom-[-10%] opacity-5 rotate-12">
                 <LayoutGrid className="w-64 h-64" />
              </div>
           </div>
        </div>
      </div>
    </StandardProcessPage>
  );
};
