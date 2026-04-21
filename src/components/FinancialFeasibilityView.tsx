import React from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { Calculator, DollarSign, TrendingUp, Target } from 'lucide-react';

interface FinancialFeasibilityViewProps {
  page: Page;
}

export const FinancialFeasibilityView: React.FC<FinancialFeasibilityViewProps> = ({ page }) => {
  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '1.1.1', title: 'Project Charter', status: 'Approved' },
        { id: '1.2.1', title: 'Market Analysis', status: 'Final' }
      ]}
      outputs={[
        { id: '1.4.1-OUT', title: 'Financial Appraisal Report', status: 'Draft' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg text-white">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Financial Feasibility</h2>
            <p className="text-sm text-slate-500 font-medium">Initial high-level evaluation of project viability and funding.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimated NPV</p>
              <p className="text-3xl font-black italic tracking-tighter text-teal-400">$2,450,000</p>
            </div>
          </div>

          <div className="p-8 bg-white border border-slate-100 rounded-[2rem] space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project IRR</p>
              <p className="text-3xl font-black italic tracking-tighter text-slate-900">18.5%</p>
            </div>
          </div>

          <div className="p-8 bg-white border border-slate-100 rounded-[2rem] space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payback Period</p>
              <p className="text-3xl font-black italic tracking-tighter text-slate-900">3.2 Years</p>
            </div>
          </div>
        </div>

        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Funding Source Matrix</h3>
          <div className="space-y-4">
            {[
              { source: 'Inter-company Loan', amount: '$5,000,000', allocation: '50%', risk: 'Low' },
              { source: 'External Financing', amount: '$3,000,000', allocation: '30%', risk: 'Medium' },
              { source: 'Operational Cash Flow', amount: '$2,000,000', allocation: '20%', risk: 'Low' },
            ].map((fund, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl group hover:bg-teal-50 transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-black text-slate-900">{fund.source}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{fund.amount}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Allocation</p>
                    <p className="text-sm font-black text-slate-900 italic">{fund.allocation}</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Risk Level</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      fund.risk === 'Low' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {fund.risk}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
