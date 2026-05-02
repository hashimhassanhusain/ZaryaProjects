import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParent, masterFormatDivisions } from '../data';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder, Supplier, WorkPackage } from '../types';
import { toast } from 'react-hot-toast';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { ActivityListView } from './ActivityListView';
import { 
  Calendar, Clock, Database, ChevronRight, ChevronDown,
  Loader2, Edit2, Search, Filter, Download, Upload,
  BarChart3, DollarSign, CheckCircle2, AlertCircle,
  ArrowRight, Link2, Plus, MoreHorizontal,
  ZoomIn, ZoomOut, ShoppingCart, TrendingUp, Target, Package, List,
  Building, Layers, MapPin, Zap, Cog, Droplets, Palette, HardHat, Mountain, Boxes, DraftingCompass
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn, formatCurrency, stripNumericPrefix } from '../lib/utils';
import { rollupToParent } from '../services/rollupService';
import { HelpTooltip } from './HelpTooltip';

import { useLanguage } from '../context/LanguageContext';
import { loadArabicFont } from '../lib/pdfUtils';
import { AddWBSLevelModal } from './AddWBSLevelModal';
import { DataImportModal } from './DataImportModal';

interface ProjectScheduleViewProps {
  page: Page;
  initialTab?: ScheduleTab;
  hideHeader?: boolean;
}

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';
type ScheduleTab = 'gantt' | 'activities' | 'milestones';
type ViewLevel = 'wbs' | 'costaccount' | 'workpackage' | 'po' | 'poitem';

const getWbsIcon = (type: string, size: string = "w-3.5 h-3.5", name: string = "") => {
  const n = name.toLowerCase();
  
  if (type === 'Division' || type === 'Cost Account') {
    if (n.includes('concrete')) return <Boxes className={cn(size, "text-orange-900 mr-2")} />;
    if (n.includes('electrical')) return <Zap className={cn(size, "text-yellow-500 mr-2")} />;
    if (n.includes('mechanical')) return <Cog className={cn(size, "text-blue-600 mr-2")} />;
    if (n.includes('plumbing') || n.includes('sanitary')) return <Droplets className={cn(size, "text-sky-500 mr-2")} />;
    if (n.includes('finishes') || n.includes('painting')) return <Palette className={cn(size, "text-pink-500 mr-2")} />;
    if (n.includes('site') || n.includes('excavation')) return <Mountain className={cn(size, "text-amber-700 mr-2")} />;
    if (n.includes('masonry') || n.includes('block')) return <HardHat className={cn(size, "text-orange-500 mr-2")} />;
    return <Database className={cn(size, "text-blue-500 mr-2")} />;
  }

  if (type === 'Work Package') {
    if (n.includes('design')) return <DraftingCompass className={cn(size, "text-indigo-500 mr-2")} />;
    if (n.includes('procurement')) return <ShoppingCart className={cn(size, "text-emerald-500 mr-2")} />;
    return <Package className={cn(size, "text-teal-500 mr-2")} />;
  }

  switch (type) {
    case 'Zone': return <Target className={cn(size, "text-purple-500 mr-2")} />;
    case 'Area': return <MapPin className={cn(size, "text-sky-500 mr-2")} />;
    case 'Building': return <Building className={cn(size, "text-emerald-500 mr-2")} />;
    case 'Floor': return <Layers className={cn(size, "text-orange-400 mr-2")} />;
    default: return <Database className={cn(size, "text-slate-400 mr-2")} />;
  }
};

const SortableHeader: React.FC<{
  id: string;
  label: string;
  width: number;
  align?: 'right' | 'center';
  onResize: (id: string) => void;
}> = ({ id, label, width, align, onResize }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest h-full flex items-center relative group cursor-grab active:cursor-grabbing hover:bg-slate-100/50 transition-colors",
        align === 'right' ? "justify-end text-right" : "justify-center text-center"
      )}
    >
      {label}
      <div 
        onMouseDown={(e) => { e.stopPropagation(); onResize(id); }}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-10"
      />
    </div>
  );
};

