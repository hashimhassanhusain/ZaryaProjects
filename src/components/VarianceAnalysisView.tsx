import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  Save, 
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  Download,
  Loader2,
  RefreshCw,
  X,
  Printer
} from 'lucide-react';
import { Project, WBSLevel, Activity, User, LessonEntry, PurchaseOrder } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper functions for live calculations
function getCostCompletion(activity: Activity, purchaseOrders: PurchaseOrder[]): number {
  const linkedPOs = purchaseOrders.filter(p => p.activityId === activity.id);
  if (linkedPOs.length === 0) return 0;
  const bac = activity.plannedCost || activity.amount || 0;
  if (bac === 0) return 0;
  const ev = linkedPOs.reduce((sum, po) => {
    return sum + (po.lineItems?.reduce((s, li) => s + (li.amount * (li.completion || 0) / 100), 0)
      ?? (po.amount * (po.completion || 0) / 100));
  }, 0);
  return Math.min(100, Math.round((ev / bac) * 100));
}

function getTimeCompletion(activity: Activity, purchaseOrders: PurchaseOrder[]): number {
  const today = new Date();
  if (activity.actualFinishDate) return 100;
  const linkedPOs = purchaseOrders.filter(p => p.activityId === activity.id);
  const actualStart = linkedPOs.length > 0
    ? linkedPOs.reduce((min, p) => (!min || (p.date && p.date < min) ? p.date : min), '')
    : activity.actualStartDate || '';
  const plannedStart = activity.startDate || actualStart || '';
  const plannedFinish = activity.finishDate || '';
  if (!plannedStart || !plannedFinish) return 0;
  const start = new Date(plannedStart);
  const finish = new Date(plannedFinish);
  const totalDuration = finish.getTime() - start.getTime();
  if (totalDuration <= 0) return 0;
  if (today < start) return 0;
  if (today > finish) return 99;
  return Math.max(0, Math.min(99, Math.round(((today.getTime() - start.getTime()) / totalDuration) * 100)));
}

function getProgress(activity: Activity, purchaseOrders: PurchaseOrder[]): number {
  return getCostCompletion(activity, purchaseOrders);
}

function getWbsActivities(wbs: WBSLevel, activities: Activity[]): Activity[] {
  return activities.filter(a => {
    if (wbs.type === 'Division' || wbs.type === 'Cost Account') {
      if (a.divisionId === wbs.id || a.wbsId === wbs.id) return true;
      const divCode = wbs.divisionCode || wbs.code;
      const actDiv = a.division || '01';
      return !a.wbsId && !a.divisionId && actDiv === divCode;
    }
    
    // For other levels, we can assume direct link if it exists
    if (a.wbsId === wbs.id) return true;
    
    return false;
  });
}

