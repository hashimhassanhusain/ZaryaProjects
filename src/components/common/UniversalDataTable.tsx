import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Settings2, 
  Plus, 
  MoreVertical, 
  ChevronDown, 
  ArrowUpDown,
  Eye,
  Edit2,
  Trash2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { EntityConfig } from '../../types';

interface UniversalDataTableProps {
  config: EntityConfig;
  data: any[];
  onRowClick: (record: any) => void;
  onNewClick: () => void;
  onDeleteRecord: (id: string) => void;
}

export const UniversalDataTable: React.FC<UniversalDataTableProps> = ({
  config,
  data,
  onRowClick,
  onNewClick,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    config.columns.filter(c => c.visible !== false).map(c => c.key)
  );
  const [showColumnControls, setShowColumnControls] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const searchStr = Object.values(item).join(' ').toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Table Header / Action Bar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search ${config.label}...`}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowColumnControls(!showColumnControls)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
            title="Column Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={onNewClick}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            New {config.label.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Column Visibility Controls */}
      <AnimatePresence>
        {showColumnControls && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 border-b border-slate-100 p-4"
          >
            <div className="flex flex-wrap gap-2">
              {config.columns.map((col, idx) => (
                <button
                  key={`col-vis-${col.key}-${idx}`}
                  onClick={() => setVisibleColumns(prev => 
                    prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key]
                  )}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                    visibleColumns.includes(col.key) 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                  )}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <tr className="border-b border-slate-100">
              <th className="w-12 px-4 py-4">
                <input type="checkbox" className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
              </th>
              {config.columns.filter(c => visibleColumns.includes(c.key)).map((col, idx) => (
                <th 
                  key={`th-${col.key}-${idx}`}
                  className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest group cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
              ))}
              <th className="w-16 px-4 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((record, idx) => (
              <motion.tr
                key={`tr-${record.id || 'record'}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => onRowClick(record)}
                className="group border-b border-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
                </td>
                {config.columns.filter(c => visibleColumns.includes(c.key)).map((col, idx) => (
                  <td key={`td-${col.key}-${idx}`} className="px-4 py-4">
                    {renderCellValue(record[col.key], col.type)}
                  </td>
                ))}
                <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeleteRecord(record.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {sortedData.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm">No {config.label.toLowerCase()} found.</p>
          </div>
        )}
      </div>

      {/* Pagination / Status Bar */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div>Showing {sortedData.length} records</div>
        <div className="flex items-center gap-4">
          <button className="hover:text-blue-600">Previous</button>
          <div className="bg-white border px-2 py-0.5 rounded border-slate-200">Page 1</div>
          <button className="hover:text-blue-600">Next</button>
        </div>
      </div>
    </div>
  );
};

const renderCellValue = (value: any, type: string) => {
  if (value === null || value === undefined) return <span className="text-slate-300">-</span>;

  switch (type) {
    case 'currency':
      return <span className="font-mono font-medium text-slate-700">{new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(value)}</span>;
    case 'date':
      return <span className="text-slate-500">{new Date(value).toLocaleDateString()}</span>;
    case 'status':
      const colors: any = {
        Active: 'bg-emerald-100 text-emerald-700',
        Draft: 'bg-slate-100 text-slate-600',
        Closed: 'bg-rose-100 text-rose-700',
        Pending: 'bg-amber-100 text-amber-700',
        Approved: 'bg-blue-100 text-blue-700',
      };
      return <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase", colors[value] || 'bg-slate-100 text-slate-600')}>{value}</span>;
    case 'badge':
      return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold">{value}</span>;
    default:
      return <span className="text-slate-700 text-sm">{String(value)}</span>;
  }
};
