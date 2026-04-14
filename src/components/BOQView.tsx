import React, { useState, useEffect, useRef } from 'react';
import { BOQItem, WBSLevel, WorkPackage } from '../types';
import { masterFormatDivisions } from '../data';
import { masterFormatSections } from '../constants/masterFormat';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  Table, Filter, LayoutGrid, List, Upload, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, Database, Plus, Trash2, ChevronRight, ChevronDown,
  FileText, Printer, Download, Search, Info, Loader2, Sparkles, ArrowLeft, X,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { loadArabicFont } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI, Type } from "@google/genai";
import { DollarSign, Coins } from 'lucide-react';

export const BOQView: React.FC = () => {
  const { t, language } = useLanguage();
  const { selectedProject } = useProject();
  const { formatAmount, exchangeRate: globalExchangeRate, currency: baseCurrency, convertToBase } = useCurrency();
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'boq' | 'export'>('boq');
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [isAddingWorkPackage, setIsAddingWorkPackage] = useState(false);
  const [newWorkPackage, setNewWorkPackage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string; type: 'item' | 'wbs' } | null>(null);
  const [newPackageData, setNewPackageData] = useState<Partial<WorkPackage>>({
    title: '',
    description: '',
    divisionId: '01',
    wbsId: '',
    status: 'Active'
  });

  // Form states
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BOQItem>>({
    description: '',
    unit: 'm3',
    quantity: 0,
    inputRate: 0,
    division: '01',
    workPackage: '',
    inputCurrency: 'IQD',
    exchangeRateUsed: 1500
  });

  // Sync newItem exchange rate when global rate changes or project changes
  useEffect(() => {
    setNewItem(prev => ({
      ...prev,
      inputCurrency: baseCurrency,
      exchangeRateUsed: globalExchangeRate
    }));
  }, [baseCurrency, globalExchangeRate]);

  useEffect(() => {
    if (!selectedProject) return;

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
        setLoading(false);
      }
    );

    const wpUnsubscribe = onSnapshot(
      query(collection(db, 'work_packages'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkPackage)));
      }
    );

    return () => {
      boqUnsubscribe();
      wbsUnsubscribe();
      wpUnsubscribe();
    };
  }, [selectedProject]);

  const handleAddBoqItem = async (customItem?: Partial<BOQItem>) => {
    if (!selectedProject || !selectedWbsId) {
      console.error("Missing project or WBS ID", { selectedProject, selectedWbsId });
      return;
    }
    const itemToSave = customItem || newItem;
    if (!itemToSave.description) {
      alert("Please provide a description");
      return;
    }

    try {
      const id = crypto.randomUUID();
      const inputCurrency = itemToSave.inputCurrency || baseCurrency;
      const exchangeRateUsed = itemToSave.exchangeRateUsed || globalExchangeRate;
      const inputRate = itemToSave.inputRate || 0;
      const quantity = itemToSave.quantity || 0;

      // Calculate amount in base currency
      const baseRate = convertToBase(inputRate, inputCurrency, exchangeRateUsed);
      const amount = quantity * baseRate;

      const fullItem: BOQItem = {
        ...itemToSave,
        id,
        projectId: selectedProject.id,
        wbsId: selectedWbsId,
        amount,
        inputCurrency,
        exchangeRateUsed,
        inputRate,
        completion: 0,
        location: wbsLevels.find(l => l.id === selectedWbsId)?.title || ''
      } as BOQItem;
      await setDoc(doc(db, 'boq', id), fullItem);
      
      if (!customItem) {
        setShowAddItem(false);
        setNewItem({ 
          description: '', 
          unit: 'm3', 
          quantity: 0, 
          inputRate: 0, 
          division: '01', 
          workPackage: '', 
          inputCurrency: baseCurrency, 
          exchangeRateUsed: globalExchangeRate 
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'boq');
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<BOQItem>) => {
    try {
      const item = boqItems.find(i => i.id === id);
      if (!item) return;
      const updatedItem = { ...item, ...updates };
      
      const inputCurrency = updatedItem.inputCurrency || baseCurrency;
      const exchangeRateUsed = updatedItem.exchangeRateUsed || globalExchangeRate;
      const inputRate = updatedItem.inputRate || 0;
      const quantity = updatedItem.quantity || 0;

      // Recalculate amount in base currency
      const baseRate = convertToBase(inputRate, inputCurrency, exchangeRateUsed);
      updatedItem.amount = quantity * baseRate;

      await setDoc(doc(db, 'boq', id), updatedItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'boq');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = boqItems.find(i => i.id === id);
    if (!item) return;
    setDeleteConfirmation({ id, title: item.description, type: 'item' });
  };

  const executeDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'boq', id));
      setDeleteConfirmation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'boq');
    }
  };

  const executeDeleteWbs = async (id: string) => {
    try {
      // Find all children recursively
      const findChildren = (parentId: string): string[] => {
        const children = wbsLevels.filter(l => l.parentId === parentId);
        let ids = children.map(c => c.id);
        children.forEach(c => {
          ids = [...ids, ...findChildren(c.id)];
        });
        return ids;
      };

      const idsToDelete = [id, ...findChildren(id)];
      
      // Delete all WBS levels
      await Promise.all(idsToDelete.map(wbsId => deleteDoc(doc(db, 'wbs', wbsId))));
      
      // Delete associated BOQ items
      const boqToDelete = boqItems.filter(item => idsToDelete.includes(item.wbsId));
      await Promise.all(boqToDelete.map(item => deleteDoc(doc(db, 'boq', item.id))));

      // Delete associated work packages
      const wpToDelete = workPackages.filter(wp => idsToDelete.includes(wp.wbsId));
      await Promise.all(wpToDelete.map(wp => deleteDoc(doc(db, 'work_packages', wp.id))));

      setDeleteConfirmation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'wbs');
    }
  };

  const handleAddWorkPackage = async () => {
    if (!selectedProject || !newPackageData.title) return;
    try {
      const id = crypto.randomUUID();
      const division = masterFormatDivisions.find(d => d.id === newPackageData.divisionId);
      const wbs = wbsLevels.find(l => l.id === newPackageData.wbsId);
      
      const wp: WorkPackage = {
        id,
        projectId: selectedProject.id,
        wbsId: newPackageData.wbsId || '',
        divisionId: newPackageData.divisionId || '01',
        title: newPackageData.title,
        description: newPackageData.description || '',
        status: 'Active',
        code: `${division?.id || '00'}-${wbs?.code || 'GEN'}-${workPackages.length + 1}`,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'work_packages', id), wp);
      setShowAddPackageModal(false);
      setNewItem(prev => ({ ...prev, workPackage: wp.title }));
      setNewPackageData({ title: '', description: '', divisionId: '01', wbsId: '', status: 'Active' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'work_packages');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setIsAnalyzing(true);
    
    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      // Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";

      const prompt = `Extract all Bill of Quantities (BOQ) items from the provided document.
      For each item, identify:
      - MasterFormat 16 Cost Accounts ID (e.g., '01', '03', '09')
      - Work Package name (e.g., 'Earthworks', 'Concrete Structure')
      - Detailed Description of the item
      - Quantity (number)
      - Unit (e.g., 'm3', 'ton', 'm2', 'LS')
      - Unit Rate (number)
      - Currency (either 'USD' or 'IQD')
      
      If the document uses a specific exchange rate, please note it.
      If Quantity, Unit, or Rate are not explicitly listed but a Total Amount is provided, set Quantity to 1, Unit to 'LS', and Rate to the Total Amount.
      If a row represents a sub-item or a detail, include it as a separate item.
      Return the result as a JSON array of objects.
      The document may have multiple pages, please extract everything.`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type || 'application/pdf'
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                division: { type: Type.STRING, description: "MasterFormat 16 Cost Accounts ID" },
                workPackage: { type: Type.STRING, description: "Work Package name" },
                description: { type: Type.STRING, description: "Detailed description of the item" },
                quantity: { type: Type.NUMBER, description: "Quantity of the item" },
                unit: { type: Type.STRING, description: "Unit of measurement" },
                rate: { type: Type.NUMBER, description: "Unit rate" },
                currency: { type: Type.STRING, description: "Currency (USD or IQD)" }
              },
              required: ["division", "workPackage", "description", "quantity", "unit", "rate", "currency"]
            }
          }
        }
      });

      const extractedItems = JSON.parse(response.text || "[]");
      
      if (extractedItems.length === 0) {
        alert("No items could be extracted from the PDF. Please ensure it's a valid BOQ document.");
        setIsAnalyzing(false);
        return;
      }

      // Save extracted items to Firestore
      for (const item of extractedItems) {
        const inputCurrency = item.inputCurrency || item.currency || baseCurrency;
        const exchangeRateUsed = globalExchangeRate;
        const inputRate = item.rate || 0;
        const quantity = item.quantity || 0;
        const baseRate = convertToBase(inputRate, inputCurrency, exchangeRateUsed);

        const fullItem: BOQItem = {
          ...item,
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          wbsId: selectedWbsId || '',
          amount: quantity * baseRate,
          inputCurrency,
          exchangeRateUsed,
          inputRate,
          completion: 0,
          location: selectedWbsId ? wbsLevels.find(l => l.id === selectedWbsId)?.title || 'General' : 'General'
        };
        await setDoc(doc(db, 'boq', fullItem.id), fullItem);
      }

      setIsAnalyzing(false);
      alert(`AI Analysis complete: ${extractedItems.length} items identified and categorized by MasterFormat 16 Cost Accounts.`);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setIsAnalyzing(false);
      alert("AI Analysis failed. Please try again or check your API key.");
    }
  };

  const exportToPDF = async () => {
    if (!selectedProject) return;
    setIsExporting(true);
    
    const doc = new jsPDF();

    // Load Arabic font if needed
    if (language === 'ar') {
      await loadArabicFont(doc);
      doc.setFont('Amiri');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${selectedProject.code}_BOQ_${dateStr}.pdf`;
    const selectedWbs = wbsLevels.find(l => l.id === selectedWbsId);
    const locationName = selectedWbs ? selectedWbs.title : 'Master BOQ';

    // --- SUMMARY PAGE ---
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(selectedProject.name.toUpperCase(), pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(`Bill of Quantities - ${locationName}`, pageWidth / 2, 45, { align: 'center' });

    const currentItems = selectedWbsId === 'master' ? boqItems : boqItems.filter(i => i.wbsId === selectedWbsId);

    const summaryData = masterFormatDivisions.map(div => {
      const divItems = currentItems.filter(item => item.division === div.id);
      const total = divItems.reduce((sum, item) => sum + item.amount, 0);
      return [div.id, div.title, formatAmount(total, baseCurrency)];
    }).filter(row => row[2] !== formatAmount(0, baseCurrency));

    const grandTotal = currentItems.reduce((sum, item) => sum + item.amount, 0);

      autoTable(doc, {
        startY: 60,
        head: [[t('cost_account'), t('description'), t('total')]],
        body: [...summaryData, ['', t('grand_total'), formatAmount(grandTotal, baseCurrency)]],
        theme: 'grid',
        styles: { font: language === 'ar' ? 'Amiri' : 'helvetica' },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 
        0: { cellWidth: 20 },
        2: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === summaryData.length) {
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
        }
      }
    });

    // --- COST ACCOUNT PAGES ---
    const activeDivisions = [...new Set(currentItems.map(item => item.division))].sort();

    activeDivisions.forEach(divId => {
      doc.addPage();
      const div = masterFormatDivisions.find(d => d.id === divId);
      
      doc.setFontSize(18);
      doc.text(selectedProject.name.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(`${divId} - ${div?.title || 'Unknown'}`, pageWidth / 2, 30, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${locationName}`, pageWidth / 2, 37, { align: 'center' });

      const divItems = currentItems.filter(item => item.division === divId);
      const tableBody = divItems.map((item, idx) => [
        `${divId}.${(idx + 1).toString().padStart(2, '0')}`,
        item.description,
        item.quantity.toLocaleString('en-US'),
        item.unit,
        formatAmount(item.inputRate || 0, item.inputCurrency || baseCurrency, item.exchangeRateUsed),
        formatAmount(item.amount, baseCurrency)
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Item', 'Description', 'Qty', 'Unit', 'Rate', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 30 },
          2: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        }
      });
    });

    doc.save(fileName);
    setIsExporting(false);
  };

  const renderWbsTree = (parentId?: string, depth = 0) => {
    const levels = wbsLevels.filter(l => l.parentId === parentId);
    return (
      <div className={cn("space-y-2", depth > 0 && "ml-6 border-l border-slate-100 pl-4")}>
        {levels.map(level => (
          <div key={level.id} className="space-y-2">
            <div 
              onClick={() => setSelectedWbsId(level.id)}
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all group",
                selectedWbsId === level.id ? "bg-blue-600/5 border border-blue-600/20" : "hover:bg-slate-50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold",
                  level.type === 'Zone' ? "bg-purple-50 text-purple-600" :
                  level.type === 'Area' ? "bg-blue-50 text-blue-600" :
                  level.type === 'Building' ? "bg-emerald-50 text-emerald-600" :
                  "bg-amber-50 text-amber-600"
                )}>
                  {level.type[0]}
                </div>
                <div>
                  <div className={cn("text-sm font-semibold transition-colors", selectedWbsId === level.id ? "text-blue-600" : "text-slate-900")}>{level.title}</div>
                  <div className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">{level.type}</div>
                </div>
              </div>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const level = wbsLevels.find(l => l.id === level.id);
                  if (level) setDeleteConfirmation({ id: level.id, title: level.title, type: 'wbs' });
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {renderWbsTree(level.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Database className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Project Selected</h3>
        <p className="text-slate-500 max-w-xs">Please select a project from the dashboard to manage its BOQ.</p>
      </div>
    );
  }

  if (wbsLevels.length === 0 && !loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutGrid className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">WBS Structure Required</h3>
          <p className="text-slate-500 mb-8">You must define your Work Breakdown Structure (WBS) before managing the Bill of Quantities. This ensures every item is correctly linked to its project location.</p>
          <button 
            onClick={() => window.location.href = '/page/2.2.9'}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            Go to WBS Setup
          </button>
        </div>
      </div>
    );
  }

  const groupedBoqItems = (selectedWbsId ? boqItems.filter(i => i.wbsId === selectedWbsId) : boqItems)
    .reduce((acc, item) => {
      const div = item.division || '99';
      if (!acc[div]) acc[div] = [];
      acc[div].push(item);
      return acc;
    }, {} as Record<string, BOQItem[]>);

  const sortedDivisions = Object.keys(groupedBoqItems).sort();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('boq')}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold transition-all",
              activeTab === 'boq' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            BOQ Manager
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold transition-all",
              activeTab === 'export' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Download className="w-4 h-4" />
            Export & Reports
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-12">
          {activeTab === 'boq' && (
            <div className="space-y-8">
              {!selectedWbsId ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search WBS levels..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedWbsId('master')}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm"
                      >
                        View Master BOQ
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wbsLevels.sort((a, b) => a.level - b.level).map(level => {
                      const items = boqItems.filter(i => i.wbsId === level.id);
                      const total = items.reduce((sum, i) => sum + i.amount, 0);
                      return (
                        <motion.div 
                          key={level.id}
                          whileHover={{ y: -4 }}
                          className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-600/20 transition-all cursor-pointer group"
                          onClick={() => setSelectedWbsId(level.id)}
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold",
                              level.type === 'Zone' ? "bg-purple-50 text-purple-600" :
                              level.type === 'Area' ? "bg-blue-50 text-blue-600" :
                              level.type === 'Building' ? "bg-emerald-50 text-emerald-600" :
                              "bg-amber-50 text-amber-600"
                            )}>
                              {level.type[0]}
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{level.type}</div>
                              <div className="text-xs font-semibold text-blue-600">{level.code}</div>
                            </div>
                          </div>
                          
                          <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{level.title}</h4>
                          <p className="text-xs text-slate-500 mb-6 line-clamp-1 font-medium">Location based BOQ for {level.title}</p>
                          
                          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                            <div>
                              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Items</div>
                              <div className="text-sm font-bold text-slate-900">{items.length}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Total Value</div>
                              <div className="text-sm font-bold text-slate-900 font-mono">
                                {formatAmount(items.reduce((sum, i) => sum + i.amount, 0), baseCurrency)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 w-full py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold text-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            Manage BOQ
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {wbsLevels.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-slate-900">No WBS Levels Found</h4>
                        <p className="text-slate-500 max-w-xs mx-auto">You need to define your project hierarchy in the WBS page before creating specific BOQs.</p>
                        <button 
                          onClick={() => window.location.href = '/page/2.2.9'}
                          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm"
                        >
                          Go to WBS Management
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                      <button 
                        onClick={() => setSelectedWbsId(null)}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase tracking-widest">
                            {selectedWbsId === 'master' ? 'Project' : wbsLevels.find(l => l.id === selectedWbsId)?.type}
                          </span>
                          {selectedWbsId !== 'master' && (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-bold uppercase tracking-widest">
                              {wbsLevels.find(l => l.id === selectedWbsId)?.code}
                            </span>
                          )}
                          <h3 className="text-xl font-bold text-slate-900">
                            {selectedWbsId === 'master' ? 'Master Bill of Quantities' : wbsLevels.find(l => l.id === selectedWbsId)?.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Managing specific BOQ items for this project component.</p>
                      </div>
                    </div>

                    <div className="relative flex-1 max-w-md mx-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search items..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-2xl font-semibold text-xs hover:bg-blue-100 transition-all cursor-pointer border border-blue-100">
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isAnalyzing} />
                      </label>
                      
                      <button 
                        onClick={() => setShowAddItem(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Account</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Qty</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Rate</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedWbsId === 'master' ? boqItems : boqItems.filter(i => i.wbsId === selectedWbsId)).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="w-8 h-8 text-slate-200" />
                                <p className="text-slate-400 text-sm">No items found for this BOQ. Use AI Analysis or Add Item to start.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          sortedDivisions.map(divId => {
                            const items = (selectedWbsId === 'master' ? boqItems : boqItems.filter(i => i.wbsId === selectedWbsId))
                              .filter(i => i.division === divId)
                              .filter(i => i.description.toLowerCase().includes(searchQuery.toLowerCase()) || i.workPackage.toLowerCase().includes(searchQuery.toLowerCase()));
                            
                            if (items.length === 0) return null;

                            return (
                              <React.Fragment key={divId}>
                                <tr className="bg-slate-50/30">
                                  <td colSpan={7} className="px-6 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                      <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                        {divId}
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                        — {masterFormatDivisions.find(d => d.id === divId)?.title || 'Other'}
                                      </span>
                                      <div className="ml-auto text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
                                        {items.length} Items | Total: {formatAmount(items.reduce((sum, i) => sum + i.amount, 0), baseCurrency)}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                {items.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-widest">
                                        {item.division}.{(idx + 1).toString().padStart(2, '0')}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div 
                                        onClick={() => {
                                          setEditingItem(item);
                                          setShowEditModal(true);
                                        }}
                                        className="cursor-pointer group/title"
                                      >
                                        <div className="text-sm font-semibold text-slate-900 group-hover/title:text-blue-600 transition-colors">{item.description}</div>
                                        <div className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{item.workPackage}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                        className="w-20 bg-transparent border-none focus:ring-0 text-sm text-slate-900 text-right font-semibold p-0"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <input 
                                        type="text"
                                        value={item.unit}
                                        onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                                        className="w-16 bg-transparent border-none focus:ring-0 text-xs text-slate-500 font-medium p-0"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="number"
                                            value={item.inputRate}
                                            onChange={(e) => handleUpdateItem(item.id, { inputRate: parseFloat(e.target.value) || 0 })}
                                            className="w-24 bg-transparent border-none focus:ring-0 text-sm text-slate-900 text-right font-semibold p-0"
                                          />
                                          <button 
                                            onClick={() => handleUpdateItem(item.id, { inputCurrency: item.inputCurrency === 'USD' ? 'IQD' : 'USD' })}
                                            className="text-[9px] font-bold text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded-md transition-colors"
                                          >
                                            {item.inputCurrency || baseCurrency}
                                          </button>
                                        </div>
                                        {item.inputCurrency !== baseCurrency && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-[8px] text-slate-400 font-medium uppercase tracking-widest">Rate:</span>
                                            <input 
                                              type="number"
                                              value={item.exchangeRateUsed}
                                              onChange={(e) => handleUpdateItem(item.id, { exchangeRateUsed: parseFloat(e.target.value) || 0 })}
                                              className="w-12 bg-transparent border-none focus:ring-0 text-[9px] text-slate-400 text-right font-medium p-0"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right font-mono">
                                      {formatAmount(item.amount, baseCurrency)}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex justify-center gap-1">
                                        <button 
                                          onClick={() => {
                                            setEditingItem(item);
                                            setShowEditModal(true);
                                          }}
                                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                          <FileText className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {/* Direct Entry Row */}
                                <tr className="bg-blue-50/30 border-t border-blue-100">
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">
                                      New Item
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <input 
                                      type="text"
                                      placeholder="Add new item description..."
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAddBoqItem({ 
                                            description: (e.target as HTMLInputElement).value,
                                            division: divId,
                                            quantity: 0,
                                            rate: 0,
                                            unit: 'm3'
                                          });
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                      className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-600 p-0 placeholder:text-slate-400"
                                    />
                                  </td>
                                  <td colSpan={5} className="px-6 py-4 text-right">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Press Enter to Add</span>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-sm text-center">
              <div className="max-w-md mx-auto space-y-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                  <Printer className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Export?</h3>
                  <p className="text-slate-500 text-sm font-medium">
                    Generate a professional BOQ document organized by MasterFormat 16 Cost Accounts.
                  </p>
                </div>
                
                <div className="space-y-4 text-left bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Summary Page with Cost Account Totals
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Detailed Pages for each Active Cost Account
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Professional Header & Branding
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    MasterFormat 16 Cost Accounts Compliant
                  </div>
                </div>

                <button 
                  onClick={exportToPDF}
                  disabled={isExporting || boqItems.length === 0}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {isExporting ? 'Generating PDF...' : 'Download BOQ Report'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Add BOQ Item</h3>
                  <p className="text-slate-500 text-xs font-medium mt-1">Define a new item for the current WBS level.</p>
                </div>
                <button onClick={() => setShowAddItem(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MasterFormat 16 Cost Accounts</label>
                  <select 
                    value={newItem.division}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        window.location.href = '/page/2.2.1';
                        return;
                      }
                      setNewItem({...newItem, division: e.target.value})
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  >
                    {masterFormatDivisions.map(div => (
                      <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Work Package</label>
                  <select 
                    value={newItem.workPackage}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setNewPackageData(prev => ({ ...prev, divisionId: newItem.division, wbsId: selectedWbsId || '' }));
                        setShowAddPackageModal(true);
                        return;
                      }
                      setNewItem({...newItem, workPackage: e.target.value})
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  >
                    <option value="">Select Work Package</option>
                    {workPackages
                      .filter(wp => wp.divisionId === newItem.division)
                      .map(wp => (
                        <option key={wp.id} value={wp.title}>{wp.code} - {wp.title}</option>
                      ))
                    }
                    {workPackages.filter(wp => wp.divisionId === newItem.division).length === 0 && 
                      masterFormatSections
                        .filter(s => s.divisionId === newItem.division)
                        .map(section => (
                          <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                        ))
                    }
                    <option value="new" className="text-blue-600 font-medium">+ Add New Work Package...</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item Description</label>
                  <textarea 
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none h-24 text-sm font-medium resize-none transition-all"
                    placeholder="Describe the item..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                  <input 
                    type="number" 
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit</label>
                  <input 
                    type="text" 
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                    placeholder="m3, ton, m2, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Currency</label>
                    <select 
                      value={newItem.inputCurrency}
                      onChange={e => setNewItem({...newItem, inputCurrency: e.target.value as 'USD' | 'IQD'})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="IQD">IQD (د.ع)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit Rate</label>
                    <input 
                      type="number" 
                      value={newItem.inputRate}
                      onChange={e => setNewItem({...newItem, inputRate: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exchange Rate</label>
                  <input 
                    type="number" 
                    value={newItem.exchangeRateUsed}
                    onChange={e => setNewItem({...newItem, exchangeRateUsed: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  />
                </div>
                <div className="flex items-end col-span-2">
                  <div className="w-full p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="text-[10px] text-blue-600 uppercase font-bold tracking-widest mb-1">Total Amount ({baseCurrency})</div>
                    <div className="text-3xl font-bold text-slate-900 font-mono">
                      {formatAmount((newItem.quantity || 0) * (newItem.inputRate || 0), newItem.inputCurrency as any, newItem.exchangeRateUsed)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-10">
                <button 
                  onClick={() => { setShowAddItem(false); setIsAddingWorkPackage(false); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleAddBoqItem()}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm"
                >
                  Add to BOQ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Edit BOQ Item</h3>
                  <p className="text-slate-500 text-xs font-medium mt-1">Update the details for this Bill of Quantities entry.</p>
                </div>
                <button onClick={() => { setEditingItem(null); setIsAddingWorkPackage(false); }} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item Description</label>
                  <textarea 
                    value={editingItem.description}
                    onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none h-24 text-sm font-medium resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MasterFormat 16 Cost Accounts</label>
                  <select 
                    value={editingItem.division}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        window.location.href = '/page/2.2.1';
                        return;
                      }
                      setEditingItem({...editingItem, division: e.target.value})
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  >
                    {masterFormatDivisions.map(div => (
                      <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Work Package</label>
                  <select 
                    value={editingItem.workPackage}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setNewPackageData(prev => ({ ...prev, divisionId: editingItem.division, wbsId: editingItem.wbsId }));
                        setShowAddPackageModal(true);
                        return;
                      }
                      setEditingItem({...editingItem, workPackage: e.target.value})
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  >
                    <option value="">Select Work Package</option>
                    {workPackages
                      .filter(wp => wp.divisionId === editingItem.division)
                      .map(wp => (
                        <option key={wp.id} value={wp.title}>{wp.code} - {wp.title}</option>
                      ))
                    }
                    {workPackages.filter(wp => wp.divisionId === editingItem.division).length === 0 && 
                      masterFormatSections
                        .filter(s => s.divisionId === editingItem.division)
                        .map(section => (
                          <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                        ))
                    }
                    <option value="new">+ Add New Work Package...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                  <input 
                    type="number"
                    value={editingItem.quantity}
                    onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit</label>
                  <input 
                    type="text"
                    value={editingItem.unit}
                    onChange={e => setEditingItem({...editingItem, unit: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit Rate</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={editingItem.inputRate}
                      onChange={e => setEditingItem({...editingItem, inputRate: parseFloat(e.target.value) || 0})}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                    />
                    <select 
                      value={editingItem.inputCurrency}
                      onChange={e => setEditingItem({...editingItem, inputCurrency: e.target.value as 'USD' | 'IQD'})}
                      className="w-24 px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-bold transition-all"
                    >
                      <option value="IQD">IQD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exchange Rate</label>
                  <input 
                    type="number" 
                    value={editingItem.exchangeRateUsed}
                    onChange={e => setEditingItem({...editingItem, exchangeRateUsed: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                  />
                </div>

                <div className="bg-blue-50/50 p-6 rounded-[24px] border border-blue-100 col-span-2">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Amount ({baseCurrency})</div>
                  <div className="text-3xl font-bold text-slate-900 font-mono">
                    {formatAmount((editingItem.quantity || 0) * (editingItem.inputRate || 0), editingItem.inputCurrency as any, editingItem.exchangeRateUsed)}
                  </div>
                </div>

                <div className="col-span-2 flex gap-4 mt-6">
                  <button 
                    onClick={() => { setEditingItem(null); setIsAddingWorkPackage(false); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (editingItem) {
                        await handleUpdateItem(editingItem.id, editingItem);
                        setEditingItem(null);
                      }
                    }}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddPackageModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Add Work Package</h3>
                  <p className="text-slate-500 text-xs font-medium mt-1">Create a new work package for this division.</p>
                </div>
                <button onClick={() => setShowAddPackageModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Title</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      list="boq-masterformat-sections"
                      value={newPackageData.title}
                      onChange={e => setNewPackageData({...newPackageData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                      placeholder="e.g. Concrete Substructure"
                    />
                    <datalist id="boq-masterformat-sections">
                      {masterFormatSections
                        .filter(s => s.divisionId === newPackageData.divisionId)
                        .map(section => (
                          <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                        ))
                      }
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    value={newPackageData.description}
                    onChange={e => setNewPackageData({...newPackageData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none h-24 text-sm font-medium resize-none transition-all"
                    placeholder="Brief description of the work package..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cost Account</label>
                    <select 
                      value={newPackageData.divisionId}
                      onChange={e => setNewPackageData({...newPackageData, divisionId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                    >
                      {masterFormatDivisions.map(div => (
                        <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">WBS Level</label>
                    <select 
                      value={newPackageData.wbsId}
                      onChange={e => setNewPackageData({...newPackageData, wbsId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none text-sm font-medium transition-all"
                    >
                      <option value="">General / Project Wide</option>
                      {wbsLevels.map(l => (
                        <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-10">
                <button 
                  onClick={() => setShowAddPackageModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddWorkPackage}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm"
                >
                  Create Package
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">Confirm Deletion</h3>
              <p className="text-slate-500 text-center mb-8">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteConfirmation.title}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (deleteConfirmation.type === 'item') {
                      executeDeleteItem(deleteConfirmation.id);
                    } else {
                      executeDeleteWbs(deleteConfirmation.id);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
