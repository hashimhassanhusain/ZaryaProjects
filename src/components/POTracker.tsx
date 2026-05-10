import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Page, PurchaseOrder, POItem, Supplier, Activity, WBSLevel, POLineItem, ProjectManagementPlan, POActivity, BOQItem, EntityConfig, CostCenter } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, updateDoc, getDoc, limit, getDocs, deleteDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { Table, FileText, BarChart3, ShieldCheck, Plus, Save, AlertTriangle, CheckCircle2, TrendingDown, Database, Loader2, ShoppingCart, Clock, X, Calendar, Search, Filter, ChevronRight, Trash2, Edit2, Sparkles, History, DraftingCompass, Upload, Download, ArrowLeft, Printer, Briefcase, User, DollarSign, Coins, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getFullWBSCode, generatePMISFileName, getRouteForFile } from '../lib/utils';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { rollupToParent } from '../services/rollupService';
import { GoogleGenAI, Type } from "@google/genai";
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { DataImportModal } from './DataImportModal';
import { UniversalDataTable } from './common/UniversalDataTable';
import { POMigrationModal } from './POMigrationModal';
import { LogProgressModal } from './LogProgressModal';
import { getCostCenters } from '../services/masterDataService';

interface POTrackerProps {
  page: Page;
}

