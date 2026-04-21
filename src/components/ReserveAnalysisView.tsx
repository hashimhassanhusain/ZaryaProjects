import React from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { ShieldCheck, AlertTriangle, PieChart, Info } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { formatCurrency } from '../lib/utils';

interface ReserveAnalysisViewProps {
  page: Page;
}

export const ReserveAnalysisView: React.FC<ReserveAnalysisViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  
  const estimatedBudget = Number(selectedProject?.charterData?.estimatedBudget) || 0;
  const contingencyReserve = estimatedBudget * 0.1; // 10%
  const managementReserve = estimatedBudget * 0.05; // 5%
  const finalBudget = estimatedBudget + contingencyReserve + managementReserve;

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '2.4.2', title: 'BOQ Estimates', status: 'Draft' },
        { id: '2.7.5', title: 'Risk Register', status: 'Active' }
      ]}
      outputs={[
        { id: '2.4.3-OUT', title: 'Cost Baseline', status: 'Ready' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Reserve Analysis</h2>
            <p className="text-sm text-slate-500 font-medium">Accounting for uncertainty through contingency and management reserves.</p>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Budget Composition</h3>
                <PieChart className="w-5 h-5 text-slate-300" />
              </div>

              <div className="space-y-6">
                {/* Cost Estimate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Estimate (Known-Knowns)</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(estimatedBudget)}</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: '85%' }} />
                  </div>
                </div>

                {/* Contingency */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contingency Reserve (Known-Unknowns)</span>
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    </div>
                    <span className="text-sm font-black text-amber-600">{formatCurrency(contingencyReserve)}</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: '10%' }} />
                  </div>
                </div>

                {/* Management */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Management Reserve (Unknown-Unknowns)</span>
                    <span className="text-sm font-black text-rose-600">{formatCurrency(managementReserve)}</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: '5%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Project Budget (BAC)</p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-900">{formatCurrency(finalBudget)}</p>
                </div>
                <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100">
                  Lock Cost Baseline
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-blue-100">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-100" />
              </div>
              <h4 className="text-xl font-black italic tracking-tight">Reserve Strategy</h4>
              <p className="text-sm text-blue-100 font-medium leading-relaxed">
                Management reserves are not part of the cost baseline but are included in the total project budget. Release of these funds requires a change request.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Financial Guardrail</h4>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                Once the baseline is locked, all cost variances {'>'} 5% will trigger a mandatory CCB review based on the Cost Management Plan.
              </p>
            </div>
          </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