export const ProjectScheduleView: React.FC<ProjectScheduleViewProps> = ({ page, initialTab, hideHeader = false }) => {
  const { selectedProject, scheduleState, setScheduleState } = useProject();
  const navigate = useNavigate();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ScheduleTab>(initialTab || 'gantt');
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  const { expandedWbs, expandedActivities, zoomLevel, viewLevel, visibleColumns, columnOrder } = scheduleState;

  const setExpandedWbs = (updater: any) => {
    setScheduleState(prev => ({
      ...prev,
      expandedWbs: typeof updater === 'function' ? updater(prev.expandedWbs) : updater
    }));
  };

  const setExpandedActivities = (updater: any) => {
    setScheduleState(prev => ({
      ...prev,
      expandedActivities: typeof updater === 'function' ? updater(prev.expandedActivities) : updater
    }));
  };

  const setZoomLevel = (val: ZoomLevel) => setScheduleState(prev => ({ ...prev, zoomLevel: val }));
  const setViewLevel = (val: ViewLevel) => setScheduleState(prev => ({ ...prev, viewLevel: val }));
  const setVisibleColumns = (updater: any) => {
    setScheduleState(prev => ({
      ...prev,
      visibleColumns: typeof updater === 'function' ? updater(prev.visibleColumns) : updater
    }));
  };
  const setColumnOrder = (newOrder: string[]) => setScheduleState(prev => ({ ...prev, columnOrder: newOrder }));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex));
    }
  };

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { t, th, isRtl, language } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  const [activityColWidth, setActivityColWidth] = useState(350);
  const [isResizingCol, setIsResizingCol] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    activityWbs: 250,
    plannedStart: 100,
    actualStart: 100,
    plannedDuration: 80,
    actualDuration: 80,
    plannedFinish: 100,
    actualFinish: 100,
    progress: 80,
    status: 90,
    supplier: 150,
    plannedCost: 100,
    poCost: 100,
    actualCost: 100
  });
  const [vendors, setVendors] = useState<Supplier[]>([]);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Refs for scrolling and dependency lines
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const milestones = useMemo(() => activities.filter(a => a.activityType === 'Milestone'), [activities]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, source: 'left' | 'right') => {
    if (source === 'left' && rightPanelRef.current) {
      rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    } else if (source === 'right' && leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const getCostCompletion = useCallback((activity: Activity): number => {
    const linkedPOs = purchaseOrders.filter(p => p.activityId === activity.id);
    if (linkedPOs.length === 0) return 0; // No PO = 0% always
    
    const bac = activity.plannedCost || activity.amount || 0;
    if (bac === 0) return 0;
    
    const ev = linkedPOs.reduce((sum, po) => {
      return sum + (po.lineItems?.reduce((s, li) => s + (li.amount * (li.completion || 0) / 100), 0)
        ?? (po.amount * (po.completion || 0) / 100));
    }, 0);
    
    return Math.min(100, Math.round((ev / bac) * 100));
  }, [purchaseOrders]);

  const getTimeCompletion = useCallback((activity: Activity): number => {
    const today = new Date();
    
    if (activity.actualFinishDate) return 100;
    
    // Actual Start = first linked PO date (not planned start)
    const linkedPOs = purchaseOrders.filter(p => p.activityId === activity.id);
    const actualStart = linkedPOs.length > 0
      ? linkedPOs.reduce((min, p) => (!min || (p.date && p.date < min) ? p.date : min), '')
      : activity.actualStartDate || '';

    const plannedStart = activity.startDate || activity.actualStartDate || '';
    const plannedFinish = activity.finishDate || '';
    
    if (!plannedStart || !plannedFinish) return 0;
    
    const start = new Date(plannedStart);
    const finish = new Date(plannedFinish);
    const totalDuration = finish.getTime() - start.getTime();
    
    if (totalDuration <= 0) return 0;
    if (today < start) return 0;
    if (today > finish) return 99; // Overdue but not closed = 99%
    
    return Math.max(0, Math.min(99, Math.round(((today.getTime() - start.getTime()) / totalDuration) * 100)));
  }, [purchaseOrders]);

  const getProgress = useCallback((activity: Activity) => getCostCompletion(activity), [getCostCompletion]);

  const getPoActualCost = useCallback((po: PurchaseOrder): number => {
    return po.lineItems?.reduce((sum, li) => sum + (li.amount * (li.completion || 0) / 100), 0) || (po.amount * (po.completion || 0) / 100);
  }, []);

  const getActivityActualCost = useCallback((act: Activity): number => {
    const linkedPOs = purchaseOrders.filter(p => p.activityId === act.id);
    if (linkedPOs.length > 0) {
      return linkedPOs.reduce((sum, p) => sum + getPoActualCost(p), 0);
    }
    // Fallback to progress based on planned cost
    return (getProgress(act) / 100) * (act.plannedCost || act.amount || 0);
  }, [purchaseOrders, getPoActualCost, getProgress]);

  const getWbsActivities = useCallback((wbs: WBSLevel) => {
    return activities.filter(a => {
      if (wbs.type === 'Division' || wbs.type === 'Cost Account') {
        // Direct link via ID
        if (a.divisionId === wbs.id || a.wbsId === wbs.id) return true;
        // Adoption logic: if activity has no wbsId/divisionId but matches this division's code
        const divCode = wbs.divisionCode || wbs.code;
        const actDiv = a.division || '01';
        return !a.wbsId && !a.divisionId && actDiv === divCode;
      }
      
      // For other levels (Building, Floor, etc.)
      // Only show if it belongs specifically to this WBS node and has no divisionId.
      // If it has a divisionId, it will be rendered by its respective Division node.
      return a.wbsId === wbs.id && !a.divisionId;
    });
  }, [activities]);

  const calculateWbsCosts = useCallback((wbsId: string): { planned: number; po: number; actual: number } => {
    const wbs = wbsLevels.find(w => w.id === wbsId);
    if (!wbs) return { planned: 0, po: 0, actual: 0 };

    const wbsActivities = getWbsActivities(wbs);
    const wbsDirectPOs = purchaseOrders.filter(p => p.wbsId === wbsId && !p.activityId);
    const children = wbsLevels.filter(w => w.parentId === wbsId);

    let planned = wbsActivities.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0) + 
                 wbsDirectPOs.reduce((sum, p) => sum + p.amount, 0);
    let poTotal = wbsActivities.reduce((sum, a) => sum + purchaseOrders.filter(p => p.activityId === a.id).reduce((s, p) => s + p.amount, 0), 0) + 
                 wbsDirectPOs.reduce((sum, p) => sum + p.amount, 0);
    let actual = wbsActivities.reduce((sum, a) => sum + (purchaseOrders.filter(p => p.activityId === a.id).reduce((s, p) => s + (p.amount * (p.completion || 0) / 100), 0) || (getProgress(a) / 100 * (a.plannedCost || a.amount || 0))), 0) + 
                wbsDirectPOs.reduce((sum, p) => sum + (p.amount * (p.completion || 0) / 100), 0);

    children.forEach(child => {
      const childCosts = calculateWbsCosts(child.id);
      planned += childCosts.planned;
      poTotal += childCosts.po;
      actual += childCosts.actual;
    });

    return { planned, po: poTotal, actual };
  }, [wbsLevels, activities, purchaseOrders, getWbsActivities, getProgress]);

  const calculateWbsProgress = useCallback((wbsId: string): number => {
    const wbs = wbsLevels.find(w => w.id === wbsId);
    if (!wbs) return 0;

    const wbsActivities = getWbsActivities(wbs);
    const wbsDirectPOs = purchaseOrders.filter(p => p.wbsId === wbsId && !p.activityId);
    const children = wbsLevels.filter(w => w.parentId === wbsId);
    
    let totalValue = wbsActivities.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0) + 
                    wbsDirectPOs.reduce((sum, p) => sum + p.amount, 0);
    
    let weightedProgress = wbsActivities.reduce((sum, a) => sum + ((a.plannedCost || a.amount || 0) * getProgress(a)), 0) + 
                          wbsDirectPOs.reduce((sum, p) => sum + (p.amount * (p.completion || 0)), 0);

    children.forEach(child => {
      const childCosts = calculateWbsCosts(child.id);
      const childProgress = calculateWbsProgress(child.id);
      totalValue += childCosts.planned;
      weightedProgress += childCosts.planned * childProgress;
    });

    return totalValue > 0 ? Math.round(weightedProgress / totalValue) : 0;
  }, [wbsLevels, purchaseOrders, getWbsActivities, calculateWbsCosts, getProgress]);

  // Weighted Cost Completion rollup (weight = plannedCost)
  const calculateWbsCostCompletion = useCallback((wbsId: string): number => {
    const wbs = wbsLevels.find(w => w.id === wbsId);
    if (!wbs) return 0;

    const wbsActs = getWbsActivities(wbs);
    const wbsPOs = purchaseOrders.filter(p => p.wbsId === wbsId && !p.activityId);
    const children = wbsLevels.filter(w => w.parentId === wbsId);
    
    let totalWeight = wbsActs.reduce((s, a) => s + (a.plannedCost || a.amount || 0), 0)
                    + wbsPOs.reduce((s, p) => s + p.amount, 0);
    let weightedEV = wbsActs.reduce((s, a) => s + (a.plannedCost || a.amount || 0) * getCostCompletion(a), 0)
                   + wbsPOs.reduce((s, p) => s + p.amount * (p.completion || 0), 0);
    
    children.forEach(child => {
      const childCosts = calculateWbsCosts(child.id);
      const childPct = calculateWbsCostCompletion(child.id);
      totalWeight += childCosts.planned;
      weightedEV += childCosts.planned * childPct;
    });
    
    return totalWeight > 0 ? Math.round(weightedEV / totalWeight) : 0;
  }, [wbsLevels, purchaseOrders, getWbsActivities, getCostCompletion, calculateWbsCosts]);

  // Weighted Time Completion rollup (weight = plannedDuration)
  const calculateWbsTimeCompletion = useCallback((wbsId: string): number => {
    const wbs = wbsLevels.find(w => w.id === wbsId);
    if (!wbs) return 0;

    const wbsActs = getWbsActivities(wbs);
    const children = wbsLevels.filter(w => w.parentId === wbsId);
    
    let totalDur = 0, weightedTime = 0;
    wbsActs.forEach(a => {
      const dur = a.duration || 0;
      totalDur += dur;
      weightedTime += dur * getTimeCompletion(a);
    });
    children.forEach(child => {
      const allChildActs = collectAllDescendantActivities(child.id, wbsLevels, activities);
      const span = calcDateSpan(allChildActs);
      const dur = span.duration;
      totalDur += dur;
      weightedTime += dur * calculateWbsTimeCompletion(child.id);
    });
    
    return totalDur > 0 ? Math.round(weightedTime / totalDur) : 0;
  }, [wbsLevels, activities, getWbsActivities, getTimeCompletion]);

  // SPI = Cost% / Time%
  const calculateSPI = useCallback((wbsId: string): number => {
    const time = calculateWbsTimeCompletion(wbsId);
    if (time === 0) return 1;
    return Math.round((calculateWbsCostCompletion(wbsId) / time) * 100) / 100;
  }, [calculateWbsTimeCompletion, calculateWbsCostCompletion]);

  const calculateCostAccountProgress = useCallback((divActivities: Activity[]) => {
    const totalAmount = divActivities.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0);
    const weightedProgress = divActivities.reduce((sum, a) => sum + ((a.plannedCost || a.amount || 0) * getProgress(a)), 0);
    return totalAmount > 0 ? Math.round(weightedProgress / totalAmount) : 0;
  }, [getProgress]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingCol && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        if (newWidth > 150 && newWidth < 1600) {
          setActivityColWidth(newWidth);
        }
      } else if (resizingColumn) {
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: Math.max(50, prev[resizingColumn] + e.movementX)
        }));
      }
    };

    const handleMouseUp = () => {
      setIsResizingCol(false);
      setResizingColumn(null);
    };

    if (isResizingCol || resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingCol]);

  useEffect(() => {
    if (!selectedProject) return;

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
        setLoading(false);
      }
    );

    const poUnsubscribe = onSnapshot(
      query(collection(db, 'purchaseOrders'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      }
    );

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const wpUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id), where('type', '==', 'Work Package')),
      (snapshot) => {
        setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      }
    );

    const vendorUnsubscribe = onSnapshot(
      query(collection(db, 'companies'), where('type', '==', 'Supplier')),
      (snapshot) => {
        setVendors(snapshot.docs.map(d => ({ 
          id: d.id, 
          name: d.data().name,
          vendorCode: d.data().supplierCode || '',
          discipline: d.data().discipline || '',
          status: d.data().status === 'Active' ? 'Active' : 'Contract Ended',
          contactDetails: {
            address: d.data().address || '',
            phone: d.data().phone || '',
            email: d.data().email || ''
          },
          projectId: selectedProject.id
        } as Supplier)));
      }
    );

    return () => {
      actUnsubscribe();
      wbsUnsubscribe();
      poUnsubscribe();
      boqUnsubscribe();
      wpUnsubscribe();
      vendorUnsubscribe();
    };
  }, [selectedProject]);

  const activityTargetColumns = [
    { key: 'divisionId', label: 'Division ID', required: true, description: 'MasterFormat Division (e.g., 01, 09)' },
    { key: 'workPackage', label: 'Work Package', required: true, description: 'Work Package Name' },
    { key: 'description', label: 'Activity Description', required: true },
    { key: 'unit', label: 'Unit', description: 'm3, m2, ton, LS' },
    { key: 'quantity', label: 'Quantity', required: true, type: 'number' as const },
    { key: 'rate', label: 'Unit Rate', type: 'number' as const },
    { key: 'startDate', label: 'Start Date', type: 'date' as const },
    { key: 'finishDate', label: 'Finish Date', type: 'date' as const },
    { key: 'status', label: 'Status', description: 'Planned, In Progress, Completed' },
    { key: 'percentComplete', label: 'Progress %', type: 'number' as const },
  ];

  const handleImportActivityData = async (mappedData: any[]) => {
    if (!selectedProject) return;
    setIsImporting(true);
    let successCount = 0;
    
    try {
      for (const item of mappedData) {
        const id = crypto.randomUUID();
        const amount = (item.quantity || 0) * (item.rate || 0);

        const activityData: Activity = {
          id,
          projectId: selectedProject.id,
          wbsId: item.wbsId || '',
          divisionId: item.divisionId || '',
          workPackage: item.workPackage || '',
          description: item.description || '',
          unit: item.unit || 'LS',
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          amount: amount,
          status: item.status || 'Not Started',
          percentComplete: parseFloat(item.percentComplete) || 0,
          startDate: item.startDate || '',
          finishDate: item.finishDate || '',
          activityType: item.activityType || 'Task',
          boqItemId: item.boqItemId || '',
          division: item.division || '',
          poId: item.poId || '',
          poLineItemId: item.poLineItemId || ''
        };

        await setDoc(doc(db, 'activities', id), activityData);
        successCount++;
      }
      toast.success(`Successfully imported ${successCount} activities.`);
    } catch (err) {
      console.error("Error importing activities:", err);
      toast.error("Failed to import some activities.");
    } finally {
      setIsImporting(false);
    }
  };

  const generateFromBOQ = async () => {
    if (!selectedProject || boqItems.length === 0) return;
    setIsGenerating(true);

    try {
      for (const item of boqItems) {
        const existing = activities.find(a => a.description === item.description && a.workPackage === item.workPackage);
        if (existing) continue;

        let divisionCode = item.division?.match(/\d+/)?.[0] || '01';
        
        // If division name matches master format but has no digits, try to find it
        if (!item.division?.match(/\d+/) && item.division) {
          const matchedDiv = masterFormatDivisions.find(d => 
            item.division!.toLowerCase().includes(d.title.toLowerCase())
          );
          if (matchedDiv) divisionCode = matchedDiv.id;
        }

        const floorId = item.wbsId || '';
        
    // Manual WBS only - don't auto-create cost account nodes
    const divisionId = floorId ? `${floorId}-${divisionCode}` : '';

        const activity: Activity = {
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          wbsId: floorId,
          divisionId: divisionId,
          workPackage: item.workPackage,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          division: divisionCode,
          status: 'Not Started',
          percentComplete: 0
        };
        await setDoc(doc(db, 'activities', activity.id), activity);
        
        // Trigger rollup from workPackage level
        if (divisionId) {
          const divisionSnap = await getDoc(doc(db, 'wbs', divisionId));
          if (divisionSnap.exists()) {
            await rollupToParent('workPackage', divisionId);
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    } finally {
      setIsGenerating(false);
    }
  };

  const getDateColor = (actual: string | undefined, planned: string | undefined) => {
    if (!actual || !planned || actual === '-' || planned === 'TBD') return 'text-slate-500';
    const aDate = new Date(actual);
    const pDate = new Date(planned);
    return aDate <= pDate ? 'text-emerald-600' : 'text-orange-500';
  };

  const getDurationColor = (actual: number | undefined, planned: number | undefined) => {
    if (actual === undefined || planned === undefined) return 'text-slate-500';
    return actual <= planned ? 'text-emerald-600' : 'text-red-500';
  };

  const getCostColor = (actual: number | undefined, planned: number | undefined) => {
    if (actual === undefined || planned === undefined) return 'text-slate-900';
    return actual <= planned ? 'text-emerald-600' : 'text-red-500';
  };

  const renderBar = (activity: Activity) => {
    if (!activity.startDate || !activity.finishDate) return null;
    
    const startOffset = getDayOffset(activity.startDate);
    const duration = Math.max(1, Math.ceil(
      (new Date(activity.finishDate).getTime() - new Date(activity.startDate).getTime()) / 86400000
    ));
    const costPct = getCostCompletion(activity);    // Green bar
    const timePct = getTimeCompletion(activity);    // Red vertical line position
    const isMilestone = activity.duration === 0;
    const spi = timePct > 0 ? costPct / timePct : 1;
    const isDelayed = (timePct - costPct) > 15;    // Variance alert threshold

    return (
      <div
        className="relative h-6 flex items-center group/bar"
        style={{ marginLeft: `${startOffset * dayWidth}px`, width: `${duration * dayWidth}px` }}
      >
        {/* Planned bar (background) */}
        <div className={cn(
          "absolute inset-y-1 rounded-full w-full opacity-30",
          activity.isCritical ? 'bg-red-200' : 'bg-blue-200'
        )} />
        
        {/* Cost Completion — Green fill */}
        <div
          className={cn(
            "absolute inset-y-1 rounded-full transition-all shadow-sm",
            isDelayed ? 'bg-amber-400' : 'bg-emerald-500'
          )}
          style={{ width: `${costPct}%` }}
        />
        
        {/* Time Completion — Red vertical line (Today marker relative to bar) */}
        {timePct > 0 && timePct < 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-20 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
            style={{ left: `${timePct}%` }}
            title={`Time: ${timePct}% | Cost: ${costPct}%`}
          />
        )}
        
        {/* Milestone */}
        {isMilestone && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45 w-3 h-3 bg-red-600 shadow-sm" />
        )}

        {/* Hover tooltip */}
        <div className="absolute left-full ml-2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
          <div className="bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded shadow-xl space-y-0.5">
            <div className="font-bold">{activity.description}</div>
            <div className="flex gap-3">
              <span className="text-emerald-400 font-bold">Cost: {costPct}%</span>
              <span className="text-red-400 font-bold">Time: {timePct}%</span>
              <span className={cn("font-bold", spi >= 1 ? 'text-green-300' : 'text-red-300')}>SPI: {spi.toFixed(2)}</span>
            </div>
            {isDelayed && <div className="text-amber-300 font-semibold animate-pulse flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              SCHEDULE IMPACT
            </div>}
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryBar = (startDate: string | null, finishDate: string | null, progress: number = 0) => {
    if (!startDate || !finishDate) return null;

    const startOffset = getDayOffset(startDate);
    const finishOffset = getDayOffset(finishDate);
    const width = (finishOffset - startOffset + 1) * dayWidth;
    const left = startOffset * dayWidth;

    return (
      <div className="relative h-10 flex items-center group/summary">
        <div 
          className="absolute h-2 bg-slate-800 z-10"
          style={{ left: `${left}px`, width: `${width}px` }}
        >
          {/* Pointed ends */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-800 -translate-x-full [clip-path:polygon(100%_0,0_50%,100%_100%)]" />
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-slate-800 translate-x-full [clip-path:polygon(0_0,100%_50%,0_100%)]" />
          
          {/* Progress Overlay */}
          <div 
            className="h-full bg-slate-400/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const deriveStatusFromActivities = (acts: Activity[]): string => {
    if (acts.length === 0) return 'Not Started';
    const allCompleted = acts.every(a => a.status === 'Completed' || (getProgress(a) >= 100));
    if (allCompleted) return 'Completed';
    const anyStarted = acts.some(a => a.status === 'In Progress' || a.status === 'Completed' || getProgress(a) > 0 || a.actualStartDate);
    if (anyStarted) return 'In Progress';
    return 'Not Started';
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Completed': case 'Finished': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'In Progress': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'Delayed': return 'text-amber-500 bg-amber-50 border-amber-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const renderActivitiesByHierarchy = (acts: Activity[], level: number, parentKey: string) => {
    const groups: Record<string, Record<string, Activity[]>> = {};
    acts.forEach(act => {
      let div = act.division;
      if (!div && act.wbsId) {
        // Try to find if this WBS node or its parents have a division code
        let currentNode = wbsLevels.find(w => w.id === act.wbsId);
        while (currentNode && !div) {
          if (currentNode.divisionCode) div = currentNode.divisionCode;
          if (currentNode.type === 'Division' && currentNode.code?.match(/^\d+$/)) div = currentNode.code;
          currentNode = wbsLevels.find(w => w.id === currentNode?.parentId);
        }
      }
      div = div || '01';
      const wp = act.workPackage || 'WP - Not Linked';
      if (!groups[div]) groups[div] = {};
      if (!groups[div][wp]) groups[div][wp] = [];
      groups[div][wp].push(act);
    });

    const sortedDivs = Object.keys(groups).sort();

    return sortedDivs.map(divId => {
      const division = masterFormatDivisions.find(d => d.id === divId);
      const divActivitiesMap = groups[divId];
      const divActivities = Object.values(divActivitiesMap).flat() as Activity[];
      const divKey = `div-${parentKey}-${divId}`;
      const isDivExpanded = expandedWbs[divKey] ?? true;
      const divProgress = calculateCostAccountProgress(divActivities);
      const divStatus = deriveStatusFromActivities(divActivities);
      const wpTitles = Object.keys(divActivitiesMap).sort();

      return (
        <React.Fragment key={`hier-div-${parentKey}-${divId}`}>
          <div 
            className="h-10 flex items-center bg-slate-50/30 hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-100"
            onClick={() => toggleWbs(`div-${parentKey}-${divId}`)}
          >
            <div className="flex items-center h-full divide-x divide-slate-200">
              <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(level + 1) * 16}px` }}>
                {isDivExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 mr-2" /> : <ChevronRight className="w-3 h-3 text-slate-400 mr-2" />}
                {getWbsIcon('Cost Account', 'w-3 h-3', divId)}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                   {division ? `${division.id} - ${division.title}` : (divId === '01' ? 'General' : divId)}
                </span>
              </div>
              
              {columnOrder.map(colId => {
                if (!visibleColumns[colId]) return null;
                let content = null;
                let align = 'center';
                switch (colId) {
                  case 'plannedStart': content = divActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '') || '-'; break;
                  case 'actualStart': content = divActivities.reduce((min, a) => !min || (a.actualStartDate && a.actualStartDate < min) ? a.actualStartDate : min, '') || '-'; break;
                  case 'plannedDuration': content = `${divActivities.reduce((sum, a) => sum + (a.duration || 0), 0)}d`; break;
                  case 'actualDuration': content = `${divActivities.reduce((sum, a) => sum + (a.actualDuration || 0), 0)}d`; break;
                  case 'plannedFinish': content = divActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '') || '-'; break;
                  case 'actualFinish': content = divActivities.reduce((max, a) => !max || (a.actualFinishDate && a.actualFinishDate > max) ? a.actualFinishDate : max, '') || '-'; break;
                  case 'progress':
                    content = (
                      <div className="flex flex-col items-center justify-center w-full px-2">
                        <span className="text-[10px] font-bold text-blue-400 mb-0.5">{divProgress}%</span>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400" style={{ width: `${divProgress}%` }} />
                        </div>
                      </div>
                    );
                    break;
                  case 'status':
                    content = (
                      <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider", getStatusColor(divStatus))}>
                        {divStatus}
                      </span>
                    );
                    break;
                  case 'plannedCost': content = formatAmount(divActivities.reduce((sum, a) => sum + a.amount, 0), baseCurrency); align = 'right'; break;
                  case 'poCost': content = formatAmount(divActivities.reduce((sum, a) => sum + (purchaseOrders.filter(po => po.activityId === a.id).reduce((s, p) => s + p.amount, 0)), 0), baseCurrency); align = 'right'; break;
                  case 'actualCost': content = formatAmount(divActivities.reduce((sum, a) => {
                    const progress = getProgress(a);
                    const poCost = purchaseOrders.filter(po => po.activityId === a.id).reduce((s, p) => s + p.amount, 0);
                    return sum + (progress / 100 * poCost);
                  }, 0), baseCurrency); align = 'right'; break;
                }
                return (
                  <div key={colId} style={{ width: columnWidths[colId] }} className={cn("h-full flex items-center px-2 text-[10px] text-slate-400 font-mono", align === 'right' ? "justify-end text-right" : "justify-center text-center")}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
          
          {isDivExpanded && wpTitles.map(wpTitle => {
            const wpActivities = divActivitiesMap[wpTitle];
            const wpKey = `wp-${parentKey}-${divId}-${wpTitle}`;
            const isWpExpanded = expandedWbs[wpKey] ?? true;
            const wpProgress = calculateCostAccountProgress(wpActivities);
            const wpStatus = deriveStatusFromActivities(wpActivities);
            const wpDetails = workPackages.find(p => p.title === wpTitle);

            return (
              <React.Fragment key={`hier-wp-${parentKey}-${divId}-${wpTitle}`}>
                <div 
                  className="h-9 flex items-center bg-slate-50/10 hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-50"
                  onClick={() => toggleWbs(`wp-${parentKey}-${divId}-${wpTitle}`)}
                >
                  <div className="flex items-center h-full divide-x divide-slate-200">
                    <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(level + 2) * 16}px` }}>
                      {isWpExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 mr-2" /> : <ChevronRight className="w-3 h-3 text-slate-400 mr-2" />}
                      {getWbsIcon('Work Package', 'w-3 h-3', wpTitle)}
                      <span className="text-[10px] font-bold text-slate-600 truncate">
                         {wpDetails ? `${wpDetails.code} - ${wpDetails.title}` : wpTitle}
                      </span>
                    </div>
                    {columnOrder.map(colId => {
                      if (!visibleColumns[colId]) return null;
                      let content = null;
                      let align = 'center';
                      switch (colId) {
                        case 'plannedStart': content = wpActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '') || '-'; break;
                        case 'actualStart': content = wpActivities.reduce((min, a) => !min || (a.actualStartDate && a.actualStartDate < min) ? a.actualStartDate : min, '') || '-'; break;
                        case 'plannedDuration': content = `${wpActivities.reduce((sum, a) => sum + (a.duration || 0), 0)}d`; break;
                        case 'actualDuration': content = `${wpActivities.reduce((sum, a) => sum + (a.actualDuration || 0), 0)}d`; break;
                        case 'plannedFinish': content = wpActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '') || '-'; break;
                        case 'actualFinish': content = wpActivities.reduce((max, a) => !max || (a.actualFinishDate && a.actualFinishDate > max) ? a.actualFinishDate : max, '') || '-'; break;
                        case 'progress':
                          content = (
                            <div className="flex flex-col items-center justify-center w-full px-2">
                              <span className="text-[10px] font-bold text-emerald-500 mb-0.5">{wpProgress}%</span>
                              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${wpProgress}%` }} />
                              </div>
                            </div>
                          );
                          break;
                        case 'status':
                          content = (
                            <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider", getStatusColor(wpStatus))}>
                              {wpStatus}
                            </span>
                          );
                          break;
                        case 'plannedCost': content = formatAmount(wpActivities.reduce((sum, a) => sum + a.amount, 0), baseCurrency); align = 'right'; break;
                        case 'poCost': content = formatAmount(wpActivities.reduce((sum, a) => sum + (purchaseOrders.filter(po => po.activityId === a.id).reduce((s, p) => s + p.amount, 0)), 0), baseCurrency); align = 'right'; break;
                        case 'actualCost': content = formatAmount(wpActivities.reduce((sum, a) => {
                          const progress = getProgress(a);
                          const poCost = purchaseOrders.filter(po => po.activityId === a.id).reduce((s, p) => s + p.amount, 0);
                          return sum + (progress / 100 * poCost);
                        }, 0), baseCurrency); align = 'right'; break;
                      }
                      return (
                        <div key={colId} style={{ width: columnWidths[colId] }} className={cn("h-full flex items-center px-2 text-[10px] text-slate-400 font-mono", align === 'right' ? "justify-end text-right" : "justify-center text-center")}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {isWpExpanded && wpActivities.map(act => (
                  <ActivityRow 
                    key={`act-row-hier-${act.id}`}
                    act={act}
                    wbsLevel={level + 2}
                    columnWidths={columnWidths}
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    purchaseOrders={purchaseOrders}
                    vendors={vendors}
                    setEditingActivity={setEditingActivity}
                    onToggleActivity={(id) => setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }))}
                    isActExpanded={expandedActivities[act.id]}
                    navigate={navigate}
                    rowRefs={rowRefs}
                    activityColWidth={activityColWidth}
                    getProgress={getProgress}
                    getDateColor={getDateColor}
                    getDurationColor={getDurationColor}
                    getCostColor={getCostColor}
                    getActivityActualCost={getActivityActualCost}
                    viewLevel={viewLevel}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    });
  };

  const projectStats = useMemo(() => {
    const topWbsNodes = wbsLevels.filter(w => !w.parentId);
    let totalPlanned = 0;
    let totalPo = 0;
    let totalActual = 0;
    let weightedCostProgress = 0;
    let weightedTimeProgress = 0;
    let totalDurationForTime = 0;

    topWbsNodes.forEach(w => {
      const costs = calculateWbsCosts(w.id);
      const costPct = calculateWbsCostCompletion(w.id);
      const timePct = calculateWbsTimeCompletion(w.id);
      
      const allActs = collectAllDescendantActivities(w.id, wbsLevels, activities);
      const span = calcDateSpan(allActs);
      
      totalPlanned += costs.planned;
      totalActual += costs.actual;
      totalPo += costs.po;
      weightedCostProgress += (costs.planned * costPct);
      weightedTimeProgress += (span.duration * timePct);
      totalDurationForTime += span.duration;
    });

    const costProgress = totalPlanned > 0 ? Math.round(weightedCostProgress / totalPlanned) : 0;
    const timeProgress = totalDurationForTime > 0 ? Math.round(weightedTimeProgress / totalDurationForTime) : 0;
    const spi = timeProgress > 0 ? costProgress / timeProgress : 1;

    const startDate = activities.length > 0 ? activities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '') : selectedProject?.startDate || '';
    const finishDate = activities.length > 0 ? activities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '') : '';
    const duration = startDate && finishDate ? Math.ceil((new Date(finishDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      plannedCost: totalPlanned,
      poCost: totalPo,
      actualCost: totalActual,
      progress: costProgress,
      costProgress,
      timeProgress,
      spi,
      startDate,
      finishDate,
      duration
    };
  }, [wbsLevels, activities, purchaseOrders, selectedProject]);

  const [expandedSummary, setExpandedSummary] = useState(true);

  const renderScheduleContent = () => {
    return (
      <>
        {/* Project Summary Row (MS Project Task 0 Style) */}
        <div 
          className="h-11 flex items-center cursor-pointer bg-slate-900 border-b border-white/10 text-white font-bold sticky top-0 z-[40]"
          onClick={() => setExpandedSummary(!expandedSummary)}
        >
          <div className="flex items-center h-full divide-x divide-white/10">
            <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs }}>
              {expandedSummary ? <ChevronDown className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-slate-400 mr-2" />}
              <Target className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-xs font-semibold uppercase tracking-widest truncate">{selectedProject?.name} (Task 0)</span>
            </div>
            
            {columnOrder.map(colId => {
              if (!visibleColumns[colId]) return null;
              let content: React.ReactNode = null;
              let align = 'center';

              switch (colId) {
                case 'plannedStart': content = projectStats.startDate || '-'; break;
                case 'actualStart': content = projectStats.startDate || '-'; break;
                case 'plannedDuration': content = `${projectStats.duration}d`; break;
                case 'actualDuration': content = `${projectStats.duration}d`; break;
                case 'plannedFinish': content = projectStats.finishDate || '-'; break;
                case 'actualFinish': content = projectStats.finishDate || '-'; break;
                case 'progress':
                  content = (
                    <div className="flex flex-col items-center justify-center w-full px-2 gap-0.5">
                      <div className="flex justify-between w-full text-[8px] font-semibold uppercase tracking-tighter text-blue-400">
                        <span>{projectStats.costProgress}% COST</span>
                        <span className={cn(projectStats.spi >= 1 ? 'text-emerald-400' : 'text-rose-400')}>SPI {projectStats.spi.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                        {/* Cost bar (emerald) */}
                        <div 
                          className="absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-1000" 
                          style={{ width: `${projectStats.costProgress}%`, zIndex: 1 }} 
                        />
                        {/* Time line (rose) */}
                        <div 
                          className="absolute inset-y-0 w-0.5 bg-rose-400 z-10"
                          style={{ left: `${Math.min(100, projectStats.timeProgress)}%` }}
                        />
                      </div>
                    </div>
                  );
                  break;
                case 'plannedCost': content = formatAmount(projectStats.plannedCost, baseCurrency); align = 'right'; break;
                case 'poCost': content = formatAmount(projectStats.poCost, baseCurrency); align = 'right'; break;
                case 'actualCost': content = formatAmount(projectStats.actualCost, baseCurrency); align = 'right'; break;
              }

              return (
                <div key={colId} style={{ width: columnWidths[colId] }} className={cn("h-full flex items-center px-2 text-[10px] text-slate-300 font-bold", align === 'right' ? "justify-end text-right" : "justify-center text-center")}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        {expandedSummary && wbsLevels.filter(wbs => !wbs.parentId).map(wbs => (
          <WbsRow 
            key={`wbs-${wbs.id}`}
            wbs={wbs}
            allWbs={wbsLevels}
            activities={activities}
            boqItems={boqItems}
            workPackages={workPackages}
            expanded={expandedWbs}
            expandedActivities={expandedActivities}
            onToggle={toggleWbs}
            onToggleActivity={(id) => setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }))}
            getProgress={getProgress}
            searchQuery={searchQuery}
            activeTab={activeTab}
            purchaseOrders={purchaseOrders}
            vendors={vendors}
            calculateWbsProgress={calculateWbsProgress}
            calculateWbsCostCompletion={calculateWbsCostCompletion}
            calculateWbsTimeCompletion={calculateWbsTimeCompletion}
            calculateSPI={calculateSPI}
            calculateDivisionProgress={calculateCostAccountProgress}
            renderActivitiesByHierarchy={renderActivitiesByHierarchy}
            navigate={navigate}
            setEditingActivity={setEditingActivity}
            rowRefs={rowRefs}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            activityColWidth={activityColWidth}
            columnWidths={columnWidths}
            viewLevel={viewLevel}
            getDateColor={getDateColor}
            getDurationColor={getDurationColor}
            getCostColor={getCostColor}
            calculateWbsCosts={calculateWbsCosts}
            getPoActualCost={getPoActualCost}
            getActivityActualCost={getActivityActualCost}
            getWbsActivities={getWbsActivities}
          />
        ))}
      </>
    );
  };

  const renderGanttActivitiesByHierarchy = (acts: Activity[], level: number, parentKey: string) => {
    const groups: Record<string, Record<string, Activity[]>> = {};
    acts.forEach(act => {
      let div = act.division;
      if (!div && act.wbsId) {
        let currentNode = wbsLevels.find(w => w.id === act.wbsId);
        while (currentNode && !div) {
          if (currentNode.divisionCode) div = currentNode.divisionCode;
          if (currentNode.type === 'Division' && currentNode.code?.match(/^\d+$/)) div = currentNode.code;
          currentNode = wbsLevels.find(w => w.id === currentNode?.parentId);
        }
      }
      div = div || '01';
      const wp = act.workPackage || 'WP - Not Linked';
      if (!groups[div]) groups[div] = {};
      if (!groups[div][wp]) groups[div][wp] = [];
      groups[div][wp].push(act);
    });

    const sortedDivs = Object.keys(groups).sort();

    return sortedDivs.map(divId => {
      const divActivitiesMap = groups[divId];
      const divActivities = Object.values(divActivitiesMap).flat() as Activity[];
      const divKey = `gantt-div-${parentKey}-${divId}`;
      const isDivExpanded = expandedWbs[divKey] ?? true;

      const divPlannedStart = divActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '');
      const divPlannedFinish = divActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '');
      const divProgress = divActivities.length > 0 ? divActivities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / divActivities.length : 0;
      const wpTitles = Object.keys(divActivitiesMap).sort();

      return (
        <React.Fragment key={`gantt-div-frag-${parentKey}-${divId}`}>
          <div className="h-10 border-b border-slate-100 bg-slate-50/10">
            {renderSummaryBar(divPlannedStart, divPlannedFinish, divProgress)}
          </div>
          
          {isDivExpanded && wpTitles.map(wpTitle => {
            const wpActivities = divActivitiesMap[wpTitle];
            const wpKey = `gantt-wp-${parentKey}-${divId}-${wpTitle}`;
            const isWpExpanded = expandedWbs[wpKey] ?? true;

            const wpPlannedStart = wpActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '');
            const wpPlannedFinish = wpActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '');
            const wpProgress = wpActivities.length > 0 ? wpActivities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / wpActivities.length : 0;

            return (
              <React.Fragment key={`gantt-wp-frag-${parentKey}-${divId}-${wpTitle}`}>
                <div className="h-9 border-b border-slate-50 bg-emerald-50/5">
                  {renderSummaryBar(wpPlannedStart, wpPlannedFinish, wpProgress)}
                </div>

                {isWpExpanded && wpActivities.map(act => {
                  const isActExpanded = expandedActivities[act.id];
                  const linkedPO = purchaseOrders.find(po => po.id === act.poId);

                  return (
                    <React.Fragment key={`gantt-act-container-${act.id}`}>
                      <div 
                        ref={el => { if (el) rowRefs.current.set(`gantt-${act.id}`, el); }}
                        className="h-10 flex items-center bg-white relative border-b border-slate-100"
                      >
                        {renderBar(act)}
                      </div>
                      {isActExpanded && linkedPO && (
                        <div key={`gantt-expanded-po-${act.id}`} className="bg-slate-50/30">
                          {(viewLevel === 'po' || viewLevel === 'poitem') && (
                            <div key={`gantt-po-spacer-${act.id}`} className="h-9 border-b border-blue-50/50" />
                          )}
                          {linkedPO.lineItems?.map(li => (
                            <div key={`gantt-li-row-${li.id}-${act.id}`} className="h-8 border-b border-slate-50/50" />
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    });
  };

  const renderGanttContent = () => {
    return (
      <>
        {/* Project Summary Bar (MS Project Task 0 Style) */}
        <div className="h-11 border-b border-slate-900/10 flex items-center relative bg-slate-900/5">
          {projectStats.startDate && projectStats.finishDate && (
            <div 
              className="absolute z-30"
              style={{ 
                left: `${getDayOffset(projectStats.startDate) * dayWidth}px`, 
                width: `${projectStats.duration * dayWidth}px`, 
                top: '14px' 
              }}
            >
              <div className="relative h-3 group">
                <div className="absolute inset-x-0 h-1 bg-slate-900 top-0" />
                <div className="absolute left-0 top-0 w-1 h-3 bg-slate-900 rounded-bl-[2px]" />
                <div className="absolute right-0 top-0 w-1 h-3 bg-slate-900 rounded-br-[2px]" />
                <div 
                  className="absolute h-0.5 bg-blue-400 top-[1px] left-[1px] transition-all"
                  style={{ width: `calc(${projectStats.progress}% - 2px)` }}
                />
              </div>
            </div>
          )}
        </div>

        {expandedSummary && wbsLevels.filter(wbs => !wbs.parentId).map(wbs => (
          <GanttRow 
            key={`gantt-wbs-${wbs.id}`}
            wbs={wbs}
            allWbs={wbsLevels}
            activities={activities}
            workPackages={workPackages}
            expanded={expandedWbs}
            expandedActivities={expandedActivities}
            renderBar={renderBar}
            renderSummaryBar={renderSummaryBar}
            rowRefs={rowRefs}
            purchaseOrders={purchaseOrders}
            visibleColumns={visibleColumns}
            viewLevel={viewLevel}
            calculateWbsProgress={calculateWbsProgress}
            renderGanttActivitiesByHierarchy={renderGanttActivitiesByHierarchy}
            getWbsActivities={getWbsActivities}
          />
        ))}
      </>
    );
  };

  const handlePrint = async () => {
    if (!selectedProject) return;
    setIsPrinting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      // Load Arabic font if needed
      if (language === 'ar') {
        await loadArabicFont(pdf);
        pdf.setFont('Amiri');
      }

      // Logo centered
      try {
        pdf.addImage(
          'https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7',
          'PNG', (pdfWidth / 2) - 20, 5, 40, 14
        );
      } catch(e) { /* skip if logo fails */ }

      // Title & Branding
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PMIS', 14, 20);
      
      pdf.setFontSize(16);
      pdf.setTextColor(30, 64, 175);
      pdf.text(t('project_schedule').toUpperCase(), 14, 30);
      
      pdf.setDrawColor(30, 64, 175);
      pdf.setLineWidth(0.5);
      pdf.line(14, 33, 80, 33);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${t('project')}: ${selectedProject.name}`, 14, 40);
      pdf.text(`${t('code')}: ${selectedProject.code}`, 14, 45);
      pdf.text(`WBS REF: SCH-${selectedProject.code}-001`, 14, 50);

      pdf.setFontSize(8);
      pdf.text(`${t('generated')}: ${new Date().toLocaleString()}`, pdfWidth - 14, 15, { align: 'right' });
      pdf.text(`REV: 01-A`, pdfWidth - 14, 20, { align: 'right' });
      pdf.text(`AUTHOR: PMIS AI ENGINE`, pdfWidth - 14, 25, { align: 'right' });

      // KPI Cards
      const totalPlanned = activities.reduce((sum, a) => sum + (a.amount || 0), 0);
      const totalActual  = activities.reduce((sum, a) => sum + (a.actualAmount || 0), 0);
      const avgProgress  = activities.length > 0
        ? Math.round(activities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / activities.length)
        : 0;

      const kpis = [
        { label: t('overall_progress'), value: `${avgProgress}%`, color: [59, 130, 246], icon: '%' },
        { label: t('planned_cost'), value: formatAmount(totalPlanned, baseCurrency), color: [30, 64, 175], icon: '$' },
        { label: t('actual_cost'), value: formatAmount(totalActual, baseCurrency), color: [16, 185, 129], icon: 'A' },
        { label: t('activities'), value: `${activities.length}`, color: [100, 116, 139], icon: '#' }
      ];

      const cardWidth = (pdfWidth - 28 - 9) / 4;
      const cardY = 55;
      const cardHeight = 25;

      kpis.forEach((kpi, i) => {
        const x = 14 + (i * (cardWidth + 3));
        
        // Card Background
        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');

        // Icon Circle
        pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.circle(x + 8, cardY + 8, 4, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(5);
        pdf.text(kpi.icon, x + 8, cardY + 9.5, { align: 'center' });

        // Value (Large)
        pdf.setFontSize(12);
        pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(kpi.value, x + (cardWidth / 2), cardY + 14, { align: 'center' });

        // Label (Small, below)
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.text(kpi.label, x + (cardWidth / 2), cardY + 21, { align: 'center' });
      });

      // Activities table and Gantt Chart side-by-side using autoTable
      const tableData = activities.map(act => {
        const progress = getProgress(act);
        const linkedPO = purchaseOrders.find(po => po.id === act.poId);
        const poCost = linkedPO ? linkedPO.amount : 0;
        const actualCost = (progress / 100) * poCost;
        
        return [
          act.description || '',
          act.startDate || 'TBD',
          act.actualStartDate || '-',
          `${act.duration || 0}d`,
          `${act.actualDuration || 0}d`,
          act.finishDate || 'TBD',
          act.actualFinishDate || '-',
          `${progress}%`,
          formatAmount(act.amount, baseCurrency),
          formatAmount(actualCost, baseCurrency),
          '' // Empty column for Gantt Chart
        ];
      });

      const ganttColWidth = 60; // Width for the Gantt column
      
      // Add Legend for Gantt
      const legendY = cardY + cardHeight + 5;
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      
      pdf.setFillColor(219, 234, 254);
      pdf.rect(14, legendY, 5, 3, 'F');
      pdf.text(t('planned'), 21, legendY + 2.5);
      
      pdf.setFillColor(16, 185, 129);
      pdf.rect(40, legendY, 5, 3, 'F');
      pdf.text(t('actual_on_time'), 47, legendY + 2.5);
      
      pdf.setFillColor(245, 158, 11);
      pdf.rect(75, legendY, 5, 3, 'F');
      pdf.text(t('actual_delayed'), 82, legendY + 2.5);

      autoTable(pdf, {
        startY: cardY + cardHeight + 10,
        head: [[t('activities'), t('start'), 'A. Start', 'P. Dur', 'A. Dur', t('finish'), 'A. Finish', '%', 'P. Cost', 'A. Cost', 'Timeline']],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 5, 
          cellPadding: 1,
          font: language === 'ar' ? 'Amiri' : 'helvetica'
        },
        headStyles: { 
          fillColor: [30, 64, 175], 
          textColor: 255,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 10, halign: 'center' },
          4: { cellWidth: 10, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 20, halign: 'right' },
          9: { cellWidth: 20, halign: 'right' },
          10: { cellWidth: ganttColWidth } // Gantt column
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 10) {
            const act = activities[data.row.index];
            if (!act || !act.startDate || !act.finishDate) return;

            const cell = data.cell;
            const padding = 1;
            const chartX = cell.x + padding;
            const chartY = cell.y + padding;
            const chartWidth = cell.width - (padding * 2);
            const chartHeight = cell.height - (padding * 2);

            // Calculate offsets relative to project timeline
            const projectStart = new Date(Math.min(...activities.filter(a => a.startDate).map(a => new Date(a.startDate!).getTime())));
            const projectEnd = new Date(Math.max(...activities.filter(a => a.finishDate).map(a => new Date(a.finishDate!).getTime())));
            const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) || 1;

            const getX = (dateStr: string) => {
              const date = new Date(dateStr);
              const diff = date.getTime() - projectStart.getTime();
              const days = diff / (1000 * 60 * 60 * 24);
              return chartX + (days / totalDays) * chartWidth;
            };

            // Draw Planned Bar
            const pStartX = getX(act.startDate);
            const pEndX = getX(act.finishDate);
            const pWidth = Math.max(1, pEndX - pStartX);
            
            pdf.setFillColor(219, 234, 254); // blue-100
            pdf.rect(pStartX, chartY, pWidth, chartHeight / 2, 'F');

            // Draw Actual Bar if exists
            if (act.actualStartDate) {
              const aStartX = getX(act.actualStartDate);
              const aEndX = act.actualFinishDate ? getX(act.actualFinishDate) : getX(new Date().toISOString());
              const aWidth = Math.max(1, aEndX - aStartX);
              
              const progress = getProgress(act);
              const isAhead = new Date(act.actualStartDate) <= new Date(act.startDate!);
              if (isAhead) {
                pdf.setFillColor(16, 185, 129); // emerald-500
              } else {
                pdf.setFillColor(245, 158, 11); // amber-500
              }
              pdf.rect(aStartX, chartY + (chartHeight / 2), aWidth, chartHeight / 2, 'F');
            }
          }
        }
      });

      pdf.save(`${selectedProject.code}_Schedule_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const toggleWbs = (id: string) => {
    setExpandedWbs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate project dates for Gantt
  const projectDates = useMemo(() => {
    const dates = activities
      .filter(a => a.startDate && a.finishDate)
      .flatMap(a => [new Date(a.startDate!), new Date(a.finishDate!)]);
    
    if (dates.length === 0) {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 3);
      return { start: today, end: nextMonth };
    }

    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add some padding
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 14);
    
    return { start, end };
  }, [activities]);

  const timeScale = useMemo(() => {
    const months: { name: string, days: number }[] = [];
    let current = new Date(projectDates.start);
    while (current <= projectDates.end) {
      const monthName = current.toLocaleString('default', { month: 'short', year: '2-digit' });
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      months.push({ name: monthName, days: daysInMonth });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
    return months;
  }, [projectDates]);

  const getDayOffset = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = date.getTime() - projectDates.start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    let current = new Date(projectDates.start);
    while (current <= projectDates.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [projectDates]);

  const totalDays = useMemo(() => {
    const diffTime = Math.abs(projectDates.end.getTime() - projectDates.start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [projectDates]);

  const dayWidth = useMemo(() => {
    switch (zoomLevel) {
      case 'day': return 40;
      case 'week': return 10;
      case 'month': return 3;
      case 'quarter': return 1;
      default: return 40;
    }
  }, [zoomLevel]);

  const todayOffset = useMemo(() => {
    const today = new Date();
    if (today < projectDates.start || today > projectDates.end) return null;
    const offset = Math.ceil((today.getTime() - projectDates.start.getTime()) / (1000 * 60 * 60 * 24));
    return offset * dayWidth;
  }, [projectDates, dayWidth]);

  const updateActivityDates = async (id: string, start: string, finish: string) => {
    try {
      await updateDoc(doc(db, 'activities', id), { startDate: start, finishDate: finish });
      
      const activitySnap = await getDoc(doc(db, 'activities', id));
      if (activitySnap.exists()) {
        const activity = activitySnap.data() as Activity;
        if (activity.divisionId) {
          await rollupToParent('workPackage', activity.divisionId);
        } else if (activity.wbsId) {
          await rollupToParent('floor', activity.wbsId);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `activities/${id}`);
    }
  };

  const updateActivityProgress = async (id: string, progress: number) => {
    try {
      await updateDoc(doc(db, 'activities', id), { percentComplete: progress });
      
      const activitySnap = await getDoc(doc(db, 'activities', id));
      if (activitySnap.exists()) {
        const activity = activitySnap.data() as Activity;
        if (activity.divisionId) {
          await rollupToParent('workPackage', activity.divisionId);
        } else if (activity.wbsId) {
          await rollupToParent('floor', activity.wbsId);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `activities/${id}`);
    }
  };

  const handleSaveAttributes = async (updatedActivity: Activity) => {
    try {
      // Logic for status derivation if not already set by modal
      if (!updatedActivity.status || updatedActivity.status === 'Not Started') {
        if (updatedActivity.actualFinishDate || (updatedActivity.percentComplete || 0) >= 100) {
          updatedActivity.status = 'Completed';
          updatedActivity.percentComplete = 100;
        } else if (updatedActivity.actualStartDate || (updatedActivity.percentComplete || 0) > 0) {
          updatedActivity.status = 'In Progress';
        }
      }

      // Manual WBS only - don't auto-create division nodes
      if (updatedActivity.wbsId && updatedActivity.division) {
        updatedActivity.divisionId = `${updatedActivity.wbsId}-${updatedActivity.division}`;
      }

      await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
      
      // Trigger rollup from workPackage level
      if (updatedActivity.divisionId) {
        const divisionSnap = await getDoc(doc(db, 'wbs', updatedActivity.divisionId));
        if (divisionSnap.exists()) {
          await rollupToParent('workPackage', updatedActivity.divisionId);
        } else if (updatedActivity.wbsId) {
          await rollupToParent('floor', updatedActivity.wbsId);
        }
      } else if (updatedActivity.wbsId) {
        // Fallback if no division
        await rollupToParent('floor', updatedActivity.wbsId);
      }
      
      setEditingActivity(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    }
  };

  const renderGanttBar = (activity: Activity) => {
    if (!activity.startDate || !activity.finishDate) return null;

    const isMilestone = activity.duration === 0;
    const startOffset = getDayOffset(activity.startDate);
    const duration = activity.duration || 0;
    const left = startOffset * dayWidth;
    const width = duration * dayWidth;

    // Actual bar calculation
    const actualStart = activity.actualStartDate || activity.startDate;
    const actualFinish = activity.actualFinishDate || activity.finishDate;
    const actualStartOffset = getDayOffset(actualStart);
    const actualDuration = activity.actualDuration || duration;
    const actualLeft = actualStartOffset * dayWidth;
    const actualWidth = actualDuration * dayWidth;

    const progress = activity.percentComplete || 0;

    if (isMilestone) {
      return (
        <div className="relative h-12 flex items-center group">
          <div 
            className="absolute z-30 flex items-center"
            style={{ left: `${left}px` }}
          >
            {/* Milestone Circle */}
            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-sm" />
            
            {/* Milestone Date Label */}
            <div className="absolute left-6 text-[10px] font-bold text-red-600 whitespace-nowrap bg-white/80 px-1 rounded">
              {activity.startDate}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative h-12 flex flex-col justify-center group">
        {/* Planned Bar (Grey) */}
        <div 
          className="absolute h-3 bg-slate-200 rounded-full border border-slate-300 z-10"
          style={{ left: `${left}px`, width: `${width}px`, top: '10px' }}
        >
          {/* Labels for Planned Bar */}
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 whitespace-nowrap pr-2">
            {activity.startDate}
          </div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-slate-500 pointer-events-none">
            {duration}d
          </div>
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 whitespace-nowrap pl-2">
            {activity.finishDate}
          </div>
        </div>

        {/* Actual Bar (Blue) */}
        <div 
          className="absolute h-3 bg-blue-500 rounded-full border border-blue-600 z-20 shadow-sm overflow-hidden"
          style={{ left: `${actualLeft}px`, width: `${actualWidth}px`, top: '22px' }}
        >
          {/* Progress Overlay */}
          <div 
            className="h-full bg-blue-400/30"
            style={{ width: `${progress}%` }}
          />
          {/* Progress Label */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-white pointer-events-none">
            {progress}%
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {activeTab === 'gantt' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <HelpTooltip text={th('search_items_summary')} position="bottom">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder={t('search_activities')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 lg:w-64 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
              </HelpTooltip>
              
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map(level => (
                  <HelpTooltip key={level} text={th(level === 'day' || level === 'week' ? 'zoom_in_summary' : 'zoom_out_summary')} position="bottom">
                    <button 
                      onClick={() => setZoomLevel(level)}
                      className={cn("px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all", zoomLevel === level ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      {t(level)}
                    </button>
                  </HelpTooltip>
                ))}
              </div>

              <HelpTooltip text={th('zoom_in_summary')} position="bottom">
                <button 
                  onClick={() => {
                    const today = new Date();
                    const container = rightPanelRef.current;
                    if (container) {
                      const diff = Math.floor((today.getTime() - projectDates.start.getTime()) / (1000 * 60 * 60 * 24));
                      container.scrollLeft = diff * dayWidth - container.clientWidth / 2;
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-bold text-[9px] hover:bg-slate-100 transition-all flex items-center gap-1.5 border border-slate-200"
                >
                  <Target className="w-3.5 h-3.5" />
                  {t('today')}
                </button>
              </HelpTooltip>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-4 w-px bg-slate-200 mx-1" />

              <HelpTooltip text={th('import_data_summary')} position="bottom">
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span className="hidden lg:inline">{isImporting ? 'Importing...' : 'Import'}</span>
                </button>
              </HelpTooltip>

              <HelpTooltip text={th('add_activity_summary')} position="bottom">
                <button 
                  onClick={() => setEditingActivity({
                    id: crypto.randomUUID(),
                    projectId: selectedProject!.id,
                    wbsId: '',
                    divisionId: '',
                    workPackage: '',
                    description: '',
                    unit: 'LS',
                    quantity: 1,
                    rate: 0,
                    amount: 0,
                    status: 'Not Started',
                    percentComplete: 0
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{t('add_activity')}</span>
                </button>
              </HelpTooltip>

              <HelpTooltip text={th('column_settings_summary')} position="bottom">
                <div className="relative">
                  <button 
                    onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                    className={cn(
                      "p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-all border border-slate-100",
                      showColumnsMenu && "bg-blue-50 text-blue-600 border-blue-100"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  
                  {showColumnsMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowColumnsMenu(false)} />
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50">
                        {Object.keys(visibleColumns).map(col => (
                          <label key={col} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={visibleColumns[col]} 
                              onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-medium text-slate-600 capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </HelpTooltip>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="bg-white border-b border-slate-200 overflow-hidden flex-1 flex relative"
          >
        {/* Left Panel: WBS & Activity List */}
        <div 
          ref={leftPanelRef}
          onScroll={(e) => handleScroll(e, 'left')}
          style={{ width: activityColWidth }}
          className="border-r border-slate-200 overflow-y-auto overflow-x-auto flex-shrink-0 relative bg-slate-50/30 no-scrollbar"
        >
          <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 h-12 flex items-center">
            <div className="flex items-center h-full divide-x divide-slate-200">
              <div 
                style={{ width: columnWidths.activityWbs }}
                className="px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest min-w-[300px] h-full flex items-center relative group"
              >
                Activity / WBS
                <div 
                  onMouseDown={(e) => { e.stopPropagation(); setResizingColumn('activityWbs'); }}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-10"
                />
              </div>
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={columnOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  {columnOrder.map(colId => {
                    if (!visibleColumns[colId]) return null;
                    const colInfo = [
                      { id: 'plannedStart', label: 'P. Start' },
                      { id: 'actualStart', label: 'A. Start' },
                      { id: 'plannedDuration', label: 'P. Dur' },
                      { id: 'actualDuration', label: 'A. Dur' },
                      { id: 'plannedFinish', label: 'P. Finish' },
                      { id: 'actualFinish', label: 'A. Finish' },
                      { id: 'progress', label: '%' },
                      { id: 'supplier', label: 'Supplier' },
                      { id: 'plannedCost', label: 'P. Cost', align: 'right' },
                      { id: 'poCost', label: 'PO Cost', align: 'right' },
                      { id: 'actualCost', label: 'A. Cost', align: 'right' }
                    ].find(c => c.id === colId);

                    if (!colInfo) return null;

                    return (
                      <SortableHeader 
                        key={colId}
                        id={colId}
                        label={colInfo.label}
                        width={columnWidths[colId]}
                        align={colInfo.align as any}
                        onResize={setResizingColumn}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {renderScheduleContent()}
          </div>
        </div>

            {/* Main Middle Resize Handle */}
            <div 
              onMouseDown={() => setIsResizingCol(true)}
              className={cn(
                "absolute top-0 bottom-0 w-2 cursor-col-resize z-40 transition-all group/resize bg-slate-200/50 hover:bg-blue-500/30",
                isResizingCol && "bg-blue-500 w-2.5 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              )}
              style={{ left: activityColWidth - 1 }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-slate-400/50 rounded-full group-hover/resize:bg-blue-400 transition-colors" />
            </div>

            {/* Right Panel: Gantt Chart & Details */}
            <div 
              ref={rightPanelRef}
              onScroll={(e) => handleScroll(e, 'right')}
              className="flex-1 overflow-auto relative custom-scrollbar"
            >
              <div ref={ganttContainerRef} className="min-w-full">
                {/* Timeline Header */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200 flex h-12">
                  {timelineDays.map((day, i) => {
                    const isFirstOfMonth = day.getDate() === 1;
                    const isMonday = day.getDay() === 1;
                    const showLabel = zoomLevel === 'day' || (zoomLevel === 'week' && isMonday) || (zoomLevel === 'month' && isFirstOfMonth);

                    return (
                      <div 
                        key={i}
                        style={{ width: dayWidth, flexShrink: 0 }}
                        className={cn(
                          "border-r border-slate-100 flex flex-col justify-center items-center",
                          isFirstOfMonth && "border-l-2 border-l-slate-300 bg-slate-50/50"
                        )}
                      >
                        {showLabel && (
                          <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">
                            {zoomLevel === 'month' ? day.toLocaleString('default', { month: 'short' }) : day.getDate()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Relationship Lines SVG Overlay */}
                <svg className="absolute inset-0 pointer-events-none z-0 w-full h-full">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {activities.flatMap(act => {
                    if (!act.predecessors || act.predecessors.length === 0) return [];
                    
                    return act.predecessors.map((dep, idx) => {
                      const predAct = activities.find(a => a.id === dep.id);
                      if (!predAct || !predAct.startDate || !predAct.finishDate || !act.startDate || !act.finishDate) return null;

                      const predRow = rowRefs.current.get(`gantt-${dep.id}`);
                      const currRow = rowRefs.current.get(`gantt-${act.id}`);
                      const container = ganttContainerRef.current;
                      
                      if (!predRow || !currRow || !container) return null;

                      const containerRect = container.getBoundingClientRect();
                      const predRect = predRow.getBoundingClientRect();
                      const currRect = currRow.getBoundingClientRect();

                      // Calculate relative Y positions
                      const y1 = predRect.top - containerRect.top + 20;
                      const y2 = currRect.top - containerRect.top + 20;

                      // Calculate relative X positions based on timeline offsets
                      const pFinishOff = getDayOffset(predAct.finishDate) * dayWidth;
                      const pStartOff = getDayOffset(predAct.startDate) * dayWidth;
                      const cStartOff = getDayOffset(act.startDate) * dayWidth;
                      const cFinishOff = getDayOffset(act.finishDate!) * dayWidth;

                      let d = "";
                      switch (dep.type) {
                        case 'FS':
                          d = `M ${pFinishOff} ${y1} L ${pFinishOff + 10} ${y1} L ${pFinishOff + 10} ${y2} L ${cStartOff} ${y2}`;
                          break;
                        case 'SS':
                          d = `M ${pStartOff} ${y1} L ${pStartOff - 10} ${y1} L ${pStartOff - 10} ${y2} L ${cStartOff} ${y2}`;
                          break;
                        case 'FF':
                          d = `M ${pFinishOff} ${y1} L ${pFinishOff + 15} ${y1} L ${pFinishOff + 15} ${y2} L ${cFinishOff} ${y2}`;
                          break;
                        case 'SF':
                          d = `M ${pStartOff} ${y1} L ${pStartOff - 15} ${y1} L ${pStartOff - 15} ${y2} L ${cFinishOff} ${y2}`;
                          break;
                        default:
                          d = `M ${pFinishOff} ${y1} L ${pFinishOff + 10} ${y1} L ${pFinishOff + 10} ${y2} L ${cStartOff} ${y2}`;
                      }

                      return (
                        <g key={`link-${act.id}-${dep.id}-${idx}`}>
                          <path 
                            d={d}
                            fill="none"
                            stroke={act.isCritical ? "#fca5a5" : "#94a3b8"}
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead)"
                            className="opacity-60"
                          />
                        </g>
                      );
                    });
                  })}
                </svg>
                
                {/* Today Line Overlay */}
                {todayOffset !== null && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-0 bottom-0 w-[2px] bg-red-600/60 z-10 pointer-events-none"
                    style={{ left: todayOffset }}
                  >
                    <motion.div 
                      animate={{ scaleX: [1, 2, 1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-red-600/20 blur-md -left-2 -right-2"
                    />
                    <div className="sticky top-12 px-2 py-0.5 bg-red-600 text-[8px] font-semibold uppercase text-white rounded-r shadow-lg whitespace-nowrap">
                      {t('today')}
                    </div>
                  </motion.div>
                )}

                {/* Gantt Rows */}
                <div className="divide-y divide-slate-100">
                  {renderGanttContent()}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {editingActivity && (
              <ActivityAttributesModal 
                activity={editingActivity}
                onClose={() => setEditingActivity(null)}
                onSave={handleSaveAttributes}
                boqItems={boqItems}
                wbsLevels={wbsLevels}
                allActivities={activities}
              />
            )}
          </AnimatePresence>
        </div>
      ) : activeTab === 'milestones' ? (
        <div className="flex-1 overflow-auto p-8 bg-slate-50 space-y-12">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Project Milestones</h3>
              <p className="text-slate-500">Key project events and target completion dates.</p>
            </div>
            <button 
              onClick={() => setShowAddMilestone(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </button>
          </div>

          <div className="relative pb-20">
            {milestones.length === 0 ? (
              <div className="p-20 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
                <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400">No milestones defined in the schedule.</p>
              </div>
            ) : (
              <div className="relative px-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2" />
                <div className="flex flex-wrap justify-center gap-y-24 gap-x-8 md:gap-x-16 relative">
                  {milestones
                    .sort((a, b) => new Date(a.finishDate || '').getTime() - new Date(b.finishDate || '').getTime())
                    .map((m, idx) => (
                      <div key={m.id} className="relative flex flex-col items-center group">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => setEditingActivity(m)}
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center z-10 transition-all cursor-pointer group-hover:scale-110",
                            m.status === 'Completed' 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20" 
                              : "bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/20"
                          )}
                        >
                          <Target className="w-6 h-6 sm:w-8 sm:h-8" />
                        </motion.div>
                        <div className="absolute -top-12 sm:-top-16 w-32 sm:w-40 text-center">
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-900 line-clamp-2 px-2">{m.description}</div>
                        </div>
                        <div className="absolute -bottom-12 sm:-bottom-16 w-32 sm:w-40 text-center">
                          <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {m.finishDate || 'TBD'}
                          </div>
                          <div className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-bold uppercase tracking-wider",
                            m.status === 'Completed' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {m.status}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <ActivityListView page={{ id: 'activities', title: 'Activities', type: 'terminal' }} />
        </div>
      )}

      {showAddMilestone && (
        <ActivityAttributesModal 
          activity={{
            id: crypto.randomUUID(),
            projectId: selectedProject?.id || '',
            wbsId: '',
            workPackage: '',
            description: '',
            unit: 'EA',
            quantity: 1,
            rate: 0,
            amount: 0,
            status: 'Not Started',
            activityType: 'Milestone',
            percentComplete: 0
          }}
          onClose={() => setShowAddMilestone(false)}
          onSave={handleSaveAttributes}
          boqItems={boqItems}
          wbsLevels={wbsLevels}
          allActivities={activities}
        />
      )}

      {showImportModal && (
        <DataImportModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportActivityData}
          targetColumns={activityTargetColumns}
          title="Import Activities"
          entityName="Project Activities"
        />
      )}
    </div>
  );
};

// Helper Components for Recursive Rendering

function collectAllDescendantActivities(wbsId: string, allWbs: WBSLevel[], activities: Activity[]): Activity[] {
  const node = allWbs.find(w => w.id === wbsId);
  if (!node) return [];

  const directActivities = activities.filter(a => {
    if (a.wbsId === wbsId || a.divisionId === wbsId) return true;
    const divCode = node.divisionCode || node.code;
    const isDivisionLink = (node.type === 'Division' || node.type === 'Cost Account') && 
                          !a.wbsId && !a.divisionId && a.division === divCode;
    return isDivisionLink;
  });

  const childWbs = allWbs.filter(w => w.parentId === wbsId);
  const descendantActivities = childWbs.flatMap(child => collectAllDescendantActivities(child.id, allWbs, activities));

  const activityMap = new Map<string, Activity>();
  [...directActivities, ...descendantActivities].forEach(a => activityMap.set(a.id, a));
  
  return Array.from(activityMap.values());
}

function calcDateSpan(acts: Activity[]) {
  let start = '', finish = '', actualStart = '', actualFinish = '';
  acts.forEach(a => {
    const s = a.startDate || (a as any).plannedStart || '';
    const f = a.finishDate || (a as any).plannedFinish || '';
    if (s && (!start || s < start)) start = s;
    if (f && (!finish || f > finish)) finish = f;
    if (a.actualStartDate && (!actualStart || a.actualStartDate < actualStart)) actualStart = a.actualStartDate;
    if (a.actualFinishDate && (!actualFinish || a.actualFinishDate > actualFinish)) actualFinish = a.actualFinishDate;
  });
  const duration = start && finish ? Math.ceil((new Date(finish).getTime() - new Date(start).getTime()) / 86400000) : 0;
  const actualDuration = actualStart && actualFinish ? Math.ceil((new Date(actualFinish).getTime() - new Date(actualStart).getTime()) / 86400000) : 0;
  return { start, finish, duration, actualStart, actualFinish, actualDuration };
}

interface WbsRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  boqItems: BOQItem[];
  workPackages: WorkPackage[];
  expanded: Record<string, boolean>;
  expandedActivities: Record<string, boolean>;
  onToggle: (id: string) => void;
  onToggleActivity: (id: string) => void;
  getProgress: (activity: Activity) => number;
  searchQuery: string;
  activeTab: ScheduleTab;
  purchaseOrders: PurchaseOrder[];
  vendors: Supplier[];
  calculateWbsProgress: (id: string) => number;
  calculateDivisionProgress: (divActivities: Activity[]) => number;
  renderActivitiesByHierarchy: (acts: Activity[], level: number, parentKey: string) => React.ReactNode;
  navigate: (path: string, state?: any) => void;
  setEditingActivity: (act: Activity) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  activityColWidth: number;
  columnWidths: Record<string, number>;
  viewLevel: ViewLevel;
  getDateColor: (actual: string | undefined, planned: string | undefined) => string;
  getDurationColor: (actual: number | undefined, planned: number | undefined) => string;
  getCostColor: (actual: number | undefined, planned: number | undefined) => string;
  calculateWbsCosts: (wbsId: string) => { planned: number; po: number; actual: number };
  calculateWbsCostCompletion: (id: string) => number;
  calculateWbsTimeCompletion: (id: string) => number;
  calculateSPI: (id: string) => number;
  getPoActualCost: (po: PurchaseOrder) => number;
  getActivityActualCost: (act: Activity) => number;
  getWbsActivities: (wbs: WBSLevel) => Activity[];
}

const PoRow: React.FC<{
  po: PurchaseOrder;
  wbsLevel: number;
  columnWidths: Record<string, number>;
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  formatAmount: (amount: number, currency: string) => string;
  baseCurrency: string;
  getPoActualCost: (po: PurchaseOrder) => number;
  navigate: (path: string, state?: any) => void;
  isExpanded: boolean;
  onToggle: () => void;
  viewLevel: ViewLevel;
}> = ({ po, wbsLevel, columnWidths, visibleColumns, columnOrder, formatAmount, baseCurrency, getPoActualCost, navigate, isExpanded, onToggle, viewLevel }) => {
  return (
    <React.Fragment key={`po-row-${po.id}`}>
      <div 
        className="h-9 flex items-center bg-blue-50/10 hover:bg-blue-50/30 transition-colors border-l-2 border-blue-400/50 cursor-pointer border-b border-slate-100"
        onClick={onToggle}
      >
        <div className="flex items-center h-full divide-x divide-slate-200">
          <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(wbsLevel + 1) * 16}px` }}>
            {po.lineItems && po.lineItems.length > 0 ? (
              isExpanded ? <ChevronDown className="w-3 h-3 text-blue-500 mr-2" /> : <ChevronRight className="w-3 h-3 text-blue-500 mr-2" />
            ) : <div className="w-5" />}
            <ShoppingCart className="w-3 h-3 text-blue-500 mr-2" />
            <span className="text-[10px] font-bold text-blue-700 truncate">PO #{po.id} - {po.supplier}</span>
          </div>
          {columnOrder.map(colId => {
            if (!visibleColumns[colId]) return null;
            let content: React.ReactNode = null;
            let align = 'center';
            switch (colId) {
              case 'plannedStart': content = po.date || '-'; break;
              case 'progress':
                content = (
                  <div className="flex flex-col items-center justify-center w-full px-2">
                    <span className="text-[10px] font-bold text-blue-600 mb-0.5">{po.completion || 0}%</span>
                    <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${po.completion || 0}%` }} />
                    </div>
                  </div>
                );
                break;
              case 'status':
                const poStatus = po.status || (po.completion && po.completion >= 100 ? 'Completed' : po.completion && po.completion > 0 ? 'In Progress' : 'Not Started');
                content = (
                  <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider", 
                    poStatus === 'Completed' || poStatus === 'Finished' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' :
                    poStatus === 'In Progress' ? 'text-blue-500 bg-blue-50 border-blue-100' :
                    'text-slate-400 bg-slate-50 border-slate-100'
                  )}>
                    {poStatus}
                  </span>
                );
                break;
              case 'supplier': content = po.supplier; break;
              case 'poCost': content = formatAmount(po.amount, baseCurrency); align = 'right'; break;
              case 'actualCost': content = formatAmount(getPoActualCost(po), baseCurrency); align = 'right'; break;
            }
            return <div key={colId} style={{ width: columnWidths[colId] }} className={cn("h-full flex items-center px-2 text-[9px] font-mono", align === 'right' ? "justify-end text-right" : "justify-center text-center")}>{content}</div>;
          })}
        </div>
      </div>
      {isExpanded && po.lineItems?.map(li => (
        <div key={`li-${li.id}`} className="h-8 flex items-center bg-slate-50/30 border-b border-slate-50">
          <div className="flex items-center h-full divide-x divide-slate-200 opacity-70">
            <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(wbsLevel + 2) * 16}px` }}>
              <Package className="w-2.5 h-2.5 text-slate-400 mr-2" />
              <span className="text-[9px] text-slate-500 truncate">{li.description}</span>
            </div>
            {columnOrder.map(colId => {
              if (!visibleColumns[colId]) return null;
              let content: React.ReactNode = null;
              let align = 'center';
              switch (colId) {
                case 'progress': content = `${li.completion || 0}%`; break;
                case 'poCost': content = formatAmount(li.amount, baseCurrency); align = 'right'; break;
                case 'actualCost': content = formatAmount((li.completion || 0) / 100 * li.amount, baseCurrency); align = 'right'; break;
              }
              return <div key={colId} style={{ width: columnWidths[colId] }} className={cn("h-full flex items-center px-2 text-[9px] font-mono", align === 'right' ? "justify-end text-right font-medium" : "justify-center text-center")}>{content}</div>;
            })}
          </div>
        </div>
      ))}
    </React.Fragment>
  );
};

const ActivityRow: React.FC<{
  act: Activity;
  wbsLevel: number;
  columnWidths: Record<string, number>;
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  purchaseOrders: PurchaseOrder[];
  vendors: Supplier[];
  setEditingActivity: (act: Activity) => void;
  onToggleActivity: (id: string) => void;
  isActExpanded: boolean;
  navigate: (path: string, state?: any) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  activityColWidth: number;
  getProgress: (act: Activity) => number;
  getDateColor: (actual: string | undefined, planned: string | undefined) => string;
  getDurationColor: (actual: number | undefined, planned: number | undefined) => string;
  getCostColor: (actual: number | undefined, planned: number | undefined) => string;
  getActivityActualCost: (act: Activity) => number;
  viewLevel: ViewLevel;
}> = ({ 
  act, wbsLevel, columnWidths, visibleColumns, columnOrder, purchaseOrders, vendors, 
  setEditingActivity, onToggleActivity, isActExpanded, navigate, rowRefs, 
  activityColWidth, getProgress, getDateColor, getDurationColor, getCostColor,
  getActivityActualCost, viewLevel
}) => {
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const linkedPOs = purchaseOrders.filter(po => po.activityId === act.id);
  const progress = getProgress(act);
  const poCost = linkedPOs.reduce((sum, po) => sum + po.amount, 0);
  const actualCost = getActivityActualCost(act);
  const isMilestone = act.duration === 0;

  return (
    <React.Fragment key={`act-row-${act.id}`}>
      <div 
        ref={el => { if (el) rowRefs.current.set(act.id, el); }}
        className="h-10 flex items-center bg-white hover:bg-blue-50/30 transition-colors border-l-2 border-transparent hover:border-blue-500 cursor-pointer border-b border-slate-100"
        onClick={() => setEditingActivity(act)}
      >
        <div className="flex items-center h-full divide-x divide-slate-200">
          <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(wbsLevel + 1) * 16}px` }}>
            <div className="flex items-center gap-2 mr-2">
              {linkedPOs.length > 0 ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActivity(act.id);
                  }}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  {isActExpanded ? <ChevronDown className="w-3 h-3 text-blue-500" /> : <ChevronRight className="w-3 h-3 text-blue-500" />}
                </button>
              ) : (
                <div className="w-5" />
              )}
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center",
                isMilestone ? "bg-red-100" : "bg-blue-100"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isMilestone ? "bg-red-500" : "bg-blue-500"
                )} />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[11px] font-medium truncate",
                  isMilestone ? "text-red-600 font-bold" : "text-slate-600"
                )}>{act.description}</span>
                {act.predecessors && act.predecessors.length > 0 && <Link2 className="w-2.5 h-2.5 text-slate-400" title="Has Predecessors" />}
                {linkedPOs.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    {linkedPOs.map((po) => (
                      <button 
                        key={po.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/page/4.2.3', { state: { editPOId: po.id } });
                        }}
                        className="p-1 hover:bg-blue-50 rounded transition-colors group/po"
                        title={`Open PO: ${po.id}`}
                      >
                        <ShoppingCart className="w-2.5 h-2.5 text-blue-400 group-hover/po:text-blue-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {columnOrder.map(colId => {
            if (!visibleColumns[colId]) return null;
            
            let content = null;
            let align = 'center';

            switch (colId) {
              case 'plannedStart':
                content = act.startDate || 'TBD';
                break;
              case 'actualStart':
                content = <span className={getDateColor(act.actualStartDate, act.startDate)}>{act.actualStartDate || '-'}</span>;
                break;
              case 'plannedDuration':
                content = isMilestone ? '-' : `${act.duration || 0}d`;
                break;
              case 'actualDuration':
                content = <span className={getDurationColor(act.actualDuration, act.duration)}>{isMilestone ? '-' : `${act.actualDuration || 0}d`}</span>;
                break;
              case 'plannedFinish':
                content = isMilestone ? '-' : (act.finishDate || 'TBD');
                break;
              case 'actualFinish':
                content = <span className={getDateColor(act.actualFinishDate, act.finishDate)}>{isMilestone ? '-' : (act.actualFinishDate || '-')}</span>;
                break;
              case 'progress':
                content = (
                  <div className="flex flex-col items-center justify-center w-full px-2">
                    <span className="text-[10px] font-bold text-blue-600 mb-0.5">{progress}%</span>
                    <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
                break;
              case 'status':
                const actStatus = act.actualFinishDate || progress >= 100 ? 'Completed' : act.actualStartDate || progress > 0 ? 'In Progress' : 'Not Started';
                content = (
                  <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider", 
                    actStatus === 'Completed' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' :
                    actStatus === 'In Progress' ? 'text-blue-500 bg-blue-50 border-blue-100' :
                    'text-slate-400 bg-slate-50 border-slate-100'
                  )}>
                    {actStatus}
                  </span>
                );
                break;
              case 'count':
                content = linkedPOs.length > 0 ? linkedPOs.length : '-';
                break;
              case 'supplier':
                content = vendors.find(v => v.id === act.supplierId)?.name || (linkedPOs.length > 0 ? (linkedPOs.length === 1 ? linkedPOs[0].supplier : `${linkedPOs.length} Suppliers`) : '-');
                break;
              case 'plannedCost':
                content = formatAmount(act.amount, baseCurrency);
                align = 'right';
                break;
              case 'poCost':
                content = formatAmount(poCost, baseCurrency);
                align = 'right';
                break;
              case 'actualCost':
                content = <span className={getCostColor(actualCost, poCost)}>{formatAmount(actualCost, baseCurrency)}</span>;
                align = 'right';
                break;
            }

            return (
              <div 
                key={colId}
                style={{ width: columnWidths[colId] }}
                className={cn(
                  "h-full flex items-center px-2 text-[9px] font-mono",
                  align === 'right' ? "justify-end text-right" : "justify-center text-center",
                  (colId === 'plannedDuration' || colId === 'actualDuration' || colId === 'plannedCost' || colId === 'poCost' || colId === 'actualCost') && "font-bold"
                )}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {isActExpanded && linkedPOs.length > 0 && linkedPOs.map(po => (
        <div key={`act-po-list-${act.id}-${po.id}`} className="bg-slate-50/50 border-l-2 border-blue-200 ml-4">
          {/* PO Header Row if in PO view */}
          {(viewLevel === 'po' || viewLevel === 'poitem') && (
            <div key={`act-po-header-${po.id}`} className="h-9 flex items-center bg-blue-50/20 border-b border-blue-100">
              <div className="flex items-center h-full divide-x divide-slate-200">
                <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs - 16, paddingLeft: `${(wbsLevel + 2) * 16}px` }}>
                  <ShoppingCart className="w-3 h-3 text-blue-500 mr-2" />
                  <span className="text-[10px] font-bold text-blue-700 truncate">PO #{po.id}</span>
                </div>
                {visibleColumns.plannedStart && <div style={{ width: columnWidths.plannedStart }} className="h-full flex items-center justify-center text-[9px] font-mono text-slate-400">{po.date || '-'}</div>}
                {visibleColumns.actualStart && <div style={{ width: columnWidths.actualStart }} className="h-full" />}
                {visibleColumns.plannedDuration && <div style={{ width: columnWidths.plannedDuration }} className="h-full" />}
                {visibleColumns.actualDuration && <div style={{ width: columnWidths.actualDuration }} className="h-full" />}
                {visibleColumns.plannedFinish && <div style={{ width: columnWidths.plannedFinish }} className="h-full" />}
                {visibleColumns.actualFinish && <div style={{ width: columnWidths.actualFinish }} className="h-full" />}
                {visibleColumns.progress && (
                  <div style={{ width: columnWidths.progress }} className="h-full flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-bold text-blue-600 mb-0.5">{po.completion || 0}%</span>
                    <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${po.completion || 0}%` }} />
                    </div>
                  </div>
                )}
                {visibleColumns.supplier && <div style={{ width: columnWidths.supplier }} className="h-full flex items-center px-2 text-[9px] text-slate-500 truncate">{po.supplier}</div>}
                {visibleColumns.plannedCost && <div style={{ width: columnWidths.plannedCost }} className="h-full" />}
                {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-blue-600 font-mono">{formatAmount(po.amount, baseCurrency)}</div>}
                {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-emerald-600 font-mono">{formatAmount((po.completion || 0) / 100 * po.amount, baseCurrency)}</div>}
              </div>
            </div>
          )}

          {/* PO Line Items */}
          {po.lineItems?.map((li) => (
            <div 
              key={`act-li-row-${act.id}-${po.id}-${li.id}`} 
              className="h-8 flex items-center px-4 text-[10px] text-slate-500 hover:bg-slate-100 transition-colors border-b border-slate-50"
            >
              <div className="flex items-center h-full divide-x divide-slate-200">
                <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs - 16, paddingLeft: `${(wbsLevel + 3) * 16}px` }}>
                  <div className="w-3 h-3 rounded-full border border-slate-300 mr-2 flex items-center justify-center">
                    <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  </div>
                  <span className="flex-1 truncate">{li.description}</span>
                </div>
                {visibleColumns.plannedStart && <div style={{ width: columnWidths.plannedStart }} className="h-full" />}
                {visibleColumns.actualStart && <div style={{ width: columnWidths.actualStart }} className="h-full" />}
                {visibleColumns.plannedDuration && <div style={{ width: columnWidths.plannedDuration }} className="h-full" />}
                {visibleColumns.actualDuration && <div style={{ width: columnWidths.actualDuration }} className="h-full" />}
                {visibleColumns.plannedFinish && <div style={{ width: columnWidths.plannedFinish }} className="h-full" />}
                {visibleColumns.actualFinish && <div style={{ width: columnWidths.actualFinish }} className="h-full" />}
                {visibleColumns.progress && (
                  <div style={{ width: columnWidths.progress }} className="h-full flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-bold text-emerald-600 mb-0.5">{li.completion || 0}%</span>
                    <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${li.completion || 0}%` }} />
                    </div>
                  </div>
                )}
                {visibleColumns.supplier && <div style={{ width: columnWidths.supplier }} className="h-full" />}
                {visibleColumns.plannedCost && <div style={{ width: columnWidths.plannedCost }} className="h-full" />}
                {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full flex items-center justify-end px-2 font-mono">{formatAmount(li.amount, baseCurrency)}</div>}
                {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className="h-full flex items-center justify-end px-2 font-mono text-emerald-600">{formatAmount((li.completion || 0) / 100 * li.amount, baseCurrency)}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </React.Fragment>
  );
};
const WbsRow: React.FC<WbsRowProps> = ({ 
  wbs, allWbs, activities, boqItems, workPackages, expanded, expandedActivities, onToggle, 
  onToggleActivity, getProgress, searchQuery, activeTab, purchaseOrders, vendors, 
  calculateWbsProgress, calculateDivisionProgress, renderActivitiesByHierarchy, navigate, setEditingActivity, 
  rowRefs, visibleColumns, columnOrder, activityColWidth, columnWidths, viewLevel,
  getDateColor, getDurationColor, getCostColor,
  calculateWbsCosts, calculateWbsCostCompletion, calculateWbsTimeCompletion, calculateSPI, getPoActualCost, getActivityActualCost, getWbsActivities
}) => {
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const hasDivisionNodes = children.some(c => c.type === 'Division');

  const wbsActivities = getWbsActivities(wbs);

  const isExpanded = expanded[wbs.id];

  const activitiesByDivisionAndWP = useMemo(() => {
    const groups: Record<string, Record<string, Activity[]>> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      const wp = act.workPackage || 'WP - Not Linked';
      if (!groups[div]) groups[div] = {};
      if (!groups[div][wp]) groups[div][wp] = [];
      groups[div][wp].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivisionAndWP).sort();
  
  if (searchQuery && !wbs.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !wbsActivities.some(a => a.description.toLowerCase().includes(searchQuery.toLowerCase()))) {
    return null;
  }

  const wbsProgress = calculateWbsProgress(wbs.id);
  const wbsCosts = calculateWbsCosts(wbs.id);
  
  const wbsPlannedCost = wbsCosts.planned;
  const wbsPoAmount = wbsCosts.po;
  const wbsActualCost = wbsCosts.actual;

  const allDescendantActs = collectAllDescendantActivities(wbs.id, allWbs, activities);
  const wbsSpan = calcDateSpan(allDescendantActs);

  const wbsPlannedStart = wbs.plannedStart || wbsSpan.start;
  const wbsPlannedFinish = wbs.plannedFinish || wbsSpan.finish;
  const wbsActualStart = wbs.actualStart || wbsSpan.actualStart;
  const wbsActualFinish = wbs.actualFinish || wbsSpan.actualFinish;
  
  const wbsPlannedDuration = typeof wbs.plannedDuration === 'number' 
    ? (wbs.plannedDuration || wbsSpan.duration)
    : wbsSpan.duration;
    
  const wbsActualDuration = typeof wbs.actualDuration === 'number'
    ? (wbs.actualDuration || wbsSpan.actualDuration)
    : wbsSpan.actualDuration;

  const directWbsPOs = purchaseOrders.filter(p => p.wbsId === wbs.id && !p.activityId && !p.workPackageId);

  // Adoption logic for activities that should belong to this WBS based on Division Code
  const displayActivities = [...wbsActivities];
  
  return (
    <>
      <div 
        className={cn(
          "h-10 flex items-center cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100",
          wbs.level === 1 ? "bg-slate-50/50" : ""
        )}
        onClick={() => onToggle(wbs.id)}
      >
        <div className="flex items-center h-full divide-x divide-slate-200">
          <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${wbs.level * 16}px` }}>
            {(children.length > 0 || displayActivities.length > 0 || directWbsPOs.length > 0) ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-slate-400 mr-2" />
            ) : <div className="w-6" />}
            {getWbsIcon(wbs.type, "w-4 h-4", wbs.title)}
            <span className="text-xs font-bold text-slate-700 truncate">{wbs.title}</span>
          </div>
          
          {columnOrder.map(colId => {
            if (!visibleColumns[colId]) return null;
            
            let content: React.ReactNode = null;
            let align = 'center';

            switch (colId) {
              case 'plannedStart': content = wbsPlannedStart || '-'; break;
              case 'actualStart': content = wbsActualStart || '-'; break;
              case 'plannedDuration': content = wbsPlannedDuration ? `${wbsPlannedDuration}d` : '-'; break;
              case 'actualDuration': content = wbsActualDuration ? `${wbsActualDuration}d` : '-'; break;
              case 'plannedFinish': content = wbsPlannedFinish || '-'; break;
              case 'actualFinish': content = wbsActualFinish || '-'; break;
              case 'progress': {
                const costPct = calculateWbsCostCompletion(wbs.id);
                const timePct = calculateWbsTimeCompletion(wbs.id);
                const spi = calculateSPI(wbs.id);
                const isDelayed = (timePct - costPct) > 15;
                
                content = (
                  <div className="flex flex-col items-center w-full px-1 gap-0.5">
                    <div className="flex justify-between w-full text-[9px] font-semibold uppercase tracking-tighter">
                      <span className="text-emerald-600">{costPct}% COST</span>
                      <span className={cn("px-1 rounded", spi >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                        SPI {spi.toFixed(2)}
                      </span>
                    </div>
                    {/* Cost bar (green) */}
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all", isDelayed ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${costPct}%` }} />
                    </div>
                    {/* Time bar (indicator) */}
                    <div className="w-full h-0.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all opacity-50", spi >= 1 ? 'bg-blue-400' : 'bg-rose-400')} style={{ width: `${Math.min(100, timePct)}%` }} />
                    </div>
                  </div>
                );
                break;
              }
              case 'status':
                const wbsStatus = wbs.status || (wbsProgress >= 100 ? 'Completed' : wbsProgress > 0 ? 'In Progress' : 'Not Started');
                content = (
                  <span className={cn("px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider", 
                    wbsStatus === 'Completed' || wbsStatus === 'Finished' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' :
                    wbsStatus === 'In Progress' ? 'text-blue-500 bg-blue-50 border-blue-100' :
                    wbsStatus === 'Delayed' ? 'text-amber-500 bg-amber-50 border-amber-100' :
                    'text-slate-400 bg-slate-50 border-slate-100'
                  )}>
                    {wbsStatus}
                  </span>
                );
                break;
              case 'supplier': content = '-'; break;
              case 'plannedCost': content = formatAmount(wbsPlannedCost, baseCurrency); align = 'right'; break;
              case 'poCost': content = formatAmount(wbsPoAmount, baseCurrency); align = 'right'; break;
              case 'actualCost': content = formatAmount(wbsActualCost, baseCurrency); align = 'right'; break;
            }

            return (
              <div 
                key={colId}
                style={{ width: columnWidths[colId] }}
                className={cn(
                  "h-full flex items-center px-2 text-[10px] text-slate-500 font-mono",
                  align === 'right' ? "justify-end text-right" : "justify-center text-center",
                  (colId === 'plannedDuration' || colId === 'actualDuration' || colId === 'plannedCost' || colId === 'poCost' || colId === 'actualCost') && "font-bold"
                )}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
      
      {isExpanded && (
        <>
          {children.map(child => (
            <WbsRow 
              key={`wbs-${child.id}`} 
              wbs={child} 
              allWbs={allWbs} 
              activities={activities} 
              boqItems={boqItems}
              workPackages={workPackages}
              expanded={expanded} 
              expandedActivities={expandedActivities}
              onToggle={onToggle}
              onToggleActivity={onToggleActivity}
              getProgress={getProgress}
              searchQuery={searchQuery}
              activeTab={activeTab}
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              calculateWbsProgress={calculateWbsProgress}
              calculateWbsCostCompletion={calculateWbsCostCompletion}
              calculateWbsTimeCompletion={calculateWbsTimeCompletion}
              calculateSPI={calculateSPI}
              calculateDivisionProgress={calculateDivisionProgress}
              renderActivitiesByHierarchy={renderActivitiesByHierarchy}
              navigate={navigate}
              setEditingActivity={setEditingActivity}
              rowRefs={rowRefs}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              activityColWidth={activityColWidth}
              columnWidths={columnWidths}
              viewLevel={viewLevel}
              getDateColor={getDateColor}
              getDurationColor={getDurationColor}
              getCostColor={getCostColor}
              calculateWbsCosts={calculateWbsCosts}
              getPoActualCost={getPoActualCost}
              getActivityActualCost={getActivityActualCost}
              getWbsActivities={getWbsActivities}
            />
          ))}
          {wbs.type !== 'Division' && wbs.type !== 'Cost Account' ? (
            renderActivitiesByHierarchy(displayActivities, wbs.level, wbs.id)
          ) : (
            // If the row itself is a division/cost account, group by Work Package
            Object.keys(activitiesByDivisionAndWP[wbs.divisionCode || wbs.code || '01'] || {}).sort().map(wpTitle => {
              const wpActivities = (activitiesByDivisionAndWP[wbs.divisionCode || wbs.code || '01'] || {})[wpTitle];
              const wpKey = `${wbs.id}-wp-${wpTitle}`;
              const isWpExpanded = expanded[wpKey] ?? true;
              const wpProgress = calculateDivisionProgress(wpActivities);
              const wpDetails = workPackages.find(p => p.title === wpTitle);
              const wpDirectPOs = purchaseOrders.filter(p => !p.activityId && (p.workPackageId === wpDetails?.id || p.workPackageId === wpTitle));

              return (
              <React.Fragment key={`wbs-wp-frag-${wbs.id}-${wpTitle}`}>
                <div 
                  className="h-9 flex items-center bg-slate-50/10 hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-50"
                  onClick={() => onToggle(wpKey)}
                >
                    <div className="flex items-center h-full divide-x divide-slate-200">
                      <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(wbs.level + 1) * 16}px` }}>
                        {(wpActivities.length > 0 || wpDirectPOs.length > 0) ? (
                          isWpExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 mr-2" /> : <ChevronRight className="w-3 h-3 text-slate-400 mr-2" />
                        ) : <div className="w-5" />}
                        <Package className="w-3 h-3 text-emerald-500 mr-2" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">
                           {wpDetails ? `${wpDetails.code} - ${wpDetails.title}` : wpTitle}
                        </span>
                      </div>
                      {columnOrder.map(colId => {
                        if (!visibleColumns[colId]) return null;
                        let content: React.ReactNode = null;
                        let align = 'center';

                        const wpPOAmount = wpDirectPOs.reduce((sum, p) => sum + p.amount, 0);
                        const wpPOActual = wpDirectPOs.reduce((sum, p) => sum + getPoActualCost(p), 0);

                        switch (colId) {
                          case 'plannedStart': content = wpActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '') || '-'; break;
                          case 'actualStart': content = wpActivities.reduce((min, a) => !min || (a.actualStartDate && a.actualStartDate < min) ? a.actualStartDate : min, '') || '-'; break;
                          case 'plannedDuration': content = `${wpActivities.reduce((sum, a) => sum + (a.duration || 0), 0)}d`; break;
                          case 'actualDuration': content = `${wpActivities.reduce((sum, a) => sum + (a.actualDuration || 0), 0)}d`; break;
                          case 'plannedFinish': content = wpActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '') || '-'; break;
                          case 'actualFinish': content = wpActivities.reduce((max, a) => !max || (a.actualFinishDate && a.actualFinishDate > max) ? a.actualFinishDate : max, '') || '-'; break;
                          case 'progress':
                            content = (
                              <div className="flex flex-col items-center justify-center w-full px-2">
                                <span className="text-[10px] font-bold text-emerald-500 mb-0.5">{wpProgress}%</span>
                                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${wpProgress}%` }} />
                                </div>
                              </div>
                            );
                            break;
                          case 'plannedCost': content = formatAmount(wpActivities.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0), baseCurrency); align = 'right'; break;
                          case 'poCost': content = formatAmount(wpActivities.reduce((sum, a) => sum + (purchaseOrders.filter(po => po.activityId === a.id).reduce((s, p) => s + p.amount, 0)), 0) + wpPOAmount, baseCurrency); align = 'right'; break;
                          case 'actualCost': 
                            const actActual = wpActivities.reduce((sum, a) => sum + getActivityActualCost(a), 0);
                            content = formatAmount(actActual + wpPOActual, baseCurrency); 
                            align = 'right'; 
                            break;
                        }
                        return <div key={colId} style={{ width: columnWidths[colId] }} className={cn("h-full flex items-center px-2 text-[10px] text-slate-400 font-mono", align === 'right' ? "justify-end text-right" : "justify-center text-center")}>{content}</div>;
                      })}
                    </div>
                  </div>
                  {isWpExpanded && (
                    <>
                      {wpActivities.map(act => (
                        <ActivityRow 
                          key={`wp-act-${wbs.id}-${wpTitle}-${act.id}`}
                          act={act}
                          wbsLevel={wbs.level + 1}
                          columnWidths={columnWidths}
                          visibleColumns={visibleColumns}
                          columnOrder={columnOrder}
                          purchaseOrders={purchaseOrders}
                          vendors={vendors}
                          setEditingActivity={setEditingActivity}
                          onToggleActivity={onToggleActivity}
                          isActExpanded={expandedActivities[act.id]}
                          navigate={navigate}
                          rowRefs={rowRefs}
                          activityColWidth={activityColWidth}
                          getProgress={getProgress}
                          getDateColor={getDateColor}
                          getDurationColor={getDurationColor}
                          getCostColor={getCostColor}
                          getActivityActualCost={getActivityActualCost}
                          viewLevel={viewLevel}
                        />
                      ))}
                      {wpDirectPOs.map(po => (
                        <PoRow 
                          key={`wp-po-${wbs.id}-${wpTitle}-${po.id}`}
                          po={po}
                          wbsLevel={wbs.level + 1}
                          columnWidths={columnWidths}
                          visibleColumns={visibleColumns}
                          columnOrder={columnOrder}
                          formatAmount={formatAmount}
                          baseCurrency={baseCurrency}
                          getPoActualCost={getPoActualCost}
                          navigate={navigate}
                          isExpanded={expandedActivities[po.id]}
                          onToggle={() => onToggleActivity(po.id)}
                          viewLevel={viewLevel}
                        />
                      ))}
                    </>
                  )}
                </React.Fragment>
              );
            })
          )}
          {/* Direct WBS POs */}
          {directWbsPOs.map(po => (
            <PoRow 
              key={`wbs-po-${po.id}`}
              po={po}
              wbsLevel={wbs.level}
              columnWidths={columnWidths}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              formatAmount={formatAmount}
              baseCurrency={baseCurrency}
              getPoActualCost={getPoActualCost}
              navigate={navigate}
              isExpanded={expandedActivities[po.id]}
              onToggle={() => onToggleActivity(po.id)}
              viewLevel={viewLevel}
            />
          ))}
        </>
      )}
    </>
  );
};

