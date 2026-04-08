import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParent, masterFormatDivisions } from '../data';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder, Vendor } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, setDoc, doc, updateDoc } from 'firebase/firestore';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { ActivityListView } from './ActivityListView';
import { MilestoneListView } from './MilestoneListView';
import { 
  Calendar, Clock, Database, ChevronRight, ChevronDown,
  Loader2, Edit2, Search, Filter, Download, Printer,
  BarChart3, DollarSign, CheckCircle2, AlertCircle,
  ArrowRight, Link2, Plus, MoreHorizontal, Maximize2,
  ZoomIn, ZoomOut, ShoppingCart, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';
import { rollupToParent } from '../services/rollupService';

interface ProjectScheduleViewProps {
  page: Page;
}

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';
type ScheduleTab = 'gantt' | 'activities' | 'milestones';
type ViewLevel = 'wbs' | 'masterformat' | 'workpackage' | 'po' | 'poitem';

export const ProjectScheduleView: React.FC<ProjectScheduleViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWbs, setExpandedWbs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<ScheduleTab>('gantt');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('masterformat');
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    plannedStart: true,
    plannedDuration: true,
    plannedFinish: true,
    actualStart: true,
    actualDuration: true,
    actualFinish: true,
    progress: true,
    supplier: true,
    plannedCost: true,
    poCost: true,
    actualCost: true
  });

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
    supplier: 150,
    plannedCost: 100,
    poCost: 100,
    actualCost: 100
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Refs for scrolling and dependency lines
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, source: 'left' | 'right') => {
    if (source === 'left' && rightPanelRef.current) {
      rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    } else if (source === 'right' && leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

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
      collection(db, 'purchaseOrders'),
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

    const vendorUnsubscribe = onSnapshot(
      query(collection(db, 'vendors'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setVendors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
      }
    );

    return () => {
      actUnsubscribe();
      wbsUnsubscribe();
      poUnsubscribe();
      boqUnsubscribe();
      vendorUnsubscribe();
    };
  }, [selectedProject]);

  const ensureDivisionNode = async (floorId: string, divisionCode: string, projectId: string) => {
    const divisionId = `${floorId}-${divisionCode}`;
    const divisionRef = doc(db, 'wbs', divisionId);
    const divisionSnap = await getDoc(divisionRef);
    
    if (!divisionSnap.exists()) {
      const divisionInfo = masterFormatDivisions.find(d => d.id === divisionCode);
      await setDoc(divisionRef, {
        id: divisionId,
        projectId,
        parentId: floorId,
        title: divisionInfo ? `${divisionCode} ${divisionInfo.title}` : `Division ${divisionCode}`,
        type: 'Division',
        level: 5,
        code: divisionCode,
        status: 'Not Started'
      });
    }
    return divisionId;
  };

  const generateFromBOQ = async () => {
    if (!selectedProject || boqItems.length === 0) return;
    setIsGenerating(true);

    try {
      for (const item of boqItems) {
        const existing = activities.find(a => a.description === item.description && a.workPackage === item.workPackage);
        if (existing) continue;

        const divisionCode = item.division?.match(/\d+/)?.[0] || '01';
        const floorId = item.wbsId || '';
        
        let divisionId = '';
        if (floorId) {
          divisionId = await ensureDivisionNode(floorId, divisionCode, selectedProject.id);
        }

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
          status: 'Planned',
          percentComplete: 0
        };
        await setDoc(doc(db, 'activities', activity.id), activity);
        
        // Trigger rollup from workPackage level
        if (divisionId) {
          await rollupToParent('workPackage', divisionId);
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
    const duration = Math.ceil((new Date(activity.finishDate).getTime() - new Date(activity.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const progress = getProgress(activity);
    const isMilestone = activity.duration === 0;

    // Conditional coloring for actual progress
    const isAhead = activity.actualStartDate ? new Date(activity.actualStartDate) <= new Date(activity.startDate) : true;
    const barColor = activity.isCritical ? "bg-red-500" : (isAhead ? "bg-emerald-500" : "bg-amber-500");

    return (
      <div 
        className="relative h-6 flex items-center group/bar"
        style={{ 
          marginLeft: `${startOffset * dayWidth}px`,
          width: `${Math.max(dayWidth, duration * dayWidth)}px`
        }}
      >
        {/* Planned Bar */}
        <div className={cn(
          "absolute inset-y-1 rounded-full opacity-30",
          activity.isCritical ? "bg-red-200" : "bg-blue-200"
        )} style={{ width: '100%' }} />
        
        {/* Actual Progress Bar */}
        <div 
          className={cn(
            "absolute inset-y-1 rounded-full shadow-sm transition-all",
            barColor
          )}
          style={{ width: `${progress}%` }}
        />

        {/* Milestone Marker */}
        {isMilestone && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45 w-3 h-3 bg-red-600 shadow-sm" />
        )}

        {/* Label */}
        <div className="absolute left-full ml-2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
          <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl flex items-center gap-2">
            <span className="font-bold">{activity.description}</span>
            <span className="text-slate-400">|</span>
            <span className="text-blue-300">{progress}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderScheduleContent = () => {
    // Always start from top-level WBS nodes to maintain hierarchy
    return wbsLevels.filter(wbs => !wbs.parentId).map(wbs => (
      <WbsRow 
        key={wbs.id}
        wbs={wbs}
        allWbs={wbsLevels}
        activities={activities}
        boqItems={boqItems}
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
        calculateDivisionProgress={calculateDivisionProgress}
        navigate={navigate}
        setEditingActivity={setEditingActivity}
        rowRefs={rowRefs}
        visibleColumns={visibleColumns}
        activityColWidth={activityColWidth}
        columnWidths={columnWidths}
        viewLevel={viewLevel}
      />
    ));
  };

    return null;
  };

  const renderGanttContent = () => {
    // Always start from top-level WBS nodes to maintain hierarchy
    return wbsLevels.filter(wbs => !wbs.parentId).map(wbs => (
      <GanttRow 
        key={wbs.id}
        wbs={wbs}
        allWbs={wbsLevels}
        activities={activities}
        expanded={expandedWbs}
        expandedActivities={expandedActivities}
        renderBar={renderBar}
        rowRefs={rowRefs}
        purchaseOrders={purchaseOrders}
        visibleColumns={visibleColumns}
        viewLevel={viewLevel}
      />
    ));
  };

  const handlePrint = async () => {
    if (!selectedProject) return;
    setIsPrinting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      // Logo centered
      try {
        pdf.addImage(
          'https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7',
          'PNG', (pdfWidth / 2) - 20, 5, 40, 14
        );
      } catch(e) { /* skip if logo fails */ }

      // Title
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Project Schedule', 14, 28);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${selectedProject.name} [${selectedProject.code}]`, 14, 35);
      pdf.setFontSize(8);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pdfWidth - 14, 10, { align: 'right' });

      // KPI Cards
      const totalPlanned = activities.reduce((sum, a) => sum + (a.amount || 0), 0);
      const totalActual  = activities.reduce((sum, a) => sum + (a.actualAmount || 0), 0);
      const avgProgress  = activities.length > 0
        ? Math.round(activities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / activities.length)
        : 0;

      const kpis = [
        { label: 'Overall Progress', value: `${avgProgress}%`, color: [59, 130, 246], icon: '%' },
        { label: 'Planned Cost', value: formatCurrency(totalPlanned), color: [30, 64, 175], icon: '$' },
        { label: 'Actual Cost', value: formatCurrency(totalActual), color: [16, 185, 129], icon: 'A' },
        { label: 'Activities', value: `${activities.length}`, color: [100, 116, 139], icon: '#' }
      ];

      const cardWidth = (pdfWidth - 28 - 9) / 4;
      const cardY = 40;
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
          formatCurrency(act.amount),
          formatCurrency(actualCost),
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
      pdf.text('Planned', 21, legendY + 2.5);
      
      pdf.setFillColor(16, 185, 129);
      pdf.rect(40, legendY, 5, 3, 'F');
      pdf.text('Actual (On Time)', 47, legendY + 2.5);
      
      pdf.setFillColor(245, 158, 11);
      pdf.rect(75, legendY, 5, 3, 'F');
      pdf.text('Actual (Delayed)', 82, legendY + 2.5);

      autoTable(pdf, {
        startY: cardY + cardHeight + 10,
        head: [['Activity', 'P. Start', 'A. Start', 'P. Dur', 'A. Dur', 'P. Finish', 'A. Finish', '%', 'P. Cost', 'A. Cost', 'Timeline']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
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
      alert('Failed to generate PDF. Please try again.');
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

  const getProgress = (activity: Activity) => {
    if (activity.percentComplete !== undefined) return activity.percentComplete;
    
    // Fallback to PO status if no explicit progress
    const linkedPO = purchaseOrders.find(po => po.id === activity.poId);
    if (linkedPO) {
      if (linkedPO.completion !== undefined) return linkedPO.completion;
      const lineItem = linkedPO.lineItems.find(li => li.description === activity.description);
      if (lineItem && lineItem.status === 'Completed') return 100;
      if (lineItem && lineItem.status === 'In Progress') return 50;
    }

    if (activity.actualFinishDate) return 100;
    if (activity.actualStartDate && activity.finishDate) {
      const today = new Date();
      const start = new Date(activity.actualStartDate);
      const finish = new Date(activity.finishDate);
      if (start >= finish) return 0;
      const progress = Math.min(100, Math.round(((today.getTime() - start.getTime()) / (finish.getTime() - start.getTime())) * 100));
      return Math.max(0, progress);
    }
    
    return 0;
  };

  const calculateWbsProgress = (wbsId: string): number => {
    const wbsActivities = activities.filter(a => a.wbsId === wbsId);
    const children = wbsLevels.filter(w => w.parentId === wbsId);
    
    let totalAmount = wbsActivities.reduce((sum, a) => sum + a.amount, 0);
    let weightedProgress = wbsActivities.reduce((sum, a) => sum + (a.amount * getProgress(a)), 0);
    
    children.forEach(child => {
      const childActivities = activities.filter(a => a.wbsId === child.id);
      const childAmount = childActivities.reduce((sum, a) => sum + a.amount, 0);
      const childProgress = calculateWbsProgress(child.id);
      totalAmount += childAmount;
      weightedProgress += (childAmount * childProgress);
    });
    
    return totalAmount > 0 ? Math.round(weightedProgress / totalAmount) : 0;
  };

  const calculateDivisionProgress = (divActivities: Activity[]) => {
    const totalAmount = divActivities.reduce((sum, a) => sum + a.amount, 0);
    const weightedProgress = divActivities.reduce((sum, a) => sum + (a.amount * getProgress(a)), 0);
    return totalAmount > 0 ? Math.round(weightedProgress / totalAmount) : 0;
  };

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
      // Ensure division node exists if division changed or is new
      if (updatedActivity.wbsId && updatedActivity.division) {
        const divId = await ensureDivisionNode(updatedActivity.wbsId, updatedActivity.division, selectedProject!.id);
        updatedActivity.divisionId = divId;
      }

      await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
      
      // Trigger rollup from workPackage level
      if (updatedActivity.divisionId) {
        await rollupToParent('workPackage', updatedActivity.divisionId);
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
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-500 pointer-events-none">
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
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-white pointer-events-none">
            {progress}%
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-1 uppercase tracking-wider">
            {getParent(page.id)?.title || 'Schedule Domain'}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {getParent(page.id) && (
              <>
                <span className="text-slate-400 font-normal">{getParent(page.id)?.title}</span>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </>
            )}
            {page.title}
          </h2>
          <p className="text-slate-500 mt-1">Comprehensive project timeline, WBS hierarchy, and performance tracking.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('gantt')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'gantt' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Gantt Chart
          </button>
          <button 
            onClick={() => setActiveTab('activities')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'activities' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Database className="w-4 h-4" />
            Activity List
          </button>
          <button 
            onClick={() => setActiveTab('milestones')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'milestones' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Calendar className="w-4 h-4" />
            Milestones
          </button>
        </div>
      </header>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Overall Progress', 
            value: `${Math.round(activities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / (activities.length || 1))}%`, 
            icon: CheckCircle2, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50',
            desc: 'Average completion across all activities'
          },
          { 
            label: 'Planned Cost', 
            value: formatCurrency(activities.reduce((sum, a) => sum + (a.amount || 0), 0)), 
            icon: DollarSign, 
            color: 'text-slate-600', 
            bg: 'bg-slate-50',
            desc: 'Total baseline budget'
          },
          { 
            label: 'Actual Cost', 
            value: formatCurrency(activities.reduce((sum, a) => sum + (a.actualAmount || 0), 0)), 
            icon: TrendingUp, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            desc: 'Total expenditure to date'
          },
          { 
            label: 'Total Activities', 
            value: activities.length, 
            icon: Database, 
            color: 'text-orange-600', 
            bg: 'bg-orange-50',
            desc: 'Total scheduled work packages'
          }
        ].map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-2xl transition-colors", kpi.bg)}>
                <kpi.icon className={cn("w-6 h-6", kpi.color)} />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KPI</div>
            </div>
            <div className="space-y-1">
              <div className={cn("text-2xl font-black tracking-tight", kpi.color)}>{kpi.value}</div>
              <div className="text-xs font-bold text-slate-900">{kpi.label}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{kpi.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {activeTab === 'gantt' && (
        <>
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search activities or WBS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setZoomLevel('day')}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold transition-all", zoomLevel === 'day' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >Day</button>
              <button 
                onClick={() => setZoomLevel('week')}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold transition-all", zoomLevel === 'week' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >Week</button>
              <button 
                onClick={() => setZoomLevel('month')}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold transition-all", zoomLevel === 'month' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >Month</button>
              <button 
                onClick={() => setZoomLevel('quarter')}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold transition-all", zoomLevel === 'quarter' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
              >Quarter</button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <select 
                  value={viewLevel}
                  onChange={(e) => setViewLevel(e.target.value as ViewLevel)}
                  className="bg-transparent border-none text-[10px] font-bold text-slate-600 px-3 py-1.5 focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="wbs">WBS Level</option>
                  <option value="masterformat">MasterFormat Level</option>
                  <option value="workpackage">Work Package Level</option>
                  <option value="po">Purchase Order Level</option>
                  <option value="poitem">PO Items Level</option>
                </select>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                  className={cn(
                    "p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1",
                    showColumnsMenu && "bg-slate-100 text-blue-600"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Columns</span>
                </button>
                
                {showColumnsMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowColumnsMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50">
                      {Object.keys(visibleColumns).map(col => (
                        <label key={col} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={visibleColumns[col]} 
                            onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-600 capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={handlePrint}
                disabled={isPrinting}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1"
              >
                {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span className="text-[10px] font-bold">Print PDF</span>
              </button>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex h-[70vh] relative"
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
                    className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[300px] h-full flex items-center relative group"
                  >
                    Activity / WBS
                    <div 
                      onMouseDown={(e) => { e.stopPropagation(); setResizingColumn('activityWbs'); }}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-10"
                    />
                  </div>
                  {[
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
                  ].map(col => visibleColumns[col.id] && (
                    <div 
                      key={col.id} 
                      style={{ width: columnWidths[col.id] }}
                      className={cn(
                        "px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest h-full flex items-center relative group",
                        col.align === 'right' ? "justify-end text-right" : "justify-center text-center"
                      )}
                    >
                      {col.label}
                      <div 
                        onMouseDown={(e) => { e.stopPropagation(); setResizingColumn(col.id); }}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-10"
                      />
                    </div>
                  ))}
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
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
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
                      if (!predAct || !predAct.startDate || !predAct.finishDate || !act.startDate) return null;

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

                {/* Gantt Rows */}
                <div className="divide-y divide-slate-100">
                  {renderGanttContent()}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'activities' && (
        <ActivityListView page={page} />
      )}

      {activeTab === 'milestones' && (
        <MilestoneListView page={page} />
      )}

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
  );
};

// Helper Components for Recursive Rendering

interface WbsRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  boqItems: BOQItem[];
  expanded: Record<string, boolean>;
  expandedActivities: Record<string, boolean>;
  onToggle: (id: string) => void;
  onToggleActivity: (id: string) => void;
  getProgress: (activity: Activity) => number;
  searchQuery: string;
  activeTab: ScheduleTab;
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  calculateWbsProgress: (id: string) => number;
  calculateDivisionProgress: (divActivities: Activity[]) => number;
  navigate: (path: string, state?: any) => void;
  setEditingActivity: (act: Activity) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  visibleColumns: Record<string, boolean>;
  activityColWidth: number;
  columnWidths: Record<string, number>;
  viewLevel: ViewLevel;
  getDateColor: (actual: string | undefined, planned: string | undefined) => string;
  getDurationColor: (actual: number | undefined, planned: number | undefined) => string;
  getCostColor: (actual: number | undefined, planned: number | undefined) => string;
}

const ActivityRow: React.FC<{
  act: Activity;
  wbsLevel: number;
  columnWidths: Record<string, number>;
  visibleColumns: Record<string, boolean>;
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
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
  viewLevel: ViewLevel;
}> = ({ 
  act, wbsLevel, columnWidths, visibleColumns, purchaseOrders, vendors, 
  setEditingActivity, onToggleActivity, isActExpanded, navigate, rowRefs, 
  activityColWidth, getProgress, getDateColor, getDurationColor, getCostColor,
  viewLevel
}) => {
  const linkedPO = purchaseOrders.find(po => po.id === act.poId);
  const progress = getProgress(act);
  const poCost = linkedPO ? linkedPO.amount : 0;
  const actualCost = (progress / 100) * poCost;
  const isMilestone = act.duration === 0;

  return (
    <React.Fragment key={act.id}>
      <div 
        ref={el => { if (el) rowRefs.current.set(act.id, el); }}
        className="h-10 flex items-center bg-white hover:bg-blue-50/30 transition-colors border-l-2 border-transparent hover:border-blue-500 cursor-pointer border-b border-slate-100"
        onClick={() => setEditingActivity(act)}
      >
        <div className="flex items-center h-full divide-x divide-slate-200">
          <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(wbsLevel + 1) * 16}px` }}>
            <div className="flex items-center gap-2 mr-2">
              {linkedPO ? (
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
                {linkedPO && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/page/4.2.3', { state: { editPOId: linkedPO.id } });
                    }}
                    className="p-1 hover:bg-blue-50 rounded transition-colors group/po"
                    title={`Open PO: ${linkedPO.id}`}
                  >
                    <ShoppingCart className="w-2.5 h-2.5 text-blue-400 group-hover/po:text-blue-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {visibleColumns.plannedStart && <div style={{ width: columnWidths.plannedStart }} className="h-full flex items-center justify-center text-[9px] font-mono text-slate-500">{act.startDate || 'TBD'}</div>}
          {visibleColumns.actualStart && <div style={{ width: columnWidths.actualStart }} className={cn("h-full flex items-center justify-center text-[9px] font-mono", getDateColor(act.actualStartDate, act.startDate))}>{act.actualStartDate || '-'}</div>}
          {visibleColumns.plannedDuration && <div style={{ width: columnWidths.plannedDuration }} className="h-full flex items-center justify-center text-[9px] font-bold text-slate-500">{isMilestone ? '-' : `${act.duration || 0}d`}</div>}
          {visibleColumns.actualDuration && <div style={{ width: columnWidths.actualDuration }} className={cn("h-full flex items-center justify-center text-[9px] font-bold", getDurationColor(act.actualDuration, act.duration))}>{isMilestone ? '-' : `${act.actualDuration || 0}d`}</div>}
          {visibleColumns.plannedFinish && <div style={{ width: columnWidths.plannedFinish }} className="h-full flex items-center justify-center text-[9px] font-mono text-slate-500">{isMilestone ? '-' : (act.finishDate || 'TBD')}</div>}
          {visibleColumns.actualFinish && <div style={{ width: columnWidths.actualFinish }} className={cn("h-full flex items-center justify-center text-[9px] font-mono", getDateColor(act.actualFinishDate, act.finishDate))}>{isMilestone ? '-' : (act.actualFinishDate || '-')}</div>}
          {visibleColumns.progress && (
            <div style={{ width: columnWidths.progress }} className="h-full flex flex-col items-center justify-center px-2">
              <span className="text-[10px] font-bold text-blue-600 mb-0.5">{progress}%</span>
              <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {visibleColumns.supplier && (
            <div style={{ width: columnWidths.supplier }} className="h-full flex items-center px-2 text-[9px] text-slate-500 truncate">
              {vendors.find(v => v.id === act.supplierId)?.name || linkedPO?.supplier || '-'}
            </div>
          )}
          {visibleColumns.plannedCost && <div style={{ width: columnWidths.plannedCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-slate-900 font-mono">{formatCurrency(act.amount)}</div>}
          {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-blue-600 font-mono">{formatCurrency(poCost)}</div>}
          {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className={cn("h-full flex items-center justify-end px-2 text-[10px] font-bold font-mono", getCostColor(actualCost, poCost))}>{formatCurrency(actualCost)}</div>}
        </div>
      </div>

      {isActExpanded && linkedPO && (
        <div className="bg-slate-50/50 border-l-2 border-blue-200 ml-4">
          {/* PO Header Row if in PO view */}
          {(viewLevel === 'po' || viewLevel === 'poitem') && (
            <div className="h-9 flex items-center bg-blue-50/20 border-b border-blue-100">
              <div className="flex items-center h-full divide-x divide-slate-200">
                <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs - 16, paddingLeft: `${(wbsLevel + 2) * 16}px` }}>
                  <ShoppingCart className="w-3 h-3 text-blue-500 mr-2" />
                  <span className="text-[10px] font-bold text-blue-700 truncate">PO #{linkedPO.id}: {linkedPO.title || 'Purchase Order'}</span>
                </div>
                {visibleColumns.plannedStart && <div style={{ width: columnWidths.plannedStart }} className="h-full flex items-center justify-center text-[9px] font-mono text-slate-400">{linkedPO.date || '-'}</div>}
                {visibleColumns.actualStart && <div style={{ width: columnWidths.actualStart }} className="h-full" />}
                {visibleColumns.plannedDuration && <div style={{ width: columnWidths.plannedDuration }} className="h-full" />}
                {visibleColumns.actualDuration && <div style={{ width: columnWidths.actualDuration }} className="h-full" />}
                {visibleColumns.plannedFinish && <div style={{ width: columnWidths.plannedFinish }} className="h-full" />}
                {visibleColumns.actualFinish && <div style={{ width: columnWidths.actualFinish }} className="h-full" />}
                {visibleColumns.progress && (
                  <div style={{ width: columnWidths.progress }} className="h-full flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-bold text-blue-600 mb-0.5">{linkedPO.completion || 0}%</span>
                    <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${linkedPO.completion || 0}%` }} />
                    </div>
                  </div>
                )}
                {visibleColumns.supplier && <div style={{ width: columnWidths.supplier }} className="h-full flex items-center px-2 text-[9px] text-slate-500 truncate">{linkedPO.supplier}</div>}
                {visibleColumns.plannedCost && <div style={{ width: columnWidths.plannedCost }} className="h-full" />}
                {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-blue-600 font-mono">{formatCurrency(linkedPO.amount)}</div>}
                {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-emerald-600 font-mono">{formatCurrency((linkedPO.completion || 0) / 100 * linkedPO.amount)}</div>}
              </div>
            </div>
          )}

          {/* PO Line Items */}
          {linkedPO.lineItems.map((li, liIdx) => (
            <div 
              key={li.id} 
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
                {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full flex items-center justify-end px-2 font-mono">{formatCurrency(li.amount)}</div>}
                {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className="h-full flex items-center justify-end px-2 font-mono text-emerald-600">{formatCurrency((li.completion || 0) / 100 * li.amount)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </React.Fragment>
  );
};
const WbsRow: React.FC<WbsRowProps> = ({ 
  wbs, allWbs, activities, boqItems, expanded, expandedActivities, onToggle, 
  onToggleActivity, getProgress, searchQuery, activeTab, purchaseOrders, vendors, 
  calculateWbsProgress, calculateDivisionProgress, navigate, setEditingActivity, 
  rowRefs, visibleColumns, activityColWidth, columnWidths, viewLevel,
  getDateColor, getDurationColor, getCostColor
}) => {
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const hasDivisionNodes = children.some(c => c.type === 'Division');

  const wbsActivities = activities.filter(a => {
    if (wbs.type === 'Division') return a.divisionId === wbs.id;
    if (wbs.type === 'Floor' && hasDivisionNodes) return false;
    return a.wbsId === wbs.id;
  });

  const isExpanded = expanded[wbs.id];

  const activitiesByDivision = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      if (!groups[div]) groups[div] = [];
      groups[div].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivision).sort();
  
  if (searchQuery && !wbs.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !wbsActivities.some(a => a.description.toLowerCase().includes(searchQuery.toLowerCase()))) {
    return null;
  }

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

  const wbsProgress = wbs.progress ?? calculateWbsProgress(wbs.id);
  const wbsPlannedCost = wbs.plannedCost ?? (wbsActivities.reduce((sum, a) => sum + a.amount, 0) + children.reduce((sum, c) => sum + activities.filter(a => a.wbsId === c.id).reduce((s, a) => s + a.amount, 0), 0));
  const wbsActualCost = wbs.actualCost ?? wbsActivities.reduce((sum, a) => sum + (a.actualAmount || 0), 0);
  const wbsPlannedStart = wbs.plannedStart || (wbsActivities.length > 0 ? wbsActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '') : '');
  const wbsPlannedFinish = wbs.plannedFinish || (wbsActivities.length > 0 ? wbsActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '') : '');
  const wbsActualStart = wbs.actualStart || (wbsActivities.length > 0 ? wbsActivities.reduce((min, a) => !min || (a.actualStartDate && a.actualStartDate < min) ? a.actualStartDate : min, '') : '');
  const wbsActualFinish = wbs.actualFinish || (wbsActivities.length > 0 ? wbsActivities.reduce((max, a) => !max || (a.actualFinishDate && a.actualFinishDate > max) ? a.actualFinishDate : max, '') : '');
  const wbsPlannedDuration = wbs.plannedDuration || (wbsPlannedStart && wbsPlannedFinish ? Math.ceil((new Date(wbsPlannedFinish).getTime() - new Date(wbsPlannedStart).getTime()) / (1000 * 60 * 60 * 24)) : 0);
  const wbsActualDuration = wbs.actualDuration || (wbsActualStart && wbsActualFinish ? Math.ceil((new Date(wbsActualFinish).getTime() - new Date(wbsActualStart).getTime()) / (1000 * 60 * 60 * 24)) : 0);

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
            {(children.length > 0 || wbsActivities.length > 0) ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-slate-400 mr-2" />
            ) : <div className="w-6" />}
            <Database className="w-3.5 h-3.5 text-blue-500 mr-2" />
            <span className="text-xs font-bold text-slate-700 truncate">{wbs.title}</span>
          </div>
          {visibleColumns.plannedStart && <div style={{ width: columnWidths.plannedStart }} className="h-full flex items-center px-2 text-[10px] text-slate-500 font-mono">{wbs.plannedStart || '-'}</div>}
          {visibleColumns.actualStart && <div style={{ width: columnWidths.actualStart }} className="h-full flex items-center px-2 text-[10px] text-slate-500 font-mono">{wbs.actualStart || '-'}</div>}
          {visibleColumns.plannedDuration && <div style={{ width: columnWidths.plannedDuration }} className="h-full flex items-center px-2 text-[10px] text-slate-500 font-bold">{wbs.plannedDuration ? `${wbs.plannedDuration}d` : '-'}</div>}
          {visibleColumns.actualDuration && <div style={{ width: columnWidths.actualDuration }} className="h-full flex items-center px-2 text-[10px] text-slate-500 font-bold">{wbs.actualDuration ? `${wbs.actualDuration}d` : '-'}</div>}
          {visibleColumns.plannedFinish && <div style={{ width: columnWidths.plannedFinish }} className="h-full flex items-center px-2 text-[10px] text-slate-500 font-mono">{wbs.plannedFinish || '-'}</div>}
          {visibleColumns.actualFinish && <div style={{ width: columnWidths.actualFinish }} className="h-full flex items-center px-2 text-[10px] text-slate-500 font-mono">{wbs.actualFinish || '-'}</div>}
          {visibleColumns.progress && (
            <div style={{ width: columnWidths.progress }} className="h-full flex flex-col items-center justify-center px-2">
              <span className="text-[10px] font-bold text-blue-600 mb-0.5">{wbsProgress}%</span>
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${wbsProgress}%` }} />
              </div>
            </div>
          )}
          {visibleColumns.supplier && <div style={{ width: columnWidths.supplier }} className="h-full" />}
          {visibleColumns.plannedCost && <div style={{ width: columnWidths.plannedCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-slate-900 font-mono">{formatCurrency(wbsPlannedCost)}</div>}
          {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full" />}
          {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-emerald-600 font-mono">{formatCurrency(wbsActualCost)}</div>}
        </div>
      </div>
      
      {isExpanded && (
        <>
          {children.map(child => (
            <WbsRow 
              key={child.id} 
              wbs={child} 
              allWbs={allWbs} 
              activities={activities} 
              boqItems={boqItems}
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
              calculateDivisionProgress={calculateDivisionProgress}
              navigate={navigate}
              setEditingActivity={setEditingActivity}
              rowRefs={rowRefs}
              visibleColumns={visibleColumns}
              activityColWidth={activityColWidth}
              columnWidths={columnWidths}
              viewLevel={viewLevel}
            />
          ))}
          {!hasDivisionNodes && activeDivisions.map(divId => {
            const division = masterFormatDivisions.find(d => d.id === divId);
            const divActivities = activitiesByDivision[divId];
            const divKey = `${wbs.id}-${divId}`;
            const isDivExpanded = expanded[divKey] ?? true;
            const divProgress = calculateDivisionProgress(divActivities);

            return (
              <React.Fragment key={divKey}>
                <div 
                  className="h-10 flex items-center bg-slate-50/30 hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-100"
                  onClick={() => onToggle(divKey)}
                >
                  <div className="flex items-center h-full divide-x divide-slate-200">
                    <div className="flex items-center px-4 min-w-[300px] h-full" style={{ width: columnWidths.activityWbs, paddingLeft: `${(wbs.level + 1) * 16}px` }}>
                      {isDivExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 mr-2" /> : <ChevronRight className="w-3 h-3 text-slate-400 mr-2" />}
                      <Database className="w-3 h-3 text-slate-400 mr-2" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        {division?.title || 'Unknown Division'}
                      </span>
                    </div>
                    {visibleColumns.plannedStart && <div style={{ width: columnWidths.plannedStart }} className="h-full flex items-center px-2 text-[10px] text-slate-400 font-mono">{wbsActivities.reduce((min, a) => !min || (a.startDate && a.startDate < min) ? a.startDate : min, '') || '-'}</div>}
                    {visibleColumns.actualStart && <div style={{ width: columnWidths.actualStart }} className="h-full flex items-center px-2 text-[10px] text-slate-400 font-mono">{wbsActivities.reduce((min, a) => !min || (a.actualStartDate && a.actualStartDate < min) ? a.actualStartDate : min, '') || '-'}</div>}
                    {visibleColumns.plannedDuration && <div style={{ width: columnWidths.plannedDuration }} className="h-full flex items-center px-2 text-[10px] text-slate-400 font-bold">{wbsActivities.reduce((sum, a) => sum + (a.duration || 0), 0)}d</div>}
                    {visibleColumns.actualDuration && <div style={{ width: columnWidths.actualDuration }} className="h-full flex items-center px-2 text-[10px] text-slate-400 font-bold">{wbsActivities.reduce((sum, a) => sum + (a.actualDuration || 0), 0)}d</div>}
                    {visibleColumns.plannedFinish && <div style={{ width: columnWidths.plannedFinish }} className="h-full flex items-center px-2 text-[10px] text-slate-400 font-mono">{wbsActivities.reduce((max, a) => !max || (a.finishDate && a.finishDate > max) ? a.finishDate : max, '') || '-'}</div>}
                    {visibleColumns.actualFinish && <div style={{ width: columnWidths.actualFinish }} className="h-full flex items-center px-2 text-[10px] text-slate-400 font-mono">{wbsActivities.reduce((max, a) => !max || (a.actualFinishDate && a.actualFinishDate > max) ? a.actualFinishDate : max, '') || '-'}</div>}
                    {visibleColumns.progress && (
                      <div style={{ width: columnWidths.progress }} className="h-full flex flex-col items-center justify-center px-2">
                        <span className="text-[10px] font-bold text-blue-400 mb-0.5">{divProgress}%</span>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400" style={{ width: `${divProgress}%` }} />
                        </div>
                      </div>
                    )}
                    {visibleColumns.supplier && <div style={{ width: columnWidths.supplier }} className="h-full" />}
                    {visibleColumns.plannedCost && <div style={{ width: columnWidths.plannedCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-slate-400 font-mono">
                      {formatCurrency(divActivities.reduce((sum, a) => sum + a.amount, 0))}
                    </div>}
                    {visibleColumns.poCost && <div style={{ width: columnWidths.poCost }} className="h-full" />}
                    {visibleColumns.actualCost && <div style={{ width: columnWidths.actualCost }} className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-emerald-400 font-mono">
                      {formatCurrency(divActivities.reduce((sum, a) => sum + (a.actualAmount || 0), 0))}
                    </div>}
                  </div>
                </div>
                
                {isDivExpanded && divActivities.map(act => (
                  <ActivityRow 
                    key={act.id}
                    act={act}
                    wbsLevel={wbs.level + 1}
                    columnWidths={columnWidths}
                    visibleColumns={visibleColumns}
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
                    viewLevel={viewLevel}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

interface GanttRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  expanded: Record<string, boolean>;
  expandedActivities: Record<string, boolean>;
  renderBar: (activity: Activity) => React.ReactNode;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  purchaseOrders: PurchaseOrder[];
  visibleColumns: Record<string, boolean>;
  viewLevel: ViewLevel;
}

const GanttRow: React.FC<GanttRowProps> = ({ 
  wbs, allWbs, activities, expanded, expandedActivities, renderBar, 
  rowRefs, purchaseOrders, visibleColumns, viewLevel 
}) => {
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const wbsActivities = activities.filter(a => a.wbsId === wbs.id);
  const isExpanded = expanded[wbs.id];

  const activitiesByDivision = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      if (!groups[div]) groups[div] = [];
      groups[div].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivision).sort();

  return (
    <>
      <div className={cn("h-10 border-b border-slate-100", wbs.level === 1 ? "bg-slate-50/50" : "")} />
      {isExpanded && (
        <>
          {children.map(child => (
            <GanttRow 
              key={child.id} 
              wbs={child} 
              allWbs={allWbs} 
              activities={activities} 
              expanded={expanded} 
              expandedActivities={expandedActivities}
              renderBar={renderBar} 
              rowRefs={rowRefs} 
              purchaseOrders={purchaseOrders}
              visibleColumns={visibleColumns}
              viewLevel={viewLevel}
            />
          ))}
          {activeDivisions.map(divId => {
            const divActivities = activitiesByDivision[divId];
            const divKey = `${wbs.id}-${divId}`;
            const isDivExpanded = expanded[divKey] ?? true;

            return (
              <React.Fragment key={divKey}>
                {/* Division Header Row in Gantt */}
                <div className="h-10 border-b border-slate-100 bg-slate-50/10" />
                
                {isDivExpanded && divActivities.map(act => {
                  const isActExpanded = expandedActivities[act.id];
                  const linkedPO = purchaseOrders.find(po => po.id === act.poId);

                  return (
                    <React.Fragment key={act.id}>
                      <div 
                        ref={el => { if (el) rowRefs.current.set(`gantt-${act.id}`, el); }}
                        className="h-10 flex items-center bg-white relative border-b border-slate-100"
                      >
                        {renderBar(act)}
                      </div>
                      {isActExpanded && linkedPO && (
                        <div className="bg-slate-50/30">
                          {/* PO Header Row in Gantt if in PO view */}
                          {(viewLevel === 'po' || viewLevel === 'poitem') && (
                            <div className="h-9 border-b border-blue-50/50" />
                          )}
                          {linkedPO.lineItems.map(li => (
                            <div key={li.id} className="h-8 border-b border-slate-50/50" />
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

