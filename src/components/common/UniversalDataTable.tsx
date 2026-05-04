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
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../../lib/utils';
import { EntityConfig } from '../../types';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

interface UniversalDataTableProps {
  config: EntityConfig;
  data: any[];
  onRowClick: (record: any) => void;
  onNewClick: () => void;
  onDeleteRecord: (id: string) => void;
  title?: React.ReactNode;
  favoriteControl?: React.ReactNode;
}

export const UniversalDataTable: React.FC<UniversalDataTableProps> = ({
  config,
  data,
  onRowClick,
  onNewClick,
  onDeleteRecord,
  title,
  favoriteControl
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
      const searchStr = Object.values(item).map(v => String(v)).join(' ').toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  // Sort Logic
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExportExcel = () => {
    try {
      const exportData = sortedData.map(item => {
        const row: any = {};
        config.columns.forEach(col => {
          row[col.label] = item[col.key];
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registry");
      XLSX.writeFile(wb, `${config.id}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export Excel');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
      {/* Table Header / Action Bar */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white sticky top-0 z-10">
        {/* Left Side: Title & Info */}
        <div className="flex items-center gap-4 shrink-0">
          {title && (
            <div className="flex items-center gap-3">
              {typeof title === 'string' ? (
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic uppercase">
                  {title}
                </h2>
              ) : title}
              {favoriteControl}
            </div>
          )}
        </div>

        {/* Middle: Search bar */}
        <div className="flex-1 max-w-xl group">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder={`Search registry documents...`}
              className="w-full pl-11 pr-6 py-2.5 bg-slate-50 border border-transparent rounded-xl text-[11px] font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Right Side: Primary Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setShowColumnControls(!showColumnControls)}
            className={cn(
              "p-2.5 rounded-xl transition-all shrink-0 border border-slate-100 shadow-sm flex items-center justify-center",
              showColumnControls ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 hover:text-blue-600 hover:bg-slate-50"
            )}
            title="Configure Columns"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          
          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:translate-y-0.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export
          </button>
          
          <button 
            onClick={onNewClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 active:translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
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
      return <span className="text-slate-500">{formatDate(value)}</span>;
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
    case 'progress':
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden min-w-[60px]">
            <div 
              className="bg-emerald-500 h-full transition-all duration-1000" 
              style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 w-8">{Number(value).toFixed(0)}%</span>
        </div>
      );
    default:
      return <span className="text-slate-700 text-sm">{String(value)}</span>;
  }
};
