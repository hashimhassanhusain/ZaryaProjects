import React, { useState, useEffect, useMemo } from 'react';
import { Page, EntityConfig } from '../types';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
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
import { useLanguage } from '../context/LanguageContext';
import { UniversalDataTable } from './common/UniversalDataTable';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { generateStandardPDF } from '../lib/pdfService';
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
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const { formatAmount } = useCurrency();
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

  const handlePrint = () => {
    const columns = ['Risk Description', 'Category', 'P', 'I', 'Score', 'Status'];
    const rows = risks.map(r => [
      r.title,
      r.category,
      r.probability,
      r.impact,
      r.probability * r.impact,
      r.status
    ]);

    generateStandardPDF({
      page,
      project: selectedProject,
      data: risks,
      columns,
      rows
    });
  };

  const getScoreColor = (p: number, i: number) => {
    const score = p * i;
    if (score >= 12) return 'bg-rose-500 text-white';
    if (score >= 6) return 'bg-amber-500 text-white';
    return 'bg-emerald-500 text-white';
  };

  const categories = ['Technical', 'Financial', 'Commercial', 'Environmental', 'Political'];
  const strategies = ['Avoid', 'Mitigate', 'Transfer', 'Accept', 'Escalate'];

  const gridConfig: EntityConfig = {
    id: 'risks',
    label: t('risk_register'),
    icon: ShieldAlert,
    collection: 'risks',
    columns: [
      { key: 'title', label: t('risk_description'), type: 'string' },
      { key: 'category', label: t('category'), type: 'badge' },
      { key: 'probability', label: 'P', type: 'number' },
      { key: 'impact', label: 'I', type: 'number' },
      { key: 'responseStrategy', label: t('strategy'), type: 'badge' },
      { key: 'status', label: t('status'), type: 'badge' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' }
    ]
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
            <div className="flex justify-end pr-2">
              <button 
                onClick={() => setView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
              >
                <ChevronDown className="w-3 h-3 rotate-90" />
                {t('back_to_list')}
              </button>
            </div>
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
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none appearance-none"
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Response Strategy</label>
                          <select 
                            value={newRisk.responseStrategy}
                            onChange={(e) => setNewRisk({ ...newRisk, responseStrategy: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none appearance-none"
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
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none appearance-none"
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
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none"
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
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 flex-1 flex flex-col"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={risks}
              onRowClick={handleEdit}
              onNewClick={() => {
                setEditingRisk(null);
                setNewRisk({ probability: 3, impact: 3, responseStrategy: 'Mitigate', status: 'Open' } as any);
                setView('form');
              }}
              onDeleteRecord={handleDelete}
              title={useStandardProcessPage()?.pageHeader}
              favoriteControl={useStandardProcessPage()?.favoriteControl}
            />

            {/* Strategic Dashboard Accents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
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
                        PMIS cross-references the Assumption Log (2.1.5). Unvalidated assumptions are tagged here as "Shadow Risks" until formally closed.
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
