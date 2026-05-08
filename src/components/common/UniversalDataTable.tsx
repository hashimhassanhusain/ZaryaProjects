import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  FileSpreadsheet,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { cn, formatDate } from '../../lib/utils';
import { EntityConfig } from '../../types';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface UniversalDataTableProps {
  config: EntityConfig;
  data: any[];
  onRowClick: (record: any) => void;
  onNewClick?: () => void;
  onDeleteRecord: (id: string) => void;
  title?: React.ReactNode;
  favoriteControl?: React.ReactNode;
  showAddButton?: boolean;
  primaryAction?: {
    label: string;
    icon: any;
    onClick: () => void;
  };
  onSelectionChange?: (selectedIds: string[]) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  batchActions?: React.ReactNode;
  onInlineSave?: (rowId: string, colKey: string, newValue: any) => Promise<void>;
}

export const UniversalDataTable: React.FC<UniversalDataTableProps> = ({
  config,
  data,
  onRowClick,
  onNewClick,
  onDeleteRecord,
  title,
  favoriteControl,
  showAddButton = true,
  primaryAction,
  onSelectionChange,
  onBulkDelete,
  batchActions,
  onInlineSave
}) => {
  const { t } = useLanguage();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    config.columns.filter(c => c.visible !== false).map(c => c.key)
  );
  const [showColumnControls, setShowColumnControls] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{ rowId: string, colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

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

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleAll = () => {
    if (selectedIds.size === sortedData.length && sortedData.length > 0) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    } else {
      const next = new Set(sortedData.map(d => d.id).filter(Boolean));
      setSelectedIds(next);
      onSelectionChange?.(Array.from(next));
    }
  };

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

  const startEditing = (rowId: string, colKey: string, value: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // Only allow editing if collection is provided and it's not a read-only column type
    const column = config.columns.find(c => c.key === colKey);
    if (!config.collection || !column || column.type === 'progress' || column.type === 'badge') return;
    
    setEditingCell({ rowId, colKey });
    setEditValue(value);
  };

  const handleInlineSave = async () => {
    if (!editingCell || !config.collection) return;
    
    const { rowId, colKey } = editingCell;
    const loadingToast = toast.loading('Saving changes...');
    
    try {
      const docRef = doc(db, config.collection, rowId);
      
      // Convert value based on type
      let finalValue = editValue;
      const column = config.columns.find(c => c.key === colKey);
      if (column?.type === 'currency' || column?.type === 'number') {
        finalValue = Math.max(0, Number(editValue));
      }
      
      if (onInlineSave) {
        await onInlineSave(rowId, colKey, finalValue);
      } else {
        await updateDoc(docRef, { [colKey]: finalValue });
      }
      
      toast.success('Saved successfully', { id: loadingToast });
      setEditingCell(null);
    } catch (err) {
      console.error('Inline save failed:', err);
      toast.error('Failed to save changes', { id: loadingToast });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInlineSave();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const renderEditableCell = (record: any, col: any) => {
    const isEditing = editingCell?.rowId === record.id && editingCell?.colKey === col.key;
    const value = record[col.key];

    if (isEditing) {
      if (col.type === 'status') {
        const statusOptions = ['Active', 'Draft', 'Closed', 'Pending', 'Approved', 'Not Started', 'In Progress', 'Completed'];
        return (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <select
              ref={editInputRef as any}
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleInlineSave}
              className="px-2 py-1 bg-white border border-brand text-[10px] font-black uppercase rounded-lg outline-none"
            >
              {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input
            ref={editInputRef as any}
            type={col.type === 'currency' || col.type === 'number' ? 'number' : 'text'}
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleInlineSave}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 bg-white border border-brand text-xs font-black text-text-primary rounded-lg outline-none shadow-[0_0_10px_rgba(255,109,0,0.1)]"
          />
        </div>
      );
    }

    return (
      <div 
        className="cursor-text hover:bg-brand/5 px-2 py-1 rounded-lg transition-all group/cell flex items-center justify-between"
        onClick={(e) => startEditing(record.id, col.key, value, e)}
      >
        {renderCellValue(value, col.type)}
        <div className="opacity-0 group-hover/cell:opacity-30">
          <Edit2 className="w-3 h-3 text-brand" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden min-h-[500px]">
      {/* Selection Banner */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand text-white px-8 py-3 flex items-center justify-between z-20"
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{selectedIds.size} Items Selected</span>
              <button onClick={() => { setSelectedIds(new Set()); onSelectionChange?.([]); }} className="text-[10px] underline uppercase font-black tracking-widest hover:opacity-80">Clear</button>
            </div>
            <div className="flex items-center gap-3">
              {batchActions}
              <button 
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  toast((t) => (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm font-black text-text-primary">Delete {ids.length} selected records? This action cannot be undone.</p>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-text-primary rounded-lg text-xs font-black border border-slate-300">Cancel</button>
                        <button onClick={onBulkDelete ? async () => {
                          toast.dismiss(t.id);
                          const loadingToast = toast.loading(`Deleting ${ids.length} items...`);
                          try {
                            await onBulkDelete(ids);
                            setSelectedIds(new Set());
                            onSelectionChange?.([]);
                            toast.success(`Successfully deleted ${ids.length} items`, { id: loadingToast });
                          } catch (err) {
                            console.error('Bulk delete failed:', err);
                            toast.error('Failed to delete some items', { id: loadingToast });
                          }
                        } : async () => {
                          toast.dismiss(t.id);
                          const loadingToast = toast.loading(`Deleting ${ids.length} items one by one...`);
                          try {
                            const results = ids.map(async (id: string) => {
                              return deleteDoc(doc(db, config.collection as string, id as string));
                            });
                            await Promise.all(results);
                            setSelectedIds(new Set());
                            onSelectionChange?.([]);
                            toast.success(`Successfully deleted ${ids.length} items`, { id: loadingToast });
                          } catch (err) {
                            toast.error('Bulk delete failed', { id: loadingToast });
                          }
                        }} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg">Confirm Delete ({ids.length} Items)</button>
                      </div>
                    </div>
                  ), { duration: 8000 });
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase transition-all shadow-xl border border-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Header / Action Bar */}
      <div className="px-5 py-4 border-b border-slate-300 dark:border-white/10 flex items-center justify-between gap-4 bg-white dark:bg-surface sticky top-0 z-10">
        {/* Left Side: Title & Info */}
        <div className="flex items-center gap-4 shrink-0">
          {title && (
            <div className="flex items-center gap-3">
              {typeof title === 'string' ? (
                <h2 className="text-xl md:text-2xl font-black text-text-primary dark:text-white tracking-tight italic uppercase">
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-brand transition-colors" />
            <input 
              type="text" 
              placeholder={`Search registry documents...`}
              className="w-full pl-11 pr-6 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 rounded-xl text-[11px] font-black text-text-primary dark:text-white focus:bg-white dark:focus:bg-surface focus:ring-4 focus:ring-brand/10 focus:border-brand/40 outline-none transition-all placeholder:text-slate-400"
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
              "p-2.5 rounded-xl transition-all shrink-0 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center",
              showColumnControls ? "bg-brand text-white border-brand transition-colors" : "bg-white dark:bg-surface text-slate-600 hover:text-brand hover:bg-slate-50 dark:hover:bg-white/10"
            )}
            title="Configure Columns"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1" />

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-surface border border-slate-200 dark:border-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-text-secondary dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm active:translate-y-0.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export
          </button>

          
          {showAddButton && (onNewClick || primaryAction) && (
            <button 
              onClick={primaryAction?.onClick || onNewClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-secondary shadow-lg shadow-brand/20 transition-all active:scale-95 active:translate-y-0.5"
            >
              {primaryAction?.icon ? <primaryAction.icon className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {primaryAction?.label || 'Add Entry'}
            </button>
          )}
        </div>
      </div>

      {/* Column Visibility Controls */}
      <AnimatePresence>
        {showColumnControls && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 p-4"
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
                      ? "bg-brand border-brand text-white" 
                      : "bg-white dark:bg-surface border-slate-300 dark:border-white/20 text-slate-500 hover:border-slate-400 dark:hover:border-white/30"
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
          <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10">
            <tr className="border-b border-slate-200 dark:border-white/10">
              <th className="w-12 px-5 py-4">
                <input 
                  type="checkbox" 
                  className="rounded-md border-slate-400 dark:border-white/20 text-brand focus:ring-brand w-5 h-5 cursor-pointer" 
                  checked={selectedIds.size === sortedData.length && sortedData.length > 0}
                  onChange={toggleAll}
                />
              </th>
              {config.columns.filter(c => visibleColumns.includes(c.key)).map((col, idx) => (
                <th 
                  key={`th-${col.key}-${idx}`}
                  className="px-4 py-4 text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest group cursor-pointer hover:text-brand dark:hover:text-brand transition-colors border-r border-slate-100 last:border-0"
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    <ArrowUpDown className={cn("w-3 h-3 transition-opacity", sortConfig?.key === col.key ? "opacity-100 text-brand" : "opacity-0 group-hover:opacity-100")} />
                  </div>
                </th>
              ))}
              <th className="w-16 px-4 py-4 text-right text-[10px] font-black text-text-primary uppercase tracking-widest">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((record, idx) => (
              <motion.tr
                key={`tr-${record.id || 'record'}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.01 }}
                onClick={() => onRowClick(record)}
                className={cn(
                  "group border-b border-slate-200 dark:border-white/5 transition-all cursor-pointer",
                  selectedIds.has(record.id) ? "bg-brand/10 dark:bg-brand/20" : "hover:bg-slate-50 dark:hover:bg-white/5"
                )}
              >
                <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="rounded-md border-slate-400 dark:border-white/20 text-brand focus:ring-brand w-5 h-5 cursor-pointer" 
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleSelection(record.id)}
                  />
                </td>
                {config.columns.filter(c => visibleColumns.includes(c.key)).map((col, idx) => (
                  <td key={`td-${col.key}-${idx}`} className="px-4 py-4 text-text-secondary font-black whitespace-nowrap leading-normal min-w-[120px]">
                    {renderEditableCell(record, col)}
                  </td>
                ))}
                 <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2 opacity-50 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-text-primary dark:text-white hover:text-brand hover:bg-brand/10 rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toast((t) => (
                          <div className="flex flex-col gap-4">
                            <p className="text-sm font-black text-text-primary">Delete this record?</p>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-50 text-text-primary rounded-lg text-xs font-black border border-slate-200">Cancel</button>
                              <button onClick={async () => {
                                toast.dismiss(t.id);
                                await onDeleteRecord(record.id);
                              }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-black shadow-sm">Delete</button>
                            </div>
                          </div>
                        ), { duration: 5000 });
                      }}
                      className="p-1.5 text-text-primary dark:text-white hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {sortedData.length === 0 && (
          <div className="p-24 text-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">No {config.label.toLowerCase()} found</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-2">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

      {/* Pagination / Status Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between text-[11px] font-black text-slate-600 dark:text-white uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-3 py-1 rounded-full text-brand shadow-sm">
            {sortedData.length} RECORDS
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="hover:text-brand transition-colors flex items-center gap-2">Previous</button>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">PAGE</span>
            <span className="bg-brand text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px]">1</span>
          </div>
          <button className="hover:text-brand transition-colors flex items-center gap-2">Next</button>
        </div>
      </div>
    </div>
  );

  function renderCellValue(value: any, type: string) {
    if (value === null || value === undefined) return <span className="text-slate-300">-</span>;

    switch (type) {
      case 'currency':
        return <span className="font-mono font-black text-text-primary">{formatAmount(value, baseCurrency)}</span>;
      case 'date':
        return <span className="text-text-primary font-black">{formatDate(value)}</span>;
      case 'status':
        const colors: any = {
          Active: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
          Draft: 'bg-slate-100 text-text-secondary border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
          Closed: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
          Pending: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
          Approved: 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
        };
        return <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase border shadow-sm", colors[value] || 'bg-slate-100 text-text-secondary dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700')}>{value}</span>;
      case 'badge':
        return <span className="px-3 py-1 bg-brand/10 text-brand rounded-lg text-[10px] font-black uppercase tracking-tight border border-brand/40 shadow-sm">{value}</span>;
      case 'progress':
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-200 dark:bg-white/10 rounded-full h-3 overflow-hidden min-w-[70px] border border-slate-300 dark:border-white/5">
              <div 
                className="bg-brand h-full transition-all duration-1000 shadow-[0_0_20px_rgba(255,109,0,0.3)]" 
                style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-text-primary dark:text-white w-9">{Number(value).toFixed(0)}%</span>
          </div>
        );
      default:
        return <span className="text-text-secondary font-black text-sm">{String(value)}</span>;
    }
  }
};
