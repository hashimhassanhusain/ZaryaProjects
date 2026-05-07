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
import { cn, stripNumericPrefix } from '../lib/utils';
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
      const baseRate = convertToBase(newItem.inputRate || 0, newItem.inputCurrency || baseCurrency, newItem.exchangeRateUsed || globalExchangeRate);
      const amount = (newItem.quantity || 0) * baseRate;

      const data = {
        ...newItem,
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
        <p className="text-sm font-bold text-slate-900">{language === 'ar' ? 'هل أنت متأكد من حذف هذا البند؟' : 'Are you sure you want to delete this item?'}</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(toastRef.id)} className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('cancel')}</button>
          <button 
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                await deleteDoc(doc(db, 'boq', id));
                if (itemToDelete?.wbsId && itemToDelete.wbsId !== 'master') {
                  await rollupToParent('workPackage', itemToDelete.wbsId);
                }
                toast.success(language === 'ar' ? "تم الحذف" : "Deleted");
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'boq');
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
      
      const mapped = extracted.map((item: any) => ({
        ...item,
        id: crypto.randomUUID(),
        inputRate: item.rate,
        inputCurrency: item.currency || baseCurrency,
        exchangeRateUsed: globalExchangeRate,
        amount: (item.quantity || 0) * convertToBase(item.rate || 0, item.currency || baseCurrency, globalExchangeRate)
      }));

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
    let fallbackCount = 0;

    try {
      const batch = writeBatch(db);
      const affectedWbsIds = new Set<string>();
      
      previewItems.forEach(item => {
        let wbsId = item.wbsId;
        
        // Use mapping if available, otherwise try name match, otherwise use general
        const wpName = (item.workPackage || "").trim();
        if (packageMappings[wpName]) {
          wbsId = packageMappings[wpName];
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
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate || item.inputRate) || 0,
          amount: Number(item.amount) || 0,
          division: item.division || '01',
          workPackage: item.workPackage || '',
          wbsId: wbsId || 'master',
          versionId: activeVersion.id,
          projectId: selectedProject?.id || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          inputRate: Number(item.inputRate || item.rate) || 0,
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
          const mapped = data.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            amount: (item.quantity || 0) * convertToBase(item.inputRate || 0, item.currency || baseCurrency, globalExchangeRate)
          }));
          
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
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">{t('new_version')}</h3>
                  <button onClick={() => setIsVersionModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('title')}</label>
                    <input value={newVersion.title} onChange={e => setNewVersion({...newVersion, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setIsVersionModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-bold uppercase text-xs">{t('cancel')}</button>
                    <button onClick={handleSaveVersion} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-600/20">{t('create_version')}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="pb-20">
        <AnimatePresence mode="wait">
          {view === 'form' ? (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-black italic text-slate-900 dark:text-white uppercase">{editingItem ? 'Edit Item' : 'New BOQ Item'}</h2>
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="p-10 space-y-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('description')}</label>
                        <textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" rows={4} />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('quantity')}</label>
                           <input type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('unit_rate')}</label>
                           <input type="number" value={newItem.inputRate} onChange={e => setNewItem({...newItem, inputRate: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold" />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cost_center_assignment') || 'Cost Center Assignment'}</label>
                        <select 
                          value={newItem.wbsId || ''} 
                          onChange={e => setNewItem({...newItem, wbsId: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none"
                        >
                          <option value="master" className="bg-white dark:bg-slate-900">General / Master</option>
                          {workPackages.map(wp => (
                            <option key={wp.id} value={wp.id} className="bg-white dark:bg-slate-900">
                              {wp.title}
                            </option>
                          ))}
                        </select>
                     </div>
                     <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : t('save_changes')}
                     </button>
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
               {/* Versions section */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 italic px-4">
                    <History className="w-4 h-4" /> {t('boq_versions_history')}
                  </h3>
                  <div className={activeVersion ? "opacity-30 grayscale-[1] pointer-events-none transition-all duration-700" : ""}>
                    <UniversalDataTable config={versionConfig} data={boqVersions} onRowClick={handleVersionClick} onDeleteRecord={handleDeleteVersion} showAddButton={false} />
                  </div>
               </div>

               {/* Items section */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between px-4">
                     <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 italic transition-colors", activeVersion ? "text-slate-900 dark:text-white" : "text-slate-300")}>
                        <FileText className={cn("w-4 h-4", activeVersion ? "text-blue-500" : "text-slate-200")} /> {t('boq_line_items')}
                     </h3>
                     {activeVersion && (
                       <button onClick={() => setActiveVersion(null)} className="text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-rose-500 uppercase tracking-widest transition-all flex items-center gap-1 group">
                         <X className="w-3 h-3 group-hover:rotate-90 transition-transform" /> {t('clear_selection')}
                       </button>
                     )}
                  </div>
                  {activeVersion ? (
                    <UniversalDataTable config={boqConfig} data={boqItems} onRowClick={handleEditItem} onDeleteRecord={handleDeleteItem} showAddButton={false} title={
                      <div className="flex items-baseline gap-2"><span className="text-blue-600 dark:text-blue-400 font-black italic text-sm">TOTAL</span><span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(totals, baseCurrency)}</span></div>
                    } />
                  ) : (
                   <div className="p-24 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] bg-white dark:bg-slate-900 shadow-sm">
                      <Database className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                      <h4 className="text-xl font-black text-slate-400 dark:text-slate-600 uppercase italic tracking-tighter">{t('select_a_version_first')}</h4>
                   </div>
                  )}
               </div>
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
                                              {workPackages.filter(l => l.type === 'Cost Account').map(l => (
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
