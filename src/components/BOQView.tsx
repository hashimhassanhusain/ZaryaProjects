import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { BOQItem, WBSLevel, WorkPackage, EntityConfig } from '../types';
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

export const BOQView: React.FC = () => {
  const { t, th, language, isRtl } = useLanguage();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { formatAmount, exchangeRate: globalExchangeRate, currency: baseCurrency, convertToBase } = useCurrency();
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'import' | 'preview'>('list');
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewItems, setPreviewItems] = useState<BOQItem[] | null>(null);
  
  // Selection/Search states (handled by UniversalDataTable, but we might need total calculation)
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
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

  const gridConfig: EntityConfig = {
    id: 'boq',
    label: t('bill_of_quantities'),
    icon: Database,
    collection: 'boq',
    columns: [
      { key: 'division', label: t('cost_account'), type: 'badge' },
      { key: 'workPackage', label: t('work_package'), type: 'string' },
      { key: 'description', label: t('description'), type: 'string' },
      { key: 'unit', label: t('unit'), type: 'string' },
      { key: 'quantity', label: t('quantity'), type: 'number' },
      { key: 'inputRate', label: t('unit_rate'), type: 'currency' },
      { key: 'amount', label: t('total_amount'), type: 'currency' }
    ]
  };

  useEffect(() => {
    if (!selectedProject?.id) return;

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
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
      boqUnsubscribe();
      wbsUnsubscribe();
      wpUnsubscribe();
    };
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject) return;
    if (!newItem.description) {
      toast.error("Please provide a description");
      return;
    }

    setIsSaving(true);
    try {
      const inputCurrency = newItem.inputCurrency || baseCurrency;
      const exchangeRateUsed = newItem.exchangeRateUsed || globalExchangeRate;
      const inputRate = newItem.inputRate || 0;
      const quantity = newItem.quantity || 0;
      const baseRate = convertToBase(inputRate, inputCurrency, exchangeRateUsed);
      const amount = quantity * baseRate;

      const dataToSave = {
        ...newItem,
        projectId: selectedProject.id,
        amount,
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'boq', editingItem.id), dataToSave);
        toast.success("BOQ item updated");
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'boq', id), {
          ...dataToSave,
          id,
          createdAt: serverTimestamp(),
          completion: 0
        });
        toast.success("BOQ item added");
      }
      setView('list');
      setEditingItem(null);
      setNewItem({
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
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'boq');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: BOQItem) => {
    setEditingItem(item);
    setNewItem({
      ...item,
      exchangeRateUsed: item.exchangeRateUsed || globalExchangeRate,
      inputCurrency: item.inputCurrency || baseCurrency
    });
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this BOQ line item?")) return;
    try {
      await deleteDoc(doc(db, 'boq', id));
      toast.success("Item removed");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'boq');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `Extract all Bill of Quantities (BOQ) items from the provided document.
      Return the result as a JSON array of objects with keys: division (ID), workPackage, description, quantity, unit, rate, currency.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type || 'application/pdf'
            }
          }
        ]
      });

      const text = (result.text || '').trim();
      const extracted = JSON.parse(text.replace(/```json|```/g, ''));
      
      const mapped = extracted.map((item: any) => {
        const id = crypto.randomUUID();
        const inputCurrency = item.currency || baseCurrency;
        const exchangeRateUsed = globalExchangeRate;
        const baseRate = convertToBase(item.rate || 0, inputCurrency, exchangeRateUsed);
        return {
          ...item,
          id,
          projectId: selectedProject.id,
          amount: (item.quantity || 0) * baseRate,
          inputCurrency,
          inputRate: item.rate,
          exchangeRateUsed,
          wbsId: 'master'
        };
      });

      setPreviewItems(mapped);
      setView('preview');
    } catch (err) {
      console.error(err);
      toast.error("AI Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confirmImport = async () => {
    if (!previewItems) return;
    try {
      await Promise.all(previewItems.map(item => setDoc(doc(db, 'boq', item.id), item)));
      toast.success(`Imported ${previewItems.length} items`);
      setView('list');
      setPreviewItems(null);
    } catch (err) {
      toast.error("Import failed");
    }
  };

  const totals = useMemo(() => {
    return boqItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  }, [boqItems]);

  return (
    <StandardProcessPage
      page={{ id: '2.4.1', title: t('bill_of_quantities'), type: 'Process' } as any}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={handleSave}
      isSaving={isSaving}
      primaryAction={{
        label: t('add_item'),
        icon: Plus,
        onClick: () => {
          setEditingItem(null);
          setNewItem({
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
          setView('form');
        }
      }}
      secondaryActions={[
        {
          label: t('import_pdf'),
          icon: Upload,
          onClick: () => document.getElementById('boq-upload')?.click(),
          loading: isAnalyzing
        }
      ]}
    >
      <input 
        id="boq-upload"
        type="file" 
        className="hidden" 
        accept=".pdf,.xlsx,.csv"
        onChange={handleFileUpload}
      />

      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pb-32"
          >
             <div className="flex justify-end pr-2">
              <button 
                onClick={() => setView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                {t('back_to_list')}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Database className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic uppercase">
                          {editingItem ? 'Update BOQ Entry' : 'Manual BOQ Entry'}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 leading-none">Standardized quantity survey input</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-10">
                    {/* Item Core info */}
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Item Specification
                      </h3>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('description')}</label>
                        <textarea 
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none min-h-[120px]"
                          placeholder="e.g. Supply and fix non-load bearing partitions 12.5mm gypsum board..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('cost_account')}</label>
                          <select 
                            value={newItem.division}
                            onChange={(e) => setNewItem({ ...newItem, division: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none"
                          >
                            {masterFormatDivisions.map(d => <option key={d.id} value={d.id}>{d.id} — {d.title}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('unit')}</label>
                          <select 
                            value={newItem.unit}
                            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none"
                          >
                            <option value="m3">Cubic Meter (m3)</option>
                            <option value="m2">Square Meter (m2)</option>
                            <option value="m">Linear Meter (m)</option>
                            <option value="ton">Ton</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="LS">Lump Sum (LS)</option>
                            <option value="set">Set</option>
                            <option value="pcs">Pieces (pcs)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Financial Quantities */}
                    <div className="space-y-6 pt-4 border-t border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Quantity & Pricing
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('quantity')}</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={newItem.quantity}
                              onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{newItem.unit}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('unit_rate')}</label>
                          <div className="relative">
                             <input 
                              type="number"
                              value={newItem.inputRate}
                              onChange={(e) => setNewItem({ ...newItem, inputRate: parseFloat(e.target.value) || 0 })}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                               <select 
                                value={newItem.inputCurrency}
                                onChange={(e) => setNewItem({ ...newItem, inputCurrency: e.target.value as any })}
                                className="bg-white border border-slate-100 rounded-lg text-[9px] font-black p-1 focus:ring-0 outline-none shadow-sm"
                              >
                                <option value="IQD">IQD</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          </div>
                        </div>
                         <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Calculation Logic</label>
                          <div className="px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                             <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Subtotal</div>
                             <div className="text-xl font-black italic text-emerald-900 leading-none">
                               {formatAmount((newItem.quantity || 0) * (newItem.inputRate || 0), newItem.inputCurrency || 'IQD')}
                             </div>
                             <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                               {newItem.inputCurrency !== baseCurrency ? `Converted to ${baseCurrency} @ ${newItem.exchangeRateUsed}` : 'Direct native currency entry'}
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 text-white">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400">Financial Impact</h3>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Rollup to Master Budget</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('grand_total')}</span>
                        <div className="text-3xl font-black italic tracking-tighter text-white drop-shadow-lg">
                           {formatAmount(convertToBase(newItem.quantity || 0 * (newItem.inputRate || 0), newItem.inputCurrency || 'IQD', newItem.exchangeRateUsed || globalExchangeRate), baseCurrency)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tax Code</span>
                          <span className="text-xs font-black italic">VAT 0%</span>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">P&L Category</span>
                          <span className="text-xs font-black italic">Direct OpEx</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-start gap-4">
                   <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-blue-600" />
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900 italic">Auto-WBS Linkage</h4>
                      <p className="text-[9px] text-blue-800 font-bold leading-relaxed opacity-70">
                        This entry will automatically be mapped to the WBS Dictionary and the Cost Performance Index (CPI) tracking.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 flex-1 flex flex-col"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={boqItems}
              onRowClick={handleEdit}
              onDeleteRecord={handleDelete}
              title={stripNumericPrefix(t('bill_of_quantities'))}
              favoriteControl={null}
            />

            {view === 'preview' && previewItems && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                >
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black italic tracking-tighter text-slate-900 uppercase">AI AI Analysis Results</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Review extracted quantities before final commit</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setView('list')}
                        className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        onClick={confirmImport}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-600/20 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {t('confirm_import')}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-4">
                          <th className="pb-4">{t('cost_account')}</th>
                          <th className="pb-4">{t('description')}</th>
                          <th className="pb-4 text-right">{t('qty')}</th>
                          <th className="pb-4">{t('unit')}</th>
                          <th className="pb-4 text-right">{t('rate')}</th>
                          <th className="pb-4 text-right">{t('total')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-black text-blue-600 text-xs italic">{item.division}</td>
                            <td className="py-4 text-sm font-semibold text-slate-900">{item.description}</td>
                            <td className="py-4 text-right text-sm font-bold text-slate-600">{item.quantity}</td>
                            <td className="py-4 text-xs font-black text-slate-400 uppercase">{item.unit}</td>
                            <td className="py-4 text-right text-xs font-bold text-slate-600">
                              {formatAmount(item.inputRate || 0, item.inputCurrency || 'IQD')}
                            </td>
                            <td className="py-4 text-right text-sm font-black text-blue-600">
                               {formatAmount(item.amount || 0, baseCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};

export default BOQView;
