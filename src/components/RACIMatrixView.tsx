import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { Grid, HelpCircle, CheckCircle2, AlertTriangle, User, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, updateDoc, doc, getDocs } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

interface RACIRow {
  id: string;
  taskTitle: string;
  assignments: Record<string, 'R' | 'A' | 'C' | 'I' | null>;
}

interface RACIMatrixViewProps {
  page: Page;
}

export const RACIMatrixView: React.FC<RACIMatrixViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [rows, setRows] = useState<RACIRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    
    // In a real app, we'd fetch WBS elements and their assignments
    // For now, simulating based on tasks linked to the project
    const q = query(collection(db, 'tasks'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setRows(snapshot.docs.map(d => ({
        id: d.id,
        taskTitle: d.data().title,
        assignments: d.data().raci || {}
      })));
    });

    // Fetch team members
    const fetchTeam = async () => {
       const uSnap = await getDocs(collection(db, 'users'));
       setTeamMembers(uSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
    };
    fetchTeam();

    return () => unsub();
  }, [selectedProject?.id]);

  const updateRACI = async (taskId: string, userId: string, role: 'R' | 'A' | 'C' | 'I' | null) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const row = rows.find(r => r.id === taskId);
      if (!row) return;

      const newAssignments = { ...row.assignments, [userId]: role };
      
      // Enforce logic: Only one 'A' (Accountable) per task
      if (role === 'A') {
        Object.keys(newAssignments).forEach(uid => {
          if (uid !== userId && newAssignments[uid] === 'A') {
            newAssignments[uid] = null;
          }
        });
      }

      await updateDoc(taskRef, { raci: newAssignments });
      toast.success("Assignment updated");
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'R': return 'bg-blue-600 text-white';
      case 'A': return 'bg-rose-600 text-white ring-4 ring-rose-100';
      case 'C': return 'bg-amber-500 text-white';
      case 'I': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.1.9', title: 'Scope Management Plan', status: 'Approved' },
        { id: '2.2.5', title: 'WBS', status: 'Approved' }
      ]}
      outputs={[
        { id: '2.6.5-OUT', title: 'Project RACI Chart', status: 'Locked' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg text-white">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Interactive RACI Matrix</h2>
            <p className="text-sm text-slate-500 font-medium">Assign Responsibility (R), Accountability (A), Consultation (C), and Information (I) roles.</p>
          </div>
        </header>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest border-b border-slate-100 sticky left-0 bg-white z-10 w-64">
                      Work Package / Task
                    </th>
                    {teamMembers.map(m => (
                      <th key={m.id} className="px-6 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest border-b border-slate-100 text-center min-w-[120px]">
                        {m.name}
                      </th>
                    ))}
                    <th className="px-6 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest border-b border-slate-100 text-center">
                       Integrity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row) => {
                    const hasAccountable = Object.values(row.assignments).includes('A');
                    const hasResponsible = Object.values(row.assignments).includes('R');

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6 border-r border-slate-50 sticky left-0 bg-white z-10">
                           <p className="text-xs font-semibold text-slate-900 italic">{row.taskTitle}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">ID: {row.id.substring(0, 8)}</p>
                        </td>
                        {teamMembers.map(m => (
                          <td key={m.id} className="px-4 py-6">
                             <div className="flex justify-center">
                                <select 
                                  value={row.assignments[m.id] || ''}
                                  onChange={(e) => updateRACI(row.id, m.id, (e.target.value || null) as any)}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold appearance-none text-center cursor-pointer transition-all hover:scale-110 ${getRoleColor(row.assignments[m.id] || null)}`}
                                >
                                   <option value="">-</option>
                                   <option value="R">R</option>
                                   <option value="A">A</option>
                                   <option value="C">C</option>
                                   <option value="I">I</option>
                                </select>
                             </div>
                          </td>
                        ))}
                        <td className="px-6 py-6 border-l border-slate-50">
                           <div className="flex justify-center gap-2">
                              {hasAccountable ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-500" title="Missing A (Accountable)" />
                              )}
                              {!hasResponsible && <HelpCircle className="w-4 h-4 text-amber-500" title="Missing R (Responsible)" />}
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
             { role: 'Responsible (R)', desc: 'The person who performs the work.', color: 'bg-blue-600' },
             { role: 'Accountable (A)', desc: 'The person with final approval (MANDATORY).', color: 'bg-rose-600' },
             { role: 'Consulted (C)', desc: 'Provides input and opinion.', color: 'bg-amber-500' },
             { role: 'Informed (I)', desc: 'Needs to be kept in the loop.', color: 'bg-emerald-500' },
           ].map((item) => (
             <div key={item.role} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${item.color}`} />
                   <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">{item.role}</p>
                </div>
                <p className="text-[11px] font-medium text-slate-500">{item.desc}</p>
             </div>
           ))}
        </div>

        <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
           <div className="relative z-10 space-y-6 max-w-2xl">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                 <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold italic tracking-tighter">Governance Enforcement</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                 Zarya's smart matrix ensures project integrity by enforcing the **"Golden Rule"**: Every task MUST have exactly one Accountable (A) role. Any deviation will alert the PMO and block final schedule baseline approval.
              </p>
           </div>
           
           <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 opacity-10">
              <Grid className="w-64 h-64 text-white" />
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
