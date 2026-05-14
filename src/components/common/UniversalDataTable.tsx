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
  LayoutGrid,
  List,
  Kanban,
  FileSpreadsheet,
  Check,
  X,
  Archive,
  Printer,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { cn, formatDate, stripNumericPrefix } from '../../lib/utils';
import { EntityConfig } from '../../types';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { db, storage } from '../../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadArabicFont, containsArabic } from '../../lib/pdfUtils';

import { useProject } from '../../context/ProjectContext';

interface UniversalDataTableProps {
  config: EntityConfig;
  data: any[];
  onRowClick: (record: any) => void;
  onNewClick?: () => void;
  onEditRecord?: (record: any) => void;
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
  density?: 'normal' | 'compact';
  description?: string;
  extraActions?: React.ReactNode;
}

export const UniversalDataTable: React.FC<UniversalDataTableProps> = ({
  config,
  data,
  onRowClick,
  onNewClick,
  onEditRecord,
  onDeleteRecord,
  title,
  favoriteControl,
  showAddButton = true,
  primaryAction,
  onSelectionChange,
  onBulkDelete,
  batchActions,
  onInlineSave,
  density = 'compact',
  description,
  extraActions
}) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'kanban'>('table');
  const [kanbanGroupField, setKanbanGroupField] = useState<string>(() => {
    const statusCol = config.columns.find(c => c.type === 'status' || c.key.toLowerCase().includes('status'));
    return statusCol ? statusCol.key : 'status';
  });
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

  const handleExportPDFToDrive = async () => {
    if (!selectedProject) {
       toast.error("Project must be selected to export to Drive");
       return;
    }
    const toastId = toast.loading(isRtl ? '🖨️ جاري تصدير ورفع الـ PDF...' : '🖨️ Exporting & uploading PDF...');
    try {
      const pdf = new jsPDF('landscape');
      const hasArabic = await loadArabicFont(pdf);
      const fontName = hasArabic ? 'Amiri' : 'helvetica';

      // Header
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(16);
      const titleText = `${config.label} Registry`;
      pdf.text(titleText, 14, 15);

      pdf.setFontSize(10);
      pdf.setFont(fontName, 'normal');
      pdf.text(`Project: ${selectedProject.code} - ${selectedProject.name}`, 14, 25);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 14, 31);
      pdf.text(`Company: ZARYA PMIS`, 14, 37);

      const tableCols = config.columns.map(c => c.label);
      const tableData = sortedData.map(item => config.columns.map(col => {
         const val = item[col.key];
         return val !== null && val !== undefined ? String(val) : '';
      }));

      autoTable(pdf, {
        head: [tableCols],
        body: tableData,
        startY: 45,
        styles: { font: fontName, fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' }
      });

      const companyCode = selectedProject?.companyCode || 'ZARYA';
      const projectCode = selectedProject?.code || 'PRJ';
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g,'');
      const blob = pdf.output('blob');
      const fileExt = '.pdf';
      const fileName = `${companyCode}-${projectCode}-${config.id}-Export-${dateStr}${fileExt}`;
      
      const storageRef = ref(storage, `pdf_exports/${selectedProject.id}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const drivePath = '.'; // Export to root since trees are ignored
      
      let projectRootId = selectedProject.driveFolderId;
      if (!projectRootId || projectRootId.length < 5 || projectRootId === '.') {
         projectRootId = '1-eFit1RPNDMZ3kQ5SgGYv9IN7VV65Jt6'; // fallback to general if nothing else
      }

      const driveRes = await fetch('/api/drive/upload-by-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRootId,
          path: drivePath,
          projectCode: selectedProject.code || '16314',
          fileUrl: url,
          fileName: fileName,
          mimeType: 'application/pdf'
        })
      });

      if (!driveRes.ok) throw new Error('Drive API rejected the upload');

      toast.success(isRtl ? '✅ تم الحفظ في جوجل درايف!' : '✅ Saved to Google Drive!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export and upload PDF: ' + err.message, { id: toastId });
    }
  };

  const handlePrintSingleRecordToDrive = async (record: any) => {
    if (!selectedProject) {
       toast.error("Project must be selected to export to Drive");
       return;
    }
    const toastId = toast.loading(isRtl ? '🖨️ جاري تصدير الريكورد ورفعه للـ PDF...' : '🖨️ Exporting record & uploading PDF...');
    try {
      const pdf = new jsPDF('portrait');
      const hasArabic = await loadArabicFont(pdf);
      const fontName = hasArabic ? 'Amiri' : 'helvetica';

      // Header
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(16);
      const titleText = `${config.label} Record Details`;
      pdf.text(titleText, 14, 15);

      pdf.setFontSize(10);
      pdf.setFont(fontName, 'normal');
      pdf.text(`Project: ${selectedProject.code} - ${selectedProject.name}`, 14, 25);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 14, 31);
      pdf.text(`Company: ZARYA PMIS`, 14, 37);
      pdf.text(`Record ID: ${record.id}`, 14, 43);

      const tableData = config.columns.map(col => {
         const val = record[col.key];
         return [col.label, val !== null && val !== undefined ? String(val) : ''];
      });

      autoTable(pdf, {
        head: [['Field', 'Value']],
        body: tableData,
        startY: 50,
        styles: { font: fontName, fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
      });

      const companyCode = selectedProject?.companyCode || 'ZARYA';
      const projectCode = selectedProject?.code || 'PRJ';
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g,'');
      const blob = pdf.output('blob');
      const fileExt = '.pdf';
      const fileName = `${companyCode}-${projectCode}-${config.id}-Record-${record.id}-${dateStr}${fileExt}`;
      
      const storageRef = ref(storage, `pdf_exports/${selectedProject.id}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const drivePath = '.'; // Export to root since trees are ignored
      
      let projectRootId = selectedProject.driveFolderId;
      if (!projectRootId || projectRootId.length < 5 || projectRootId === '.') {
         projectRootId = '1-eFit1RPNDMZ3kQ5SgGYv9IN7VV65Jt6';
      }

      const driveRes = await fetch('/api/drive/upload-by-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRootId,
          path: drivePath,
          projectCode: selectedProject.code || '16314',
          fileUrl: url,
          fileName: fileName,
          mimeType: 'application/pdf'
        })
      });

      if (!driveRes.ok) throw new Error('Drive API rejected the upload');

      toast.success(isRtl ? '✅ تم الحفظ في جوجل درايف!' : '✅ Saved record to Google Drive!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export and upload record PDF: ' + err.message, { id: toastId });
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
        
        // --- Sync Rename to Drive ---
        const record = data.find(r => r.id === rowId);
        const nameCols = ['name', 'title', 'filename', 'fullname'];
        if (record && record.driveFileId && nameCols.includes(colKey.toLowerCase()) && finalValue !== record[colKey]) {
           const extension = (record[colKey] || "").split('.').pop() || '';
           const newName = String(finalValue).includes('.') ? String(finalValue) : `${finalValue}${extension ? '.' + extension : ''}`;
           
           fetch('/api/drive/rename', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ fileId: record.driveFileId, newName })
           }).catch(err => console.error('Drive rename failed:', err));
        }
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
        className={cn("cursor-text hover:bg-brand/5 px-2 py-1 rounded-lg transition-all group/cell flex items-center justify-between", col.render && "pointer-events-none hover:bg-transparent")}
        onClick={col.render ? undefined : (e) => startEditing(record.id, col.key, value, e)}
      >
        {col.render ? col.render(value, record) : renderCellValue(value, col.type)}
        {!col.render && (
          <div className="opacity-0 group-hover/cell:opacity-30">
            <Edit2 className="w-3 h-3 text-brand" />
          </div>
        )}
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

      {/* Table Header / Action Bar - Unified Single Row */}
      <div 
        dir="ltr"
        className="px-5 py-3 border-b border-slate-300 dark:border-white/10 flex items-center justify-between gap-6 bg-white dark:bg-surface sticky top-0 z-40 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
      >
        {/* Left Side: Title & Description */}
        <div className="flex items-center gap-4 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            {/* Favorite Star Icon integrated as requested */}
            {favoriteControl ? (
              favoriteControl
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); /* Add favorite logic if needed */ }}
                className="p-1.5 text-amber-400 hover:scale-110 transition-transform"
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            )}

            <div className={cn("flex flex-col text-left min-w-0", isRtl && "text-right")}>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1 truncate" id="table-header-title">
                {typeof title === 'string' ? stripNumericPrefix(title) : (title || stripNumericPrefix(config.label))}
              </h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none opacity-60">
                {config.collection || 'Registry'}
              </p>
            </div>
            
            {description && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 shrink-0 hidden md:block" />
                <p className="text-[11px] font-medium text-slate-400 truncate max-w-[300px] hidden lg:block italic">
                  {description}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Grouped Actions (Search, Toggles, Extra, Primary) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-row">
          {/* Search bar inside header - Now First of the group as in Image 2 */}
          <div className="relative group w-[180px] xl:w-[240px] transition-all focus-within:w-[220px] xl:focus-within:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand transition-colors" />
            <input 
              type="text" 
              placeholder={t('search') || "Search..."}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-700 dark:text-white focus:bg-white dark:focus:bg-surface focus:ring-4 focus:ring-brand/5 focus:border-brand/30 outline-none transition-all placeholder:text-slate-400 uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="table-search-input"
            />
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Kanban Group Selector - Visible only in Kanban mode */}
          {viewMode === 'kanban' && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-[9px] font-black uppercase text-slate-400">By:</span>
              <select 
                value={kanbanGroupField}
                onChange={(e) => setKanbanGroupField(e.target.value)}
                className="bg-transparent text-[9px] font-black uppercase text-brand outline-none cursor-pointer"
              >
                {config.columns.filter(c => c.type === 'status' || c.type === 'badge' || c.type === 'date' || c.key.toLowerCase().includes('status')).map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* View Toggles - Extra Compact */}
          <div className="flex p-0.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'table' ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-400 hover:text-slate-600")}
              title="Table View"
              id="view-toggle-table"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-400 hover:text-slate-600")}
              title="Grid View"
              id="view-toggle-grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'kanban' ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-400 hover:text-slate-600")}
              title="Kanban View"
              id="view-toggle-kanban"
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

          <button 
            onClick={() => {/* Archive Logic */}}
            className="p-1.5 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:text-amber-600 transition-all shadow-sm active:translate-y-0.5"
            title="Archive"
            id="action-archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={handleExportPDFToDrive}
            className="p-1.5 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:text-red-500 transition-all shadow-sm active:translate-y-0.5"
            title="Print PDF & Save to Drive"
            id="action-print"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={handleExportExcel}
            className="p-1.5 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:text-emerald-600 transition-all shadow-sm active:translate-y-0.5"
            title="Export Excel"
            id="action-excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={() => setShowColumnControls(!showColumnControls)}
            className={cn(
              "p-1.5 rounded-lg transition-all border border-slate-200 dark:border-white/10 shadow-sm",
              showColumnControls ? "bg-brand text-white border-brand" : "bg-white dark:bg-surface text-slate-400 hover:text-brand"
            )}
            title="Columns"
            id="action-columns"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {extraActions && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />
              <div className="flex items-center gap-1.5">
                {extraActions}
              </div>
            </>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Add Button - Now Last of the group as in Image 2 */}
          {showAddButton && (onNewClick || primaryAction) && (
            <button 
              onClick={primaryAction?.onClick || onNewClick}
              className="p-1.5 bg-brand dark:bg-brand border border-brand/20 rounded-lg text-white hover:bg-brand-secondary transition-all shadow-sm active:translate-y-0.5 flex items-center gap-1.5 px-3"
              title={primaryAction?.label || t('add_new') || 'Add New'}
              id="action-add-new"
            >
              {primaryAction?.icon ? <primaryAction.icon className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                {primaryAction?.label || t('add_new') || 'ADD'}
              </span>
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

      {/* Data Section */}
      <div className={cn("flex-1 overflow-auto", viewMode === 'table' ? "" : "p-6 bg-slate-50 border-t border-slate-200 w-full rounded-b-[2rem] h-full dark:bg-transparent")}>
        {viewMode === 'table' && (
          <table className="w-full border-collapse text-left">
            <thead className={cn("sticky top-0 bg-white dark:bg-slate-950 z-10", density === 'compact' ? "h-auto" : "")}>
            <tr className="border-b border-slate-200 dark:border-white/10">
              <th className={cn("px-5 py-4", density === 'compact' ? "py-2 w-10" : "w-12")}>
                <input 
                  type="checkbox" 
                  className={cn("rounded-md border-slate-400 dark:border-white/20 text-brand focus:ring-brand cursor-pointer", density === 'compact' ? "w-4 h-4" : "w-5 h-5")} 
                  checked={selectedIds.size === sortedData.length && sortedData.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className={cn("px-4 py-4 text-left text-[10px] font-black text-brand dark:text-brand uppercase tracking-widest border-r border-slate-100 last:border-0", density === 'compact' ? "py-2 text-[9px] w-14" : "w-16")}>{t('actions') || 'Actions'}</th>
              {config.columns.filter(c => visibleColumns.includes(c.key)).map((col, idx) => (
                <th 
                  key={`th-${col.key}-${idx}`}
                  className={cn("px-4 py-4 text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest group cursor-pointer hover:text-brand dark:hover:text-brand transition-colors border-r border-slate-100 last:border-0", density === 'compact' ? "py-2 text-[9px] px-3" : "")}
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    <ArrowUpDown className={cn("w-3 h-3 transition-opacity", sortConfig?.key === col.key ? "opacity-100 text-brand" : "opacity-0 group-hover:opacity-100")} />
                  </div>
                </th>
              ))}
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
                <td className={cn("px-5 py-4", density === 'compact' ? "py-1.5 px-4" : "")} onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className={cn("rounded-md border-slate-400 dark:border-white/20 text-brand focus:ring-brand cursor-pointer", density === 'compact' ? "w-4 h-4" : "w-5 h-5")} 
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleSelection(record.id)}
                  />
                </td>
                <td className={cn("px-4 py-4 text-left bg-slate-50/30 dark:bg-white/2", density === 'compact' ? "py-1.5 px-3" : "")} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-start gap-1.5 transition-all">
                    <button 
                      onClick={() => onEditRecord ? onEditRecord(record) : onRowClick(record)}
                      className={cn("text-brand hover:text-white hover:bg-brand rounded-lg transition-all shadow-sm bg-white dark:bg-surface border border-brand/20", density === 'compact' ? "p-1.5" : "p-2")}
                    >
                      <Edit2 className={cn("w-4 h-4", density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintSingleRecordToDrive(record);
                      }}
                      className={cn("text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition-all shadow-sm bg-white dark:bg-surface border border-emerald-100 dark:border-emerald-500/20", density === 'compact' ? "p-1.5" : "p-2")}
                      title="Print Record & Save to Drive"
                    >
                      <Printer className={cn("w-4 h-4", density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
                    </button>

                    {(record.driveFileId || record.fileUrl || record.firebaseUrl) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = record.driveFileId 
                            ? `https://drive.google.com/file/d/${record.driveFileId}/view?usp=sharing` 
                            : (record.fileUrl || record.firebaseUrl);
                          window.open(url, '_blank');
                        }}
                        className={cn("text-sky-500 hover:text-white hover:bg-sky-500 rounded-lg transition-all shadow-sm bg-white dark:bg-surface border border-sky-100 dark:border-sky-500/20", density === 'compact' ? "p-1.5" : "p-2")}
                        title="Download / View File"
                      >
                        <Download className={cn("w-4 h-4", density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
                      </button>
                    )}
                    
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
                      className={cn("text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all shadow-sm bg-white dark:bg-surface border border-rose-100 dark:border-rose-500/20", density === 'compact' ? "p-1.5" : "p-2")}
                    >
                      <Trash2 className={cn("w-4 h-4", density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
                    </button>
                  </div>
                </td>
                {config.columns.filter(c => visibleColumns.includes(c.key)).map((col, idx) => (
                  <td key={`td-${col.key}-${idx}`} className={cn("text-text-secondary font-black whitespace-nowrap leading-normal min-w-[120px]", density === 'compact' ? "px-3 py-1.5 text-[11px]" : "px-4 py-4")}>
                    {renderEditableCell(record, col)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {sortedData.map((record, idx) => (
            <motion.div
              key={`grid-card-${record.id}-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onRowClick(record)}
              className={cn(
                "bg-white dark:bg-surface rounded-2xl p-5 border shadow-sm transition-all cursor-pointer hover:shadow-md",
                selectedIds.has(record.id) ? "border-brand ring-2 ring-brand/20" : "border-slate-200 dark:border-white/10 hover:border-brand/30"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={selectedIds.has(record.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(record.id);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[200px]">
                      {record.id || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  {onEditRecord && (
                    <button onClick={() => onEditRecord(record)} className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => onDeleteRecord(record.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {config.columns.filter(c => visibleColumns.includes(c.key) && c.key !== 'id').slice(0, 5).map(col => (
                  <div key={`grid-col-${col.key}`} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">{col.label}</span>
                    <div className="text-right truncate flex-1 flex justify-end">{col.render ? col.render(record[col.key], record) : renderCellValue(record[col.key], col.type)}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {viewMode === 'kanban' && (() => {
        const kanbanRecsByGroup: Record<string, any[]> = {};
        
        sortedData.forEach(record => {
          const groupValue = record[kanbanGroupField] || 'Unassigned';
          if (!kanbanRecsByGroup[groupValue]) kanbanRecsByGroup[groupValue] = [];
          kanbanRecsByGroup[groupValue].push(record);
        });

        const groups = Object.keys(kanbanRecsByGroup).sort();
        
        return (
          <div className="flex gap-6 min-h-[400px] overflow-x-auto p-6 items-start">
            {groups.map(groupName => {
              const kanbanRecs = kanbanRecsByGroup[groupName];
              return (
                <div key={`kanban-${groupName}`} className="flex-shrink-0 w-[320px] flex flex-col gap-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-surface rounded-xl shadow-sm border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand"></div>
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">{groupName}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-white/10">
                      {kanbanRecs.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[100px] rounded-xl p-1">
                    {kanbanRecs.map((record, idx) => (
                      <motion.div
                        key={`k-card-${record.id}-${idx}`}
                        layoutId={`kcard-${record.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onRowClick(record)}
                        className={cn(
                          "bg-white dark:bg-surface p-4 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md",
                          selectedIds.has(record.id) ? "border-brand ring-2 ring-brand/20" : "border-slate-200 dark:border-white/10 hover:border-brand/30"
                        )}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <input 
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={(e) => { e.stopPropagation(); toggleSelection(record.id); }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer mt-1"
                          />
                          <span className="text-[10px] font-mono text-slate-400 font-bold max-w-[120px] truncate" title={record.id}>{record.id}</span>
                        </div>
                        
                        <div className="space-y-2">
                          {config.columns.filter(c => visibleColumns.includes(c.key) && c.key !== 'id' && c.key !== kanbanGroupField).slice(0, 3).map(col => (
                            <div key={`k-col-${col.key}`} className="text-xs flex flex-col gap-0.5 max-w-full">
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">{col.label}</span>
                              <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 w-full">
                                {col.render ? col.render(record[col.key], record) : col.type === 'currency' ? formatAmount(record[col.key], baseCurrency) : col.type === 'date' ? formatDate(record[col.key]) : record[col.key] && col.type !== 'object' && col.type !== 'array' ? String(record[col.key]).substring(0,60) : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-slate-50 dark:border-white/5" onClick={e => e.stopPropagation()}>
                          {onEditRecord && (
                            <button onClick={() => onEditRecord(record)} className="p-1 hover:text-brand hover:bg-brand/10 rounded text-slate-400 transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handlePrintSingleRecordToDrive(record); }} className="p-1 hover:text-emerald-500 hover:bg-emerald-50 rounded text-slate-400 transition-colors" title="Print to Drive">
                            <Printer className="w-3 h-3" />
                          </button>
                          <button onClick={() => onDeleteRecord(record.id)} className="p-1 hover:text-red-500 hover:bg-red-50 rounded text-slate-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
        
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