function collectAllDescendantActivities(wbsId: string | null, allWbs: WBSLevel[], activities: Activity[]): Activity[] {
  if (!wbsId) return activities; // Project root

  const node = allWbs.find(w => w.id === wbsId);
  if (!node) return [];

  const directActivities = getWbsActivities(node, activities);

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

function getAllDescendantWbsIds(wbsId: string, wbsLevels: WBSLevel[]): string[] {
  const children = wbsLevels.filter(w => w.parentId === wbsId);
  return [wbsId, ...children.flatMap(child => getAllDescendantWbsIds(child.id, wbsLevels))];
}

interface VarianceAnalysisViewProps {
  project: Project;
}

interface VarianceData {
  id?: string;
  projectId: string;
  date: string;
  scheduleRootCause: string;
  schedulePlannedResponse: string;
  costRootCause: string;
  costPlannedResponse: string;
  qualityVariances: {
    id: string;
    item: string;
    defect: string;
    planned: string;
    actual: string;
    rootCause: string;
    lessonLearned: boolean;
  }[];
  createdAt?: any;
  updatedAt?: any;
}

export const VarianceAnalysisView: React.FC<VarianceAnalysisViewProps> = ({ project }) => {
  const { t, isRtl } = useLanguage();
  const { currency: baseCurrency, formatAmount } = useCurrency();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [varianceData, setVarianceData] = useState<VarianceData>({
    projectId: project.id,
    date: new Date().toISOString().split('T')[0],
    scheduleRootCause: '',
    schedulePlannedResponse: '',
    costRootCause: '',
    costPlannedResponse: '',
    qualityVariances: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // PDF Preview & Drive states
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pendingDrivePath, setPendingDrivePath] = useState('');

  useEffect(() => {
    // 1. Fetch WBS Levels (Cost Accounts & Work Packages)
    const qWbs = query(collection(db, 'wbs'), where('projectId', '==', project.id));
    const unsubWbs = onSnapshot(qWbs, (snap) => {
      setWbsLevels(snap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
    });

    // 2. Fetch Activities for detailed rollups
    const qActivities = query(collection(db, 'activities'), where('projectId', '==', project.id));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    // 3. Fetch Purchase Orders for actual cost calculation
    const qPo = query(collection(db, 'purchaseOrders'), where('projectId', '==', project.id));
    const unsubPo = onSnapshot(qPo, (snap) => {
      setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    });

    // 4. Fetch latest Variance Analysis record
    const qVariance = query(
      collection(db, 'variance_analyses'), 
      where('projectId', '==', project.id),
      orderBy('date', 'desc')
    );
    const unsubVariance = onSnapshot(qVariance, (snap) => {
      if (!snap.empty) {
        setVarianceData({ id: snap.docs[0].id, ...snap.docs[0].data() } as VarianceData);
      }
      setIsLoading(false);
    });

    return () => {
      unsubWbs();
      unsubActivities();
      unsubPo();
      unsubVariance();
    };
  }, [project.id]);

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const calculateVariances = () => {
    // Project Spans
    const projectSpan = calcDateSpan(activities);
    const totalPlannedDuration = projectSpan.duration;
    const totalActualDuration = projectSpan.actualDuration;

    // Correct Project-wide costs (sum of ALL activities and ALL direct POs)
    const plannedCost = activities.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0) +
                       purchaseOrders.filter(po => !po.activityId && (!po.wbsId || !wbsLevels.some(w => w.id === po.wbsId))).reduce((sum, po) => sum + po.amount, 0);
    
    const actualCost = activities.reduce((sum, a) => {
      const actPOs = purchaseOrders.filter(p => p.activityId === a.id);
      if (actPOs.length > 0) {
        return sum + actPOs.reduce((s, p) => s + (p.amount * (p.completion || 0) / 100), 0);
      }
      return sum + (getProgress(a, purchaseOrders) / 100 * (a.plannedCost || a.amount || 0));
    }, 0) + purchaseOrders.filter(po => !po.activityId && (!po.wbsId || !wbsLevels.some(w => w.id === po.wbsId))).reduce((sum, po) => sum + (po.amount * (po.completion || 0) / 100), 0);

    // Weighted Progress Calculation
    let totalValue = activities.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0) + 
                    purchaseOrders.filter(p => !p.activityId).reduce((sum, p) => sum + p.amount, 0);
    let weightedProgress = activities.reduce((sum, a) => sum + ((a.plannedCost || a.amount || 0) * getProgress(a, purchaseOrders)), 0) +
                        purchaseOrders.filter(p => !p.activityId).reduce((sum, p) => sum + (p.amount * (p.completion || 0)), 0);
    
    const overallProgress = totalValue > 0 ? Math.round(weightedProgress / totalValue) : 0;

    const costVar = actualCost - plannedCost;
    const costVarPct = plannedCost > 0 ? (costVar / plannedCost) * 100 : 0;
    
    const schedVar = totalActualDuration - totalPlannedDuration;
    const schedVarPct = totalPlannedDuration > 0 ? (schedVar / totalPlannedDuration) * 100 : 0;

    return {
      plannedCost,
      actualCost,
      costVar,
      costVarPct,
      totalPlannedDuration,
      totalActualDuration,
      schedVar,
      schedVarPct,
      overallProgress
    };
  };

  const stats = calculateVariances();

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast.error('Authentication required');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...varianceData,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      };

      if (varianceData.id) {
        await updateDoc(doc(db, 'variance_analyses', varianceData.id), data);
        toast.success('Variance Analysis updated');
      } else {
        await addDoc(collection(db, 'variance_analyses'), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast.success('Variance Analysis submitted');
      }

      // Automatically sync to Lessons Learned if checked
      for (const qv of varianceData.qualityVariances) {
        if (qv.lessonLearned && qv.rootCause) {
          await addDoc(collection(db, 'lessons_learned'), {
            projectId: project.id,
            category: 'Quality',
            description: `Quality issue: ${qv.defect} on ${qv.item}. Root Cause: ${qv.rootCause}`,
            recommendation: 'Improve inspection protocols for this specific work item.',
            impact: 'Negative',
            status: 'Published',
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid,
            sourceType: 'Variance Analysis',
            sourceId: varianceData.id || 'new'
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'variance_analyses');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDFAction = () => {
    const doc = new jsPDF();
    const projectCode = project?.code || 'ZRY';
    const dateStr = varianceData.date;
    const fileName = `${projectCode}-ZRY-VARIANCE-ANALYSIS-${dateStr}.pdf`;
    
    // Path as per project structure
    const path = `MONITORING_CONTROLLING_06/06.2_VARIANCE_ANALYSIS_REPORTS`;

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text(`VARIANCE ANALYSIS REPORT`, 105, 20, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Project: ${project?.name || 'N/A'} (${projectCode})`, 20, 35);
    doc.text(`Date: ${dateStr}`, 20, 42);
    doc.text(`Generated By: ${auth.currentUser?.email}`, 20, 49);

    // Stats
    const stats = calculateVariances();
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Performance Summary', 20, 60);
    
    (doc as any).autoTable({
      startY: 65,
      head: [['Category', 'Planned', 'Actual', 'Variance', '%']],
      body: [
        [`Schedule (Days)`, stats.totalPlannedDuration, stats.totalActualDuration, stats.schedVar, `${stats.schedVarPct.toFixed(1)}%`],
        [`Cost (${baseCurrency})`, formatAmount(stats.plannedCost, baseCurrency), formatAmount(stats.actualCost, baseCurrency), formatAmount(stats.costVar, baseCurrency), `${stats.costVarPct.toFixed(1)}%`]
      ],
      headStyles: { fillColor: [30, 64, 175] }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Root Causes
    doc.setFontSize(14);
    doc.text('Analysis & Observations', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Schedule Root Cause:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const schLines = doc.splitTextToSize(varianceData.scheduleRootCause || 'N/A', 170);
    doc.text(schLines, 20, currentY);
    currentY += (schLines.length * 5) + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Cost Root Cause:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const costLines = doc.splitTextToSize(varianceData.costRootCause || 'N/A', 170);
    doc.text(costLines, 20, currentY);
    currentY += (costLines.length * 5) + 15;

    // Quality Table
    if (varianceData.qualityVariances.length > 0) {
      doc.setFontSize(14);
      doc.text('Quality Variances', 20, currentY);
      currentY += 5;
      (doc as any).autoTable({
        startY: currentY,
        head: [['Work Item', 'Defect', 'Deviation', 'Root Cause']],
        body: varianceData.qualityVariances.map(v => [v.item, v.defect, `${v.planned} vs ${v.actual}`, v.rootCause]),
        headStyles: { fillColor: [245, 158, 11] }
      });
    }

    const pdfBlob = doc.output('blob');
    const previewUrl = URL.createObjectURL(pdfBlob);
    
    setPdfPreviewBlob(pdfBlob);
    setPdfFileName(fileName);
    setPdfPreviewUrl(previewUrl);
    setPendingDrivePath(path);
    setShowPdfConfirm(true);
  };

  const uploadToDrive = async () => {
    if (!pdfPreviewBlob || !project || !pendingDrivePath) {
      toast.error('Missing data for upload');
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfPreviewBlob, pdfFileName);
      formData.append('projectRootId', project?.driveFolderId || '');
      formData.append('path', pendingDrivePath);

      const response = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      toast.success('Archived to Google Drive successfully');
      setShowPdfConfirm(false);
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const addQualityVariance = () => {
    setVarianceData(prev => ({
      ...prev,
      qualityVariances: [
        ...prev.qualityVariances,
        {
          id: crypto.randomUUID(),
          item: '',
          defect: '',
          planned: '',
          actual: '',
          rootCause: '',
          lessonLearned: true
        }
      ]
    }));
  };

  const removeQualityVariance = (id: string) => {
    setVarianceData(prev => ({
      ...prev,
      qualityVariances: prev.qualityVariances.filter(v => v.id !== id)
    }));
  };

  const updateQualityVariance = (id: string, field: string, value: any) => {
    setVarianceData(prev => ({
      ...prev,
      qualityVariances: prev.qualityVariances.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-12 p-8 pb-24 max-w-7xl mx-auto", isRtl && "text-right")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">VARIANCE ANALYSIS</h1>
          <p className="text-slate-500 font-medium">Project: {project.name} | {project.code}</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all">
            <History className="w-5 h-5" />
            History
          </button>
          <button 
            onClick={() => {
              handleSave();
              generatePDFAction();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-5 h-5" />
            Archive to Drive
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Submit Analysis
          </button>
        </div>
      </div>

      {/* Section 01: Schedule Variance */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">SECTION 01 / SCHEDULE VARIANCE ANALYSIS</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VarianceCard 
            label="PLANNED RESULT"
            value={`${stats.totalPlannedDuration} DAYS`}
            icon={<Clock className="w-6 h-6" />}
          />
          <VarianceCard 
            label="ACTUAL RESULT"
            value={`${stats.totalActualDuration} DAYS`}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <VarianceCard 
            label="VARIANCE"
            value={`${stats.schedVar > 0 ? '+' : ''}${stats.schedVar} DAYS`}
            subValue={`${stats.schedVarPct.toFixed(1)}% ${stats.schedVar > 0 ? 'DELAY' : 'AHEAD'}`}
            status={stats.schedVar > 0 ? 'danger' : 'success'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ROOT CAUSE</label>
            <textarea 
              value={varianceData.scheduleRootCause}
              onChange={e => setVarianceData(prev => ({ ...prev, scheduleRootCause: e.target.value }))}
              placeholder="Explain the reasons for schedule variance..."
              className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PLANNED RESPONSE</label>
            <textarea 
              value={varianceData.schedulePlannedResponse}
              onChange={e => setVarianceData(prev => ({ ...prev, schedulePlannedResponse: e.target.value }))}
              placeholder="What actions are being taken to recover?"
              className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>
        </div>
      </section>

      {/* Section 02: Cost Variance */}
      <section className="space-y-6 pt-12 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">SECTION 02 / COST VARIANCE ANALYSIS</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VarianceCard 
            label="PLANNED RESULT"
            value={`$${(stats.plannedCost / 1000000).toFixed(2)}M`}
            icon={<DollarSign className="w-6 h-6" />}
          />
          <VarianceCard 
            label="ACTUAL RESULT"
            value={`$${(stats.actualCost / 1000000).toFixed(2)}M`}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <VarianceCard 
            label="VARIANCE"
            value={`${stats.costVar > 0 ? '+' : ''}$${(stats.costVar / 1000).toFixed(0)}K`}
            subValue={`${stats.costVarPct.toFixed(1)}% ${stats.costVar > 0 ? 'OVER' : 'UNDER'}`}
            status={stats.costVar > 0 ? 'danger' : 'success'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ROOT CAUSE</label>
            <textarea 
              value={varianceData.costRootCause}
              onChange={e => setVarianceData(prev => ({ ...prev, costRootCause: e.target.value }))}
              placeholder="Explain the reasons for budget overrun or savings..."
              className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PLANNED RESPONSE</label>
            <textarea 
              value={varianceData.costPlannedResponse}
              onChange={e => setVarianceData(prev => ({ ...prev, costPlannedResponse: e.target.value }))}
              placeholder="Budget adjustments or cost saving measures..."
              className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>
        </div>
      </section>

      {/* NEW: Comparison Table (Cost Centers & Work Packages) */}
      <section className="space-y-6 pt-12 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">DETAILED PERFORMANCE TABLE</h2>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">WBS Element</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Cost</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual Cost</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Days</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual Days</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Project Root Level (MS Project Style) */}
                <tr className="bg-slate-900 text-white font-bold">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/10">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{project.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.code}</span>
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-white/10 text-white">
                            PROJECT SUMMARY
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center tabular-nums font-bold">
                    {formatAmount(stats.plannedCost, baseCurrency)}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-center tabular-nums font-bold",
                    stats.costVar > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {formatAmount(stats.actualCost, baseCurrency)}
                  </td>
                  <td className="px-6 py-4 text-center tabular-nums text-slate-300">
                    {stats.totalPlannedDuration}d
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-center tabular-nums",
                    stats.schedVar > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {stats.totalActualDuration}d
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            stats.overallProgress > 90 ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${stats.overallProgress}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {stats.overallProgress}% OVERALL PROGRESS
                      </span>
                    </div>
                  </td>
                </tr>

                {wbsLevels
                  .filter(n => !n.parentId || n.type === 'Cost Account')
                  .map(node => renderWBSRow(node, wbsLevels, activities, purchaseOrders, expandedNodes, toggleNode, isRtl, formatAmount, baseCurrency))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 03: Quality Variance */}
      <section className="space-y-6 pt-12 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">SECTION 03 / QUALITY VARIANCE ANALYSIS</h2>
          </div>
          <button 
            onClick={addQualityVariance}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all border border-amber-200/50"
          >
            <Plus className="w-4 h-4" />
            Add quality finding
          </button>
        </div>

        <div className="space-y-4">
          {varianceData.qualityVariances.map((qv, idx) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={qv.id} 
              className="bg-white rounded-3xl border border-slate-200 p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 relative group"
            >
              <button 
                onClick={() => removeQualityVariance(qv.id)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="lg:col-span-3 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Item</label>
                  <input 
                    value={qv.item}
                    onChange={e => updateQualityVariance(qv.id, 'item', e.target.value)}
                    placeholder="e.g. Marble Installation"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defect/Variance</label>
                  <input 
                    value={qv.defect}
                    onChange={e => updateQualityVariance(qv.id, 'defect', e.target.value)}
                    placeholder="e.g. Surface inconsistency"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planned Requirement</label>
                  <input 
                    value={qv.planned}
                    onChange={e => updateQualityVariance(qv.id, 'planned', e.target.value)}
                    placeholder="Standard Spec"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual Result</label>
                  <input 
                    value={qv.actual}
                    onChange={e => updateQualityVariance(qv.id, 'actual', e.target.value)}
                    placeholder="Observed Result"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROOT CAUSE (MANUAL ENTRY)</label>
                <textarea 
                  value={qv.rootCause}
                  onChange={e => updateQualityVariance(qv.id, 'rootCause', e.target.value)}
                  placeholder="Why did this deviation occur?"
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="lg:col-span-2 flex flex-col justify-center items-center gap-2 border-l border-slate-100 pl-4">
                <label className="flex items-center gap-2 cursor-pointer p-4 hover:bg-slate-50 rounded-2xl transition-all w-full justify-center">
                  <div className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                    qv.lessonLearned ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white"
                  )}>
                    {qv.lessonLearned && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <input 
                    type="checkbox"
                    className="hidden"
                    checked={qv.lessonLearned}
                    onChange={e => updateQualityVariance(qv.id, 'lessonLearned', e.target.checked)}
                  />
                  <span className="text-xs font-bold text-slate-600">Sync LL</span>
                </label>
                <p className="text-[10px] text-slate-400 text-center font-medium">Log to Lessons Learned</p>
              </div>
            </motion.div>
          ))}
          {varianceData.qualityVariances.length === 0 && (
            <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 space-y-3">
              <ShieldCheck className="w-12 h-12 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No quality variances logged</p>
            </div>
          )}
        </div>
      </section>

      {/* PDF Confirmation Modal */}
      <AnimatePresence>
        {showPdfConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPdfConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 uppercase">Analysis Review</h3>
                    <p className="text-xs text-slate-500 font-medium">Verify data before archival</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (pdfPreviewUrl) window.open(pdfPreviewUrl, '_blank');
                    }}
                    className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                  >
                    View Full PDF
                  </button>
                  <button 
                    onClick={() => setShowPdfConfirm(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                {pdfPreviewUrl && (
                  <iframe 
                    src={pdfPreviewUrl} 
                    className="w-full h-[600px] border border-slate-200 rounded-2xl shadow-inner bg-white"
                  />
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
                <div className="flex items-center gap-4 text-slate-500">
                  <Printer className="w-5 h-5 text-slate-300" />
                  <p className="text-xs font-medium">Ready to archive as: <span className="text-slate-900 font-bold">{pdfFileName}</span></p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPdfConfirm(false)}
                    className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-all"
                  >
                    Back to Edit
                  </button>
                  <button 
                    onClick={uploadToDrive}
                    disabled={isUploadingToDrive}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isUploadingToDrive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Confirm & Archive to Drive
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <div className="pt-12 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        <span>ARCHITECTURAL MONOLITH | INTERNAL ANALYSIS PROTOCOL 4.0</span>
        <span>PAGE 1 OF 1</span>
      </div>
    </div>
  );
};

const VarianceCard = ({ label, value, subValue, icon, status = 'info' }: { 
  label: string; 
  value: string; 
  subValue?: string; 
  icon?: React.ReactNode;
  status?: 'info' | 'success' | 'danger' | 'warning';
}) => {
  const colors = {
    info: "border-slate-200 text-slate-900 border-l-4 border-l-slate-900",
    success: "border-emerald-200 bg-emerald-50/10 text-emerald-700 border-l-4 border-l-emerald-500",
    danger: "border-rose-200 bg-rose-50/10 text-rose-700 border-l-4 border-l-rose-500",
    warning: "border-amber-200 bg-amber-50/10 text-amber-700 border-l-4 border-l-amber-500"
  };

  return (
    <div className={cn("p-8 bg-white border rounded-3xl space-y-4", colors[status])}>
      <div className="flex justify-between items-start">
        <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{label}</label>
        {icon && <div className="text-slate-300">{icon}</div>}
      </div>
      <div className="space-y-1">
        <h3 className="text-4xl font-black tabular-nums">{value}</h3>
        {subValue && <p className="text-sm font-bold opacity-80 uppercase">{subValue}</p>}
      </div>
    </div>
  );
};

const getRobustTotals = (id: string, wbsLevels: WBSLevel[], activities: Activity[], purchaseOrders: PurchaseOrder[]): { pc: number; ac: number; pd: number; ad: number; costProgress: number; timeProgress: number; spi: number } => {
  const wbs = wbsLevels.find(w => w.id === id);
  if (!wbs) return { pc: 0, ac: 0, pd: 0, ad: 0, costProgress: 0, timeProgress: 0, spi: 1 };

  const descendantActs = collectAllDescendantActivities(id, wbsLevels, activities);
  const span = calcDateSpan(descendantActs);
  const descendantWbsIds = getAllDescendantWbsIds(id, wbsLevels);
  const descendantActIds = descendantActs.map(a => a.id);

  const pc = descendantActs.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0) + 
             purchaseOrders.filter(po => !po.activityId && po.wbsId && descendantWbsIds.includes(po.wbsId)).reduce((sum, po) => sum + po.amount, 0);
  
  const ac = descendantActs.reduce((sum, a) => {
    const actPOs = purchaseOrders.filter(p => p.activityId === a.id);
    if (actPOs.length > 0) {
      return sum + actPOs.reduce((s, p) => s + (p.amount * (p.completion || 0) / 100), 0);
    }
    return sum + (getCostCompletion(a, purchaseOrders) / 100 * (a.plannedCost || a.amount || 0));
  }, 0) + purchaseOrders.filter(po => !po.activityId && po.wbsId && descendantWbsIds.includes(po.wbsId)).reduce((sum, po) => sum + (po.amount * (po.completion || 0) / 100), 0);

  // Weighted Cost Progress
  let totalValueForProgress = descendantActs.reduce((sum, a) => sum + (a.plannedCost || a.amount || 0), 0) + 
                             purchaseOrders.filter(po => !po.activityId && po.wbsId && descendantWbsIds.includes(po.wbsId)).reduce((sum, p) => sum + p.amount, 0);
  let weightedCostProgress = descendantActs.reduce((sum, a) => sum + ((a.plannedCost || a.amount || 0) * getCostCompletion(a, purchaseOrders)), 0) +
                        purchaseOrders.filter(po => !po.activityId && po.wbsId && descendantWbsIds.includes(po.wbsId)).reduce((sum, p) => sum + (p.amount * (p.completion || 0)), 0);
  const costProgress = totalValueForProgress > 0 ? Math.round(weightedCostProgress / totalValueForProgress) : 0;

  // Weighted Time Progress
  let totalDur = 0, weightedTime = 0;
  descendantActs.forEach(a => {
    const dur = a.duration || 0;
    totalDur += dur;
    weightedTime += dur * getTimeCompletion(a, purchaseOrders);
  });
  const timeProgress = totalDur > 0 ? Math.round(weightedTime / totalDur) : 0;
  const spi = timeProgress > 0 ? costProgress / timeProgress : 1;

  return { pc, ac, pd: span.duration, ad: span.actualDuration, costProgress, timeProgress, spi };
};

const renderWBSRow = (
  node: WBSLevel, 
  allWbs: WBSLevel[], 
  activities: Activity[],
  purchaseOrders: PurchaseOrder[],
  expandedNodes: Set<string>,
  toggleNode: (id: string) => void,
  isRtl: boolean,
  formatAmount: (amount: number, currency: string) => string,
  baseCurrency: string,
  depth = 0
) => {
  const hasChildren = allWbs.some(w => w.parentId === node.id);
  const isExpanded = expandedNodes.has(node.id);
  const children = allWbs.filter(w => w.parentId === node.id);

  // Use robust totals which are consistent with schedule view
  const totals = getRobustTotals(node.id, allWbs, activities, purchaseOrders);

  const costVar = totals.ac - totals.pc;
  const timeVar = totals.ad - totals.pd;

  return (
    <React.Fragment key={node.id}>
      <tr className={cn(
        "group hover:bg-slate-50 transition-colors",
        node.type === 'Cost Account' ? "bg-slate-50/50" : ""
      )}>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            <button 
              onClick={() => toggleNode(node.id)}
              className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                hasChildren ? "hover:bg-slate-200" : "opacity-0 cursor-default"
              )}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div>
              <p className="text-sm font-bold text-slate-800">{node.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{node.code}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                  node.type === 'Cost Account' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {node.type}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-center font-bold text-slate-600 tabular-nums">
          {formatAmount(totals.pc, baseCurrency)}
        </td>
        <td className={cn(
          "px-6 py-4 text-center font-bold tabular-nums",
          costVar > 0 ? "text-rose-600" : "text-emerald-600"
        )}>
          {formatAmount(totals.ac, baseCurrency)}
        </td>
        <td className="px-6 py-4 text-center font-bold text-slate-600 tabular-nums">
          {totals.pd}d
        </td>
        <td className={cn(
          "px-6 py-4 text-center font-bold tabular-nums",
          timeVar > 0 ? "text-rose-600" : "text-emerald-600"
        )}>
          {totals.ad}d
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="flex justify-between w-full text-[8px] font-black uppercase text-slate-400">
              <span className="text-emerald-600">{totals.costProgress}% COST</span>
              <span className={cn(totals.spi >= 1 ? 'text-emerald-500' : 'text-rose-500')}>SPI {totals.spi.toFixed(2)}</span>
            </div>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden relative">
              {/* Cost bar (green) */}
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-1000",
                  totals.costProgress > 90 ? "bg-emerald-500" : "bg-emerald-400"
                )}
                style={{ width: `${totals.costProgress}%`, zIndex: 1 }}
              />
              {/* Time indicator line */}
              <div 
                className="absolute inset-y-0 w-0.5 bg-rose-500 z-10"
                style={{ left: `${Math.min(100, totals.timeProgress)}%` }}
              />
            </div>
          </div>
        </td>
      </tr>
      {isExpanded && children.map(child => renderWBSRow(child, allWbs, activities, purchaseOrders, expandedNodes, toggleNode, isRtl, formatAmount, baseCurrency, depth + 1))}
    </React.Fragment>
  );
};

const Check = ({ className }: { className?: string }) => (
  <CheckCircle2 className={className} />
);
