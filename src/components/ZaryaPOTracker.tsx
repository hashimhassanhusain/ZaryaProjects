import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Page, PurchaseOrder, POItem, Vendor, Activity, WBSLevel, POLineItem, ProjectManagementPlan } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, updateDoc, getDoc, limit, getDocs } from 'firebase/firestore';
import { Table, FileText, BarChart3, ShieldCheck, Plus, Save, AlertTriangle, CheckCircle2, TrendingDown, Database, Loader2, ShoppingCart, Clock, X, Calendar, Search, Filter, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { rollupToParent } from '../services/rollupService';
import { DollarSign, Coins, RefreshCw } from 'lucide-react';

interface ZaryaPOTrackerProps {
  page: Page;
}

export const ZaryaPOTracker: React.FC<ZaryaPOTrackerProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatAmount, exchangeRate: globalExchangeRate, currency: baseCurrency, convertToBase } = useCurrency();
  const location = useLocation();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pmPlan, setPmPlan] = useState<ProjectManagementPlan | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingPOId, setEditingPOId] = useState<string | null>(null);

  // New PO State
  const [newPO, setNewPO] = useState<Partial<PurchaseOrder>>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    wbsId: '',
    masterFormat: '',
    activityId: '',
    actualStartDate: '',
    actualFinishDate: '',
    inputCurrency: baseCurrency,
    exchangeRateUsed: globalExchangeRate,
    lineItems: []
  });

  // Sync newPO exchange rate when global rate changes or project changes
  useEffect(() => {
    setNewPO(prev => ({
      ...prev,
      inputCurrency: baseCurrency,
      exchangeRateUsed: globalExchangeRate
    }));
  }, [baseCurrency, globalExchangeRate]);

  useEffect(() => {
    if (!selectedProject) return;

    const posUnsubscribe = onSnapshot(
      query(collection(db, 'purchaseOrders'), where('projectId', '==', selectedProject.id)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
        setPos(data);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'purchaseOrders');
      }
    );

    const vendorsUnsubscribe = onSnapshot(
      query(collection(db, 'vendors'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      }
    );

    const activitiesUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WBSLevel)));
      }
    );

    const fetchPmPlan = async () => {
      try {
        const q = query(
          collection(db, 'projectManagementPlans'),
          where('projectId', '==', selectedProject.id),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPmPlan(snap.docs[0].data() as ProjectManagementPlan);
        }
      } catch (err) {
        console.error("Failed to fetch PM Plan in PO Tracker:", err);
      }
    };
    fetchPmPlan();

    return () => {
      posUnsubscribe();
      vendorsUnsubscribe();
      activitiesUnsubscribe();
      wbsUnsubscribe();
    };
  }, [selectedProject]);

  // Handle incoming state to edit a specific PO
  useEffect(() => {
    const state = location.state as { editPOId?: string };
    if (state?.editPOId && pos.length > 0) {
      const poToEdit = pos.find(p => p.id === state.editPOId);
      if (poToEdit) {
        handleEditPO(poToEdit);
        // Clear state to prevent re-opening on every render
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, pos]);

  // Flatten POs into items for tracking
  const items = useMemo(() => {
    const flattened: POItem[] = [];
    pos.forEach(po => {
      po.lineItems.forEach(li => {
        flattened.push({
          id: li.id,
          code: po.id, // Using PO ID as code for now
          description: li.description,
          totalQty: li.quantity,
          previousQty: li.status === 'Received' ? li.quantity : 0, // Mock logic
          currentQty: 0,
          price: li.rate,
          uom: li.unit
        });
      });
    });
    return flattened;
  }, [pos]);

  const seedData = async () => {
    if (!selectedProject) return;
    const samplePOs: PurchaseOrder[] = [
      {
        id: 'COS001649',
        projectId: selectedProject.id,
        supplier: 'Fuad Hama Saed',
        date: '2023-05-11',
        status: 'Approved',
        amount: 8250000,
        workPackageId: '6.1.3.1',
        company: '511',
        buyFromPartner: 'SUP000140',
        purchaseOffice: 'P16314',
        projectName: 'Villa 2',
        buyer: 'BAWAN',
        buyerName: 'Bawan Jamal',
        currency: 'IQD',
        workflowStatus: 'Approved',
        divisions: 'Div. 03 - Concrete',
        completion: 100,
        location: 'Villa 2',
        lineItems: [
          { id: 'li1', description: 'Wooden Formwork Panels', quantity: 100, unit: 'pcs', rate: 50000, amount: 5000000, status: 'Received' },
          { id: 'li2', description: 'Nails and Accessories', quantity: 50, unit: 'kg', rate: 65000, amount: 3250000, status: 'Received' },
        ]
      }
    ];

    try {
      for (const po of samplePOs) {
        await setDoc(doc(db, 'purchaseOrders', po.id), po);
      }
      alert('PO Data Seeded Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchaseOrders');
    }
  };

  const handleSavePO = async () => {
    if (!selectedProject || !newPO.id || !newPO.supplier) return;

    try {
      const inputCurrency = newPO.inputCurrency || baseCurrency;
      const exchangeRateUsed = newPO.exchangeRateUsed || globalExchangeRate;

      // Calculate total amount in base currency
      const totalAmount = (newPO.lineItems || []).reduce((acc, item) => {
        const baseRate = convertToBase(item.inputRate || 0, inputCurrency, exchangeRateUsed);
        return acc + (item.quantity * baseRate);
      }, 0);
      
      // Calculate total PO completion based on line items weighted by amount
      const totalWeightedCompletion = (newPO.lineItems || []).reduce((acc, item) => {
        const baseRate = convertToBase(item.inputRate || 0, inputCurrency, exchangeRateUsed);
        const itemBaseAmount = item.quantity * baseRate;
        return acc + ((item.completion || 0) * itemBaseAmount);
      }, 0);
      const poCompletion = totalAmount > 0 ? Math.round(totalWeightedCompletion / totalAmount) : 0;

      const poData: PurchaseOrder = {
        ...newPO as PurchaseOrder,
        projectId: selectedProject.id,
        amount: totalAmount,
        inputCurrency,
        exchangeRateUsed,
        status: 'Approved',
        workflowStatus: 'Approved',
        completion: poCompletion,
        projectName: selectedProject.name,
        purchaseOffice: selectedProject.code
      };

      await setDoc(doc(db, 'purchaseOrders', poData.id), poData);

      // Trigger rollup from PO level
      if (poData.workPackageId) {
        await rollupToParent('po', poData.workPackageId);
      }

      // Sync with Activity (Work Package) - This is partially redundant now with rollup but good for immediate UI feedback
      if (poData.activityId) {
        const activityRef = doc(db, 'activities', poData.activityId);
        await updateDoc(activityRef, {
          percentComplete: poCompletion,
          status: poCompletion === 100 ? 'Completed' : 'In Progress',
          poId: poData.id,
          actualStartDate: poData.actualStartDate || null,
          actualFinishDate: poData.actualFinishDate || null
        });
      }

      setView('list');
      setEditingPOId(null);
      setNewPO({
        id: '',
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        wbsId: '',
        masterFormat: '',
        activityId: '',
        lineItems: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchaseOrders');
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setNewPO(po);
    setEditingPOId(po.id);
    setView('form');
  };

  const addLineItem = () => {
    const newItem: POLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 0,
      unit: '',
      inputRate: 0,
      amount: 0,
      status: 'Pending',
      completion: 0,
      inputCurrency: newPO.inputCurrency as 'USD' | 'IQD' || baseCurrency,
      exchangeRateUsed: newPO.exchangeRateUsed || globalExchangeRate
    };
    setNewPO(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), newItem]
    }));
  };

  const updateLineItem = (id: string, field: keyof POLineItem, value: any) => {
    setNewPO(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          const inputCurrency = prev.inputCurrency || baseCurrency;
          const exchangeRateUsed = prev.exchangeRateUsed || globalExchangeRate;
          
          if (field === 'quantity' || field === 'inputRate') {
            const baseRate = convertToBase(updated.inputRate || 0, inputCurrency, exchangeRateUsed);
            updated.amount = updated.quantity * baseRate;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const removeLineItem = (id: string) => {
    setNewPO(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter(item => item.id !== id)
    }));
  };

  // Filter options for the modal
  const availableWBS = useMemo(() => wbsLevels.filter(w => w.level <= 2), [wbsLevels]);
  const availableMasterFormat = useMemo(() => {
    if (!newPO.wbsId) return [];
    const filteredActivities = activities.filter(a => a.wbsId === newPO.wbsId);
    return Array.from(new Set(filteredActivities.map(a => a.division).filter(Boolean)));
  }, [activities, newPO.wbsId]);

  const availableActivities = useMemo(() => {
    if (!newPO.wbsId || !newPO.masterFormat) return [];
    return activities.filter(a => a.wbsId === newPO.wbsId && a.division === newPO.masterFormat);
  }, [activities, newPO.wbsId, newPO.masterFormat]);

  const renderPOForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white w-full overflow-hidden flex flex-col shadow-sm rounded-3xl border border-slate-200"
    >
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{editingPOId ? 'Edit Purchase Order' : 'Create New Purchase Order'}</h3>
          <p className="text-xs text-slate-500 mt-1">Project: {selectedProject?.name}</p>
        </div>
        <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Step 1: Hierarchy Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. WBS (Zone/Building)</label>
            <select
              value={newPO.wbsId}
              onChange={(e) => setNewPO(prev => ({ ...prev, wbsId: e.target.value, masterFormat: '', activityId: '' }))}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            >
              <option value="">Select WBS...</option>
              {availableWBS.map(w => (
                <option key={w.id} value={w.id}>{w.code} - {w.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. MasterFormat</label>
            <select
              value={newPO.masterFormat}
              disabled={!newPO.wbsId}
              onChange={(e) => setNewPO(prev => ({ ...prev, masterFormat: e.target.value, activityId: '' }))}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 rounded-xl"
            >
              <option value="">Select Division...</option>
              {availableMasterFormat.map(mf => (
                <option key={mf} value={mf}>Div. {mf}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3. Activity / Work Package</label>
            <select
              value={newPO.activityId}
              disabled={!newPO.masterFormat}
              onChange={(e) => {
                const act = activities.find(a => a.id === e.target.value);
                setNewPO(prev => ({ ...prev, activityId: e.target.value, workPackageId: act?.workPackage || '' }));
              }}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 rounded-xl"
            >
              <option value="">Select Activity...</option>
              {availableActivities.map(a => (
                <option key={a.id} value={a.id}>{a.description}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: PO Details */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PO Code</label>
            <input
              type="text"
              value={newPO.id}
              disabled={!!editingPOId}
              onChange={(e) => setNewPO(prev => ({ ...prev, id: e.target.value }))}
              placeholder="e.g. PO-2024-001"
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Date</label>
            <input
              type="date"
              value={newPO.date}
              onChange={(e) => setNewPO(prev => ({ ...prev, date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency</label>
            <select
              value={newPO.inputCurrency}
              onChange={(e) => {
                const newCurr = e.target.value as 'USD' | 'IQD';
                setNewPO(prev => {
                  const updatedLineItems = (prev.lineItems || []).map(item => {
                    const baseRate = convertToBase(item.inputRate || 0, newCurr, prev.exchangeRateUsed || globalExchangeRate);
                    return { ...item, inputCurrency: newCurr, amount: item.quantity * baseRate };
                  });
                  return { ...prev, inputCurrency: newCurr, lineItems: updatedLineItems };
                });
              }}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            >
              <option value="USD">USD ($)</option>
              <option value="IQD">IQD (د.ع)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exchange Rate</label>
            <input
              type="number"
              value={newPO.exchangeRateUsed}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value) || 0;
                setNewPO(prev => {
                  const updatedLineItems = (prev.lineItems || []).map(item => {
                    const baseRate = convertToBase(item.inputRate || 0, prev.inputCurrency || baseCurrency, newRate);
                    return { ...item, exchangeRateUsed: newRate, amount: item.quantity * baseRate };
                  });
                  return { ...prev, exchangeRateUsed: newRate, lineItems: updatedLineItems };
                });
              }}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual Start</label>
            <input
              type="date"
              value={newPO.actualStartDate || ''}
              onChange={(e) => setNewPO(prev => ({ ...prev, actualStartDate: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual Finish</label>
            <input
              type="date"
              value={newPO.actualFinishDate || ''}
              onChange={(e) => setNewPO(prev => ({ ...prev, actualFinishDate: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor / Supplier</label>
            <select
              value={newPO.supplier}
              onChange={(e) => setNewPO(prev => ({ ...prev, supplier: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            >
              <option value="">Select Vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.vendorCode} - {v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 3: Line Items */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Items (BOQ Breakdown)</label>
            <button
              onClick={addLineItem}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {newPO.lineItems?.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                <div className="col-span-3 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Unit</label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Rate</label>
                  <input
                    type="number"
                    value={item.inputRate}
                    onChange={(e) => updateLineItem(item.id, 'inputRate', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Amount ({baseCurrency})</label>
                  <div className="w-full bg-slate-100 p-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg">
                    {formatAmount(item.amount, baseCurrency)}
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">% Completion</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.completion || 0}
                      onChange={(e) => updateLineItem(item.id, 'completion', parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-slate-500">%</span>
                  </div>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeLineItem(item.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!newPO.lineItems || newPO.lineItems.length === 0) && (
              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                No line items added. Click "Add Item" to begin.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
        <button
          onClick={() => setView('list')}
          className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors rounded-xl"
        >
          Cancel
        </button>
        <button
          onClick={handleSavePO}
          disabled={!newPO.id || !newPO.supplier || !newPO.activityId}
          className="px-8 py-2 bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          {editingPOId ? 'Update Purchase Order' : 'Save Purchase Order'}
        </button>
      </div>
    </motion.div>
  );

  const formatCurrency = (val: number, curr: string = 'IQD') => {
    return formatAmount(val, curr as 'USD' | 'IQD');
  };

  const calculateRemaining = (item: POItem) => {
    const totalReceived = item.previousQty + item.currentQty;
    const remainingQty = item.totalQty - totalReceived;
    const remainingAmount = remainingQty * item.price;
    return { remainingQty, remainingAmount, totalReceived };
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  const renderPaymentCertificate = () => (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Zarya Company for Construction</h3>
            <p className="text-slate-500">Summery of Work Form - Payment Certificate</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-600">Date: 25/03/2026</div>
            <div className="text-xs text-slate-400">Ref: ZARYA-PC-003</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Supplier Name:</span> <span className="font-semibold">Wasta Noory Restaurant</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">PO Number:</span> <span className="font-semibold">COS003853</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Project Name:</span> <span className="font-semibold">Villa 2</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Payment Number:</span> <span className="font-semibold">3rd Payment</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Currency:</span> <span className="font-semibold">IQD</span></div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 mb-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Received Qty</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">UOM</th>
                <th className="px-4 py-3 text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-4 font-mono text-xs">{item.code}</td>
                  <td className="px-4 py-4 text-slate-700">{item.description}</td>
                  <td className="px-4 py-4 text-right">
                    <input 
                      type="number" 
                      value={item.currentQty} 
                      onChange={(e) => {
                        // This is a read-only view for now, or we should manage local state
                        console.log('Update current qty:', e.target.value);
                      }}
                      className="w-20 text-right border-b border-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-4 text-right">{formatAmount(item.price, baseCurrency)}</td>
                  <td className="px-4 py-4">{item.uom}</td>
                  <td className="px-4 py-4 text-right font-semibold">{formatAmount(item.currentQty * item.price, baseCurrency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50/50 font-bold">
              <tr>
                <td colSpan={5} className="px-4 py-4 text-right text-blue-900">Total Current Payment:</td>
                <td className="px-4 py-4 text-right text-blue-900">
                  {formatAmount(items.reduce((acc, item) => acc + (item.currentQty * item.price), 0), baseCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <Plus className="w-4 h-4" /> Add Line
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
            <Save className="w-4 h-4" /> Save & Migrate Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderCumulativeTracking = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Cumulative PO Tracking - Master Record</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">IQD BASIS</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">SYNCED</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 border-r border-slate-200" colSpan={3}>PO Details</th>
                <th className="px-4 py-4 border-r border-slate-200 bg-blue-50/50" colSpan={2}>Payments (Cumulative)</th>
                <th className="px-4 py-4 bg-emerald-50/50" colSpan={3}>Remaining (Balance)</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Total PO Amount</th>
                <th className="px-4 py-2 text-right">Received Qty</th>
                <th className="px-4 py-2 text-right">Received Amount</th>
                <th className="px-4 py-2 text-right">MasterFormat Qty</th>
                <th className="px-4 py-2 text-right">MasterFormat Amount</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const { remainingQty, remainingAmount, totalReceived } = calculateRemaining(item);
                const isLow = remainingQty < (item.totalQty * 0.2);
                return (
                  <tr key={idx} className={cn("hover:bg-slate-50 transition-colors", isLow && "bg-rose-50/30")}>
                    <td className="px-4 py-4 font-mono">{item.code}</td>
                    <td className="px-4 py-4">{item.description}</td>
                    <td className="px-4 py-4 text-right font-semibold">{formatAmount(item.totalQty * item.price, baseCurrency)}</td>
                    <td className="px-4 py-4 text-right">{totalReceived}</td>
                    <td className="px-4 py-4 text-right font-medium">{formatAmount(totalReceived * item.price, baseCurrency)}</td>
                    <td className="px-4 py-4 text-right font-bold text-blue-600">{remainingQty}</td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-600">{formatAmount(remainingAmount, baseCurrency)}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                        isLow ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {isLow ? 'Critical Balance' : 'Remain on PO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const totalCommitted = pos.reduce((acc, po) => acc + po.amount, 0);
    const globalLimit = pmPlan?.baselines.cost || 0;
    const utilizationPercent = globalLimit > 0 ? (totalCommitted / globalLimit) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Global Limit Banner */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Global Project Limit</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight">${globalLimit.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">USD (Synced from PMP)</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
              <span className="text-slate-400">Budget Utilization</span>
              <span className={cn(utilizationPercent > 90 ? "text-rose-400" : "text-blue-400")}>
                {utilizationPercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                className={cn(
                  "h-full transition-all duration-1000",
                  utilizationPercent > 90 ? "bg-rose-500" : "bg-blue-500"
                )}
              />
            </div>
          </div>

        <div className="text-right">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Committed</h4>
          <div className="text-2xl font-black tracking-tight text-emerald-400">
            {formatAmount(totalCommitted, baseCurrency)}
          </div>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Package Utilization</h3>
            </div>
            <div className="space-y-4">
              {items.map((item, idx) => {
                const { totalReceived } = calculateRemaining(item);
                const percent = (totalReceived / item.totalQty) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 truncate w-32">{item.description}</span>
                      <span className="font-bold">{percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-1000", percent > 80 ? "bg-rose-500" : "bg-blue-500")}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-slate-800">Critical Alerts</h3>
            </div>
            <div className="space-y-3">
              {items.filter(i => (i.previousQty + i.currentQty) / i.totalQty > 0.8).map((item, idx) => (
                <div key={idx} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-900">{item.code} - Low Balance</div>
                    <div className="text-[10px] text-rose-700">Less than 20% remaining on this PO line. Action required.</div>
                  </div>
                </div>
              ))}
              {items.filter(i => (i.previousQty + i.currentQty) / i.totalQty <= 0.8).length === items.length && (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">All PO balances are healthy.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Financial Summary
            </h3>
            <div className="space-y-6">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total Committed (POs)</div>
                <div className="text-2xl font-bold text-blue-400">
                  {formatAmount(totalCommitted, baseCurrency)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">Total Paid</div>
                  <div className="text-sm font-bold">
                    {formatAmount(items.reduce((acc, i) => acc + ((i.previousQty + i.currentQty) * i.price), 0), baseCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">Total Remaining</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {formatAmount(items.reduce((acc, i) => acc + calculateRemaining(i).remainingAmount, 0), baseCurrency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPOLog = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">PO Log - Detailed Tracking</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setNewPO({
                  id: '',
                  date: new Date().toISOString().split('T')[0],
                  supplier: '',
                  wbsId: '',
                  masterFormat: '',
                  activityId: '',
                  lineItems: []
                });
                setEditingPOId(null);
                setView('form');
              }}
              className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> Add Purchase Order
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr className="divide-x divide-slate-200">
                <th className="px-3 py-3 whitespace-nowrap">WBS</th>
                <th className="px-3 py-3 whitespace-nowrap">MasterFormat</th>
                <th className="px-3 py-3 whitespace-nowrap">Activity</th>
                <th className="px-3 py-3 whitespace-nowrap">Order</th>
                <th className="px-3 py-3 whitespace-nowrap">Order Date</th>
                <th className="px-3 py-3 whitespace-nowrap">Suppliers</th>
                <th className="px-3 py-3 whitespace-nowrap text-right">Amount ({baseCurrency})</th>
                <th className="px-3 py-3 whitespace-nowrap">Status</th>
                <th className="px-3 py-3 whitespace-nowrap text-center">% Completion</th>
                <th className="px-3 py-3 whitespace-nowrap">Actual Start</th>
                <th className="px-3 py-3 whitespace-nowrap">Actual Finish</th>
                <th className="px-3 py-3 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pos.map((po, idx) => {
                const wbs = wbsLevels.find(w => w.id === po.wbsId);
                const activity = activities.find(a => a.id === po.activityId);
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors divide-x divide-slate-100">
                    <td className="px-3 py-3 font-bold text-slate-700">{wbs?.code || 'N/A'}</td>
                    <td className="px-3 py-3 text-slate-500">Div. {po.masterFormat || 'N/A'}</td>
                    <td className="px-3 py-3 text-slate-600 font-medium">{activity?.description || 'N/A'}</td>
                    <td className="px-3 py-3 font-mono font-bold text-blue-600">{po.id}</td>
                    <td className="px-3 py-3 text-slate-500">{po.date}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{po.supplier}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 font-mono">{formatAmount(po.amount, baseCurrency)}</td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                        po.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden min-w-[40px]">
                          <div 
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${po.completion || 0}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{po.completion || 0}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{po.actualStartDate || '-'}</td>
                    <td className="px-3 py-3 text-slate-500">{po.actualFinishDate || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      <button 
                        onClick={() => handleEditPO(po)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-slate-400">
                    No purchase orders found for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wider">Zarya Construction Co.</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
        </div>
        <div className="flex gap-2">
           {items.length === 0 && (
             <button 
               onClick={seedData}
               className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2"
             >
               <Database className="w-3 h-3" />
               Seed PO Data
             </button>
           )}
           <div className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">SYSTEM: ACTIVE</div>
           <div className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-500/20">LIVE SYNC</div>
        </div>
      </header>

      {page.id === '4.2.3' && renderPaymentCertificate()}
      {page.id === '4.2.4' && renderCumulativeTracking()}
      {page.id === '4.2.5' && renderDashboard()}
      {page.id === '4.2.6' && (
        view === 'list' ? renderPOLog() : renderPOForm()
      )}

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Smart Logic Enabled</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            All calculations follow the formula: <code className="bg-blue-100 px-1 rounded">Remaining = Total PO - (Previous + Current)</code>. 
            Data is automatically migrated to the Cumulative Tracking record upon saving.
          </p>
        </div>
      </div>
    </div>
  );
};
