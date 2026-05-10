import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Database, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  ChevronDown, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  FileText, 
  LayoutGrid, 
  ChevronRight,
  TrendingUp,
  Target,
  ArrowRight,
  Zap,
  Info,
  History,
  Save,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { rollupToParent } from '../services/rollupService';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { BOQItem, WBSLevel, WorkPackage, EntityConfig, BOQVersion } from '../types';
import { masterFormatDivisions } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from '@google/genai';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadArabicFont } from '../lib/pdfService';
import { cn, stripNumericPrefix, formatDate } from '../lib/utils';
import { Ribbon, RibbonGroup } from './Ribbon';
import { HelpTooltip } from './HelpTooltip';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { DataImportModal } from './DataImportModal';

export const BOQView: React.FC = () => {
  const { t, th, language, isRtl } = useLanguage();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { formatAmount, exchangeRate: globalExchangeRate, currency: baseCurrency, convertToBase } = useCurrency();
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [boqVersions, setBoqVersions] = useState<BOQVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<BOQVersion | null>(null);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'versions' | 'list' | 'form' | 'import' | 'preview'>('list');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [editingVersion, setEditingVersion] = useState<BOQVersion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<BOQItem[] | null>(null);
  const [unmappedWorkPackages, setUnmappedWorkPackages] = useState<string[]>([]);
  const [packageMappings, setPackageMappings] = useState<Record<string, string>>({});
  const [isMappingMode, setIsMappingMode] = useState(false);
  
  const [newVersion, setNewVersion] = useState<Partial<BOQVersion>>({
    title: '',
    versionNumber: '1.0',
    status: 'Draft',
    description: ''
  });

  const [newItem, setNewItem] = useState<Partial<BOQItem>>({
    description: '',
    unit: 'm3',
    quantity: 0,
    inputRate: 0,
    division: '01',
    workPackage: '',
    wbsId: 'master',
    inputCurrency: baseCurrency,
    exchangeRateUsed: globalExchangeRate
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const versionConfig: EntityConfig = {
    id: 'boq_versions' as any,
    label: t('boq_versions'),
    icon: History,
    collection: 'boq_versions',
    columns: [
      { key: 'versionNumber', label: t('version_number'), type: 'badge' },
      { key: 'title', label: t('title'), type: 'string' },
      { key: 'status', label: t('status'), type: 'status' },
      { key: 'createdAt', label: t('date'), type: 'date' },
      { key: 'issuedBy', label: t('issued_by'), type: 'string' }
    ]
  };

  const boqConfig: EntityConfig = {
    id: 'boq',
    label: t('bill_of_quantities'),
    icon: Database,
    collection: 'boq',
    columns: [
      { key: 'division', label: t('cost_account'), type: 'badge' },
      { key: 'workPackage', label: t('work_package'), type: 'string' },
      { key: 'description', label: t('description'), type: 'string' },
      { key: 'unit', label: t('unit'), type: 'badge' },
      { key: 'quantity', label: t('quantity'), type: 'number' },
      { key: 'inputRate', label: t('unit_rate'), type: 'currency' },
      { key: 'amount', label: t('total_amount'), type: 'currency' }
    ]
  };

  useEffect(() => {
    if (!selectedProject?.id) return;

    const versionsUnsubscribe = onSnapshot(
      query(collection(db, 'boq_versions'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqVersions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQVersion)));
        setLoading(false);
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
      }
    );

    const wpUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id), where('type', '==', 'Work Package')),
      (snapshot) => {
        setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      }
    );

    return () => {
      versionsUnsubscribe();
      wbsUnsubscribe();
      wpUnsubscribe();
    };
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!activeVersion?.id) {
      setBoqItems([]);
      return;
    }

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('versionId', '==', activeVersion.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    return () => boqUnsubscribe();
  }, [activeVersion?.id]);

  const handleSaveVersion = async () => {
    if (!selectedProject) return;
    if (!newVersion.title) {
      toast.error("Please provide a title");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...newVersion,
        projectId: selectedProject.id,
        updatedAt: serverTimestamp()
      };

      if (editingVersion) {
        await updateDoc(doc(db, 'boq_versions', editingVersion.id), data);
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'boq_versions', id), {
          ...data,
          id,
          createdAt: serverTimestamp(),
          issuedBy: auth.currentUser?.displayName || auth.currentUser?.email
        });
      }
      setIsVersionModalOpen(false);
      toast.success(editingVersion ? "Version updated" : "Version created");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'boq_versions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !activeVersion) return;
    if (!newItem.description) {
      toast.error("Description is required");
      return;
    }

    setIsSaving(true);
    try {
      const quantity = Math.max(0, newItem.quantity || 0);
      const inputRate = Math.max(0, newItem.inputRate || 0);
      const baseRate = convertToBase(inputRate, newItem.inputCurrency || baseCurrency, newItem.exchangeRateUsed || globalExchangeRate);
      const amount = quantity * baseRate;

      const data = {
        ...newItem,
        quantity,
        inputRate,
        projectId: selectedProject.id,
        versionId: activeVersion.id,
        amount,
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'boq', editingItem.id), data);
        toast.success("Item updated");
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'boq', id), {
          ...data,
          id,
          createdAt: serverTimestamp(),
          completion: 0
        });
        toast.success("Item added");
      }

      // Trigger rollup
      if (newItem.wbsId) {
        await rollupToParent('workPackage', newItem.wbsId);
      }

      setView('list');
      setEditingItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'boq');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineSave = async (id: string, field: string, value: any) => {
    const item = boqItems.find(i => i.id === id);
    if (!item) {
      toast.error("Item not found");
      return;
    }

    try {
      let updateData: any = { 
        [field]: value,
        updatedAt: serverTimestamp()
      };

      // Recalculate amount if key fields change
      if (field === 'quantity' || field === 'inputRate' || field === 'inputCurrency') {
        const qty = field === 'quantity' ? Number(value) : (item.quantity || 0);
        const rate = field === 'inputRate' ? Number(value) : (item.inputRate || 0);
        const curr = field === 'inputCurrency' ? value : (item.inputCurrency || baseCurrency);
        
        const baseRateValue = convertToBase(rate, curr, item.exchangeRateUsed || globalExchangeRate);
        updateData.amount = qty * baseRateValue;
      }

      await updateDoc(doc(db, 'boq', id), updateData);
      
      // Rollup if item had a WBS assignment
      if (item.wbsId) {
        await rollupToParent('workPackage', item.wbsId);
      }
    } catch (err) {
      console.error('Error during inline save:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'boq');
    }
  };

  const handleVersionClick = (version: BOQVersion) => {
    setActiveVersion(version);
  };

  const handleDeleteVersion = async (id: string) => {
    toast((toastRef) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">{language === 'ar' ? 'هل أنت متأكد من حذف هذا الإصدار وجميع عناصره؟' : 'Are you sure you want to delete this version and all its items?'}</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(toastRef.id)} className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('cancel')}</button>
          <button 
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                await deleteDoc(doc(db, 'boq_versions', id));
                if (activeVersion?.id === id) setActiveVersion(null);
                toast.success("Version deleted");
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'boq_versions');
              }
            }} 
            className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-bold uppercase tracking-widest"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleEditItem = (item: BOQItem) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setView('form');
  };

  const handleDeleteItem = async (id: string) => {
    const itemToDelete = boqItems.find(i => i.id === id);
    toast((toastRef) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-black text-black">Are you sure you want to delete this item?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(toastRef.id)} className="px-3 py-1.5 bg-slate-100 text-black rounded-lg text-xs font-black border border-slate-300">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                await deleteDoc(doc(db, 'boq', id));
                if (itemToDelete?.wbsId && itemToDelete.wbsId !== 'master') {
                  await rollupToParent('workPackage', itemToDelete.wbsId);
                }
                toast.success('Deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'boq');
              }
            }} 
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black shadow-sm"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleBulkDeleteItems = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const affectedWbsIds = new Set<string>();
      
      ids.forEach(id => {
        const item = boqItems.find(i => i.id === id);
        if (item?.wbsId && item.wbsId !== 'master') affectedWbsIds.add(item.wbsId);
        batch.delete(doc(db, 'boq', id));
      });

      await batch.commit();
      
      // Refresh costs
      for (const wbsId of Array.from(affectedWbsIds)) {
        await rollupToParent('workPackage', wbsId);
      }
    } catch (err) {
      console.error('Batch delete failed:', err);
      throw err;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeVersion) {
      if (!activeVersion) toast.error("Select a version first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ text: "Extract BOQ items as JSON array: division, workPackage, description, unit, quantity, rate, currency." }, { inlineData: { data: base64Data, mimeType: file.type } }]
      });

      const text = (result.text || '').trim();
      const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
      const extracted = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      
      const mapped = extracted.map((item: any) => {
        const quantity = Math.max(0, Number(item.quantity) || 0);
        const rate = Math.max(0, Number(item.rate) || 0);
        const inputRate = Math.max(0, Number(item.rate) || 0);
        return {
          ...item,
          id: crypto.randomUUID(),
          quantity,
          rate,
          inputRate,
          inputCurrency: item.currency || baseCurrency,
          exchangeRateUsed: globalExchangeRate,
          amount: quantity * convertToBase(rate, item.currency || baseCurrency, globalExchangeRate)
        };
      });

      setPreviewItems(mapped);
      
      // Check for unmapped packages
      const wpMap = new Map(workPackages.map(wp => [(wp.title || "").toLowerCase().trim(), wp.id]));
      const unmapped = Array.from(new Set(mapped.map((item: any) => item.workPackage).filter(Boolean))) as string[];
      const missing = unmapped.filter(name => !wpMap.has(name.toLowerCase().trim()));
      
      if (missing.length > 0) {
        setUnmappedWorkPackages(missing);
        setIsMappingMode(true);
      }
      
      setView('preview');
    } catch (err) {
      toast.error("AI Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generalWp = useMemo(() => workPackages.find(wp => 
    (wp.title || "").toLowerCase().includes('general') || 
    (wp.title || "").includes('عام') || 
    (wp.title || "").includes('مركز التكلفة العام')
  ) || workPackages[0], [workPackages]);

  const handleAutoMapAllToGeneral = () => {
    const newMappings = { ...packageMappings };
    unmappedWorkPackages.forEach(pkg => {
      if (!newMappings[pkg] && generalWp) {
        newMappings[pkg] = generalWp.id;
      }
    });
    setPackageMappings(newMappings);
  };

  const confirmImport = async () => {
    if (!previewItems || !activeVersion) {
      toast.error(t('invalid_session_or_no_version'));
      return;
    }
    
    // Check if mapping is complete
    if (isMappingMode && Object.keys(packageMappings).length < unmappedWorkPackages.length) {
      toast.error(language === 'ar' ? "يرجى ربط جميع حزم العمل بمراكز التكلفة" : "Please map all work packages to cost accounts");
      return;
    }

    setIsSaving(true);
    
    const wpMap = new Map(workPackages.map(wp => [(wp.title || "").toLowerCase().trim(), wp.id]));
    const wbsNodesById = new Map<string, WBSLevel>(wbsLevels.map(node => [node.id, node]));
    let fallbackCount = 0;

    try {
      const batch = writeBatch(db);
      const affectedWbsIds = new Set<string>();
      
      // Step 1: Create missing work packages from mappings
      const pkgToFinalId = new Map<string, string>();
      
      for (const pkgName of unmappedWorkPackages) {
        const targetId = packageMappings[pkgName];
        if (!targetId) continue;
        
        const targetNode = wbsNodesById.get(targetId);
        if (targetNode && targetNode.type !== 'Work Package') {
          // Create a new work package under this Deliverable/Phase
          const newWpId = crypto.randomUUID();
          const newWpData: WBSLevel = {
            id: newWpId,
            projectId: selectedProject?.id || '',
            parentId: targetId,
            title: pkgName,
            type: 'Work Package',
            level: (targetNode.level || 0) + 1,
            code: `${targetNode.code || 'DLV'}-${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'Not Started',
            progress: 0,
            plannedCost: 0,
            actualCost: 0
          };
          batch.set(doc(db, 'wbs', newWpId), newWpData);
          pkgToFinalId.set(pkgName, newWpId);
          affectedWbsIds.add(newWpId);
        } else {
          // Mapping is likely to an existing Work Package (Merge)
          pkgToFinalId.set(pkgName, targetId);
          affectedWbsIds.add(targetId);
        }
      }

      previewItems.forEach(item => {
        let wbsId = item.wbsId;
        
        // Use mapping if available, otherwise try name match, otherwise use general
        const wpName = (item.workPackage || "").trim();
        if (pkgToFinalId.has(wpName)) {
          wbsId = pkgToFinalId.get(wpName);
        } else if (!wbsId && wpName) {
          wbsId = wpMap.get(wpName.toLowerCase());
          if (!wbsId) {
            wbsId = generalWp?.id || 'master';
            fallbackCount++;
          }
        } else if (!wbsId) {
          wbsId = generalWp?.id || 'master';
          fallbackCount++;
        }

        if (wbsId && wbsId !== 'master') affectedWbsIds.add(wbsId);

        const boqData = {
          description: item.description || '',
          unit: item.unit || '',
          quantity: Math.max(0, Number(item.quantity) || 0),
          rate: Math.max(0, Number(item.rate || item.inputRate) || 0),
          amount: Math.max(0, Number(item.amount) || 0),
          division: item.division || '01',
          workPackage: item.workPackage || '',
          wbsId: wbsId || 'master',
          versionId: activeVersion.id,
          projectId: selectedProject?.id || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          inputRate: Math.max(0, Number(item.inputRate || item.rate) || 0),
          inputCurrency: item.inputCurrency || item.currency || baseCurrency,
          exchangeRateUsed: item.exchangeRateUsed || globalExchangeRate
        };

        batch.set(doc(db, 'boq', item.id), boqData);
      });

      await batch.commit();

      setView('list');
      setPreviewItems(null);
      setIsMappingMode(false);
      setPackageMappings({});

      // Trigger rollups for all affected WBS nodes
      affectedWbsIds.forEach(wid => {
        rollupToParent('workPackage', wid).catch(e => console.error("Import rollup failed:", e));
      });

      if (fallbackCount > 0) {
        toast.success(
          language === 'ar' 
            ? `تم استيراد ${previewItems.length} عنصر. تم إضافة ${fallbackCount} عنصر إلى مركز التكلفة العام لعدم توفر حزمة العمل.`
            : `${previewItems.length} items imported. ${fallbackCount} unmapped items added to General Cost Account.`, 
          { icon: '⚠️', duration: 6000 }
        );
      } else {
        toast.success(t('imported_successfully'));
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Import failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!activeVersion) return;
    setIsSaving(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const isArabic = language === 'ar';
      
      if (isArabic) {
        await loadArabicFont(doc);
      }

      // Header
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(isArabic ? 'جدول الكميات' : 'Bill of Quantities', isArabic ? 190 : 20, 20, { align: isArabic ? 'right' : 'left' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`${activeVersion.title} (v${activeVersion.versionNumber})`, isArabic ? 190 : 20, 30, { align: isArabic ? 'right' : 'left' });
      
      doc.setFontSize(10);
      doc.text(isArabic ? `التاريخ: ${formatDate(new Date())}` : `Date: ${formatDate(new Date())}`, isArabic ? 190 : 20, 38, { align: isArabic ? 'right' : 'left' });

      const tableData = boqItems.map((item, idx) => [
        idx + 1,
        item.division || '',
        item.workPackage || '',
        item.description || '',
        item.unit || '',
        item.quantity || 0,
        new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(item.inputRate || 0),
        new Intl.NumberFormat('en-IQ', { maximumFractionDigits: 0 }).format(item.amount || 0)
      ]);

      autoTable(doc, {
        startY: 45,
        head: [[
          isArabic ? 'ت' : '#',
          isArabic ? 'مركز التكلفة' : 'Cost Account',
          isArabic ? 'حزمة العمل' : 'Work Package',
          isArabic ? 'الوصف' : 'Description',
          isArabic ? 'الوحدة' : 'Unit',
          isArabic ? 'الكمية' : 'Qty',
          isArabic ? 'سعر الوحدة' : 'Rate',
          isArabic ? 'الإجمالي' : 'Total'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [15, 23, 42], 
          textColor: [255, 255, 255], 
          fontSize: 10, 
          fontStyle: 'bold', 
          halign: isArabic ? 'right' : 'left' 
        },
        styles: { 
          font: isArabic ? 'Amiri' : 'helvetica', 
          fontSize: 9, 
          halign: isArabic ? 'right' : 'left' 
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 45 },
        columnStyles: {
          0: { cellWidth: 10 },
          7: { fontStyle: 'bold' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(isArabic ? `الإجمالي الكلي: ${formatCurrency(totals, baseCurrency)}` : `Grand Total: ${formatCurrency(totals, baseCurrency)}`, isArabic ? 190 : 20, finalY + 15, { align: isArabic ? 'right' : 'left' });

      doc.save(`BOQ_${activeVersion.title.replace(/\s+/g, '_')}_v${activeVersion.versionNumber}.pdf`);
      toast.success(isArabic ? 'تم تصدير ملف PDF' : 'PDF exported successfully');
    } catch (err) {
      console.error('PDF Export failed:', err);
      toast.error('Failed to export PDF');
    } finally {
      setIsSaving(false);
    }
  };

  const totals = useMemo(() => boqItems.reduce((acc, item) => acc + (item.amount || 0), 0), [boqItems]);

    return (
      <StandardProcessPage
      page={{ id: '2.4.1', title: activeVersion ? `${stripNumericPrefix(t('bill_of_quantities'))} — ${activeVersion.versionNumber}` : stripNumericPrefix(t('boq_versions')), type: 'Process' } as any}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      isSaving={isSaving}
      primaryAction={activeVersion ? {
        label: t('add_item'),
        icon: Plus,
        onClick: () => {
          setEditingItem(null);
          setNewItem({
            description: '', unit: 'm3', quantity: 0, inputRate: 0, division: '01',
            inputCurrency: baseCurrency, exchangeRateUsed: globalExchangeRate, wbsId: 'master'
          });
          setView('form');
        }
      } : {
        label: t('create_new_version'),
        icon: Plus,
        onClick: () => {
          setEditingVersion(null);
          setNewVersion({ title: '', versionNumber: '1.0', status: 'Draft' });
          setIsVersionModalOpen(true);
        }
      }}
      secondaryActions={[
        { label: t('import_excel'), icon: Download, onClick: () => setIsImportModalOpen(true) },
        { label: t('import_pdf'), icon: Upload, onClick: () => document.getElementById('boq-upload')?.click(), loading: isAnalyzing }
      ]}
    >
      <DataImportModal
        isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}
        title={t('import_boq')} entityName="BOQ Items"
        targetColumns={[
          { key: 'division', label: t('cost_account'), required: true },
          { key: 'workPackage', label: t('work_package'), required: false },
          { key: 'description', label: t('description'), required: true },
          { key: 'unit', label: t('unit') },
          { key: 'quantity', label: t('quantity'), type: 'number', required: true },
          { key: 'inputRate', label: t('unit_rate'), type: 'number', required: true }
        ]}
        onImport={(data) => {
          if (!activeVersion) return;
          const mapped = data.map(item => {
            const quantity = Math.max(0, Number(item.quantity) || 0);
            const inputRate = Math.max(0, Number(item.inputRate) || 0);
            return {
              ...item,
              id: crypto.randomUUID(),
              quantity,
              inputRate,
              amount: quantity * convertToBase(inputRate, item.currency || baseCurrency, globalExchangeRate)
            };
          });
          
          setPreviewItems(mapped);
          
          const wpMap = new Map(workPackages.map(wp => [(wp.title || "").toLowerCase().trim(), wp.id]));
          const unmapped = Array.from(new Set(mapped.map((item: any) => item.workPackage).filter(Boolean))) as string[];
          const missing = unmapped.filter(name => !wpMap.has(name.toLowerCase().trim()));
          
          if (missing.length > 0) {
            setUnmappedWorkPackages(missing);
            setIsMappingMode(true);
          }
          
          setView('preview');
        }}
      />
      
      <input id="boq-upload" type="file" className="hidden" accept=".pdf,.xlsx,.csv" onChange={handleFileUpload} />

      {createPortal(
        <AnimatePresence>
          {isVersionModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-slate-200 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black italic uppercase text-text-primary dark:text-white">{t('new_version')}</h3>
                  <button onClick={() => setIsVersionModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{t('title')}</label>
                    <input value={newVersion.title} onChange={e => setNewVersion({...newVersion, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-text-primary dark:text-white font-bold" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setIsVersionModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-bold uppercase text-xs text-text-secondary">{t('cancel')}</button>
                    <button onClick={handleSaveVersion} className="flex-[2] py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-brand/20">{t('create_version')}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="pb-8 space-y-6">
        {activeVersion && view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('total_boq_value') || 'Total BOQ Value'}</p>
                <div className="text-2xl font-black italic text-brand tracking-tight">{formatAmount(totals, baseCurrency)}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-brand" />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('item_count') || 'Item Count'}</p>
                <div className="text-2xl font-black italic text-text-primary dark:text-white tracking-tight">{boqItems.length}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutGrid className="w-6 h-6 text-blue-500" />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('active_version') || 'Active Version'}</p>
                <div className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tight">v{activeVersion.versionNumber}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'form' ? (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-black italic text-text-primary dark:text-white uppercase">{editingItem ? 'Edit Item' : 'New BOQ Item'}</h2>
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-primary dark:text-slate-300 uppercase tracking-widest">{t('description')}</label>
                        <textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-text-primary dark:text-white font-bold focus:ring-4 focus:ring-brand/10 transition-all outline-none" rows={4} />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-text-primary dark:text-slate-300 uppercase tracking-widest">{t('quantity')}</label>
                           <input type="number" min="0" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Math.max(0, parseFloat(e.target.value) || 0)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-text-primary dark:text-white font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-text-primary dark:text-slate-300 uppercase tracking-widest">{t('unit_rate')}</label>
                           <input type="number" min="0" value={newItem.inputRate} onChange={e => setNewItem({...newItem, inputRate: Math.max(0, parseFloat(e.target.value) || 0)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-text-primary dark:text-white font-bold focus:ring-2 focus:ring-brand/20 outline-none" />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-secondary dark:text-slate-300 uppercase tracking-widest">{t('cost_center_assignment') || 'Cost Center Assignment'}</label>
                        <select 
                          value={newItem.wbsId || ''} 
                          onChange={e => setNewItem({...newItem, wbsId: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-text-primary dark:text-white font-bold focus:ring-4 focus:ring-brand/10 transition-all outline-none appearance-none"
                        >
                          <option value="master" className="bg-white dark:bg-slate-900 font-bold text-text-primary dark:text-white">General / Master</option>
                          {workPackages.map(wp => (
                            <option key={wp.id} value={wp.id} className="bg-white dark:bg-slate-900 font-bold text-text-primary dark:text-white">
                              {wp.title}
                            </option>
                          ))}
                        </select>
                     </div>
                     <button onClick={handleSave} className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 active:scale-[0.98] transition-all">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : t('save_changes')}
                     </button>
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-0">
               <AnimatePresence mode="wait">
                  {!activeVersion ? (
                    <motion.div 
                      key="versions-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-text-primary dark:text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 italic px-4">
                          <History className="w-4 h-4 text-brand" /> {t('boq_versions_history')}
                        </h3>
                        <UniversalDataTable config={versionConfig} data={boqVersions} onRowClick={handleVersionClick} onDeleteRecord={handleDeleteVersion} showAddButton={false} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="items-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={() => setActiveVersion(null)}
                             className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all group"
                             title="Back to Versions"
                           >
                             <ChevronRight className={cn("w-6 h-6 text-slate-400 group-hover:text-brand", isRtl ? "rotate-180" : "rotate-180")} />
                           </button>
                           <div>
                              <h3 className="text-[11px] font-black text-slate-950 dark:text-white uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                 <FileText className="w-4 h-4 text-blue-500" /> {t('boq_line_items')}
                              </h3>
                              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-0.5">{activeVersion.title} (v{activeVersion.versionNumber})</p>
                           </div>
                        </div>
                        <button onClick={() => setActiveVersion(null)} className="text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-all flex items-center gap-1 group">
                          <X className="w-3 h-3 group-hover:rotate-90 transition-transform" /> {t('close_details') || 'Close Details'}
                        </button>
                      </div>

                      <UniversalDataTable 
                        config={boqConfig} 
                        data={boqItems} 
                        onRowClick={handleEditItem} 
                        onDeleteRecord={handleDeleteItem} 
                        onBulkDelete={handleBulkDeleteItems}
                        onInlineSave={handleInlineSave}
                        showAddButton={false} 
                        title={
                          <div className="flex items-baseline gap-2">
                            <span className="text-blue-700 dark:text-blue-400 font-black italic text-sm">TOTAL</span>
                            <span className="text-3xl font-black text-black dark:text-white tracking-tighter">{formatCurrency(totals, baseCurrency)}</span>
                          </div>
                        }
                        batchActions={
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={handleExportPDF}
                               className="flex items-center gap-2 px-4 py-2 bg-brand text-white hover:bg-brand-secondary rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
                             >
                                <Download className="w-3.5 h-3.5" />
                                Export PDF
                             </button>
                             <button 
                               onClick={() => toast.error('Google Drive integration required')}
                               className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase transition-all"
                             >
                                <Target className="w-3.5 h-3.5" />
                                Save to Drive
                             </button>
                          </div>
                        }
                      />
                    </motion.div>
                  )}
               </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {createPortal(
          <AnimatePresence>
            {view === 'preview' && previewItems && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-950 rounded-[3rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/5">
                  <div className="p-10 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">AI Analysis Preview</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {isMappingMode ? (language === 'ar' ? 'يرجى ربط حزم العمل الجديدة' : 'Mapping required for new work packages') : `Review ${previewItems.length} extracted line items`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setView('list');
                          setIsMappingMode(false);
                          setPackageMappings({});
                        }} 
                        disabled={isSaving}
                        className="px-8 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-xs uppercase disabled:opacity-50"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        onClick={confirmImport} 
                        disabled={isSaving}
                        className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 disabled:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('confirm_import')}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10">
                      {isMappingMode ? (
                        <div className="max-w-3xl mx-auto space-y-8">
                             <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-[2rem] flex items-start gap-4">
                              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                              <div className="flex-1 space-y-1">
                                 <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">
                                    {language === 'ar' ? 'حزم عمل غير معروفة' : 'Unmapped Work Packages Found'}
                                 </h4>
                                 <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                    {language === 'ar' 
                                      ? 'تم العثور على حزم عمل في الملف لم يتم تعريفها مسبقاً. يرجى اختيار مركز التكلفة (Cost Account) الذي تتبع له كل حزمة.'
                                      : 'We found work packages in your file that aren\'t defined in your WBS. Please map each one to an existing WBS Node (Cost Account).'}
                                 </p>
                              </div>
                              <button 
                                onClick={handleAutoMapAllToGeneral}
                                className="px-4 py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                {language === 'ar' ? 'ربط الجميع بالعام' : 'Auto-Map All to General'}
                              </button>
                           </div>

                           <div className="space-y-4">
                                  {unmappedWorkPackages.map((pkgName) => (
                                    <div key={pkgName} className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                                       <div className="flex-1">
                                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">{language === 'ar' ? 'اسم الحزمة من الملف' : 'Package Name from File'}</span>
                                          <span className="text-sm font-bold text-slate-900 dark:text-white">{pkgName}</span>
                                       </div>
                                       <div className="hidden md:block">
                                          <ArrowRight className="w-4 h-4 text-slate-300" />
                                       </div>
                                       <div className="flex-1">
                                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">{language === 'ar' ? 'ربط بمركز التكلفة / حزمة العمل' : 'Map to Cost Account / Work Package'}</span>
                                          <select 
                                            value={packageMappings[pkgName] || ''} 
                                            onChange={(e) => setPackageMappings({...packageMappings, [pkgName]: e.target.value})}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                          >
                                            <option value="">{language === 'ar' ? 'اختر الهدف...' : 'Select Target...'}</option>
                                            <option value="master">{language === 'ar' ? 'مركز التكلفة العام' : 'General / Master Cost Account'}</option>
                                            <optgroup label={language === 'ar' ? 'مراكز التكلفة (لإنشاء حزمة جديدة)' : 'Cost Accounts (Create New Package)'}>
                                              {wbsLevels.filter(l => l.type === 'Cost Account').map(l => (
                                                <option key={l.id} value={l.id}>{l.code} - {l.title}</option>
                                              ))}
                                            </optgroup>
                                            <optgroup label={language === 'ar' ? 'حزم العمل الحالية (دمج)' : 'Existing Work Packages (Merge)'}>
                                              {workPackages.filter(l => l.type === 'Work Package').map(l => (
                                                <option key={l.id} value={l.id}>{l.title}</option>
                                              ))}
                                            </optgroup>
                                          </select>
                                       </div>
                                    </div>
                                  ))}
                           </div>
                        </div>
                      ) : (
                        <table className="w-full">
                           <thead>
                              <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">
                                 <th className="text-left pb-4">Area</th>
                                 <th className="text-left pb-4">{t('work_package')}</th>
                                 <th className="text-left pb-4">Description</th>
                                 <th className="text-right pb-4">Qty</th>
                                 <th className="text-left pb-4">Unit</th>
                                 <th className="text-right pb-4">Rate</th>
                                 <th className="text-right pb-4">Total</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {previewItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                   <td className="py-4 text-blue-500 font-bold italic text-xs">{item.division}</td>
                                   <td className="py-4 text-emerald-500 font-black italic text-[10px] uppercase truncate max-w-[100px]">{item.workPackage || 'N/A'}</td>
                                   <td className="py-4 text-slate-900 dark:text-slate-100 text-sm font-semibold">{item.description}</td>
                                   <td className="py-4 text-right text-slate-900 dark:text-slate-300 font-bold">{item.quantity}</td>
                                   <td className="py-4 text-xs font-black text-slate-400 uppercase">{item.unit}</td>
                                   <td className="py-4 text-right text-xs font-bold text-slate-500">{formatCurrency(item.inputRate || 0, item.inputCurrency || 'IQD')}</td>
                                   <td className="py-4 text-right text-sm font-black text-blue-500">{formatCurrency(item.amount || 0, baseCurrency)}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                      )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </StandardProcessPage>
  );
};

export default BOQView;
