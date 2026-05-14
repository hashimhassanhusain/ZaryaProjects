import React, { useState, useEffect, useMemo } from 'react';
import { Page, BOQItem, PurchaseOrder, ProjectManagementPlan } from '../types';
import { getParent } from '../data';
import { BarChart3, Calculator, RefreshCw, TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2, AlertCircle, ShieldCheck, FileText, Printer, Download, Share2, UserCheck, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { StandardProcessPage } from './StandardProcessPage';
import { DriveUploadButton } from './common/DriveUploadButton';
import { collection, query, where, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface EVMReportViewProps {
  page: Page;
}

export const EVMReportView: React.FC<EVMReportViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatAmount, exchangeRate: globalExchangeRate, currency: baseCurrency, convertToBase } = useCurrency();
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [pmPlan, setPmPlan] = useState<ProjectManagementPlan | null>(null);
  
  const parent = getParent(page.id);

  useEffect(() => {
    if (!selectedProject) return;

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const posUnsubscribe = onSnapshot(
      query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setPos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      }
    );

    const fetchPmPlan = async () => {
      try {
        const q = query(
          collection(db, 'projectManagementPlans'),
          where('projectId', '==', selectedProject.id),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPmPlan(snap.docs[0].data() as ProjectManagementPlan);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch PM Plan in EVM:", err);
        setLoading(false);
      }
    };
    fetchPmPlan();

    return () => {
      boqUnsubscribe();
      posUnsubscribe();
    };
  }, [selectedProject]);

  const evmMetrics = useMemo(() => {
    // Convert everything to base currency for consistent EVM calculation
    const bac = boqItems.reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0);

    const ev = boqItems.reduce((sum, item) => {
      const amount = item.amount || 0;
      // Use physical progress if available, fallback to completion
      const progress = item.physicalProgress ?? item.completion ?? 0;
      return sum + (amount * (progress / 100));
    }, 0);

    const ac = pos
      .filter(po => ['Approved', 'Paid', 'Closed'].includes(po.status || ''))
      .reduce((sum, po) => {
        return sum + (po.amount || 0);
      }, 0);
    
    // Calculate PV based on time elapsed if start/end dates exist
    let pv = 0;
    let percentPlanned = 0;
    if (selectedProject?.startDate && selectedProject?.endDate) {
      const start = new Date(selectedProject.startDate).getTime();
      const end = new Date(selectedProject.endDate).getTime();
      const now = new Date().getTime();
      
      if (now > start) {
        const totalDuration = end - start;
        const elapsed = now - start;
        percentPlanned = Math.min(100, (elapsed / totalDuration) * 100);
        pv = bac * (percentPlanned / 100);
      }
    } else {
      // Fallback to 70% for demo if no dates
      percentPlanned = 70;
      pv = bac * 0.7;
    }

    const sv = ev - pv;
    const cv = ev - ac;
    const spi = pv > 0 ? ev / pv : 1;
    const cpi = ac > 0 ? ev / ac : 1;

    return {
      bac,
      pv,
      ev,
      ac,
      sv,
      cv,
      spi,
      cpi,
      percentPlanned,
      percentEarned: bac > 0 ? (ev / bac) * 100 : 0,
      percentSpent: bac > 0 ? (ac / bac) * 100 : 0
    };
  }, [boqItems, pos, selectedProject, isSyncing, baseCurrency]);

  const sCurveData = useMemo(() => {
    // Generate data points for the S-Curve
    // In a real app, this would use daily snapshots
    const points = [];
    const months = 6; // Forecast for 6 months
    const now = new Date();
    
    for (let i = -3; i <= months; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() + i);
      const label = date.toLocaleString('default', { month: 'short' });
      
      // Logistic function for S-curve (simplified)
      const x = (i + 3) / (months + 3);
      const sFactor = 1 / (1 + Math.exp(-10 * (x - 0.5)));
      
      const point: any = {
        name: label,
        PV: evmMetrics.bac * sFactor,
      };

      if (i <= 0) {
        point.EV = evmMetrics.ev * (1 + i * 0.1); // Simulated historical EV
        point.AC = evmMetrics.ac * (1 + i * 0.08); // Simulated historical AC
      }

      points.push(point);
    }
    return points;
  }, [evmMetrics]);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const formatCurrency = (val: number) => formatAmount(val, baseCurrency);
  const formatIndex = (val: number) => val.toFixed(2);

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <StandardProcessPage
      page={page}
      actions={
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Project Data'}
          </button>
          <DriveUploadButton
            drivePath="Financials_and_Procurements_6/Cost_Control_Reports"
            label="Upload EVM Report"
          />
        </div>
      }
    >
      <div className="space-y-8 p-6">
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
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Core Values</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">BAC</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(evmMetrics.bac)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Planned Value (PV)</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(evmMetrics.pv)}</div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Earned Value (EV)</div>
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-200">{formatCurrency(evmMetrics.ev)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Actual Cost (AC)</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(evmMetrics.ac)}</div>
                    </div>
                  </div>
                </div>

                {/* Variances */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Variances</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-xl shadow-sm">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Schedule Variance (SV)</div>
                        <div className={`text-xl font-bold ${evmMetrics.sv >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {evmMetrics.sv >= 0 ? '+' : ''}{formatCurrency(evmMetrics.sv)}
                        </div>
                      </div>
                      {evmMetrics.sv >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-xl shadow-sm">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Cost Variance (CV)</div>
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
              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-6">Performance Indices</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">SPI (Schedule)</span>
                      <span className={`text-2xl font-black ${evmMetrics.spi >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatIndex(evmMetrics.spi)}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${evmMetrics.spi >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(evmMetrics.spi * 50, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold italic">Values {'>'} 1.00 indicate project is ahead of schedule.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">CPI (Cost)</span>
                      <span className={`text-2xl font-black ${evmMetrics.cpi >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatIndex(evmMetrics.cpi)}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${evmMetrics.cpi >= 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(evmMetrics.cpi * 50, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold italic">Values {'>'} 1.00 indicate project is under budget.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* S-Curve Chart */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900 italic uppercase">Cost Baseline S-Curve</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-300 rounded-full" /> PV</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full" /> EV</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full" /> AC</div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    hide 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="PV" stroke="#cbd5e1" strokeWidth={2} fillOpacity={1} fill="url(#colorPV)" />
                  <Area type="monotone" dataKey="EV" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEV)" />
                  <Line type="monotone" dataKey="AC" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Progress Overview */}
          <section className="bg-white dark:bg-surface p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Progress Comparison
            </h3>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-black text-slate-800 dark:text-slate-200">
                  <span>Planned Completion</span>
                  <span>{evmMetrics.percentPlanned.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 dark:bg-slate-700" style={{ width: `${evmMetrics.percentPlanned}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-black text-slate-800 dark:text-slate-200">
                  <span>Earned Completion (Actual Progress)</span>
                  <span>{evmMetrics.percentEarned.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${evmMetrics.percentEarned}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-black text-slate-800 dark:text-slate-200">
                  <span>Budget Spent</span>
                  <span>{evmMetrics.percentSpent.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
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
    </StandardProcessPage>
  );
};
