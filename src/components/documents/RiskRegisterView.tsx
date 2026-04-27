import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  ChevronRight,
  Zap,
  Target,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../../context/ProjectContext';
import { useLanguage } from '../../context/LanguageContext';
import { RiskRegisterService } from '../../services/documentService';
import { RiskRegister } from '../../types/projectDocuments';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export const RiskRegisterView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [risks, setRisks] = useState<RiskRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newRisk, setNewRisk] = useState<Partial<RiskRegister>>({
    riskName: '',
    category: 'Opportunities',
    probability: 3,
    impact: 3,
    responseStrategy: 'Mitigate',
    owner: ''
  });

  useEffect(() => {
    if (selectedProject) {
      loadRisks();
    }
  }, [selectedProject]);

  const loadRisks = async () => {
    if (!selectedProject) return;
    setLoading(true);
    const data = await RiskRegisterService.getAllByProject(selectedProject.id);
    setRisks(data);
    setLoading(false);
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newRisk.riskName) return;

    const prob = Number(newRisk.probability) || 0;
    const imp = Number(newRisk.impact) || 0;

    await RiskRegisterService.create({
      projectId: selectedProject.id,
      riskName: newRisk.riskName,
      category: newRisk.category || 'Threats',
      probability: prob,
      impact: imp,
      riskScore: prob * imp,
      responseStrategy: newRisk.responseStrategy as any,
      owner: newRisk.owner || ''
    } as any);

    setShowAddModal(false);
    setNewRisk({
      riskName: '',
      category: 'Threats',
      probability: 3,
      impact: 3,
      responseStrategy: 'Mitigate',
      owner: ''
    });
    loadRisks();
  };

  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.riskName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || risk.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Threats', 'Opportunities', 'Strengths', 'Weaknesses'];

  const getRiskLevel = (score: number) => {
    if (score >= 15) return { label: 'High', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    if (score >= 8) return { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { label: 'Low', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  };

  return (
    <div className="space-y-6">
      {/* Risk Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="col-span-1 lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[200px]">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
           <div className="relative z-10">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('active_risk_exposure')}</div>
             <div className="text-4xl font-black italic tracking-tighter">
               {risks.reduce((acc, r) => acc + r.riskScore, 0)}
               <span className="text-xs font-normal text-slate-500 ml-2 not-italic">AGGREGATE SCORE</span>
             </div>
           </div>
           <div className="flex gap-4 relative z-10 mt-6">
             <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('opps')}</div>
                <div className="text-xl font-bold text-blue-400">{risks.filter(r => r.category === 'Opportunities').length}</div>
             </div>
             <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('threats')}</div>
                <div className="text-xl font-bold text-rose-400">{risks.filter(r => r.category === 'Threats').length}</div>
             </div>
           </div>
        </div>

        {/* Heatmap Preview Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-6 flex flex-col justify-between">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{t('probability_impact_matrix')}</h3>
              <BarChart3 className="w-5 h-5 text-slate-400" />
           </div>
           <div className="grid grid-cols-5 h-32 gap-1 mt-4">
              {Array.from({ length: 5 }).map((_, r) => (
                Array.from({ length: 5 }).map((_, c) => {
                  const score = (5-r) * (c+1);
                  return (
                    <div 
                      key={`${r}-${c}`}
                      className={cn(
                        "rounded-md transition-all border",
                        score >= 15 ? "bg-rose-500/10 border-rose-200" :
                        score >= 8 ? "bg-amber-500/10 border-amber-200" :
                        "bg-emerald-500/10 border-emerald-200"
                      )}
                    />
                  );
                })
              ))}
           </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={t('search_risks')}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
                onClick={() => setSelectedCategory('All')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
                  selectedCategory === 'All' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t('all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
                  selectedCategory === cat ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t(cat.toLowerCase())}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t('log_risk')}
          </button>
        </div>
      </div>

      {/* Risks Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-bottom border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('risk_event')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{t('p_x_i')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{t('score')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('strategy')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('owner')}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredRisks.map((risk) => {
                  const riskStyle = getRiskLevel(risk.riskScore);
                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={risk.id} 
                      className="hover:bg-slate-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110",
                             risk.category === 'Threats' ? "bg-rose-50 text-rose-500 border-rose-100" : 
                             risk.category === 'Opportunities' ? "bg-blue-50 text-blue-500 border-blue-100" :
                             "bg-slate-50 text-slate-400 border-slate-100"
                           )}>
                             {risk.category === 'Threats' ? <Flame className="w-5 h-5" /> : 
                              risk.category === 'Opportunities' ? <Zap className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                           </div>
                           <div className="space-y-1">
                             <div className="text-sm font-bold text-slate-900 line-clamp-1">{risk.riskName}</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t(risk.category.toLowerCase())}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold">
                            <span className="text-slate-400">P:</span> {risk.probability}
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-slate-400">I:</span> {risk.impact}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-xs font-black border",
                          riskStyle.color
                        )}>
                          {risk.riskScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          {risk.responseStrategy === 'Mitigate' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          {risk.responseStrategy === 'Avoid' && <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />}
                          {risk.responseStrategy === 'Accept' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {t(risk.responseStrategy.toLowerCase())}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500">{risk.owner || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 opacity-0 group-hover:opacity-100">
                           <MoreHorizontal className="w-4 h-4" />
                         </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

       {/* Add Risk Modal */}
       {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl -mr-24 -mt-24" />
            
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('identify_register_risk')}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('swot_integrated_analysis')}</p>
              </div>
            </div>

            <form onSubmit={handleAddRisk} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('risk_name')}</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-rose-500/20"
                  placeholder={t('risk_event_desc')}
                  value={newRisk.riskName}
                  onChange={e => setNewRisk({...newRisk, riskName: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('probability')} (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                       <button
                         key={v}
                         type="button"
                         onClick={() => setNewRisk({...newRisk, probability: v})}
                         className={cn(
                           "flex-1 h-12 rounded-xl text-sm font-black transition-all",
                           newRisk.probability === v ? "bg-slate-900 text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                         )}
                       >
                         {v}
                       </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('impact')} (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                       <button
                         key={v}
                         type="button"
                         onClick={() => setNewRisk({...newRisk, impact: v})}
                         className={cn(
                           "flex-1 h-12 rounded-xl text-sm font-black transition-all",
                           newRisk.impact === v ? "bg-slate-900 text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                         )}
                       >
                         {v}
                       </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('category')}</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-rose-500/20 appearance-none"
                    value={newRisk.category}
                    onChange={e => setNewRisk({...newRisk, category: e.target.value as any})}
                  >
                    {categories.map(c => <option key={c} value={c}>{t(c.toLowerCase())}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('response_strategy')}</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-rose-500/20 appearance-none"
                    value={newRisk.responseStrategy}
                    onChange={e => setNewRisk({...newRisk, responseStrategy: e.target.value as any})}
                  >
                    <option value="Mitigate">{t('mitigate')}</option>
                    <option value="Avoid">{t('avoid')}</option>
                    <option value="Transfer">{t('transfer')}</option>
                    <option value="Accept">{t('accept')}</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                >
                  {t('cancel_close')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-rose-500 transition-all shadow-2xl shadow-rose-600/30"
                >
                  {t('register_risk_record')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
