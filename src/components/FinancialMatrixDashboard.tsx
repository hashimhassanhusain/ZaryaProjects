import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateFinancialMatrix } from '../services/wbsService';
import { getCostCenters } from '../services/masterDataService';
import { WBSLevel, CostCenter } from '../types';
import { formatCurrency } from '../lib/utils';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';

export const FinancialMatrixDashboard: React.FC = () => {
  const { selectedProject } = useProject();
  const [matrix, setMatrix] = React.useState({ deliverableCosts: {} as Record<string, number>, costCenterCosts: {} as Record<string, number> });
  const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);

  React.useEffect(() => {
    if (selectedProject) {
      calculateFinancialMatrix(selectedProject.id).then(setMatrix);
      getCostCenters().then(setCostCenters);
    }
  }, [selectedProject]);

  const totalActual = useMemo(() => Object.values(matrix.deliverableCosts).reduce((a: number, b: number) => a + b, 0), [matrix]);

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-bold text-xs uppercase mb-2">Total Actual PO Cost</div>
          <div className="text-2xl font-black">{formatCurrency(totalActual)}</div>
        </div>
        {/* Placeholder for budget */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-bold text-xs uppercase mb-2">Total Budget</div>
          <div className="text-2xl font-black">{formatCurrency(1500000000)}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Financial Matrix: Deliverables vs. Cost Centers
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] uppercase font-bold text-slate-500">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-3">Deliverable (WBS)</th>
                {costCenters.map(cc => <th key={cc.id} className="p-3 text-right">{cc.name}</th>)}
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* This would ideally map over WBS nodes, 
                  but for the matrix view, we need a flat structure 
                  or a nested rendering. Showing placeholder for now. */}
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">Aggregate View</td>
                {costCenters.map(cc => (
                    <td key={cc.id} className="p-3 text-right">
                        {formatCurrency(matrix.costCenterCosts[cc.id] || 0)}
                    </td>
                ))}
                <td className="p-3 text-right font-black">{formatCurrency(totalActual)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
