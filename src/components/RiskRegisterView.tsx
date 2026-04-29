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
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    
    const unsubTeam = onSnapshot(collection(db, 'users'), (snap) => setTeam(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
    
    return () => { unsub(); unsubTeam(); };
  }, [selectedProject?.id]);

  const handleCreate = async () => {
    if (!newRisk.title || !selectedProject) {
      toast.error("Please provide a title");
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingRisk) {
        await updateDoc(doc(db, 'risks', editingRisk.id), {
          ...newRisk,
          updatedAt: serverTimestamp()
        });
        toast.success("Risk updated");
      } else {
        await addDoc(collection(db, 'risks'), {
          ...newRisk,
          projectId: selectedProject.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Risk identified and registered");
      }
      setView('list');
      setEditingRisk(null);
      setNewRisk({ probability: 3, impact: 3, responseStrategy: 'Mitigate', status: 'Open' } as any);
    } catch (err) {
      console.error(err);
      toast.error("Registration failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setNewRisk(risk);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to retire this risk record?")) return;
    try {
      await deleteDoc(doc(db, 'risks', id));
      toast.success("Risk entry retired");
    } catch (err) {
      toast.error("Deletion failed");
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
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={handleCreate}
      onPrint={handlePrint}
      isSaving={isSaving}
      inputs={[
        { id: '2.1.14', title: 'Risk Mgmt Plan', status: 'Approved' },
        { id: '2.2.5', title: 'WBS', status: 'Approved' }
      ]}
    >
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left Column: Risk Identification & Details */}
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
                        <ShieldAlert className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingRisk ? 'Update Risk Record' : 'Identify New Risk'}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Quantify uncertainty & link ownership</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    {/* Core Identification */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Risk Identification
                      </h3>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Risk Title / Description</label>
                        <input 
                          type="text"
                          value={newRisk.title}
                          onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none"
                          placeholder="e.g. Delay in custom marble delivery from Italy..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                          <select 
                            value={newRisk.category}
                            onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none appearance-none"
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Response Strategy</label>
                          <select 
                            value={newRisk.responseStrategy}
                            onChange={(e) => setNewRisk({ ...newRisk, responseStrategy: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none appearance-none"
                          >
                            {strategies.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </section>

                    {/* Ownership & Links */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Ownership & Domain Links
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Risk Owner</label>
                          <select 
                            value={newRisk.ownerId}
                            onChange={(e) => setNewRisk({ ...newRisk, ownerId: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none appearance-none"
                          >
                            <option value="">Select Owner...</option>
                            {team.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Linked WBS ID</label>
                          <input 
                            type="text"
                            value={newRisk.wbsId}
                            onChange={(e) => setNewRisk({ ...newRisk, wbsId: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none"
                            placeholder="e.g. 2.2.1.2 Finishes"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Status Toggle */}
                    <section className="space-y-6">
                       <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Operational Status
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        {['Open', 'Mitigated', 'Retired'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setNewRisk({ ...newRisk, status: s as any })}
                            className={cn(
                              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all",
                              newRisk.status === s 
                                ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </section>
              </div>

              {/* Right Column: Scoring & Impact Assessment */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-rose-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20 text-white">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400">Heat Map Scoring</h3>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">P × I Matrix Assessment</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Probability */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Probability</span>
                          <span className="text-xl font-black italic text-white">{newRisk.probability} / 5</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          {[1,2,3,4,5].map(v => (
                            <button 
                              key={`p-${v}`}
                              onClick={() => setNewRisk({ ...newRisk, probability: v })}
                              className={cn(
                                "flex-1 h-12 rounded-xl text-xs font-black transition-all",
                                newRisk.probability === v 
                                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                                  : "bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10"
                              )}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Impact */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Impact</span>
                          <span className="text-xl font-black italic text-white">{newRisk.impact} / 5</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          {[1,2,3,4,5].map(v => (
                            <button 
                              key={`i-${v}`}
                              onClick={() => setNewRisk({ ...newRisk, impact: v })}
                              className={cn(
                                "flex-1 h-12 rounded-xl text-xs font-black transition-all",
                                newRisk.impact === v 
                                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                                  : "bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10"
                              )}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Resulting Score */}
                      <div className={cn(
                        "p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group/score",
                        (newRisk.probability || 0) * (newRisk.impact || 0) >= 12 
                          ? "bg-rose-600/20 border-rose-600/30 shadow-lg shadow-rose-900/40" 
                          : "bg-emerald-600/10 border-emerald-600/20"
                      )}>
                        <div className="space-y-1">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] group-hover/score:text-rose-400 transition-colors">Exposure Level</div>
                           <div className="text-2xl font-black tracking-tighter text-white uppercase italic">
                              {(newRisk.probability || 0) * (newRisk.impact || 0) >= 12 ? 'High Threat' : 
                               (newRisk.probability || 0) * (newRisk.impact || 0) >= 6 ? 'Medium Concern' : 'Low Risk'}
                           </div>
                        </div>
                        <div className="text-4xl font-black italic text-white drop-shadow-2xl">
                          {(newRisk.probability || 0) * (newRisk.impact || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="p-8 bg-rose-50 rounded-[2.5rem] border border-rose-100 space-y-4">
                  <div className="flex items-center gap-3 text-rose-600">
                    <ShieldAlert className="w-5 h-5" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Governance Rule</h4>
                  </div>
                  <p className="text-[10px] text-rose-800 font-bold leading-relaxed opacity-70">
                    Risks with scores above 15 trigger an automated escalation email to the Project Sponsor and must be addressed in the weekly management review.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Risk Identification Log</h2>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Total Exposure: {risks.length} threats logged</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setView('form')}
                      className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Threat Record
                    </button>
                 </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/20 border-b border-slate-50">
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Risk Description</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">Exposure</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Owner / Structure</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Response</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">Status</th>
                          <th className="px-10 py-6"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {risks.length === 0 ? (
                         <tr>
                           <td colSpan={6} className="px-10 py-32 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner">
                                  <ShieldAlert className="w-12 h-12 text-slate-200" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">No threats identified in current project cycle.</p>
                              </div>
                           </td>
                         </tr>
                       ) : risks.sort((a,b) => (b.probability * b.impact) - (a.probability * a.impact)).map((risk, idx) => {
                          const owner = team.find(m => m.id === risk.ownerId);
                          const score = risk.probability * risk.impact;
                          return (
                            <tr key={`${risk.id}-${idx}`} onClick={() => handleEdit(risk)} className="hover:bg-slate-50 group cursor-pointer transition-colors relative overflow-hidden">
                               <td className="px-10 py-8 min-w-[300px] relative">
                                  {score >= 12 && (
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                                  )}
                                  <p className="text-sm font-black text-slate-900 tracking-tight leading-tight mb-2 italic uppercase">{risk.title}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{risk.category}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">ID: {risk.id.slice(0, 8)}</span>
                                  </div>
                               </td>
                               <td className="px-10 py-8 text-center w-[120px]">
                                  <div className={cn(
                                    "w-12 h-12 mx-auto inline-flex items-center justify-center rounded-[1.25rem] font-bold text-sm shadow-sm group-hover:scale-110 transition-transform italic",
                                    getScoreColor(risk.probability, risk.impact)
                                  )}>
                                     {score}
                                  </div>
                               </td>
                               <td className="px-10 py-8 w-[200px]">
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center">
                                          <User className="w-3 h-3 text-slate-400" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{owner?.name || 'Unassigned'}</p>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center">
                                          <Target className="w-3 h-3 text-slate-400" />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">{risk.wbsId || 'N/A'}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-8 w-[180px]">
                                  <div className="flex items-center gap-2">
                                     <div className={cn(
                                       "w-2 h-2 rounded-full",
                                       risk.responseStrategy === 'Avoid' ? "bg-rose-500" :
                                       risk.responseStrategy === 'Mitigate' ? "bg-amber-500" : "bg-blue-500"
                                     )} />
                                     <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">{risk.responseStrategy}</p>
                                  </div>
                               </td>
                               <td className="px-10 py-8 text-center w-[150px]">
                                   <span className={cn(
                                     "text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm",
                                     risk.status === 'Open' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                     risk.status === 'Mitigated' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500'
                                   )}>
                                      {risk.status}
                                   </span>
                               </td>
                               <td className="px-10 py-8 text-right">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleDelete(risk.id); }}
                                     className="opacity-0 group-hover:opacity-100 p-3 bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
            </div>

            {/* Strategic Dashboard Accents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row gap-10 items-center shadow-2xl">
                  <div className="flex-1 space-y-6 relative z-10">
                    <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center ring-1 ring-rose-500/30">
                      <Zap className="w-7 h-7 text-rose-400 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter leading-none uppercase">Risk<br/>Intelligence Hub</h3>
                    <p className="text-slate-400 font-bold leading-relaxed max-w-xl text-xs uppercase tracking-wide opacity-80">
                      Automated reserve analysis: P × I scores above 15 mandate a contingency budget allocation in the finance domain.
                    </p>
                  </div>
                  
                  <div className="flex-none grid grid-cols-2 gap-4 relative z-10">
                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 text-center backdrop-blur-sm group hover:bg-rose-500/10 transition-all duration-500 cursor-default">
                      <p className="text-[10px] font-black uppercase text-rose-400 mb-3 tracking-widest leading-none">Exposure Rank 1</p>
                      <p className="text-4xl font-black italic tracking-tighter text-white">
                        {risks.filter(r => r.probability * r.impact >= 12).length}
                      </p>
                       <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">High Severity</p>
                    </div>
                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 text-center backdrop-blur-sm hover:bg-emerald-500/10 transition-all duration-500 cursor-default">
                      <p className="text-[10px] font-black uppercase text-emerald-400 mb-3 tracking-widest leading-none">Mitigated</p>
                      <p className="text-4xl font-black italic tracking-tighter text-white">
                         {risks.filter(r => r.status === 'Mitigated').length}
                      </p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">Active Defenses</p>
                    </div>
                  </div>

                  <div className="absolute right-[-5%] bottom-[-10%] opacity-5 rotate-12 scale-150 pointer-events-none">
                    <ShieldAlert className="w-96 h-96" />
                  </div>
               </div>

               <div className="bg-amber-50 border border-amber-100 rounded-[3rem] p-10 flex flex-col justify-between items-start group">
                  <div className="space-y-6">
                    <div className="w-12 h-12 bg-amber-200/50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Info className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-lg font-black uppercase tracking-tighter italic text-amber-900 leading-none">Predictive Analytics<br/>Engaged</h4>
                      <p className="text-[10px] font-bold text-amber-800/60 leading-relaxed uppercase tracking-widest">
                        Zarya cross-references the Assumption Log (2.1.5). Unvalidated assumptions are tagged here as "Shadow Risks" until formally closed.
                      </p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 group-hover:gap-4 transition-all mt-8">
                    Review Assumption Links <ChevronDown className="w-3 h-3 -rotate-90" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};;
