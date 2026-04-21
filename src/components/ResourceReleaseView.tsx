import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { CheckCircle, ShieldCheck, UserMinus, FileText, Download, Award, AlertCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

interface Assignment {
  id: string;
  resourceId: string;
  taskId: string;
  status: string;
  resourceName?: string;
  taskTitle?: string;
}

interface ResourceReleaseViewProps {
  page: Page;
}

export const ResourceReleaseView: React.FC<ResourceReleaseViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'resource-assignments'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, async (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const handleRelease = async (asgn: Assignment) => {
    try {
      await updateDoc(doc(db, 'resource-assignments', asgn.id), { status: 'Released' });
      await updateDoc(doc(db, 'resources', asgn.resourceId), { status: 'Available' });
      toast.success("Resource released successfully");
    } catch (err) {
      console.error(err);
      toast.error("Release failed");
    }
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '5.1.2', title: 'Project Closure', status: 'In Progress' }
      ]}
      outputs={[
        { id: '5.3.1-OUT', title: 'Release Certificate', status: 'Generated' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg text-white">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Resource Release Hub</h2>
            <p className="text-sm text-slate-500 font-medium">Verify completion and formally release human and physical assets.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Pending Release Assignments</h3>
                 <div className="space-y-4">
                    {assignments.filter(a => a.status === 'Assigned').map((a) => (
                      <div key={a.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 transition-transform group-hover:rotate-12">
                               <UserMinus className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 uppercase">Resource ID: {a.resourceId.substring(0,8)}</p>
                               <p className="text-[10px] font-bold text-slate-400">ASSIGNMENT ID: {a.id}</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleRelease(a)}
                           className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                         >
                            Approve Release
                         </button>
                      </div>
                    ))}
                    {assignments.filter(a => a.status === 'Assigned').length === 0 && (
                      <div className="text-center py-20 grayscale opacity-30">
                         <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                         <p className="text-[10px] font-black uppercase tracking-widest">All Resources Released</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-emerald-900/10">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-400" />
                 </div>
                 <h3 className="text-xl font-black italic tracking-tighter">Release Protocols</h3>
                 <p className="text-sm text-slate-400 font-medium leading-relaxed">
                   Releasing a resource triggers two automated workflows:
                   <br/><br/>
                   1. **Equipment:** Final maintenance log submission.
                   <br/>
                   2. **Staff:** Performance evaluation archival to "Knowledge Management".
                 </p>
              </div>

              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Certificate Status</h3>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Staff Evaluations</span>
                       <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-50">
                       <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Equip. Handover</span>
                       <AlertCircle className="w-4 h-4 text-rose-500" />
                    </div>
                 </div>
                 <button className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Generate Certificate
                 </button>
              </div>
           </div>
        </div>
      </div>
    </StandardProcessPage>
  );
};
