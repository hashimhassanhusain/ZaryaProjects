import React, { useState } from 'react';
import { 
  Grid, 
  Info, 
  Save, 
  Loader2, 
  AlertTriangle,
  Target,
  Clock,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Shield,
  Search
} from 'lucide-react';
import { RiskEntry } from '../../types';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface RiskAssessmentTabProps {
  risks: RiskEntry[];
  projectId: string;
}

export const RiskAssessmentTab: React.FC<RiskAssessmentTabProps> = ({ risks, projectId }) => {
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedRisk = risks.find(r => r.id === selectedRiskId);

  const filteredRisks = risks.filter(r => 
    r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.riskId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const levels = [
    { value: 5, label: 'Very High', color: 'bg-red-500' },
    { value: 4, label: 'High', color: 'bg-orange-500' },
    { value: 3, label: 'Medium', color: 'bg-yellow-500' },
    { value: 2, label: 'Low', color: 'bg-emerald-500' },
    { value: 1, label: 'Very Low', color: 'bg-blue-500' }
  ];

  const getCellColor = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 15) return 'bg-red-500/80 hover:bg-red-500';
    if (score >= 8) return 'bg-amber-500/80 hover:bg-amber-500';
    return 'bg-emerald-500/80 hover:bg-emerald-500';
  };

  const handleCellClick = async (prob: number, imp: number) => {
    if (!selectedRisk) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      
      await updateDoc(doc(db, 'risks', selectedRisk.id), {
        probability: prob,
        impact: imp,
        score: prob * imp,
        updatedAt: timestamp,
        updatedBy: user
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'risks');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImpactUpdate = async (objective: 'scope' | 'quality' | 'schedule' | 'cost', value: number) => {
    if (!selectedRisk) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      
      const currentImpacts = selectedRisk.impacts || { scope: 1, quality: 1, schedule: 1, cost: 1 };
      const newImpacts = { ...currentImpacts, [objective]: value };
      
      // Overall impact is the max of individual impacts
      const overallImpact = Math.max(...Object.values(newImpacts) as number[]);

      await updateDoc(doc(db, 'risks', selectedRisk.id), {
        impacts: newImpacts,
        impact: overallImpact,
        score: selectedRisk.probability * overallImpact,
        updatedAt: timestamp,
        updatedBy: user
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'risks');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          Risk Assessment Matrix
        </h3>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search risks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Selection List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Select Risk to Assess
            </h3>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredRisks.map(risk => (
              <button
                key={risk.id}
                onClick={() => setSelectedRiskId(risk.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all group",
                  selectedRiskId === risk.id 
                    ? "bg-slate-900 border-slate-900 shadow-lg shadow-slate-200" 
                    : "bg-white border-slate-100 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-md",
                    selectedRiskId === risk.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {risk.riskId}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    selectedRiskId === risk.id ? "text-white/60" : "text-slate-400"
                  )}>
                    Score: {risk.score}
                  </span>
                </div>
                <p className={cn(
                  "text-xs font-bold line-clamp-2",
                  selectedRiskId === risk.id ? "text-white" : "text-slate-700"
                )}>
                  {risk.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
          <Info className="w-8 h-8 mb-4 text-blue-400" />
          <h4 className="font-bold mb-2">Matrix Guidance</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            High Probability (&ge;80%) and High Cost Impact (&gt;$10k) = <span className="text-red-400 font-bold">Red Zone Risk</span>.
            Map impacts to project objectives to determine overall severity.
          </p>
        </div>
        </div>

        {/* PI Matrix & Impact Mapping */}
        <div className="lg:col-span-2 space-y-8">
        {!selectedRisk ? (
          <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
            <Grid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Select a risk to begin assessment</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* PI Matrix */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Probability & Impact Matrix</h3>
                {isSaving && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>

              <div className="relative flex">
                {/* Y-Axis Label (Impact) */}
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">
                  Impact (Severity)
                </div>

                <div className="flex-1 ml-8">
                  <div className="grid grid-cols-6 gap-2">
                    {/* Empty corner */}
                    <div className="h-12"></div>
                    {/* X-Axis Labels (Probability) */}
                    {levels.slice().reverse().map(l => (
                      <div key={l.value} className="h-12 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-1">
                        {l.label}
                      </div>
                    ))}

                    {/* Matrix Rows */}
                    {levels.map(imp => (
                      <React.Fragment key={imp.value}>
                        {/* Y-Axis Label */}
                        <div className="h-24 flex items-center justify-end pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                          {imp.label}
                        </div>
                        {/* Cells */}
                        {levels.slice().reverse().map(prob => (
                          <button
                            key={`${prob.value}-${imp.value}`}
                            onClick={() => handleCellClick(prob.value, imp.value)}
                            className={cn(
                              "h-24 rounded-2xl transition-all relative group overflow-hidden border-2",
                              getCellColor(prob.value, imp.value),
                              selectedRisk.probability === prob.value && selectedRisk.impact === imp.value 
                                ? "border-white ring-4 ring-slate-900/10 scale-105 z-10" 
                                : "border-transparent"
                            )}
                          >
                            <div className="absolute inset-0 flex items-center justify-center text-white/20 font-black text-2xl group-hover:text-white/40 transition-colors">
                              {prob.value * imp.value}
                            </div>
                            {selectedRisk.probability === prob.value && selectedRisk.impact === imp.value && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                                  <CheckCircle2 className="w-6 h-6 text-slate-900" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* X-Axis Label */}
                  <div className="text-center mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Probability (Likelihood)
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Mapping */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-8">Impact Mapping to Objectives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { id: 'scope', label: 'Scope Impact', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { id: 'quality', label: 'Quality Impact', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { id: 'schedule', label: 'Schedule Impact', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { id: 'cost', label: 'Cost Impact', icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' }
                ].map(obj => (
                  <div key={obj.id} className="space-y-4 p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", obj.bg)}>
                        <obj.icon className={cn("w-5 h-5", obj.color)} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{obj.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          onClick={() => handleImpactUpdate(obj.id as any, val)}
                          className={cn(
                            "flex-1 h-10 rounded-xl font-black text-xs transition-all",
                            (selectedRisk.impacts?.[obj.id as keyof typeof selectedRisk.impacts] || 1) === val
                              ? "bg-slate-900 text-white shadow-lg"
                              : "bg-white text-slate-400 border border-slate-200 hover:border-slate-400"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
};
