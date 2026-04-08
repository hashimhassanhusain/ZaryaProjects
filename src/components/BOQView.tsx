import React, { useState, useEffect, useRef } from 'react';
import { BOQItem, WBSLevel } from '../types';
import { masterFormatDivisions } from '../data';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  Table, Filter, LayoutGrid, List, Upload, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, Database, Plus, Trash2, ChevronRight, ChevronDown,
  FileText, Printer, Download, Search, Info, Loader2, Sparkles, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const BOQView: React.FC = () => {
  const { selectedProject } = useProject();
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'boq' | 'export'>('boq');
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Form states
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BOQItem>>({
    description: '',
    unit: 'm3',
    quantity: 0,
    rate: 0,
    division: '01',
    workPackage: ''
  });

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

    return () => {
      boqUnsubscribe();
      wbsUnsubscribe();
    };
  }, [selectedProject]);

  const handleAddBoqItem = async (customItem?: Partial<BOQItem>) => {
    if (!selectedProject || !selectedWbsId) return;
    const itemToSave = customItem || newItem;
    if (!itemToSave.description) return;

    try {
      const item: any = {
        ...itemToSave,
        id: crypto.randomUUID(),
        projectId: selectedProject.id,
        wbsId: selectedWbsId,
        amount: (itemToSave.quantity || 0) * (itemToSave.rate || 0),
        completion: 0,
        location: wbsLevels.find(l => l.id === selectedWbsId)?.title || ''
      };
      await setDoc(doc(db, 'boq', item.id), item);
      if (!customItem) {
        setShowAddItem(false);
        setNewItem({ description: '', unit: 'm3', quantity: 0, rate: 0, division: '01', workPackage: '' });
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
      updatedItem.amount = (updatedItem.quantity || 0) * (updatedItem.rate || 0);
      await setDoc(doc(db, 'boq', id), updatedItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'boq');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'boq', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'boq');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setIsAnalyzing(true);
    
    try {
      const prompt = `Extract all Bill of Quantities (BOQ) items from the provided document.
      For each item, identify:
      - MasterFormat 16 Divisions ID (e.g., '01', '03', '09')
      - Work Package name (e.g., 'Earthworks', 'Concrete Structure')
      - Detailed Description of the item
      - Quantity (number)
      - Unit (e.g., 'm3', 'ton', 'm2', 'LS')
      - Unit Rate (number, in IQD)

      If Quantity, Unit, or Rate are not explicitly listed but a Total Amount is provided, set Quantity to 1, Unit to 'LS', and Rate to the Total Amount.
      If a row represents a sub-item or a detail, include it as a separate item.
      Return the result as a JSON array of objects.
      The document may have multiple pages, please extract everything.`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);

      const res = await fetch('/api/ai/analyze-document', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server AI request failed');
      }
      const { result } = await res.json();
      const extractedItems = JSON.parse(result || "[]");
      
      if (extractedItems.length === 0) {
        alert("No items could be extracted from the PDF. Please ensure it's a valid BOQ document.");
        setIsAnalyzing(false);
        return;
      }

      // Save extracted items to Firestore
      for (const item of extractedItems) {
        const fullItem: BOQItem = {
          ...item,
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          wbsId: selectedWbsId || '',
          amount: (item.quantity || 0) * (item.rate || 0),
          completion: 0,
          location: selectedWbsId ? wbsLevels.find(l => l.id === selectedWbsId)?.title || 'General' : 'General'
        };
        await setDoc(doc(db, 'boq', fullItem.id), fullItem);
      }

      setIsAnalyzing(false);
      alert(`AI Analysis complete: ${extractedItems.length} items identified and categorized by MasterFormat 16 Divisions.`);
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
      return [div.id, div.title, formatCurrency(total)];
    }).filter(row => row[2] !== '0 IQD');

    const grandTotal = currentItems.reduce((sum, item) => sum + item.amount, 0);

    autoTable(doc, {
      startY: 60,
      head: [['Div', 'Description', 'Total']],
      body: [...summaryData, ['', 'GRAND TOTAL', formatCurrency(grandTotal)]],
      theme: 'grid',
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

    // --- DIVISION PAGES ---
    const activeDivisions = [...new Set(currentItems.map(item => item.division))].sort();

    activeDivisions.forEach(divId => {
      doc.addPage();
      const div = masterFormatDivisions.find(d => d.id === divId);
      
      doc.setFontSize(18);
      doc.text(selectedProject.name.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(`Division ${divId} - ${div?.title || 'Unknown'}`, pageWidth / 2, 30, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${locationName}`, pageWidth / 2, 37, { align: 'center' });

      const divItems = currentItems.filter(item => item.division === divId);
      const tableBody = divItems.map((item, idx) => [
        `Div ${divId} ${(idx + 1).toString().padStart(2, '0')}`,
        item.description,
        item.quantity.toLocaleString(),
        item.unit,
        formatCurrency(item.rate),
        formatCurrency(item.amount)
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
      <div className={cn("space-y-2", depth > 0 && "ml-6 border-l border-slate-200 pl-4")}>
        {levels.map(level => (
          <div key={level.id} className="space-y-2">
            <div 
              onClick={() => setSelectedWbsId(level.id)}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group",
                selectedWbsId === level.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                  level.type === 'Zone' ? "bg-purple-100 text-purple-600" :
                  level.type === 'Area' ? "bg-blue-100 text-blue-600" :
                  level.type === 'Building' ? "bg-emerald-100 text-emerald-600" :
                  "bg-amber-100 text-amber-600"
                )}>
                  {level.type[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{level.title}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{level.type}</div>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'wbs', level.id)); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Table className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bill of Quantities</h2>
          </div>
          <p className="text-slate-500">MasterFormat 16 Divisions structured cost planning linked to WBS levels.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('boq')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'boq' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <List className="w-4 h-4" />
            BOQ Hub
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'export' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Printer className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-12">
          {activeTab === 'boq' && (
            <div className="space-y-8">
              {!selectedWbsId ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Project BOQ Hub</h3>
                      <p className="text-slate-500">Select a WBS level to manage its specific Bill of Quantities.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Search WBS levels..."
                          className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button 
                        onClick={() => setSelectedWbsId('master')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
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
                          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
                          onClick={() => setSelectedWbsId(level.id)}
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm",
                              level.type === 'Zone' ? "bg-purple-100 text-purple-600" :
                              level.type === 'Area' ? "bg-blue-100 text-blue-600" :
                              level.type === 'Building' ? "bg-emerald-100 text-emerald-600" :
                              "bg-amber-100 text-amber-600"
                            )}>
                              {level.type[0]}
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{level.type}</div>
                              <div className="text-xs font-bold text-blue-600">{level.code}</div>
                            </div>
                          </div>
                          
                          <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{level.title}</h4>
                          <p className="text-xs text-slate-500 mb-6 line-clamp-1">Location based BOQ for {level.title}</p>
                          
                          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Items</div>
                              <div className="text-sm font-bold text-slate-900">{items.length}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Value</div>
                              <div className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(total)}</div>
                            </div>
                          </div>

                          <div className="mt-6 w-full py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold text-center group-hover:bg-blue-600 group-hover:text-white transition-all">
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
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedWbsId(null)}
                        className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">
                            {selectedWbsId === 'master' ? 'Project' : wbsLevels.find(l => l.id === selectedWbsId)?.type}
                          </span>
                          {selectedWbsId !== 'master' && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">
                              {wbsLevels.find(l => l.id === selectedWbsId)?.code}
                            </span>
                          )}
                          <h3 className="text-xl font-bold text-slate-900">
                            {selectedWbsId === 'master' ? 'Master Bill of Quantities' : wbsLevels.find(l => l.id === selectedWbsId)?.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500">Managing specific BOQ items for this project component.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold text-sm hover:bg-blue-100 transition-all cursor-pointer border border-blue-100">
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isAnalyzing} />
                      </label>
                      
                      <button 
                        onClick={() => setShowAddItem(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Division</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Qty</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Rate</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
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
                              .filter(i => i.division === divId);
                            
                            if (items.length === 0) return null;

                            return (
                              <React.Fragment key={divId}>
                                <tr className="bg-slate-50/80">
                                  <td colSpan={7} className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                        Division {divId}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        — {masterFormatDivisions.find(d => d.id === divId)?.title || 'Other'}
                                      </span>
                                      <div className="ml-auto text-[10px] font-bold text-slate-500">
                                        {items.length} Items | Total: {formatCurrency(items.reduce((sum, i) => sum + i.amount, 0))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                {items.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                        Div {item.division} {(idx + 1).toString().padStart(2, '0')}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <input 
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 p-0"
                                      />
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.workPackage}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                        className="w-20 bg-transparent border-none focus:ring-0 text-sm text-slate-600 text-right font-mono p-0"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <input 
                                        type="text"
                                        value={item.unit}
                                        onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                                        className="w-16 bg-transparent border-none focus:ring-0 text-sm text-slate-600 p-0"
                                      />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <input 
                                        type="number"
                                        value={item.rate}
                                        onChange={(e) => handleUpdateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                        className="w-24 bg-transparent border-none focus:ring-0 text-sm text-slate-600 text-right font-mono p-0"
                                      />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right font-mono">{formatCurrency(item.amount)}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex justify-center">
                                        <button 
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
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
            <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center">
              <div className="max-w-md mx-auto space-y-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Printer className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Export?</h3>
                  <p className="text-slate-500">
                    Generate a professional BOQ document organized by MasterFormat 16 Divisions.
                  </p>
                </div>
                
                <div className="space-y-4 text-left bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Summary Page with Division Totals
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Detailed Pages for each Active Division
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Professional Header & Branding
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    MasterFormat 16 Divisions Compliant
                  </div>
                </div>

                <button 
                  onClick={exportToPDF}
                  disabled={isExporting || boqItems.length === 0}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Add BOQ Item</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea 
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24"
                    placeholder="Describe the work package..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">MasterFormat Division</label>
                  <select 
                    value={newItem.division}
                    onChange={e => setNewItem({...newItem, division: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {masterFormatDivisions.map(div => (
                      <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Package Name</label>
                  <input 
                    type="text" 
                    value={newItem.workPackage}
                    onChange={e => setNewItem({...newItem, workPackage: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Foundation Concrete"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                  <input 
                    type="number" 
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit</label>
                  <input 
                    type="text" 
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="m3, ton, m2, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit Rate (IQD)</label>
                  <input 
                    type="number" 
                    value={newItem.rate}
                    onChange={e => setNewItem({...newItem, rate: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Amount</div>
                    <div className="text-lg font-bold text-slate-900">
                      {formatCurrency((newItem.quantity || 0) * (newItem.rate || 0))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-8">
                <button 
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddBoqItem}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Add to BOQ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