export const POTracker: React.FC<POTrackerProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const { formatAmount, exchangeRate: globalExchangeRate, currency: baseCurrency, convertToBase } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Supplier[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pmPlan, setPmPlan] = useState<ProjectManagementPlan | null>(null);
  const [view, setView] = useState<'list' | 'form' | 'import' | 'preview' | 'detail'>(page.details?.initialView === 'form' ? 'form' : 'list');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

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
    lineItems: [],
    contractNumber: '',
    contractDuration: 0,
    contractDurationType: 'Calendar Days',
    contractDriveUrl: '',
    changeOrdersUrl: '',
    sowUrl: ''
  });

  const totalPOAmount = useMemo(() => {
    return (newPO.lineItems || []).reduce((sum, li) => sum + (li.amount || 0), 0);
  }, [newPO.lineItems]);

  // Get unique suppliers from both companies collection and existing POs
  const allAvailableSuppliers = useMemo(() => {
    const poSuppliers = pos.map(p => p.supplier).filter(Boolean);
    const vendorNames = vendors.map(v => v.name);
    return Array.from(new Set([...poSuppliers, ...vendorNames])).sort();
  }, [pos, vendors]);

  const requiresAgreement = totalPOAmount > 3000000;
  const requiresContract = totalPOAmount > 15000000;

  // Handle initialization/prop changes
  useEffect(() => {
    if (page.details?.initialView === 'form') {
      setView('form');
    } else if (page.details?.initialView === 'list') {
      setView('list');
    }
  }, [page.details?.initialView]);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewPOs, setPreviewPOs] = useState<PurchaseOrder[] | null>(null);
  const [selectedPOIds, setSelectedPOIds] = useState<string[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isAddingNewActivity, setIsAddingNewActivity] = useState(false);
  const [newActivityData, setNewActivityData] = useState<Partial<Activity>>({
    description: '',
    unit: '',
    quantity: 0,
    rate: 0,
    amount: 0,
    status: 'Not Started'
  });

  useEffect(() => {
    getCostCenters().then(setCostCenters);
  }, []);

  const { language } = useLanguage();
  const getAmountColor = (amount: number) => {
    // 3,000,000 or less: Green
    // 15,000,000 or more: Red
    if (amount <= 3000000) return 'text-emerald-600';
    if (amount >= 15000000) return 'text-rose-600 font-semibold';
    
    // Gradient logic: Green -> Amber -> Orange -> Red
    if (amount < 6000000) return 'text-green-600';
    if (amount < 9000000) return 'text-amber-500';
    if (amount < 12000000) return 'text-orange-500';
    return 'text-red-500 font-bold';
  };

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

    let posUnsubscribe: () => void;
    let vendorsUnsubscribe: () => void;
    let activitiesUnsubscribe: () => void;
    let wbsUnsubscribe: () => void;
    let boqUnsubscribe: () => void;

    try {
      posUnsubscribe = onSnapshot(
        query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id)), 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
          setPos(data);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'purchase_orders');
        }
      );

      vendorsUnsubscribe = onSnapshot(
        query(collection(db, 'companies'), where('type', '==', 'Supplier')),
        (snapshot) => {
          setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
        }
      );

      activitiesUnsubscribe = onSnapshot(
        query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
        (snapshot) => {
          setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
        }
      );

      wbsUnsubscribe = onSnapshot(
        query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
        (snapshot) => {
          setWbsLevels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WBSLevel)));
        }
      );

      boqUnsubscribe = onSnapshot(
        query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
        (snapshot) => {
          setBoqItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BOQItem)));
        }
      );
    } catch (err) {
      console.error("Failed to setup subscribers:", err);
    }

    return () => {
      posUnsubscribe?.();
      vendorsUnsubscribe?.();
      activitiesUnsubscribe?.();
      wbsUnsubscribe?.();
      boqUnsubscribe?.();
    };
  }, [selectedProject, baseCurrency, globalExchangeRate]);

  // Auto-sync missing suppliers from existing POs
  useEffect(() => {
    const syncSuppliers = async () => {
      if (pos.length > 0 && vendors.length >= 0) {
        const poSuppliers = new Set(pos.map(p => p.supplier).filter(Boolean));
        const existingVendorNames = new Set(vendors.map(v => v.name));
        
        for (const sName of Array.from(poSuppliers)) {
          if (!existingVendorNames.has(sName)) {
            try {
              const supplierId = `SUP-${crypto.randomUUID().slice(0, 8)}`;
              await setDoc(doc(db, 'companies', supplierId), {
                id: supplierId,
                name: sName,
                type: 'Supplier',
                is_internal: false,
                entity_type: 'vendor',
                status: 'Approved',
                reliability: 'Active',
                category: 'Auto-Synced From POs',
                createdAt: new Date().toISOString()
              });
              console.log(`Auto-synced missing supplier: ${sName}`);
            } catch (err) {
              console.error("Failed to sync supplier:", sName, err);
            }
          }
        }
      }
    };
    syncSuppliers();
  }, [pos.length, vendors.length]);

  useEffect(() => {
    if (!selectedProject) return;
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
        divisions: '03 - Concrete',
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
        await setDoc(doc(db, 'purchase_orders', po.id), po);
      }
      toast.success('PO Data Seeded Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchase_orders');
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

      let finalActivityId = newPO.activityId;

      // Handle new activity creation
      if (isAddingNewActivity && newActivityData.description) {
        const activityId = crypto.randomUUID();
        const wp = wbsLevels.find(l => l.id === newPO.workPackageId);
        const activity: Activity = {
          id: activityId,
          projectId: selectedProject.id,
          wbsId: newPO.wbsId || '',
          workPackage: wp?.title || '',
          description: newActivityData.description,
          unit: newActivityData.unit || 'unit',
          quantity: newActivityData.quantity || 0,
          rate: newActivityData.rate || 0,
          amount: newActivityData.amount || 0,
          status: poCompletion === 100 ? 'Completed' : 'In Progress',
          startDate: newPO.date,
          percentComplete: poCompletion
        };
        await setDoc(doc(db, 'activities', activityId), activity);
        finalActivityId = activityId;
      }

      // History tracking
      const history: POActivity[] = [...(newPO.history || [])];
      if (editingPOId) {
        const oldPO = pos.find(p => p.id === editingPOId);
        if (oldPO) {
          const changes: { field: string; old: any; new: any }[] = [];
          if (oldPO.amount !== totalAmount) changes.push({ field: 'amount', old: oldPO.amount, new: totalAmount });
          if (oldPO.supplier !== newPO.supplier) changes.push({ field: 'supplier', old: oldPO.supplier, new: newPO.supplier });
          if (oldPO.status !== newPO.status) changes.push({ field: 'status', old: oldPO.status, new: newPO.status });
          
          if (changes.length > 0) {
            history.push({
              id: crypto.randomUUID(),
              userId: auth.currentUser?.uid || 'unknown',
              userName: auth.currentUser?.displayName || 'User',
              action: 'Updated Purchase Order',
              timestamp: new Date().toISOString(),
              changes
            });
          }
        }
      } else {
        history.push({
          id: crypto.randomUUID(),
          userId: auth.currentUser?.uid || 'unknown',
          userName: auth.currentUser?.displayName || 'User',
          action: 'Created Purchase Order',
          timestamp: new Date().toISOString()
        });
      }

      const poData: PurchaseOrder = {
        ...newPO as PurchaseOrder,
        activityId: finalActivityId,
        projectId: selectedProject.id,
        amount: totalAmount,
        inputCurrency,
        exchangeRateUsed,
        status: requiresContract && !newPO.contractDriveUrl ? 'Pending Contract' : 'Approved',
        workflowStatus: requiresContract && !newPO.contractDriveUrl ? 'Pending Contract' : 'Approved',
        completion: poCompletion,
        projectName: selectedProject.name,
        purchaseOffice: selectedProject.code,
        history
      };

      await setDoc(doc(db, 'purchase_orders', poData.id), poData);

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
      setIsAddingNewActivity(false);
      setNewActivityData({
        description: '',
        unit: '',
        quantity: 0,
        rate: 0,
        amount: 0,
        status: 'Not Started'
      });
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
      handleFirestoreError(error, OperationType.WRITE, 'purchase_orders');
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setNewPO(po);
    setEditingPOId(po.id);
    setView('form');
  };

  const poTargetColumns = [
    { key: 'id', label: 'PO Number / ID', required: true, description: 'Unique identifier for the PO' },
    { key: 'date', label: 'Order Date', required: true, type: 'date' as const, description: 'Date of the order' },
    { key: 'buyFromPartner', label: 'Business Partner Code', description: 'Supplier Code (e.g., SUP000031)' },
    { key: 'supplier', label: 'Business Partner Name', required: true, description: 'Name of the vendor' },
    { key: 'masterFormat', label: 'Cost Account (Division)', description: 'MasterFormat code (e.g., 03, 09)' },
    { key: 'amount', label: 'Total Amount', type: 'number' as const, description: 'Total value of the PO' },
    { key: 'inputCurrency', label: 'Currency', type: 'string' as const, description: 'USD or IQD' },
    { key: 'exchangeRateUsed', label: 'Exchange Rate', type: 'number' as const, description: 'Rate used for conversion' },
    { key: 'contractNumber', label: 'Contract Number', description: 'Associated contract ID' },
    { key: 'workPackageId', label: 'Work Package ID', description: 'Associated WBS code' },
    { key: 'divisions', label: 'Division Description', description: 'e.g. Division 03 - Concrete' },
    { key: 'lineDescription', label: 'Item Description', description: 'Description for the line item' },
    { key: 'lineQuantity', label: 'Item Quantity', type: 'number' as const, description: 'Quantity for this line item' },
    { key: 'lineUnit', label: 'Item Unit', description: 'Unit of measure (pcs, m3, etc.)' },
    { key: 'lineRate', label: 'Item Rate', type: 'number' as const, description: 'Unit rate for this line item' },
  ];

  const neuralDataMapping = async (supplierName: string, supplierCode: string, projectId: string) => {
    try {
      if (!supplierName) return null;
      const supplierId = supplierCode || `SUP-${supplierName.replace(/\s+/g, '-').toUpperCase()}`;
      
      const existing = vendors.find(v => v.id === supplierId || v.name === supplierName);
      if (existing) return supplierId;

      const supplierRef = doc(db, 'companies', supplierId);
      const supplierSnap = await getDoc(supplierRef);
      
      if (!supplierSnap.exists()) {
        await setDoc(supplierRef, {
          id: supplierId,
          name: supplierName,
          type: 'Supplier',
          is_internal: false,
          entity_type: 'vendor',
          status: 'Approved',
          reliability: 'Active',
          category: 'Neural Synced',
          projectId,
          vendorCode: supplierCode,
          createdAt: new Date().toISOString()
        });
        
        const stakId = `SH-${supplierId}`;
        await setDoc(doc(db, 'stakeholders', stakId), {
          id: stakId,
          projectId: projectId,
          name: supplierName,
          organization: supplierName,
          position: 'Vendor / Partner',
          role: 'Supplier',
          type: 'External',
          status: 'Active',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      return supplierId;
    } catch (err) {
      console.error("Neural mapping failed:", err);
      return null;
    }
  };

  const handleImportPOData = async (mappedData: any[]) => {
    if (!selectedProject) return;
    setIsAnalyzing(true);
    let successCount = 0;
    
    try {
      // Group data by PO ID
      const groupedData: Record<string, any[]> = {};
      for (const item of mappedData) {
        if (!item.id) continue;
        if (!groupedData[item.id]) groupedData[item.id] = [];
        groupedData[item.id].push(item);
      }

      const poIds = Object.keys(groupedData);
      for (const id of poIds) {
        const rows = groupedData[id];
        const firstRow = rows[0];

        // Neural mapping outside transaction
        await neuralDataMapping(firstRow.supplier, firstRow.buyFromPartner, selectedProject.id);

        await runTransaction(db, async (transaction) => {
          const poRef = doc(db, 'purchase_orders', id);
          const poSnap = await transaction.get(poRef);
          
          const inputCurrency = firstRow.inputCurrency || (poSnap.exists() ? poSnap.data().inputCurrency : baseCurrency);
          const exchangeRateUsed = firstRow.exchangeRateUsed || (poSnap.exists() ? poSnap.data().exchangeRateUsed : globalExchangeRate);

          const newItems: POLineItem[] = rows.map(row => ({
            id: crypto.randomUUID(),
            description: row.lineDescription || row.description || 'Line Item',
            quantity: parseFloat(row.lineQuantity) || 0,
            unit: row.lineUnit || 'unit',
            rate: parseFloat(row.lineRate) || 0,
            inputRate: parseFloat(row.lineRate) || 0,
            amount: (parseFloat(row.lineQuantity) || 0) * convertToBase(parseFloat(row.lineRate) || 0, inputCurrency, exchangeRateUsed),
            status: 'Pending',
            completion: 0,
            inputCurrency,
            exchangeRateUsed
          }));

          if (poSnap.exists()) {
            const existingData = poSnap.data() as PurchaseOrder;
            const updatedLineItems = [...(existingData.lineItems || []), ...newItems];
            transaction.update(poRef, {
              lineItems: updatedLineItems,
              amount: updatedLineItems.reduce((sum, li) => sum + li.amount, 0),
              updatedAt: new Date().toISOString()
            });
          } else {
            transaction.set(poRef, {
              id,
              projectId: selectedProject.id,
              date: firstRow.date || new Date().toISOString().split('T')[0],
              supplier: firstRow.supplier || 'Unknown Supplier',
              buyFromPartner: firstRow.buyFromPartner || '',
              amount: newItems.reduce((sum, li) => sum + li.amount, 0),
              status: 'Approved',
              workflowStatus: 'Approved',
              inputCurrency,
              exchangeRateUsed,
              lineItems: newItems,
              projectName: selectedProject.name,
              divisions: firstRow.divisions || '',
              completion: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });
        successCount++;
      }
      toast.success(`Successfully processed ${successCount} Purchase Orders`);
      setView('list');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'purchase_orders');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePOFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const prompt = `Extract all Purchase Orders (PO) from the provided document.
      For each PO, identify:
      - PO Number/ID
      - Date (YYYY-MM-DD)
      - Supplier Name
      - Cost Account (also known as Masterformat or Division). Map these to the project's specific names if possible (e.g., 'Div. 01' -> 'General Requirements').
      - Work Package name
      - % Completion (if mentioned, otherwise 0)
      - Line Items:
        - Description
        - Quantity (number)
        - Unit (e.g., 'pcs', 'm3', 'ton')
        - Unit Rate (number)
        - Total Amount for the line item (number)
      
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
                poId: { type: Type.STRING, description: "Purchase Order Number/ID" },
                date: { type: Type.STRING, description: "Order Date (YYYY-MM-DD)" },
                supplier: { type: Type.STRING, description: "Supplier Name" },
                costAccount: { type: Type.STRING, description: "Cost Account / Masterformat / Division" },
                workPackage: { type: Type.STRING, description: "Work Package Name" },
                completion: { type: Type.NUMBER, description: "Percentage completion (0-100)" },
                lineItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                      rate: { type: Type.NUMBER },
                      amount: { type: Type.NUMBER }
                    },
                    required: ["description", "quantity", "unit", "rate", "amount"]
                  }
                }
              },
              required: ["poId", "date", "supplier", "lineItems"]
            }
          }
        }
      });

      const extractedPOs = JSON.parse(response.text || "[]");
      
      if (extractedPOs.length === 0) {
        toast.error("No Purchase Orders could be extracted from the document.");
        setIsAnalyzing(false);
        return;
      }

      const mappedPOs: PurchaseOrder[] = extractedPOs.map((extractedPO: any) => {
        const poId = extractedPO.poId || `PO-${crypto.randomUUID().slice(0, 8)}`;
        
        const lineItems: POLineItem[] = extractedPO.lineItems.map((li: any) => ({
          id: crypto.randomUUID(),
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          rate: li.rate,
          inputRate: li.rate,
          amount: li.amount,
          status: 'Pending',
          completion: extractedPO.completion || 0,
          inputCurrency: baseCurrency,
          exchangeRateUsed: globalExchangeRate
        }));

        const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);

        return {
          id: poId,
          projectId: selectedProject.id,
          supplier: extractedPO.supplier,
          date: extractedPO.date || new Date().toISOString().split('T')[0],
          status: 'Approved',
          workflowStatus: 'Approved',
          amount: totalAmount,
          inputCurrency: baseCurrency,
          exchangeRateUsed: globalExchangeRate,
          completion: extractedPO.completion || 0,
          projectName: selectedProject.name,
          purchaseOffice: selectedProject.code,
          lineItems: lineItems,
          wbsId: '',
          masterFormat: extractedPO.costAccount || extractedPO.workPackage || '',
          activityId: '',
          workPackageId: ''
        };
      });

      setPreviewPOs(mappedPOs);
      setView('preview');
      setIsAnalyzing(false);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setIsAnalyzing(false);
      toast.error("AI Analysis failed. Please try again.");
    }
  };

  const handleConfirmImport = async () => {
      if (!previewPOs) return;
      try {
        const batch = writeBatch(db);
        const affectedActivityIds = new Set<string>();
        
        for (const po of previewPOs) {
          const poRef = doc(db, 'purchase_orders', po.id);
          batch.set(poRef, po);
          if (po.activityId) affectedActivityIds.add(po.activityId);
        }
        
        await batch.commit();
        
        // Trigger rollups for affected activities
        for (const actId of affectedActivityIds) {
          await rollupToParent('po', actId);
        }

        toast.success(`Successfully imported ${previewPOs.length} Purchase Orders.`);
        setView('list');
        setPreviewPOs(null);
      } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import POs.");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPOIds(pos.map(po => po.id));
    } else {
      setSelectedPOIds([]);
    }
  };

  const handleSelectRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedPOIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const poTableData = useMemo(() => {
    return pos.map(po => {
      const wbs = wbsLevels.find(w => w.id === po.workPackageId);
      const activity = activities.find(a => a.id === po.activityId);
      
      return {
        ...po,
        wbsTitle: wbs?.title || 'Not assigned', // Fix display title
        wbsCode: wbs?.code || 'N/A',
        masterFormat: po.masterFormat || 'N/A',
        activityDescription: activity?.description || 'N/A'
      };
    });
  }, [pos, wbsLevels, activities]);

  const poConfig: EntityConfig = {
    id: 'purchase_orders',
    label: 'Purchase Orders',
    icon: ShoppingCart,
    collection: 'purchase_orders',
    columns: [
      { key: 'wbsCode', label: 'WBS', type: 'badge' },
      { key: 'masterFormat', label: 'Cost Account', type: 'string' },
      { key: 'activityDescription', label: 'Activity', type: 'string' },
      { key: 'id', label: 'Order / Contract', type: 'badge' },
      { key: 'date', label: 'Order Date', type: 'date' },
      { key: 'supplier', label: 'Suppliers', type: 'string' },
      { key: 'amount', label: `Total (${baseCurrency})`, type: 'currency' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'completion', label: '% Completion', type: 'progress' },
      { key: 'actualStartDate', label: 'Actual Start', type: 'date' },
      { key: 'actualFinishDate', label: 'Actual Finish', type: 'date' },
    ]
  };

  const handleBulkDeleteAction = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const affectedActivityIds = new Set<string>();
      
      for (const id of ids) {
        const po = pos.find(p => p.id === id);
        if (po?.activityId) affectedActivityIds.add(po.activityId);
        batch.delete(doc(db, 'purchase_orders', id));
      }
      
      await batch.commit();
      
      for (const actId of affectedActivityIds) {
        await rollupToParent('po', actId);
      }
    } catch (err) {
      console.error("Bulk delete failed:", err);
      throw err;
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const po = pos.find(p => p.id === id);
      const affectedActivityId = po?.activityId;
      
      await deleteDoc(doc(db, 'purchase_orders', id));
      
      if (affectedActivityId) {
        await rollupToParent('po', affectedActivityId);
      }
      toast.success('Purchase Order deleted');
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error('Failed to delete Purchase Order');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPOIds.length === 0) return;
    
    toast((toastRef) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete {selectedPOIds.length} purchase orders?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(toastRef.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                const batch = writeBatch(db);
                const affectedActivityIds = new Set<string>();
                
                for (const id of selectedPOIds) {
                  const po = pos.find(p => p.id === id);
                  if (po?.activityId) affectedActivityIds.add(po.activityId);
                  batch.delete(doc(db, 'purchase_orders', id));
                }
                
                await batch.commit();
                
                // Trigger rollups for affected activities
                for (const actId of affectedActivityIds) {
                  await rollupToParent('po', actId);
                }

                toast.success(`Deleted ${selectedPOIds.length} items`);
                setSelectedPOIds([]);
              } catch (err) {
                console.error("Bulk delete failed:", err);
                toast.error("Failed to delete some items");
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete All
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const addLineItem = () => {
    const newItem: POLineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 0,
      unit: '',
      rate: 0,
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
  const availableWBS = useMemo(() => wbsLevels.filter(w => w.level <= 3), [wbsLevels]);
  
  const availableMasterFormat = useMemo(() => {
    if (!newPO.wbsId) return [];
    
    // Find all Cost Account levels that are descendants of the selected WBS level
    const findDescendants = (parentId: string): WBSLevel[] => {
      const children = wbsLevels.filter(l => l.parentId === parentId);
      let descendants = [...children];
      children.forEach(c => {
        descendants = [...descendants, ...findDescendants(c.id)];
      });
      return descendants;
    };
    
    const descendants = findDescendants(newPO.wbsId);
    const costAccounts = descendants.filter(l => l.type === 'Work Package');
    
    // Also check if the selected level itself is a Work Package
    const selectedWBS = wbsLevels.find(l => l.id === newPO.wbsId);
    const result = costAccounts.map(ca => ({ 
      title: ca.title, 
      code: getFullWBSCode(ca.id, wbsLevels) || ca.code 
    }));
    if (selectedWBS?.type === 'Work Package') {
      result.push({ 
        title: selectedWBS.title, 
        code: getFullWBSCode(selectedWBS.id, wbsLevels) || selectedWBS.code 
      });
    }
    
    // Fallback to activities if no WBS Cost Accounts found (for backward compatibility)
    if (result.length === 0) {
      const filteredActivities = activities.filter(a => a.wbsId === newPO.wbsId);
      const uniqueDivisions = Array.from(new Set(filteredActivities.map(a => a.division).filter(Boolean)));
      return uniqueDivisions.map(div => ({ title: div, code: '' }));
    }
    
    // Ensure unique results by title
    const uniqueMap = new Map();
    result.forEach(item => uniqueMap.set(item.title, item));
    return Array.from(uniqueMap.values());
  }, [wbsLevels, activities, newPO.wbsId]);

  const availableWorkPackages = useMemo(() => {
    return wbsLevels
      .filter(l => l.type === 'Work Package')
      .map(l => ({ 
        id: l.id, 
        description: l.title, 
        code: getFullWBSCode(l.id, wbsLevels) || l.code 
      }));
  }, [wbsLevels]);

  const filteredActivities = useMemo(() => {
    if (!newPO.workPackageId) return [];
    const wp = wbsLevels.find(l => l.id === newPO.workPackageId);
    if (!wp) return [];
    return activities.filter(a => a.workPackage === wp.title);
  }, [activities, newPO.workPackageId, wbsLevels]);

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setView('detail');
  };

  const renderPODetail = () => {
    if (!selectedPO) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-[800px]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('list')}
              className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-900 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase flex items-center gap-3">
                Purchase Order Detail
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] rounded-lg tracking-widest not-italic font-bold">{selectedPO.id}</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official Procurement Record • {selectedPO.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleEditPO(selectedPO)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit Order
            </button>
            <button 
              onClick={() => window.print()}
              className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-xl"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-12 space-y-12">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
               <div className="flex items-center gap-2 text-blue-600">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Supplier Meta</span>
               </div>
               <div className="space-y-1">
                  <div className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedPO.supplier}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vendor Identification</div>
               </div>
            </div>
            
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
               <div className="flex items-center gap-2 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Financial Scope</span>
               </div>
               <div className="space-y-1">
                  <div className="text-xl font-black text-slate-900 font-mono tracking-tighter">{formatAmount(selectedPO.amount, baseCurrency)}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Committed Amount</div>
               </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl text-white space-y-4 shadow-xl">
               <div className="flex items-center gap-2 text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Governance Hub</span>
               </div>
               <div className="space-y-1">
                  <div className="text-xl font-black uppercase tracking-tight">{selectedPO.status}</div>
                  <div className="text-[10px] text-blue-300 font-bold uppercase tracking-widest opacity-60">Approval Status</div>
               </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Line Items (BOQ Breakdown)</h4>
              <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {selectedPO.lineItems?.length || 0} Total Aggregates
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-[0.2em] border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5">Description</th>
                    <th className="px-8 py-5 text-right">Quantity</th>
                    <th className="px-8 py-5">Unit</th>
                    <th className="px-8 py-5 text-right">Rate</th>
                    <th className="px-8 py-5 text-right">Total ({baseCurrency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPO.lineItems?.map((li: any, lidx: number) => (
                    <tr key={lidx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-800 italic">{li.description}</td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 tracking-tighter">{li.quantity?.toLocaleString()}</td>
                      <td className="px-8 py-6 text-slate-400 font-bold uppercase tracking-widest">{li.unit}</td>
                      <td className="px-8 py-6 text-right font-bold text-slate-600 font-mono">{formatAmount(li.inputRate || 0, baseCurrency)}</td>
                      <td className="px-8 py-6 text-right font-black text-blue-600 font-mono text-lg tracking-tighter">{formatAmount(li.amount || 0, baseCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
             <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Compliance & Contracts</h4>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Official Contract Number</div>
                      </div>
                      <div className="text-xs font-black text-blue-600 font-mono tracking-tighter">{selectedPO.contractNumber || 'NOT ASSOCIATED'}</div>
                   </div>
                   {selectedPO.contractDriveUrl && (
                     <a 
                       href={selectedPO.contractDriveUrl} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center justify-between p-5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] transition-transform"
                     >
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Download className="w-5 h-5" />
                         </div>
                         <div className="text-[11px] font-black uppercase tracking-widest">Download Contract PDF</div>
                       </div>
                       <ChevronRight className="w-5 h-5 opacity-60" />
                     </a>
                   )}
                </div>
             </div>
             
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Audit Logs</h4>
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                   <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>Last Updated: {selectedPO.updatedAt || selectedPO.date}</span>
                   </div>
                   <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                      <User className="w-4 h-4" />
                      <span>Authorizing Officer: System Administrator</span>
                   </div>
                   <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Digitally Encrypted & Verified</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPOForm = () => {
    const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedProject) return;

      const toastId = toast.loading('Uploading contract to Drive...');
      try {
        const division = newPO.masterFormat?.match(/DIV(\d+)/)?.[1] || '01';
        const finalName = generatePMISFileName({
          projectCode: selectedProject.code,
          type: 'CON',
          division: division,
          description: `PO_${newPO.code}_${newPO.description}`,
        }) + '.' + file.name.split('.').pop();

        const route = getRouteForFile('CON', division);
        
        const formData = new FormData();
        formData.append('file', file, finalName);
        formData.append('projectRootId', selectedProject.driveFolderId || '');
        formData.append('path', route);

        const response = await fetch('/api/drive/upload-by-path', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        const result = await response.json();
        
        setNewPO(prev => ({ 
          ...prev, 
          contractDriveUrl: `https://drive.google.com/file/d/${result.fileId}/view`,
          workflowStatus: requiresContract ? 'Pending Contract' : prev.workflowStatus
        }));
        
        toast.success('Contract uploaded and linked successfully', { id: toastId });
      } catch (error) {
        console.error('Contract upload error:', error);
        toast.error('Failed to upload contract. Please try again.', { id: toastId });
      }
    };

    return (
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

      <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
        {/* Step 1: Work Package & Activity Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Work Package</label>
            <select
              value={newPO.workPackageId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId === 'new') {
                  navigate('/page/work-packages');
                  return;
                }
                
                const wp = wbsLevels.find(l => l.id === selectedId);
                
                let parentId = '';
                let costAccountTitle = '';
                let wbsTopLevelId = '';

                if (wp && wp.type === 'Work Package') {
                  parentId = wp.parentId || '';
                  
                  // Find Cost Account (parent of Work Package)
                  const costAccount = wbsLevels.find(l => l.id === parentId);
                  if (costAccount) {
                    costAccountTitle = costAccount.title;
                    wbsTopLevelId = costAccount.parentId || '';
                  }
                }

                setNewPO(prev => ({ 
                  ...prev, 
                  workPackageId: selectedId,
                  activityId: '', // Reset activity when WP changes
                  wbsId: wbsTopLevelId,
                  masterFormat: costAccountTitle
                }));
                setIsAddingNewActivity(false);
              }}
              className="w-full bg-slate-50 border border-slate-200 p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none rounded-2xl shadow-sm hover:border-blue-200 transition-all text-slate-900"
            >
              <option value="">Select Work Package...</option>
              {availableWorkPackages.map(a => (
                <option key={a.id} value={a.id}>
                  📦 {a.code ? `${a.code} - ` : ''}{a.description}
                </option>
              ))}
              <option value="new" className="text-blue-600 font-bold">+ Add New Work Package...</option>
            </select>
            
            {newPO.masterFormat && (
              <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold w-fit">
                <Database className="w-3 h-3" />
                Linked Cost Account: {newPO.masterFormat}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Activity</label>
            <select
              value={isAddingNewActivity ? 'new' : (newPO.activityId || '')}
              disabled={!newPO.workPackageId}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  setIsAddingNewActivity(true);
                  setNewPO(prev => ({ ...prev, activityId: '' }));
                } else {
                  setIsAddingNewActivity(false);
                  setNewPO(prev => ({ ...prev, activityId: e.target.value }));
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none rounded-2xl shadow-sm hover:border-blue-200 transition-all text-slate-900"
            >
              <option value="">Select Activity...</option>
              {filteredActivities.map(a => (
                <option key={a.id} value={a.id}>⚡ {a.description}</option>
              ))}
              <option value="new" className="text-blue-600 font-bold">+ {t('create_new_activity')}...</option>
            </select>
          </div>
        </div>

        {/* Inline New Activity Form */}
        <AnimatePresence>
          {isAddingNewActivity && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-full mb-2">
                   <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                     <Sparkles className="w-4 h-4" />
                     Define New Activity under {wbsLevels.find(l => l.id === newPO.workPackageId)?.title}
                   </h4>
                </div>
                <div className="md:col-span-1 border-r border-blue-100 pr-4">
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Activity Name</label>
                  <input
                    type="text"
                    value={newActivityData.description || ''}
                    onChange={(e) => setNewActivityData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Concrete Pouring"
                    className="w-full bg-white border border-blue-200 p-2 text-xs font-bold rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Unit</label>
                  <input
                    type="text"
                    value={newActivityData.unit || ''}
                    onChange={(e) => setNewActivityData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="m3, ton..."
                    className="w-full bg-white border border-blue-200 p-2 text-xs font-bold rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Qty</label>
                  <input
                    type="number"
                    value={newActivityData.quantity}
                    onChange={(e) => {
                      const qty = parseFloat(e.target.value) || 0;
                      setNewActivityData(prev => ({ ...prev, quantity: qty, amount: qty * (prev.rate || 0) }));
                    }}
                    className="w-full bg-white border border-blue-200 p-2 text-xs font-bold rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Planned Rate</label>
                  <input
                    type="number"
                    value={newActivityData.rate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      setNewActivityData(prev => ({ ...prev, rate: rate, amount: (prev.quantity || 0) * rate }));
                    }}
                    className="w-full bg-white border border-blue-200 p-2 text-xs font-bold rounded-lg outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: PO Details */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">PO Code</label>
            <input
              type="text"
              value={newPO.id || ''}
              disabled={!!editingPOId}
              onChange={(e) => setNewPO(prev => ({ ...prev, id: e.target.value }))}
              placeholder="e.g. PO-2024-001"
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Order Date</label>
            <input
              type="date"
              value={newPO.date || ''}
              onChange={(e) => setNewPO(prev => ({ ...prev, date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Currency</label>
            <select
              value={newPO.inputCurrency || ''}
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
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            >
              <option value="USD">USD ($)</option>
              <option value="IQD">IQD (د.ع)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Exchange Rate</label>
            <input
              type="number"
              value={newPO.exchangeRateUsed || 0}
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
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Actual Start</label>
            <input
              type="date"
              value={newPO.actualStartDate || ''}
              onChange={(e) => setNewPO(prev => ({ ...prev, actualStartDate: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Actual Finish</label>
            <input
              type="date"
              value={newPO.actualFinishDate || ''}
              onChange={(e) => setNewPO(prev => ({ ...prev, actualFinishDate: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{t('supplier')}</label>
            <select
              value={newPO.supplier || ''}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  navigate('/page/companies');
                  return;
                }
                setNewPO(prev => ({ ...prev, supplier: e.target.value }));
              }}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
            >
              <option value="">{t('select_supplier')}...</option>
              {allAvailableSuppliers.map(sName => (
                <option key={sName} value={sName}>{sName}</option>
              ))}
              <option value="new" className="text-blue-600 font-medium">+ {t('add_supplier')}...</option>
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
                    value={item.description || ''}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Qty</label>
                  <input
                    type="number"
                    value={item.quantity || 0}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Unit</label>
                  <input
                    type="text"
                    value={item.unit || ''}
                    onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Rate</label>
                  <input
                    type="number"
                    value={item.inputRate || 0}
                    onChange={(e) => updateLineItem(item.id, 'inputRate', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Amount ({baseCurrency})</label>
                  <div className={cn(
                    "w-full bg-slate-100 p-2 text-xs font-bold border border-slate-200 rounded-lg",
                    getAmountColor(item.amount)
                  )}>
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

        {/* Contract & Documentation Section */}
        <div className={cn(
          "space-y-6 pt-6 border-t transition-all",
          requiresContract ? "border-rose-200 bg-rose-50/20 p-6 rounded-3xl" : 
          requiresAgreement ? "border-amber-200 bg-amber-50/20 p-6 rounded-3xl" : "border-slate-100"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn("w-5 h-5", requiresContract ? "text-rose-500" : requiresAgreement ? "text-amber-500" : "text-blue-500")} />
              <h4 className="text-sm font-bold text-slate-900">Contract & Documentation</h4>
              {requiresContract && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-semibold uppercase rounded animate-pulse">
                  Official Contract Required ({'>'}15M IQD)
                </span>
              )}
              {!requiresContract && requiresAgreement && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase rounded">
                  Agreement Required ({'>'}3M IQD)
                </span>
              )}
            </div>
          </div>

          {(requiresAgreement || requiresContract) && !newPO.contractDriveUrl && (
            <div className={cn(
              "p-4 rounded-xl flex items-start gap-3 border",
              requiresContract ? "bg-rose-100 border-rose-200 text-rose-800" : "bg-amber-100 border-amber-200 text-amber-800"
            )}>
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold mb-1">Financial Logic Gate Active</p>
                <p>This PO value ({formatAmount(totalPOAmount, baseCurrency)}) exceeds the {requiresContract ? '15,000,000' : '3,000,000'} IQD threshold. 
                   Please upload the {requiresContract ? 'Official Contract' : 'Agreement'} to proceed.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Contract Number</label>
              <input
                type="text"
                value={newPO.contractNumber || ''}
                onChange={(e) => setNewPO(prev => ({ ...prev, contractNumber: e.target.value }))}
                placeholder="e.g. PMIS-CONT-2024-042"
                className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Quick Upload</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 rounded-xl transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs font-bold">Upload to Drive</span>
                  <input type="file" className="hidden" onChange={handleContractUpload} accept=".pdf,.doc,.docx" />
                </label>
                {newPO.contractDriveUrl && (
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Contract PDF Link (Drive)</label>
              <div className="relative">
                <input
                  type="url"
                  value={newPO.contractDriveUrl || ''}
                  onChange={(e) => setNewPO(prev => ({ ...prev, contractDriveUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl pr-10"
                />
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Contract Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newPO.contractDuration || ''}
                  onChange={(e) => setNewPO(prev => ({ ...prev, contractDuration: parseInt(e.target.value) || 0 }))}
                  placeholder="Days"
                  className="flex-1 bg-white border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
                />
                <select
                  value={newPO.contractDurationType || 'Calendar Days'}
                  onChange={(e) => setNewPO(prev => ({ ...prev, contractDurationType: e.target.value as any }))}
                  className="w-32 bg-white border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none rounded-xl"
                >
                  <option value="Calendar Days">Calendar Days</option>
                  <option value="Work Days">Work Days</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Contract PDF Link (Drive)</label>
              <div className="relative">
                <input
                  type="url"
                  value={newPO.contractDriveUrl || ''}
                  onChange={(e) => setNewPO(prev => ({ ...prev, contractDriveUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl pr-10"
                />
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Scope of Work (Google Doc)</label>
              <div className="relative">
                <input
                  type="url"
                  value={newPO.sowUrl || ''}
                  onChange={(e) => setNewPO(prev => ({ ...prev, sowUrl: e.target.value }))}
                  placeholder="https://docs.google.com/..."
                  className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl pr-10"
                />
                <Database className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Change Orders Link</label>
              <div className="relative">
                <input
                  type="url"
                  value={newPO.changeOrdersUrl || ''}
                  onChange={(e) => setNewPO(prev => ({ ...prev, changeOrdersUrl: e.target.value }))}
                  className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none rounded-xl pr-10"
                />
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        {newPO.history && newPO.history.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change History</label>
            </div>
            <div className="space-y-3">
              {newPO.history.slice().reverse().map((activity) => (
                <div key={activity.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase">
                        {activity.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{activity.userName}</div>
                        <div className="text-[10px] text-slate-500">{activity.action}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {activity.changes && activity.changes.length > 0 && (
                    <div className="mt-2 space-y-1 pl-8">
                      {activity.changes.map((change, cidx) => (
                        <div key={cidx} className="text-[10px] text-slate-600 flex items-center gap-2">
                          <span className="font-bold uppercase text-slate-400">{change.field}:</span>
                          <span className="line-through text-slate-300">{typeof change.old === 'number' ? formatAmount(change.old, baseCurrency) : change.old}</span>
                          <ChevronRight className="w-2 h-2 text-slate-300" />
                          <span className="font-bold text-blue-600">{typeof change.new === 'number' ? formatAmount(change.new, baseCurrency) : change.new}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 flex gap-1.5 items-center z-50">
        <button
          onClick={() => setView('list')}
          className="px-3 py-2 bg-white text-slate-600 text-[10px] font-bold shadow-2xl hover:bg-slate-50 border border-slate-200 transition-all rounded-xl flex items-center gap-1.5 group"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Cancel
        </button>
        <button
          onClick={handleSavePO}
          disabled={!newPO.id || !newPO.supplier || (!newPO.activityId && !newPO.workPackageId)}
          className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          {editingPOId ? 'Update PO' : 'Save PO'}
        </button>
      </div>
    </motion.div>
    );
  };

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
            <h3 className="text-2xl font-bold text-slate-900">Standard Purchase Order Tracking</h3>
            <p className="text-slate-500">Summery of Work Form - Payment Certificate</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-600">Date: 25/03/2026</div>
            <div className="text-xs text-slate-400">Ref: ZARYA-PC-003</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('supplier_name')}:</span> <span className="font-semibold">Wasta Noory Restaurant</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('po_number')}:</span> <span className="font-semibold">COS003853</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('project_name')}:</span> <span className="font-semibold">Villa 2</span></div>
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
                <th className="px-4 py-2 text-right">Cost Account Qty</th>
                <th className="px-4 py-2 text-right">Cost Account Amount</th>
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
              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Global Project Limit</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">${globalLimit.toLocaleString('en-US')}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">USD (Synced from PMP)</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest mb-2">
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
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total Committed</h4>
          <div className="text-2xl font-semibold tracking-tight text-emerald-400">
            {formatAmount(totalCommitted, baseCurrency)}
          </div>
        </div>
        </div>

        {/* Financial Summary & Comparison Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Plan vs. Actual (Execution)</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Comparison per Work Package</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Work Package</th>
                    <th className="px-6 py-4 text-right">BOQ Planned</th>
                    <th className="px-6 py-4 text-right">PO Committed</th>
                    <th className="px-6 py-4 text-right">Variance</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wbsLevels.filter(l => l.type === 'Work Package').map(wp => {
                    const planned = boqItems
                      .filter(item => item.workPackage === wp.title)
                      .reduce((sum, item) => sum + item.amount, 0);
                    
                    const actualCommited = pos
                      .filter(po => po.workPackageId === wp.id)
                      .reduce((sum, po) => sum + po.amount, 0);
                    
                    const variance = planned - actualCommited;
                    const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;
                    
                    return (
                      <tr key={wp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{wp.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono italic">{getFullWBSCode(wp.id, wbsLevels)}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">
                          {formatAmount(planned, baseCurrency)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-blue-600">
                          {formatAmount(actualCommited, baseCurrency)}
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-mono font-bold",
                          variance < 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {formatAmount(variance, baseCurrency)}
                          <div className="text-[10px] opacity-70">
                            {variancePercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest",
                            actualCommited === 0 ? "bg-slate-100 text-slate-500" :
                            variance < 0 ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {actualCommited === 0 ? 'Not Started' :
                             variance < 0 ? 'Over Budget' : 'Within Budget'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-white/5">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Financial Summary
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total Committed (POs)</div>
                  <div className="text-2xl font-semibold text-blue-400">
                    {formatAmount(totalCommitted, baseCurrency)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">Items Paid</div>
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

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-bold text-slate-800">Critical Alerts</h3>
              </div>
              <div className="space-y-3">
                {items.filter(i => (i.previousQty + i.currentQty) / i.totalQty > 0.8).map((item, idx) => (
                  <div key={idx} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
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
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Budget healthy</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImportView = () => (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase">Import Purchase Orders</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Upload CSV or Excel files to bulk import PO data</p>
          </div>
        </div>
        <button 
          onClick={() => setView('list')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
      <div className="p-8">
        <DataImportModal 
          isOpen={true}
          onClose={() => setView('list')}
          onImport={handleImportPOData}
          targetColumns={poTargetColumns}
          title="Import Purchase Orders"
          entityName="Purchase Orders"
        />
      </div>
    </div>
  );

  const renderPreviewView = () => {
    if (!previewPOs) return null;
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight">AI Analysis Preview</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Verify extracted Purchase Orders before importing</p>
            </div>
          </div>
          <button 
            onClick={() => setView('list')}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {previewPOs.map((po, idx) => (
            <div key={`${po.id}-${idx}`} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PO Number</div>
                    <div className="text-sm font-black text-blue-600 tracking-tighter italic">{po.id}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('supplier')}</div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                       {po.supplier}
                       <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-sm font-black uppercase">Neural Auto-Link</span>
                    </div>
                  </div>
                  {po.buyFromPartner && (
                    <div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Partner Code</div>
                      <div className="text-sm font-bold text-slate-500 font-mono">{po.buyFromPartner}</div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Amount</div>
                  <div className="text-lg font-black text-slate-900 font-mono tracking-tighter">{formatAmount(po.amount, baseCurrency)}</div>
                </div>
              </div>
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white border-b border-slate-100 text-slate-400 font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Qty</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4 text-right">Rate</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {po.lineItems.map((li, lidx) => (
                    <tr key={`${li.description}-${lidx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 italic">{li.description}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{li.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500 uppercase font-bold tracking-widest">{li.unit}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">{formatAmount(li.rate, baseCurrency)}</td>
                      <td className="px-6 py-4 text-right font-black text-blue-600 font-mono">{formatAmount(li.amount, baseCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            onClick={() => setView('list')}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirmImport}
            className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Import Data
          </button>
        </div>
      </div>
    );
  };

  const renderPOLog = () => {
    return (
      <div className="relative group/polog">
        <POMigrationModal 
          isOpen={isMigrationModalOpen} 
          onClose={() => setIsMigrationModalOpen(false)}
          pos={pos}
          wbsLevels={wbsLevels}
          costCenters={costCenters}
        />
        {selectedPO && (
          <LogProgressModal 
            isOpen={!!selectedPO}
            onClose={() => setSelectedPO(null)}
            po={selectedPO}
          />
        )}
        <div className="absolute top-0 right-0 p-4 z-10 pointer-events-none opacity-0 group-hover/polog:opacity-100 transition-opacity">
          <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Glassmorphism Mode Active
          </div>
        </div>

        <UniversalDataTable 
          config={{
            ...poConfig,
            columns: poConfig.columns.map(col => {
              if (col.key === 'id') {
                return {
                  ...col,
                  render: (val: string, row: any) => (
                    <div className="relative group/po-id">
                      <div className="font-mono font-bold text-blue-600 cursor-help hover:underline decoration-blue-200 underline-offset-4">
                        {val}
                      </div>
                      {/* Hover Intelligence Popover */}
                      <div className="absolute left-full top-0 ml-4 w-64 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 opacity-0 group-hover/po-id:opacity-100 pointer-events-none transition-all scale-95 group-hover/po-id:scale-100 origin-left">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Neural Intelligence</div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                              <div className="text-[8px] text-slate-500 uppercase">Supplier</div>
                              <div className="text-xs text-white font-bold truncate">{row.supplier}</div>
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                              <div className="text-[8px] text-slate-500 uppercase">Partner Code</div>
                              <div className="text-xs text-white font-bold">{row.buyFromPartner || row.buy_from_partner || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-brand/10 rounded-xl border border-brand/20">
                            <div className="text-[8px] text-brand uppercase mb-1">Impact Analysis</div>
                            <div className="text-[10px] text-white leading-relaxed">
                              This order covers <span className="font-bold text-brand">{row.lineItems?.length || 0}</span> items in <span className="font-bold">{row.masterFormat || 'Global'}</span> division. 
                              Status: <span className="text-emerald-400 font-bold">{row.workflowStatus || row.status}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                              <Database className="w-3 h-3 text-blue-400" />
                            </div>
                            <div className="text-[9px] text-slate-400">Drive Folder: <span className="text-blue-400">Villa-2/Suppliers/{row.supplier}</span></div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedPO(row); }}
                            className="w-full mt-3 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Log Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }
              }
              return col;
            })
          }}
          data={poTableData}
          onRowClick={(po) => handleViewPO(po)}
          onNewClick={() => {
            setNewPO({
              id: '',
              date: new Date().toISOString().split('T')[0],
              supplier: '',
              buyFromPartner: '',
              wbsId: '',
              masterFormat: '',
              activityId: '',
              lineItems: [],
              contractNumber: '',
              contractDuration: 0,
              contractDurationType: 'Calendar Days',
              contractDriveUrl: '',
              changeOrdersUrl: '',
              sowUrl: ''
            });
            setEditingPOId(null);
            setView('form');
          }}
          onDeleteRecord={handleDeleteRecord}
          onBulkDelete={handleBulkDeleteAction}
          title="Intelligent Vendor Ecosystem Log"
          favoriteControl={
            <div className="flex gap-2">
              <button 
                onClick={() => setView('import')}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all cursor-pointer border border-blue-100"
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {isAnalyzing ? 'Neural Syncing...' : 'Import Data'}
              </button>
              <button 
                onClick={() => setIsMigrationModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-all cursor-pointer border border-amber-100"
              >
                <AlertTriangle className="w-3 h-3" />
                Fix Orphaned POs
              </button>
            </div>
          }
        />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-2 mb-8">
         <div className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">SYSTEM: ACTIVE</div>
         <div className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-500/20">LIVE SYNC</div>
      </div>

      {page.id === '4.2.3' && renderPaymentCertificate()}
      {page.id === '4.2.4' && renderCumulativeTracking()}
      {page.id === '4.2.5' && renderDashboard()}
      {(page.id === '4.2.6' || page.id === '3.4.3') && (
        view === 'list' ? renderPOLog() : 
        view === 'form' ? renderPOForm() :
        view === 'import' ? renderImportView() :
        view === 'detail' ? renderPODetail() :
        renderPreviewView()
      )}



      <AnimatePresence>
        {/* Modals removed for full-page views */}
      </AnimatePresence>
    </div>
  );
};
