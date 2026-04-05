import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import { boqData, purchaseOrders, getParent } from '../data';
import { BarChart3, Calculator, RefreshCw, TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2, AlertCircle, ShieldCheck, FileText, Printer, Download, Share2, UserCheck, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface EVMReportViewProps {
  page: Page;
}

export const EVMReportView: React.FC<EVMReportViewProps> = ({ page }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const parent = getParent(page.id);

  const evmMetrics = useMemo(() => {
    const bac = boqData.reduce((sum, item) => sum + item.amount, 0);
    const ev = boqData.reduce((sum, item) => sum + (item.amount * (item.completion / 100)), 0);
    const ac = purchaseOrders.reduce((sum, po) => sum + po.amount, 0);
    
    // For PV, let's assume we are 70% through the planned schedule for this demo
    const pv = bac * 0.7;

    const sv = ev - pv;
    const cv = ev - ac;
    const spi = ev / pv;
    const cpi = ev / ac;

    return {
      bac,
      pv,
      ev,
      ac,
      sv,
      cv,
      spi,
      cpi,
      percentPlanned: 70,
      percentEarned: (ev / bac) * 100,
      percentSpent: (ac / bac) * 100
    };
  }, [isSyncing]);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatIndex = (val: number) => val.toFixed(2);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {parent && <span className="text-slate-400 font-medium">{parent.title} &gt; </span>}
            <span>{page.title}</span>
          </h2>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Updated: {new Date().toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> Automated Data Sync: Active</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Project Data'}
          </button>
          <div className="flex gap-2">
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-all">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-all">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Metrics Card */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-900">EVM Performance Analysis</h3>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Automated Calculation</span>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Core Values */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Core Values</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">BAC</div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(evmMetrics.bac)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Planned Value (PV)</div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(evmMetrics.pv)}</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">Earned Value (EV)</div>
                      <div className="text-lg font-bold text-blue-900">{formatCurrency(evmMetrics.ev)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actual Cost (AC)</div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(evmMetrics.ac)}</div>
                    </div>
                  </div>
                </div>

                {/* Variances */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Variances</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Schedule Variance (SV)</div>
                        <div className={`text-xl font-bold ${evmMetrics.sv >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {evmMetrics.sv >= 0 ? '+' : ''}{formatCurrency(evmMetrics.sv)}
                        </div>
                      </div>
                      {evmMetrics.sv >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Cost Variance (CV)</div>
                        <div className={`text-xl font-bold ${evmMetrics.cv >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {evmMetrics.cv >= 0 ? '+' : ''}{formatCurrency(evmMetrics.cv)}
                        </div>
                      </div>
                      {evmMetrics.cv >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Indices */}
              <div className="mt-12 pt-8 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Performance Indices</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-700">SPI (Schedule)</span>
                      <span className={`text-2xl font-black ${evmMetrics.spi >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatIndex(evmMetrics.spi)}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${evmMetrics.spi >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(evmMetrics.spi * 50, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Values {'>'} 1.00 indicate project is ahead of schedule.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-700">CPI (Cost)</span>
                      <span className={`text-2xl font-black ${evmMetrics.cpi >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatIndex(evmMetrics.cpi)}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${evmMetrics.cpi >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(evmMetrics.cpi * 50, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Values {'>'} 1.00 indicate project is under budget.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Progress Overview */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Progress Comparison
            </h3>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>Planned Completion</span>
                  <span>{evmMetrics.percentPlanned.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300" style={{ width: `${evmMetrics.percentPlanned}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>Earned Completion (Actual Progress)</span>
                  <span>{evmMetrics.percentEarned.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${evmMetrics.percentEarned}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>Budget Spent</span>
                  <span>{evmMetrics.percentSpent.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${evmMetrics.percentSpent}%` }} />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Analysis Status</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Overall Health</div>
                <div className="text-xl font-bold text-emerald-400">On Target</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Data Source</div>
                <div className="text-sm font-medium text-slate-200">BOQ & PO Master Tables</div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 mb-2">Sync Status</div>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Real-time Active
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-slate-900">Validation</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              All metrics are calculated automatically from the verified project database. Manual overrides are disabled to maintain data integrity.
            </p>
            <div className="text-xs font-mono text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
              ID: ZARYA-EVM-AUTO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
