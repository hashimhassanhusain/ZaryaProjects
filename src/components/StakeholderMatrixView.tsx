import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { LayoutGrid, Users, Target, Info, ShieldAlert, Crosshair } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  power: number; // 0 to 100
  interest: number; // 0 to 100
  priority: 'High' | 'Medium' | 'Low';
}

interface StakeholderMatrixViewProps {
  page: Page;
}

export const StakeholderMatrixView: React.FC<StakeholderMatrixViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const seen = new Set();
      const uniqueStakeholders = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Stakeholder))
        .filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
      setStakeholders(uniqueStakeholders);
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const updateStakeholderPosition = async (id: string, power: number, interest: number) => {
    try {
      await updateDoc(doc(db, 'stakeholders', id), { power, interest });
    } catch (err) {
      console.error("Failed to update position:", err);
    }
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '1.1.1', title: 'Project Charter', status: 'Approved' }
      ]}
      outputs={[
        { id: '1.2.1-OUT', title: 'Stakeholder Classification', status: 'Draft' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg text-white">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Power / Interest Matrix</h2>
            <p className="text-sm text-slate-500 font-medium">Prioritize stakeholders based on their influence and level of concern.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Matrix Area - 3 Columns */}
          <div className="lg:col-span-3 space-y-6">
            <div className="aspect-square bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative p-8">
              {/* Axes Labels */}
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Power (Influence)
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Interest (Expectation)
              </div>

              {/* Quadrants Backdrop */}
              <div className="grid grid-cols-2 grid-rows-2 h-full w-full border-2 border-slate-900/5 rounded-3xl overflow-hidden relative">
                {/* Quadrant Titles */}
                <div className="p-4 flex flex-col items-center justify-center text-center bg-amber-50/30 border-r border-b border-slate-100">
                   <p className="text-[10px] font-semibold uppercase text-amber-600 mb-1 opacity-40">Manage Closely</p>
                   <p className="text-xs font-bold text-slate-900 leading-tight">High Power<br/>High Interest</p>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-center bg-blue-50/30 border-b border-slate-100">
                   <p className="text-[10px] font-semibold uppercase text-blue-600 mb-1 opacity-40">Keep Informed</p>
                   <p className="text-xs font-bold text-slate-900 leading-tight">Low Power<br/>High Interest</p>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-center bg-emerald-50/30 border-r border-slate-100">
                   <p className="text-[10px] font-semibold uppercase text-emerald-600 mb-1 opacity-40">Keep Satisfied</p>
                   <p className="text-xs font-bold text-slate-900 leading-tight">High Power<br/>Low Interest</p>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-center bg-slate-50/20">
                   <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1 opacity-40">Monitor</p>
                   <p className="text-xs font-bold text-slate-900 leading-tight">Low Power<br/>Low Interest</p>
                </div>

                {/* Target Crosshair */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-slate-900/5" />
                <div className="absolute left-1/2 top-0 w-px h-full bg-slate-900/5" />

                {/* Stakeholder Points */}
                <div className="absolute inset-0">
                   {stakeholders.map((sh) => (
                     <motion.div
                       key={sh.id}
                       layoutId={sh.id}
                       drag
                       dragMomentum={false}
                       onDragEnd={(e, info) => {
                         // Very simplified coordinate mapping logic
                         const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
                         if (rect) {
                            const p = Math.max(0, Math.min(100, 100 - ((info.point.y - rect.top) / rect.height) * 100));
                            const i = Math.max(0, Math.min(100, ((info.point.x - rect.left) / rect.width) * 100));
                            updateStakeholderPosition(sh.id, p, i);
                         }
                       }}
                       style={{ 
                         left: `${sh.interest}%`, 
                         bottom: `${sh.power}%`,
                         transform: 'translate(-50%, 50%)'
                       }}
                       className="absolute w-8 h-8 group cursor-grab active:cursor-grabbing z-10"
                     >
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-125 transition-transform">
                           <span className="text-[10px] font-bold">{sh.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-[9px] font-semibold uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                           {sh.name}
                        </div>
                     </motion.div>
                   ))}
                </div>
              </div>
            </div>
          </div>

          {/* List Area - 1 Column */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
               <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-6 italic">Priority Stakeholders</h3>
               <div className="space-y-4">
                  {stakeholders.sort((a,b) => (b.power + b.interest) - (a.power + a.interest)).slice(0, 5).map((sh) => (
                    <div key={sh.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-purple-50 transition-colors group cursor-pointer">
                       <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-purple-600 font-bold group-hover:shadow-md transition-all">
                          {sh.name[0]}
                       </div>
                       <div>
                          <p className="text-xs font-semibold text-slate-900 line-clamp-1">{sh.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sh.role}</p>
                       </div>
                    </div>
                  ))}
                  {stakeholders.length === 0 && (
                     <div className="text-center py-10">
                        <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Stakeholders Found</p>
                     </div>
                  )}
               </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-purple-900/10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-purple-400" />
               </div>
               <h4 className="text-xl font-semibold italic tracking-tight">Classification Logic</h4>
               <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  Moving a stakeholder to the top-right quadrant (High Power, High Interest) automatically shifts their engagement requirements to **"Manage Closely"**.
               </p>
            </div>
          </div>
        </div>
      </div>
    </StandardProcessPage>
  );
};
