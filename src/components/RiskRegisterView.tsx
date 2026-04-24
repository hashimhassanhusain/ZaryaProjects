import React, { useState, useEffect, useMemo } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Target, 
  User, 
  Zap, 
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { generateZaryaPDF } from '../lib/pdfService';
import { cn } from '../lib/utils';

interface Risk {
  id: string;
  title: string;
  category: string;
  probability: number; // 1-5
  impact: number; // 1-5
  ownerId: string;
  wbsId: string;
  responseStrategy: string;
  status: 'Open' | 'Mitigated' | 'Retired';
}

interface RiskRegisterViewProps {
  page: Page;
}

export const RiskRegisterView: React.FC<RiskRegisterViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatCurrency } = useCurrency();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [team, setTeam] = useState<{id: string, name: string}[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRisk, setNewRisk] = useState<Partial<Risk>>({
    title: '',
    category: 'Technical',
    probability: 3,
    impact: 3,
    ownerId: '',
    wbsId: '',
    responseStrategy: 'Mitigate',
    status: 'Open'
  });

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'risks'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snap) => setRisks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Risk))));
    
    // Static WBS IDs for now
    const unsubTeam = onSnapshot(collection(db, 'users'), (snap) => setTeam(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
    
    return () => { unsub(); unsubTeam(); };
  }, [selectedProject?.id]);

  const handleCreate = async () => {
    if (!newRisk.title || !selectedProject) return;
    try {
      await addDoc(collection(db, 'risks'), {
        ...newRisk,
        projectId: selectedProject.id,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewRisk({ probability: 3, impact: 3, strategy: 'Mitigate' } as any);
      toast.success("Risk identified and registered");
    } catch (err) {
      console.error(err);
      toast.error("Registration failed");
    }
  };

  const getScoreColor = (p: number, i: number) => {
    const score = p * i;
    if (score >= 12) return 'bg-rose-500 text-white';
    if (score >= 6) return 'bg-amber-500 text-white';
    return 'bg-emerald-500 text-white';
  };

  const categories = ['Technical', 'Financial', 'Commercial', 'Environmental', 'Political'];
  const strategies = ['Avoid', 'Mitigate', 'Transfer', 'Accept', 'Escalate'];

  const handlePrint = () => {
    generateZaryaPDF({
      page,
      project: selectedProject,
      data: risks,
      columns: ['Risk / ID', 'P', 'I', 'Score', 'Owner', 'Strategy', 'Status'],
      rows: risks.map(r => [
        `${r.title}\n(${r.id})`,
        r.probability,
        r.impact,
        r.probability * r.impact,
        team.find(m => m.id === r.ownerId)?.name || 'Unassigned',
        r.responseStrategy,
        r.status
      ])
    });
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.1.14', title: 'Risk Mgmt Plan', status: 'Approved' },
        { id: '2.2.9', title: 'WBS', status: 'Approved' }
      ]}
      outputs={[
        { id: '2.7.5-OUT', title: 'The Master Risk Register', status: 'Dynamic' }
      ]}
      onPrint={handlePrint}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Risk Defense Matrix</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Quantify uncertainty and link ownership to project breakdown structures.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all flex items-center gap-2",
              isAdding ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
            )}
          >
            {isAdding ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Plus className="w-4 h-4" />}
            {isAdding ? "Collapse Form" : "Identify Risk"}
          </button>
        </header>

        <AnimatePresence>
           {isAdding && (
             <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="bg-white border-2 border-rose-100 p-10 rounded-[2.5rem] shadow-2xl space-y-8"
             >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-semibold uppercase text-slate-400 italic">Risk Identification</label>
                         <input 
                           placeholder="e.g. Delay in custom marble delivery from Italy"
                           value={newRisk.title}
                           onChange={e => setNewRisk({...newRisk, title: e.target.value})}
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/10 transition-all"
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-400">Category</label>
                            <select 
                              value={newRisk.category}
                              onChange={e => setNewRisk({...newRisk, category: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                            >
                               {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-400">Response Strategy</label>
                            <select 
                              value={newRisk.responseStrategy}
                              onChange={e => setNewRisk({...newRisk, responseStrategy: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                            >
                               {strategies.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6 bg-slate-50 p-8 rounded-3xl">
                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <label className="text-[10px] font-semibold uppercase text-slate-400 block">Probability (1-5)</label>
                            <div className="flex justify-between items-center bg-white p-2 rounded-xl">
                               {[1,2,3,4,5].map(v => (
                                 <button 
                                   key={v}
                                   onClick={() => setNewRisk({...newRisk, probability: v})}
                                   className={`w-10 h-10 rounded-lg text-xs font-semibold transition-all ${newRisk.probability === v ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                                 >
                                   {v}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-4">
                            <label className="text-[10px] font-semibold uppercase text-slate-400 block">Impact (1-5)</label>
                            <div className="flex justify-between items-center bg-white p-2 rounded-xl">
                               {[1,2,3,4,5].map(v => (
                                 <button 
                                   key={v}
                                   onClick={() => setNewRisk({...newRisk, impact: v})}
                                   className={`w-10 h-10 rounded-lg text-xs font-semibold transition-all ${newRisk.impact === v ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                                 >
                                   {v}
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                         <p className="text-[10px] font-semibold uppercase text-slate-400">Risk Score (P × I)</p>
                         <div className={`px-4 py-1.5 rounded-full text-xs font-semibold ${(newRisk.probability || 0) * (newRisk.impact || 0) >= 12 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {(newRisk.probability || 0) * (newRisk.impact || 0)}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                   <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Linked Risk Owner (Resources)</label>
                      <select 
                        value={newRisk.ownerId}
                        onChange={e => setNewRisk({...newRisk, ownerId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                      >
                         <option value="">Select Owner...</option>
                         {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Linked WBS ID (Scope Domain)</label>
                      <input 
                        placeholder="e.g. 2.2.1.2 Finishes"
                        value={newRisk.wbsId}
                        onChange={e => setNewRisk({...newRisk, wbsId: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                      />
                   </div>
                </div>

                <div className="flex justify-end gap-3">
                   <button onClick={() => setIsAdding(false)} className="px-8 py-3 text-[10px] font-semibold uppercase text-slate-400">Discard</button>
                   <button onClick={handleCreate} className="px-10 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-semibold uppercase tracking-widest shadow-xl shadow-rose-600/20">Commit to Register</button>
                </div>
             </motion.div>
           )}
        </AnimatePresence>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Risk Description</th>
                    <th className="px-8 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest text-center">Score</th>
                    <th className="px-8 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Owner / WBS</th>
                    <th className="px-8 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Strategy</th>
                    <th className="px-8 py-6 text-[10px] font-semibold uppercase text-slate-400 tracking-widest text-center">Status</th>
                    <th className="px-8 py-6"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {risks.sort((a,b) => (b.probability * b.impact) - (a.probability * a.impact)).map(risk => {
                    const owner = team.find(m => m.id === risk.ownerId);
                    return (
                      <tr key={risk.id} className="hover:bg-slate-50/50 transition-all group">
                         <td className="px-8 py-6 max-w-md">
                            <p className="text-sm font-semibold text-slate-900 italic leading-tight mb-1">{risk.title}</p>
                            <span className="text-[9px] font-semibold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{risk.category}</span>
                         </td>
                         <td className="px-8 py-6 text-center">
                            <div className={`w-10 h-10 inline-flex items-center justify-center rounded-xl font-semibold text-xs shadow-sm group-hover:scale-110 transition-transform ${getScoreColor(risk.probability, risk.impact)}`}>
                               {risk.probability * risk.impact}
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-1.5 ">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <p className="text-[10px] font-bold text-slate-600">{owner?.name || 'Unassigned'}</p>
                               </div>
                               <div className="flex items-center gap-1.5">
                                  <Target className="w-3 h-3 text-slate-400" />
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">WBS: {risk.wbsId}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                               <p className="text-[10px] font-semibold uppercase text-slate-900">{risk.responseStrategy}</p>
                            </div>
                         </td>
                         <td className="px-8 py-6 text-center">
                             <span className={`text-[8px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                               risk.status === 'Open' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                               risk.status === 'Mitigated' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'
                             }`}>
                                {risk.status}
                             </span>
                         </td>
                         <td className="px-8 py-6 text-right">
                             <button 
                               onClick={() => deleteDoc(doc(db, 'risks', risk.id))}
                               className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                         </td>
                      </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>

        <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row gap-10 items-center">
           <div className="flex-1 space-y-6 relative z-10">
              <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                 <Zap className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-3xl font-semibold italic tracking-tighter leading-none">Automated<br/>Escalation Engine</h3>
              <p className="text-slate-400 font-medium leading-relaxed max-w-xl text-sm">
                 Risks with a score above **15** are automatically escalated to the Project Sponsor. Zarya calculates the **EMV (Expected Monetary Value)** for each threat and pulls it into the Finance Domain's Reserve Analysis.
              </p>
           </div>
           
           <div className="flex-none grid grid-cols-2 gap-4 relative z-10">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                 <p className="text-[9px] font-semibold uppercase text-rose-400 mb-2">High Exposure</p>
                 <p className="text-3xl font-semibold tracking-tighter">
                    {risks.filter(r => r.probability * r.impact >= 12).length}
                 </p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                 <p className="text-[9px] font-semibold uppercase text-rose-400 mb-2">Escalated</p>
                 <p className="text-3xl font-semibold tracking-tighter">
                    {risks.filter(r => r.probability * r.impact >= 16).length}
                 </p>
              </div>
           </div>

           <div className="absolute right-[-5%] bottom-[-10%] opacity-5 rotate-12">
              <ShieldAlert className="w-80 h-80" />
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
