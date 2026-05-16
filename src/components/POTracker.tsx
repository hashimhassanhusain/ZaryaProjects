import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2, 
  Download, 
  FileSpreadsheet, 
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  BarChart3,
  Calendar,
  Users,
  Building2,
  Package,
  Layers,
  LayoutGrid,
  List,
  Kanban,
  FileSignature,
  FileWarning,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { EntityConfig, PurchaseOrder, Page } from '../types';
import { UniversalDataTable } from './common/UniversalDataTable';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { loadArabicFont } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const POTracker: React.FC<{ page: Page; costCenterId?: string | null }> = ({ page, costCenterId }) => {
  const { selectedProject } = useProject();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const { language, t } = useLanguage();
  const isRtl = language === 'ar';

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'form' | 'tracking'>('list');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Filtered POs based on costCenterId and Archive state
  const filteredPOs = useMemo(() => {
    let result = pos;
    
    // Filter by Archive status
    result = result.filter(po => showArchived ? po.isArchived === true : !po.isArchived);

    if (costCenterId) {
      // Normalize costCenterId (strip 'CC-' if present)
      const normalizedCCId = costCenterId.startsWith('CC-') ? costCenterId.substring(3) : costCenterId;
      
      result = result.filter(po => {
        // Support both field names if they exist
        const cc = (po as any).costCenterId || po.masterFormat;
        return cc === normalizedCCId || cc === costCenterId || (cc && String(cc).startsWith(normalizedCCId + ' '));
      });
    }
    return result;
  }, [pos, costCenterId]);
  const [newPO, setNewPO] = useState<Partial<PurchaseOrder>>({
    status: 'Draft',
    date: new Date().toISOString().split('T')[0],
    lineItems: []
  });

  const handleExportPDF = async () => {
    if (!selectedPO) return;
    
    const toastId = toast.loading(isRtl ? 'جاري تصدير PDF...' : 'Exporting PDF...');
    try {
      const pdf = new jsPDF('portrait');
      const hasArabic = await loadArabicFont(pdf);
      const fontName = hasArabic ? 'Amiri' : 'helvetica';

      // Header
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(20);
      pdf.text(`Purchase Order: ${selectedPO.id}`, 14, 20);

      pdf.setFontSize(12);
      pdf.setFont(fontName, 'normal');
      pdf.text(`Status: ${selectedPO.status}`, 14, 30);
      pdf.text(`Date: ${selectedPO.date}`, 14, 38);
      pdf.text(`Supplier: ${selectedPO.supplier}`, 14, 46);
      pdf.text(`Description: ${selectedPO.description || 'N/A'}`, 14, 54);

      // Financials
      pdf.setFont(fontName, 'bold');
      pdf.text(`Amount: ${formatAmount(selectedPO.amount || 0)}`, 14, 66);
      pdf.setFont(fontName, 'normal');

      // Table for Line Items
      if (selectedPO.lineItems && selectedPO.lineItems.length > 0) {
        const tableCols = [
          isRtl ? 'الوصف' : 'Description',
          isRtl ? 'الكمية' : 'Quantity',
          isRtl ? 'الوحدة' : 'Unit',
          isRtl ? 'سعر الوحدة' : 'Unit Price',
          isRtl ? 'الإجمالي' : 'Total'
        ];

        const tableData = selectedPO.lineItems.map(item => [
          item.description,
          item.quantity.toString(),
          item.unit,
          formatAmount(item.unitPrice),
          formatAmount(item.total)
        ]);

        autoTable(pdf, {
          head: [tableCols],
          body: tableData,
          startY: 75,
          styles: { font: fontName, fontSize: 10 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' }
        });
      }

      pdf.save(`PO_${selectedPO.id}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(isRtl ? 'تم التصدير بنجاح' : 'Exported successfully', { id: toastId });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed', { id: toastId });
    }
  };

  // PO Classification Logic
  // - Contract: >= 15M IQD
  // - Agreement: >= 3M IQD && < 15M IQD
  // - None: < 3M IQD
  const getDocTypeRequirement = (amount: number) => {
    if (amount >= 15000000) {
      return { 
        label: isRtl ? 'عقد' : 'Contract', 
        color: 'bg-indigo-600 text-white',
        border: 'border-indigo-700',
        bg: 'bg-indigo-50',
        icon: FileSignature,
        type: 'contract'
      };
    } else if (amount >= 3000000) {
      return { 
        label: isRtl ? 'اتفاقية' : 'Agreement', 
        color: 'bg-amber-500 text-white',
        border: 'border-amber-600',
        bg: 'bg-amber-50',
        icon: FileText,
        type: 'agreement'
      };
    } else {
      return { 
        label: isRtl ? 'لا يوجد' : 'None', 
        color: 'bg-slate-400 text-white',
        border: 'border-slate-500',
        bg: 'bg-slate-50',
        icon: AlertCircle,
        type: 'none'
      };
    }
  };

  const poConfig: EntityConfig = {
    id: 'purchase_orders',
    collection: 'purchase_orders',
    label: isRtl ? 'أوامر الشراء' : 'Purchase Orders',
    icon: ShoppingCart,
    columns: [
      { key: 'id', label: 'PO #', type: 'string', render: (val) => <span className="font-black text-brand tracking-widest">{val}</span> },
      { key: 'name', label: isRtl ? 'الاسم' : 'Name', type: 'string' },
      { key: 'date', label: isRtl ? 'التاريخ' : 'Date', type: 'date' },
      { key: 'supplier', label: isRtl ? 'المورد' : 'Supplier', type: 'string' },
      { key: 'description', label: isRtl ? 'الوصف' : 'Description', type: 'string' },
      { key: 'amount', label: isRtl ? 'المبلغ' : 'Amount', type: 'currency' },
      { 
        key: 'docType', 
        label: isRtl ? 'نوع المستند' : 'Doc Type', 
        type: 'string',
        render: (_, row) => {
          const req = getDocTypeRequirement(row.amount || 0);
          const hasContract = !!row.contractId;
          const needsContract = (row.amount || 0) >= 15000000;

          return (
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border",
                req.color,
                req.border
              )}>
                {req.label}
              </span>
              {needsContract && !hasContract && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[8px] font-black uppercase animate-pulse">
                  <FileWarning className="w-3 h-3" />
                  {isRtl ? 'بانتظار العقد' : 'Pending Contract'}
                </span>
              )}
              {hasContract && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[8px] font-black uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  {isRtl ? 'مرتبط بعقد' : 'Contract Linked'}
                </span>
              )}
            </div>
          );
        }
      },
      { key: 'status', label: isRtl ? 'الحالة' : 'Status', type: 'status' }
    ]
  };

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setPos(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject]);

  const handleSavePO = async () => {
    if (!selectedProject || !newPO.id || !newPO.supplier || !newPO.amount) {
      toast.error(isRtl ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if ((newPO.amount || 0) >= 15000000 && !newPO.contractId) {
      toast.error(isRtl ? 'هذا المبلغ يتطلب رقم عقد معتمد' : 'This amount requires an official contract reference');
      return;
    }

    try {
      const poData = {
        ...newPO,
        projectId: selectedProject.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (selectedPO) {
        await updateDoc(doc(db, 'purchase_orders', selectedPO.id), poData);
        toast.success(isRtl ? 'تم تحديث أمر الشراء بنجاح' : 'Purchase order updated successfully');
      } else {
        await addDoc(collection(db, 'purchase_orders'), poData);
        toast.success(isRtl ? 'تم إنشاء أمر الشراء بنجاح' : 'Purchase order created successfully');
      }
      setView('list');
      setSelectedPO(null);
      setNewPO({ status: 'Draft', date: new Date().toISOString().split('T')[0], lineItems: [] });
    } catch (error) {
      console.error('Error saving PO:', error);
      toast.error(isRtl ? 'فشل حفظ أمر الشراء' : 'Failed to save purchase order');
    }
  };

  const handleDeletePO = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'purchase_orders', id));
      toast.success(isRtl ? 'تم حذف أمر الشراء بنجاح' : 'Purchase order deleted successfully');
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error(isRtl ? 'فشل حذف أمر الشراء' : 'Failed to delete purchase order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-slate-50", isRtl && "text-right")} dir={isRtl ? 'rtl' : 'ltr'}>
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 p-6 overflow-hidden"
          >
            <UniversalDataTable 
              config={poConfig}
              data={filteredPOs}
              title={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                      {isRtl ? 'سجل أوامر الشراء' : 'PO Registry'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      {isRtl ? 'إدارة وتتبع أوامر الشراء والمستندات' : 'Manage and track purchase orders & documents'}
                    </p>
                  </div>
                </div>
              }
              onRowClick={(po) => {
                setSelectedPO(po);
                setView('detail');
              }}
              onNewClick={() => {
                setSelectedPO(null);
                setNewPO({ status: 'Draft', date: new Date().toISOString().split('T')[0], lineItems: [] });
                setView('form');
              }}
              onDeleteRecord={handleDeletePO}
              onArchiveRecord={async (po) => {
                try {
                  await updateDoc(doc(db, 'purchase_orders', po.id), { isArchived: !po.isArchived });
                  toast.success(po.isArchived ? 'Restored from archive' : 'Archived successfully');
                } catch (err) {
                  toast.error('Failed to archive');
                }
              }}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived(!showArchived)}
              favoriteControl={
                <div className="flex items-center gap-2">
                  <div className={cn("px-4 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm flex items-center gap-2")}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      {filteredPOs.length} {isRtl ? 'أوامر' : 'Orders'}
                    </span>
                  </div>
                </div>
              }
            />
          </motion.div>
        )}

        {view === 'detail' && selectedPO && (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="bg-slate-50 min-h-screen p-8">
              <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-6 mb-12">
                  <button 
                    onClick={() => setView('list')}
                    className="p-3 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-500 group"
                  >
                    <ArrowRight className={cn("w-6 h-6", isRtl ? "rotate-0" : "rotate-180")} />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                        {selectedPO.name || selectedPO.id}
                      </h1>
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm border",
                        selectedPO.status === 'Approved' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
                      )}>
                        {selectedPO.status}
                      </span>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {selectedPO.supplier} • {selectedPO.date} • {selectedPO.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setNewPO(selectedPO);
                      setView('form');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 shadow-sm transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    {isRtl ? 'تعديل' : 'Edit'}
                  </button>

                  {(selectedPO.amount || 0) >= 3000000 && (
                    <button 
                      onClick={() => {
                        // Navigate to Contracts tab or open a contract linking interface
                        // For now, we can show a toast or a simple way to link
                        // Ideally, we want to jump to the CONTRACTS tab. 
                        // But POTracker doesn't control the parent tabs.
                        // However, we can update the PO here with a contract ID if we want.
                        // Let's just provide a direct link button if possible, 
                        // or at least a way to mark it as having a contract.
                        toast.success(isRtl ? 'انتقل إلى تبويب العقود لربط هذا الأمر بعقد' : 'Go to CONTRACTS tab to link this PO to a contract');
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 shadow-sm transition-all"
                    >
                      <FileSignature className="w-4 h-4" />
                      {isRtl ? 'إدارة العقد' : 'Manage Contract'}
                    </button>
                  )}

                  <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-secondary shadow-lg shadow-brand/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {isRtl ? 'تصدير PDF' : 'Export PDF'}
                  </button>
                </div>
              </div>

              {/* Requirement Alert Section */}
              {(() => {
                const req = getDocTypeRequirement(selectedPO.amount || 0);
                return (
                  <div className={cn(
                    "p-8 rounded-2xl border shadow-sm relative overflow-hidden",
                    req.bg,
                    req.border.replace('border-', 'border-opacity-30 border-')
                  )}>
                    <div className="relative z-10 flex items-start gap-8">
                      <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center shadow-lg", req.color)}>
                        <req.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                            {isRtl ? 'متطلبات المستند' : 'Document Requirements'}
                          </h2>
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            req.color
                          )}>
                            {req.label}
                          </span>
                        </div>
                        <p className={cn("text-sm font-bold opacity-70 leading-relaxed max-w-2xl", isRtl ? "text-right" : "text-left")}>
                          {req.type === 'contract' && (isRtl 
                            ? 'بناءً على التكلفة الإجمالية (أكثر من 15,000,000 د.ع)، يتطلب أمر الشراء هذا إصدار عقد قانوني رسمي لضمان الحقوق والالتزامات.' 
                            : 'Based on the total cost (>= 15,000,000 IQD), this PO requires a formal legal contract to ensure rights and obligations.')}
                          {req.type === 'agreement' && (isRtl 
                            ? 'نظراً لأن التكلفة تتراوح بين 3,000,000 و 15,000,000 د.ع، يوصى بعمل اتفاقية عمل مبسطة توضح شروط التوريد.' 
                            : 'Since the cost is between 3,000,000 and 15,000,000 IQD, a simplified work agreement is recommended.')}
                          {req.type === 'none' && (isRtl 
                            ? 'تكلفة هذا الأمر أقل من 3,000,000 د.ع، وبالتالي لا يتطلب إجراءات تعاقدية إضافية حسب السياسة الحالية.' 
                            : 'The cost of this order is below 3,000,000 IQD, so it does not require additional contracting procedures according to current policy.')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Main Content Grid */}
              <div className="grid grid-cols-3 gap-8">
                {/* Financial Summary */}
                <div className="col-span-2 space-y-8">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <BarChart3 className="w-5 h-5 text-brand" />
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                        {isRtl ? 'التفاصيل المالية' : 'Financial Details'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                          {isRtl ? 'المبلغ الإجمالي' : 'Total Amount'}
                        </span>
                        <div className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                          {formatAmount(selectedPO.amount || 0, baseCurrency)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                          {isRtl ? 'حالة الدفع' : 'Payment Status'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <span className="text-lg font-black text-slate-700 tracking-tight">
                            {isRtl ? 'قيد الانتظار' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 h-px bg-slate-100 w-full" />

                    <div className="mt-8 space-y-4">
                       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm">
                                <Layers className="w-5 h-5" />
                             </div>
                             <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">WBS ID</span>
                                <span className="font-bold text-slate-900 italic tracking-tighter">{selectedPO.wbsId || '6.1.1'}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm">
                                <Building2 className="w-5 h-5" />
                             </div>
                             <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Cost Account</span>
                                <span className="font-bold text-slate-900 italic tracking-tighter">{selectedPO.masterFormat || '03 Concrete'}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-brand" />
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                            {isRtl ? 'بنود التجهيز' : 'Line Items'}
                          </h3>
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {selectedPO.lineItems?.length || 0} {isRtl ? 'بنود' : 'Items'}
                       </span>
                    </div>

                    <div className="space-y-4">
                      {selectedPO.lineItems?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm font-black text-xs group-hover:text-brand">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 tracking-tight">{item.description}</h4>
                              <div className="flex items-center gap-3 mt-1 underline decoration-slate-200 decoration-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.quantity} {item.unit}</span>
                                <span className="text-[10px] font-black text-slate-300">@</span>
                                <span className="text-[10px] font-black text-brand uppercase tracking-widest">
                                  {formatAmount(item.rate, baseCurrency)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900 font-mono tracking-tighter">
                              {formatAmount(item.amount, baseCurrency)}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                              Code: MAT-01
                            </span>
                          </div>
                        </div>
                      )) || (
                        <div className="p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No line items recorded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                  <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                    
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
                      {isRtl ? 'المورد والموافقة' : 'Supplier & Approval'}
                    </h3>

                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-brand shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{isRtl ? 'المورد المعتمد' : 'Primary Vendor'}</span>
                          <p className="font-bold tracking-tight text-white">{selectedPO.supplier}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60 italic underline">View Vendor Profile</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{isRtl ? 'سلطة الاعتماد' : 'Approval Authority'}</span>
                          <p className="font-bold tracking-tight text-white">Project Manager</p>
                          <p className="text-[9px] font-black text-emerald-400/70 uppercase tracking-widest mt-1">Status: Fully Verified</p>
                        </div>
                      </div>
                    </div>

                    <button className="w-full mt-12 bg-white text-slate-900 py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
                      <Download className="w-4 h-4" />
                      {isRtl ? 'تحميل كملف ZIP' : 'Download Bundle'}
                    </button>
                  </div>

                  {/* History/Timeline */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8">
                      {isRtl ? 'سجل العمليات' : 'PO Timeline'}
                    </h3>

                    <div className="space-y-8 relative">
                      <div className="absolute top-2 left-4 bottom-2 w-px bg-slate-100 hidden md:block" />
                      
                      {[
                        { action: 'PO Created', user: 'Admin', date: selectedPO.date, status: 'Completed' },
                        { action: 'Budget Verified', user: 'Finance', date: selectedPO.date, status: 'Completed' },
                        { action: 'Approval Granted', user: 'PM', date: selectedPO.date, status: 'Completed' },
                        { action: 'Supplier Notified', user: 'Procurement', date: '-', status: 'Pending' }
                      ].map((log, i) => (
                        <div key={i} className="flex gap-4 relative z-10">
                          <div className={cn(
                            "w-8 h-8 rounded-full border-4 border-white shadow-md flex items-center justify-center shrink-0",
                            log.status === 'Completed' ? "bg-emerald-500" : "bg-slate-200"
                          )}>
                            {log.status === 'Completed' ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                          </div>
                          <div>
                            <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">{log.action}</h5>
                            <span className="text-[10px] font-bold text-slate-400 opacity-70 block mt-1">{log.user} • {log.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 p-12 overflow-auto"
          >
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                    {selectedPO ? (isRtl ? 'تعديل أمر شراء' : 'Edit Purchase Order') : (isRtl ? 'أمر شراء جديد' : 'New Purchase Order')}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {isRtl ? 'أدخل تفاصيل التوريد والبنود المالية' : 'Enter procurement details and financial items'}
                  </p>
                </div>
                <button 
                  onClick={() => setView('list')}
                  className="p-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 p-10 space-y-12">
                 {/* Basic Info Container */}
                 <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-xl border border-slate-100">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'رقم أمر الشراء' : 'PO ID NUMBER'}</label>
                       <input 
                         type="text" 
                         value={newPO.id || ''}
                         onChange={(e) => setNewPO({...newPO, id: e.target.value})}
                         placeholder="e.g. COS002024"
                         className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand font-black text-slate-900 tracking-widest uppercase transition-all shadow-sm"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'تاريخ الأمر' : 'ORDER DATE'}</label>
                       <input 
                         type="date" 
                         value={newPO.date || ''}
                         onChange={(e) => setNewPO({...newPO, date: e.target.value})}
                         className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand font-black text-slate-900 uppercase tracking-widest transition-all shadow-sm"
                       />
                    </div>
                    <div className="space-y-4 col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'الاسم' : 'Purchase Order Name'}</label>
                       <input 
                         type="text" 
                         value={newPO.name || ''}
                         onChange={(e) => setNewPO({...newPO, name: e.target.value})}
                         placeholder={isRtl ? 'اسم أمر الشراء' : 'Purchase Order Name'}
                         className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand font-black text-slate-900 uppercase tracking-widest transition-all shadow-sm"
                       />
                    </div>
                    {(newPO.amount || 0) >= 15000000 && (
                      <div className="space-y-4 col-span-2">
                         <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block ml-1">{isRtl ? 'رقم العقد المعتمد' : 'OFFICIAL CONTRACT REFERENCE'}</label>
                         <input 
                           type="text" 
                           value={newPO.contractId || ''}
                           onChange={(e) => setNewPO({...newPO, contractId: e.target.value})}
                           placeholder="e.g. CON-01/2026"
                           className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-indigo-900 tracking-widest uppercase transition-all shadow-sm"
                         />
                      </div>
                    )}
                    <div className="space-y-4 col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'المورد / الشركة' : 'PRIMARY SUPPLIER / VENDOR'}</label>
                       <input 
                         type="text" 
                         value={newPO.supplier || ''}
                         onChange={(e) => setNewPO({...newPO, supplier: e.target.value})}
                         placeholder="e.g. Al-Rawi Construction Materials"
                         className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand font-black text-slate-900 uppercase tracking-widest transition-all shadow-sm"
                       />
                    </div>
                 </div>

                 {/* Amount Section */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">{isRtl ? 'القيمة الإجمالية' : 'Total Financial Value'}</h3>
                       <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-brand" />
                          <span className="text-[10px] font-black text-brand uppercase tracking-widest">{isRtl ? 'تقدير آلي' : 'AUTO-ESTIMATE'}</span>
                       </div>
                    </div>
                    
                    <div className="relative group">
                       <input 
                         type="number" 
                         value={newPO.amount || ''}
                         onChange={(e) => setNewPO({...newPO, amount: Number(e.target.value)})}
                         placeholder="0.00"
                         className="w-full p-8 bg-slate-900 text-white rounded-2xl outline-none font-mono text-5xl font-black text-center tracking-tighter shadow-2xl focus:ring-[15px] focus:ring-brand/20 border-4 border-transparent focus:border-brand transition-all pr-24"
                       />
                       <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 font-black text-2xl uppercase tracking-widest pointer-events-none group-focus-within:text-brand transition-colors">
                         {baseCurrency}
                       </div>
                    </div>

                    {/* Real-time Requirement Preview */}
                    {newPO.amount ? (() => {
                      const req = getDocTypeRequirement(newPO.amount);
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "mt-4 p-5 rounded-xl border flex items-center justify-between shadow-sm",
                            req.bg,
                            req.border
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md", req.color)}>
                              <req.icon className="w-5 h-5" />
                            </div>
                            <div>
                               <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block ml-1">{isRtl ? 'نوع المستند المطلوب' : 'REQUIRED DOCUMENT TYPE'}</span>
                               <span className="text-lg font-black tracking-tight">{req.label}</span>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-bold text-slate-500 leading-tight max-w-[200px]">
                               {req.type === 'contract' && (isRtl ? 'يتطلب عقد قانوني كامل' : 'Requires full legal contract')}
                               {req.type === 'agreement' && (isRtl ? 'يتطلب اتفاقية عمل مبسطة' : 'Requires work agreement')}
                               {req.type === 'none' && (isRtl ? 'لا يتطلب تعاقد إضافي' : 'No additional contracting needed')}
                             </p>
                          </div>
                        </motion.div>
                      );
                    })() : null}
                 </div>

                 {/* Action Buttons */}
                 <div className="flex gap-4 pt-12">
                   <button 
                     onClick={() => setView('list')}
                     className="flex-1 py-5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] transition-all border border-slate-300"
                   >
                     {isRtl ? 'إلغاء' : 'Cancel'}
                   </button>
                   <button 
                     onClick={handleSavePO}
                     className="flex-[2] py-5 bg-brand text-white rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-brand/20 hover:bg-brand-secondary transition-all flex items-center justify-center gap-3"
                   >
                     <ShoppingCart className="w-5 h-5" />
                     {isRtl ? 'حفظ أمر الشراء' : 'Save Purchase Order'}
                   </button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const XIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