interface GanttRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  workPackages: WorkPackage[];
  expanded: Record<string, boolean>;
  expandedActivities: Record<string, boolean>;
  renderBar: (activity: Activity) => React.ReactNode;
  renderSummaryBar: (startDate: string | null, finishDate: string | null, progress?: number) => React.ReactNode;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  purchaseOrders: PurchaseOrder[];
  visibleColumns: Record<string, boolean>;
  viewLevel: ViewLevel;
  calculateWbsProgress: (id: string) => number;
  renderGanttActivitiesByHierarchy: (acts: Activity[], level: number, parentKey: string) => React.ReactNode;
  getWbsActivities: (wbs: WBSLevel) => Activity[];
}

const GanttRow: React.FC<GanttRowProps> = ({ 
  wbs, allWbs, activities, workPackages, expanded, expandedActivities, renderBar, renderSummaryBar,
  rowRefs, purchaseOrders, visibleColumns, viewLevel, calculateWbsProgress, renderGanttActivitiesByHierarchy,
  getWbsActivities
}) => {
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const wbsActivities = getWbsActivities(wbs);
  const isExpanded = expanded[wbs.id];

  const allDescendantActs = collectAllDescendantActivities(wbs.id, allWbs, activities);
  const wbsSpan = calcDateSpan(allDescendantActs);

  const wbsPlannedStart = wbs.plannedStart || wbsSpan.start;
  const wbsPlannedFinish = wbs.plannedFinish || wbsSpan.finish;
  const wbsProgress = wbs.progress ?? calculateWbsProgress(wbs.id);

  const activitiesByDivisionAndWP = useMemo(() => {
    const groups: Record<string, Record<string, Activity[]>> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      const wp = act.workPackage || 'WP - Not Linked';
      if (!groups[div]) groups[div] = {};
      if (!groups[div][wp]) groups[div][wp] = [];
      groups[div][wp].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivisionAndWP).sort();

  return (
    <>
      <div className={cn("h-10 border-b border-slate-100", wbs.level === 1 ? "bg-slate-50/50" : "")}>
        {renderSummaryBar(wbsPlannedStart, wbsPlannedFinish, wbsProgress)}
      </div>
      {isExpanded && (
        <>
          {children.map(child => (
            <GanttRow 
              key={child.id} 
              wbs={child} 
              allWbs={allWbs} 
              activities={activities} 
              workPackages={workPackages}
              expanded={expanded} 
              expandedActivities={expandedActivities}
              renderBar={renderBar} 
              renderSummaryBar={renderSummaryBar}
              rowRefs={rowRefs} 
              purchaseOrders={purchaseOrders}
              visibleColumns={visibleColumns}
              viewLevel={viewLevel}
              calculateWbsProgress={calculateWbsProgress}
              renderGanttActivitiesByHierarchy={renderGanttActivitiesByHierarchy}
              getWbsActivities={getWbsActivities}
            />
          ))}
          {wbs.type !== 'Division' ? (
            renderGanttActivitiesByHierarchy(wbsActivities, wbs.level, wbs.id)
          ) : (
            Object.keys(activitiesByDivisionAndWP[wbs.divisionCode || '01'] || {}).sort().map(wpTitle => {
              const wpActivities = (activitiesByDivisionAndWP[wbs.divisionCode || '01'] || {})[wpTitle];
              const wpKey = `${wbs.id}-wp-${wpTitle}`;
              const isWpExpanded = expanded[wpKey] ?? true;

              const wpPlannedStart = wpActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '');
              const wpPlannedFinish = wpActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '');
              const wpProgress = wpActivities.length > 0 ? wpActivities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / wpActivities.length : 0;

              return (
                <React.Fragment key={wpKey}>
                  <div className="h-9 border-b border-slate-50 bg-emerald-50/5">
                    {renderSummaryBar(wpPlannedStart, wpPlannedFinish, wpProgress)}
                  </div>

                  {isWpExpanded && wpActivities.map(act => {
                    const isActExpanded = expandedActivities[act.id];
                    const linkedPO = purchaseOrders.find(po => po.id === act.poId);

                    return (
                      <React.Fragment key={`gantt-act-frag-${act.id}`}>
                        <div 
                          ref={el => { if (el) rowRefs.current.set(`gantt-${act.id}`, el); }}
                          className="h-10 flex items-center bg-white relative border-b border-slate-100"
                        >
                          {renderBar(act)}
                        </div>
                        {isActExpanded && linkedPO && (
                          <div key={`gantt-po-expand-${act.id}`} className="bg-slate-50/30">
                            {(viewLevel === 'po' || viewLevel === 'poitem') && (
                              <div key={`gantt-po-head-${linkedPO.id}`} className="h-9 border-b border-blue-50/50" />
                            )}
                            {linkedPO.lineItems?.map(li => (
                              <div key={`gantt-li-line-${li.id}`} className="h-8 border-b border-slate-50/50" />
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })
          )}
        </>
      )}
    </>
  );
};

