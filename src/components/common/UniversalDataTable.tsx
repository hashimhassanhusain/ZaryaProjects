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
  Star,
  RefreshCcw,
  FileText,
  ChevronUp,
  Database
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
import { useDriveSync } from '../../context/DriveSyncContext';

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
  onArchiveRecord?: (record: any) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
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
  extraActions,
  onArchiveRecord,
  showArchived,
  onToggleArchived
}) => {
  const { selectedProject } = useProject();
  const { isSyncing, triggerGlobalSync } = useDriveSync();
  const { t, isRtl } = useLanguage();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'kanban'>('table');
  const [kanbanGroupField, setKanbanGroupField] = useState<string>(() => {
    const statusCol = config.columns.find(c => c.type === 'status' || c.key.toLowerCase().includes('status'));
    return statusCol ? statusCol.key : 'status';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    config.columns.filter(c => c.visible !== false).map(c => c.key)
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    config.columns.map(c => c.key)
  );
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(
    Object.fromEntries(config.columns.map(c => [c.key, c.label]))
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
      if (!projectRootId || projectRootId.length < 5 || projectRootId === '.' || projectRootId.includes('eFit1RP')) {
         throw new Error('Project Main Folder not found. Please verify Google Drive settings.');
      }

      let driveRes;
      try {
        driveRes = await fetch('/api/drive/upload-by-url', {
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
      } catch (fetchErr: any) {
        throw new Error('Network error during Drive upload: ' + fetchErr.message);
      }

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
      if (!projectRootId || projectRootId.length < 5 || projectRootId === '.' || projectRootId.includes('eFit1RP')) {
         throw new Error('Project Main Folder not found. Please verify Google Drive settings.');
      }

      let driveRes;
      try {
        driveRes = await fetch('/api/drive/upload-by-url', {
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
      } catch (fetchErr: any) {
        throw new Error('Network error during Drive upload: ' + fetchErr.message);
      }

      if (!driveRes.ok) throw new Error('Drive API rejected the upload');

      toast.success(isRtl ? '✅ تم الحفظ في جوجل درايف!' : '✅ Saved record to Google Drive!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export and upload record PDF: ' + err.message, { id: toastId });
    }
  };

  const handleRowClickWithActionPrompt = (record: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (onEditRecord) {
      onEditRecord(record);
    } else {
      onRowClick(record);
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
        const statusOptions = ['Active', 'Draft', 'Closed', 'Pending', 'Approved', 'Not Started', 'In Progress', 'Completed', 'TO DO', 'PLANNING', 'RFP', 'TENDERING', 'AT RISK', 'UPDATE REQUIRED', 'PO Issued'];
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

      if (col.type === 'priority') {
        const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
        return (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <select
              ref={editInputRef as any}
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleInlineSave}
              className="px-2 py-1 bg-white border border-brand text-[10px] font-black uppercase rounded-lg outline-none"
            >
              {priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input
            ref={editInputRef as any}
            type={col.type === 'date' ? 'date' : (col.type === 'currency' || col.type === 'number' ? 'number' : 'text')}
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
        className={cn("cursor-text hover:bg-brand/5 px-2 py-1 rounded-lg transition-all group/cell flex items-center justify-between", col.render ? "hover:bg-transparent" : "")}
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
    <div className="flex flex-col h-full bg-transparent rounded-none border-0 shadow-none overflow-hidden min-h-[500px]">
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
        className="pb-4 border-b-2 border-slate-300 flex items-center justify-between gap-6 bg-white dark:bg-surface sticky top-0 z-40 mb-4 px-4 py-3 rounded-lg shadow-sm"
      >
        {/* Left Side: Title & Description */}
        <div className="flex items-center gap-5 shrink-0 min-w-0">
          {typeof title !== 'string' && title ? (
            <div className="flex-1 min-w-0">{title}</div>
          ) : (
            <div className={cn("flex flex-col text-left min-w-0", isRtl && "text-right")}>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1 truncate flex items-center gap-2" id="table-header-title">
                <FileSpreadsheet className="w-4 h-4 text-brand" />
                {typeof title === 'string' ? stripNumericPrefix(title) : stripNumericPrefix(config.label)}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none opacity-60">
                {config.collection || 'Registry'}
              </p>
            </div>
          )}
          
          {description && typeof title === 'string' && (
            <>
              <p className="text-xs font-medium text-slate-400 truncate max-w-[300px] hidden lg:block italic ml-4 border-l pl-4 border-slate-200">
                {description}
              </p>
            </>
          )}

          {favoriteControl && (
            <div className="hidden sm:block">
              {favoriteControl}
            </div>
          )}
        </div>

        {/* Right Side: Grouped Actions (Search, Toggles, Extra, Primary) */}
        <div className="flex items-center gap-4 shrink ml-auto flex-row">
          {/* Search bar inside header - Expandable Transition */}
          <div className={cn(
            "relative group transition-all duration-300 ease-in-out flex items-center",
            isSearchExpanded ? "w-[220px] sm:w-[260px] md:w-[320px]" : "w-10 h-10"
          )}>
            <AnimatePresence mode="wait">
              {isSearchExpanded ? (
                 <motion.div 
                   key="search-input"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="w-full relative flex items-center"
                 >
                    <Search className="absolute left-3 w-4 h-4 text-brand" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder={t('search') || "Search..."}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-white/5 border border-brand rounded-lg text-xs font-bold text-slate-700 dark:text-white focus:bg-white dark:focus:bg-surface focus:ring-4 focus:ring-brand/10 outline-none transition-all placeholder:text-slate-400 uppercase tracking-wider"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                      onKeyDown={(e) => e.key === 'Escape' && setIsSearchExpanded(false)}
                      id="table-search-input"
                    />
                    <button 
                      onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }}
                      className="absolute right-3 p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </motion.div>
              ) : (
                <motion.button
                  key="search-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSearchExpanded(true)}
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:text-brand hover:border-brand/40 transition-all shadow-sm"
                  title={t('search') || "Search"}
                >
                  <Search className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-2">
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
                <span className="text-[8px] font-black uppercase text-slate-900 px-1">Group:</span>
                <select 
                  value={kanbanGroupField}
                  onChange={(e) => setKanbanGroupField(e.target.value)}
                  className="bg-transparent text-[9px] font-black uppercase text-slate-900 dark:text-white outline-none cursor-pointer pr-4"
                >
                  {config.columns.map(col => (
                    <option key={`group-${col.key}`} value={col.key}>{columnLabels[col.key] || col.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'table' ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-400 hover:text-slate-600")}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-400 hover:text-slate-600")}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'kanban' ? "bg-white dark:bg-surface shadow-sm text-brand" : "text-slate-400 hover:text-slate-600")}
                title="Kanban View"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Add Button - Orange Icon with + ONLY */}
            {showAddButton && (onNewClick || primaryAction) && (
              <button 
                onClick={primaryAction?.onClick || onNewClick}
                className="w-10 h-10 bg-[#ff6d00] border border-[#ff6d00] rounded-lg text-white hover:scale-105 transition-all shadow-lg shadow-[#ff6d00]/20 active:translate-y-0.5 flex items-center justify-center shrink-0"
                title={primaryAction?.label || t('add_new') || 'Add New'}
              >
                <Plus className="w-6 h-6" strokeWidth={3.5} />
              </button>
            )}

            {onToggleArchived && (
              <button 
                onClick={onToggleArchived}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-lg border transition-all shadow-sm",
                  showArchived ? "bg-amber-500 text-white border-amber-600" : "bg-white dark:bg-surface text-slate-400 border-slate-200 hover:border-amber-400 hover:text-amber-500"
                )}
                title={showArchived ? "Hide Archived" : "Show Archived"}
              >
                <div className="relative">
                  <Archive className="w-4 h-4" />
                  {showArchived && <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border border-amber-500" />}
                </div>
              </button>
            )}

            <button 
              onClick={() => setShowColumnControls(!showColumnControls)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-all border border-slate-200 dark:border-white/10 shadow-sm",
                showColumnControls ? "bg-brand text-white border-brand" : "bg-white dark:bg-surface text-slate-400 hover:text-brand"
              )}
              title="Columns"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={triggerGlobalSync}
              disabled={isSyncing}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:text-blue-500 transition-all shadow-sm active:translate-y-0.5"
              title="Sync"
            >
              <RefreshCcw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            </button>

            <button 
              onClick={handleExportPDFToDrive}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-slate-400 hover:text-red-500 transition-all shadow-sm"
              title="Print to Drive"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

          {/* Extra Actions Container - AFTER Add New */}
          {extraActions && (
            <div className="flex items-center gap-2 shrink-0 ml-2 border-l border-slate-200 pl-4">
              {extraActions}
            </div>
          )}
        </div>
      </div>

      {/* Column Visibility/Settings Controls */}
      <AnimatePresence>
        {showColumnControls && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-white/10 p-6"
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isRtl ? 'إعدادات الأعمدة (تغيير المسمى والترتيب)' : 'Column Settings (Rename & Reorder)'}</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">{isRtl ? 'تحكم في ظهور الأعمدة وسحبها لترتيبها' : 'Control visibility and drag/order columns'}</p>
                </div>
                <button 
                  onClick={() => setShowColumnControls(false)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {columnOrder.map((key, idx) => {
                  const col = config.columns.find(c => c.key === key);
                  if (!col) return null;
                  const isVisible = visibleColumns.includes(key);
                  return (
                    <div 
                      key={`col-settings-${key}`}
                      className={cn(
                        "flex flex-col gap-2 p-4 bg-white dark:bg-surface border-2 transition-all rounded-xl",
                        isVisible ? "border-slate-200 scale-100 shadow-sm" : "border-transparent opacity-50 scale-95 grayscale"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => setVisibleColumns(prev => 
                              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                            )}
                            className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                          />
                          <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest truncate max-w-[120px]">{key}</span>
                        </div>
                        
                        <div className="flex gap-1">
                          <button 
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...columnOrder];
                              [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                              setColumnOrder(next);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-20 text-slate-400 hover:text-brand"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            disabled={idx === columnOrder.length - 1}
                            onClick={() => {
                              const next = [...columnOrder];
                              [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                              setColumnOrder(next);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-20 text-slate-400 hover:text-brand"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <input 
                        type="text"
                        value={columnLabels[key]}
                        onChange={(e) => setColumnLabels(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 rounded-lg text-xs font-black text-slate-900 dark:text-white outline-none focus:border-brand transition-all font-mono"
                        placeholder="Label"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("flex-1 overflow-auto", viewMode === 'table' ? "" : "p-6 w-full h-full")}>
        {viewMode === 'table' && (
          <table className="w-full border-collapse text-left">
            <thead className={cn("sticky top-0 bg-slate-950 border-b-2 border-brand z-10 shadow-xl", density === 'compact' ? "h-auto" : "")}>
            <tr className="border-b border-white/10">
              <th className={cn("px-5 py-4", density === 'compact' ? "py-3 w-10 text-[#ff6d00]" : "w-12 text-[#ff6d00]")}>
                <input 
                  type="checkbox" 
                  className={cn("rounded border-white/20 text-[#ff6d00] focus:ring-[#ff6d00] cursor-pointer", density === 'compact' ? "w-4 h-4" : "w-5 h-5")} 
                  checked={selectedIds.size === sortedData.length && sortedData.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className={cn("px-4 py-4 text-left text-[11px] font-black text-[#ff6d00] uppercase tracking-[0.2em] border-r border-white/10 last:border-0", density === 'compact' ? "py-3 w-16" : "w-20")}>{t('actions') || 'Actions'}</th>
              {columnOrder.filter(k => visibleColumns.includes(k)).map((k) => (
                <th 
                  key={`th-${k}`}
                  className={cn("px-4 py-4 text-[11px] font-black text-white uppercase tracking-[0.2em] group cursor-pointer hover:bg-white/10 transition-colors border-r border-white/10 last:border-0", density === 'compact' ? "py-3 px-4" : "")}
                  onClick={() => toggleSort(k)}
                >
                  <div className="flex items-center gap-2">
                    {columnLabels[k]}
                    <ArrowUpDown className={cn("w-3 h-3 transition-opacity", sortConfig?.key === k ? "opacity-100 text-[#ff6d00]" : "opacity-0 group-hover:opacity-100")} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <FileText className="w-12 h-12 text-slate-200" />
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">No Records Found</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">The system found no matching data for this view.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((record, idx) => (
              <motion.tr
                key={`tr-${record.id || 'record'}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.01 }}
                onClick={(e) => handleRowClickWithActionPrompt(record, e)}
                className={cn(
                  "group transition-all cursor-pointer h-[40px] border-b border-dashed border-slate-300",
                  selectedIds.has(record.id) ? "bg-[#ff6d00]/10" : "hover:bg-slate-200/50"
                )}
              >
                <td className={cn("px-5 py-0 h-[40px] border-b border-transparent leading-[40px]", density === 'compact' ? "px-4" : "")} onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className={cn("rounded-md border-slate-400 dark:border-white/20 text-brand focus:ring-brand cursor-pointer", density === 'compact' ? "w-4 h-4" : "w-5 h-5")} 
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleSelection(record.id)}
                  />
                </td>
                <td className={cn("px-4 py-0 h-[40px] text-left bg-transparent", density === 'compact' ? "px-3" : "")} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-start gap-1.5 transition-all">
                    <button 
                      onClick={() => onEditRecord ? onEditRecord(record) : onRowClick(record)}
                      className={cn("text-brand hover:text-white hover:bg-brand rounded-lg transition-all shadow-sm bg-white dark:bg-surface border border-brand/20", density === 'compact' ? "p-1.5" : "p-2")}
                      title="Edit Record"
                    >
                      <Edit2 className={cn("w-4 h-4", density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
                    </button>

                    {onArchiveRecord && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveRecord(record);
                        }}
                        className={cn("text-amber-500 hover:text-white hover:bg-amber-500 rounded-lg transition-all shadow-sm bg-white dark:bg-surface border border-amber-100 dark:border-amber-500/20", density === 'compact' ? "p-1.5" : "p-2")}
                        title="Archive Record"
                      >
                        <Archive className={cn("w-4 h-4", density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
                      </button>
                    )}

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
                  <td key={`td-${col.key}-${idx}`} className={cn("text-[#1A1C1E] font-medium whitespace-nowrap leading-normal min-w-[120px] h-[40px] py-0", density === 'compact' ? "px-3 text-[11px]" : "px-4")}>
                    {renderEditableCell(record, col)}
                  </td>
                ))}
              </motion.tr>
            )))}
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
              onClick={(e) => handleRowClickWithActionPrompt(record, e)}
              className={cn(
                "bg-white dark:bg-surface rounded-lg p-5 border shadow-sm transition-all cursor-pointer hover:shadow-md",
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
                  {onArchiveRecord && (
                    <button onClick={() => onArchiveRecord(record)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg">
                      <Archive className="w-3.5 h-3.5" />
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
                  <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-lg shadow-md border border-slate-700">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        {columnLabels[kanbanGroupField] || kanbanGroupField}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff6d00] animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">{groupName}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-bold rounded-md border border-white/10">
                      {kanbanRecs.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[100px] rounded-lg p-1">
                    {kanbanRecs.map((record, idx) => (
                      <motion.div
                        key={`k-card-${record.id}-${idx}`}
                        layoutId={`kcard-${record.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={(e) => handleRowClickWithActionPrompt(record, e)}
                        className={cn(
                          "bg-white dark:bg-surface p-4 rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md",
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
                          {onArchiveRecord && (
                            <button onClick={() => onArchiveRecord(record)} className="p-1 hover:text-amber-500 hover:bg-amber-50 rounded text-slate-400 transition-colors">
                              <Archive className="w-3 h-3" />
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
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>{data.length} {t('records')}</span>
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
