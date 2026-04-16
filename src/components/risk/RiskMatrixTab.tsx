import React, { useState } from 'react';
import { 
  Grid, 
  Info, 
  AlertTriangle,
  Search,
  Maximize2,
  X
} from 'lucide-react';
import { RiskEntry } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface RiskMatrixTabProps {
  risks: RiskEntry[];
}

export const RiskMatrixTab: React.FC<RiskMatrixTabProps> = ({ risks }) => {
  const [selectedRisk, setSelectedRisk] = useState<RiskEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const levels = [5, 4, 3, 2, 1];
  const labels = ['Very High', 'High', 'Medium', 'Low', 'Very Low'];

  const getCellColor = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 15) return 'bg-red-500/10';
    if (score >= 8) return 'bg-amber-500/10';
    return 'bg-emerald-500/10';
  };

  const getRisksInCell = (prob: number, imp: number) => {
    return risks.filter(r => r.probability === prob && r.impact === imp && 
      (r.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
       r.riskId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  if (risks.length === 0) {
    return (
      <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No risks to display in matrix</p>
        <p className="text-xs text-slate-400 mt-2">Identify risks in the Risk Register to see them mapped here</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <Grid className="w-6 h-6 text-blue-600" />
          Risk Prioritization Matrix
        </h3>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter risks on matrix..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* The Matrix */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="relative flex">
              {/* Y-Axis Label (Impact) */}
              <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">
                Impact (Severity)
              </div>

              <div className="flex-1 ml-12">
                <div className="grid grid-cols-6 gap-2">
                  {/* Empty corner */}
                  <div className="h-12"></div>
                  {/* X-Axis Labels (Probability) */}
                  {labels.slice().reverse().map((label, i) => (
                    <div key={label} className="h-12 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-1">
                      {label}
                    </div>
                  ))}

                  {/* Matrix Rows */}
                  {levels.map((imp, impIdx) => (
                    <React.Fragment key={imp}>
                      {/* Y-Axis Label */}
                      <div className="h-32 flex items-center justify-end pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        {labels[impIdx]}
                      </div>
                      {/* Cells */}
                      {levels.slice().reverse().map(prob => {
                        const cellRisks = getRisksInCell(prob, imp);
                        return (
                          <div
                            key={`${prob}-${imp}`}
                            className={cn(
                              "h-32 rounded-2xl border-2 border-slate-50 transition-all p-2 overflow-y-auto no-scrollbar",
                              getCellColor(prob, imp)
                            )}
                          >
                            <div className="flex flex-wrap gap-1">
                              {cellRisks.map(risk => (
                                <button
                                  key={risk.id}
                                  onClick={() => setSelectedRisk(risk)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-black transition-all shadow-sm",
                                    risk.score >= 15 ? "bg-red-600 text-white" :
                                    risk.score >= 8 ? "bg-amber-500 text-white" :
                                    "bg-emerald-600 text-white"
                                  )}
                                >
                                  {risk.riskId}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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
        </div>

        {/* Legend & Details */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
            <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-white/40">Risk Levels</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-xs font-bold">Critical (15-25)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span className="text-xs font-bold">Medium (8-14)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span className="text-xs font-bold">Low (1-7)</span>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10">
              <Info className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-[10px] text-white/40 leading-relaxed">
                Click a risk ID on the matrix to view detailed information and planned responses.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {selectedRisk && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-lg relative"
              >
                <button 
                  onClick={() => setSelectedRisk(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md">
                    {selectedRisk.riskId}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Score: {selectedRisk.score}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">{selectedRisk.description}</h4>
                <div className="space-y-3 mt-4 pt-4 border-t border-slate-50">
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategy</div>
                    <div className="text-xs font-bold text-slate-700">{selectedRisk.strategy}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                    <div className="text-xs font-bold text-slate-700">{selectedRisk.status}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
