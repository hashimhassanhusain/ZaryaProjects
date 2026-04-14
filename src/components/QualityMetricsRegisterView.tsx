import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  ShieldAlert,
  ClipboardCheck,
  Layers,
  Box,
  Activity,
  DollarSign,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calculator
} from 'lucide-react';
import { Page, Project, PageVersion, WBSLevel, QualityMetricEntry, QualityMetricVersion, PurchaseOrder } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  getDocs,
  getDoc,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QualityMetricsRegisterViewProps {
  page: Page;
  embedded?: boolean;
}

const MASTERFORMAT_DIVISIONS = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics, and Composites' },
  { code: '07', name: 'Thermal and Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '21', name: 'Fire Suppression' },
  { code: '22', name: 'Plumbing' },
  { code: '23', name: 'HVAC' },
  { code: '26', name: 'Electrical' },
  { code: '31', name: 'Earthwork' },
  { code: '32', name: 'Exterior Improvements' },
  { code: '33', name: 'Utilities' }
];

export const QualityMetricsRegisterView: React.FC<QualityMetricsRegisterViewProps> = ({ page, embedded = false }) => {
  const { selectedProject } = useProject();
  const [metrics, setMetrics] = useState<QualityMetricEntry[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [versions, setVersions] = useState<QualityMetricVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Partial<QualityMetricEntry> | null>(null);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    const metricsQuery = query(
      collection(db, 'quality_metrics'),
      where('projectId', '==', selectedProject.id),
      orderBy('metricId', 'asc')
    );

    const unsubMetrics = onSnapshot(metricsQuery, async (snap) => {
      if (snap.empty && selectedProject) {
        // Add default sample data
        const sampleMetric = {
          projectId: selectedProject.id,
          metricId: 'ZRY-QUA-001',
          item: 'Steel Rebar Grade 60',
          masterFormatCode: '05',
          metric: 'Tensile strength as per ASTM A615',
          measurementMethod: 'Tensile Test Lab Report',
          acceptanceCriteria: 'Minimum yield strength of 420 MPa',
          status: 'Active',
          complianceStatus: 'Pending',
          version: 1.0,
          createdAt: new Date().toISOString(),
          createdBy: 'System',
          updatedAt: new Date().toISOString(),
          updatedBy: 'System'
        };
        await addDoc(collection(db, 'quality_metrics'), sampleMetric);
      } else {
        setMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() } as QualityMetricEntry)));
      }
      setLoading(false);
    });

    const wbsQuery = query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id));
    const unsubWbs = onSnapshot(wbsQuery, (snap) => {
      const list: WBSLevel[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as WBSLevel));
      setWbsLevels(list);
    });

    const poQuery = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
    const unsubPos = onSnapshot(poQuery, (snap) => {
      setPos(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    });

    return () => {
      unsubMetrics();
      unsubWbs();
      unsubPos();
    };
  }, [selectedProject?.id]);

  useEffect(() => {
    if (editingMetric?.id) {
      const vQuery = query(
        collection(db, 'quality_metric_versions'),
        where('metricEntryId', '==', editingMetric.id),
        orderBy('version', 'desc')
      );
      const unsubVersions = onSnapshot(vQuery, (snap) => {
        setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as QualityMetricVersion)));
      });
      return () => unsubVersions();
    }
  }, [editingMetric?.id]);

  const filteredMetrics = metrics.filter(m => 
    m.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.metricId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.metric.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveMetric = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !editingMetric) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const metricData = {
        ...editingMetric,
        projectId: selectedProject.id,
        version: isNewVersion ? (editingMetric.version || 1.0) + 0.1 : (editingMetric.version || 1.0),
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingMetric.createdAt || timestamp,
        createdBy: editingMetric.createdBy || user,
        status: editingMetric.status || 'Active',
        complianceStatus: editingMetric.complianceStatus || 'Pending'
      };

      let docRef;
      if (editingMetric.id && !isNewVersion) {
        docRef = doc(db, 'quality_metrics', editingMetric.id);
        await updateDoc(docRef, metricData);
      } else {
        docRef = await addDoc(collection(db, 'quality_metrics'), metricData);
      }

      // Version History
      await addDoc(collection(db, 'quality_metric_versions'), {
        metricEntryId: docRef.id,
        version: metricData.version,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: metricData,
        changeSummary: isNewVersion ? `Created new version ${metricData.version.toFixed(1)}` : (editingMetric.id ? 'Updated existing record' : 'Initial entry')
      });

      setIsFormOpen(false);
      setEditingMetric(null);

      // Prompt on Integration with PO
      const linkedPO = pos.find(p => p.lineItems.some(li => li.description.toLowerCase().includes(metricData.item!.toLowerCase())));
      if (linkedPO) {
        setShowPrompt({
          type: 'PO Link',
          message: `Link this quality standard to PO [${linkedPO.id}]?`,
          onConfirm: () => {
            console.log('Linked to PO:', linkedPO.id);
            setShowPrompt(null);
          }
        });
      }

    } catch (err) {
      handleFirestoreError(err, editingMetric.id ? OperationType.UPDATE : OperationType.CREATE, 'quality_metrics');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this metric?')) return;
    try {
      await deleteDoc(doc(db, 'quality_metrics', id));
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    // Header with Logo
    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('QUALITY METRICS', pageWidth / 2, 35, { align: 'center' });

    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.text(`Project Title: ${selectedProject.name}`, margin, 45);
    pdfDoc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 45);

    autoTable(pdfDoc, {
      startY: 55,
      head: [['ID', 'Item', 'Metric', 'Measurement Method']],
      body: metrics.map(m => [m.metricId, m.item, m.metric, m.measurementMethod]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `[${selectedProject.code}]-QUA-MET-${dateStr}.pdf`;
    pdfDoc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className={cn("space-y-8", embedded && "mt-12 pt-12 border-t border-slate-100")}>
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search metrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Printer className="w-4 h-4" />
            Export Register
          </button>
          <button 
            onClick={() => {
              const nextId = `ZRY-QUA-${(metrics.length + 1).toString().padStart(3, '0')}`;
              
              // Try to pull acceptance criteria logic from QMP
              let qmpLogic = '';
              if (selectedProject) {
                const qmpRef = doc(db, 'projects', selectedProject.id);
                getDoc(qmpRef).then(snap => {
                  if (snap.exists()) {
                    const pData = snap.data() as Project;
                    if (pData.qmpData && (pData.qmpData as any).acceptanceCriteriaLogic) {
                      qmpLogic = (pData.qmpData as any).acceptanceCriteriaLogic;
                    }
                  }
                  setEditingMetric({ 
                    metricId: nextId, 
                    item: '', 
                    metric: '', 
                    measurementMethod: '', 
                    acceptanceCriteria: qmpLogic,
                    status: 'Active',
                    complianceStatus: 'Pending',
                    version: 1.0
                  });
                  setIsFormOpen(true);
                });
              } else {
                setEditingMetric({ 
                  metricId: nextId, 
                  item: '', 
                  metric: '', 
                  measurementMethod: '', 
                  acceptanceCriteria: '',
                  status: 'Active',
                  complianceStatus: 'Pending',
                  version: 1.0
                });
                setIsFormOpen(true);
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            Add New Metric
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">ID</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metric</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Status</th>
              <th className="px-8 py-5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMetrics.map((m) => (
              <tr key={m.id} className="group hover:bg-slate-50/30 transition-all">
                <td className="px-8 py-6">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg tracking-tighter">{m.metricId}</span>
                </td>
                <td className="px-8 py-6">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{m.item}</p>
                    {m.masterFormatCode && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DIV {m.masterFormatCode}</span>}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm text-slate-600 font-medium">{m.metric}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs">{m.measurementMethod}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      m.complianceStatus === 'Compliant' ? "bg-green-100 text-green-600" :
                      m.complianceStatus === 'Non-Compliant' ? "bg-red-100 text-red-600" :
                      "bg-amber-100 text-amber-600"
                    )}>
                      {m.complianceStatus === 'Compliant' ? <CheckCircle className="w-3 h-3" /> : 
                       m.complianceStatus === 'Non-Compliant' ? <XCircle className="w-3 h-3" /> : 
                       <Clock className="w-3 h-3" />}
                      {m.complianceStatus}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => {
                        setEditingMetric(m);
                        setIsFormOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteMetric(m.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Metric Form Modal */}
      <AnimatePresence>
        {isFormOpen && editingMetric && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Quality Metric Standard</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{editingMetric.metricId}</p>
                  </div>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Description</label>
                    <input 
                      type="text"
                      value={editingMetric.item}
                      onChange={(e) => setEditingMetric({ ...editingMetric, item: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="e.g. Steel Rebar Grade 60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MasterFormat 16 Divisions</label>
                    <select 
                      value={editingMetric.masterFormatCode}
                      onChange={(e) => setEditingMetric({ ...editingMetric, masterFormatCode: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">Select Division...</option>
                      {MASTERFORMAT_DIVISIONS.map(div => (
                        <option key={div.code} value={div.code}>{div.code} - {div.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WBS Link</label>
                    <select 
                      value={editingMetric.wbsId}
                      onChange={(e) => setEditingMetric({ ...editingMetric, wbsId: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">Select Deliverable...</option>
                      {wbsLevels.map(w => (
                        <option key={w.id} value={w.id}>{w.code} - {w.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Metric Threshold
                      <Tooltip text="Define the technical threshold for success (e.g., Slump test max 10cm)." />
                    </label>
                    <input 
                      type="text"
                      value={editingMetric.metric}
                      onChange={(e) => setEditingMetric({ ...editingMetric, metric: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="e.g. Tensile strength as per ASTM A615"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Measurement Method
                      <Tooltip text="Specify the tool or standard used for verification." />
                    </label>
                    <textarea 
                      value={editingMetric.measurementMethod}
                      onChange={(e) => setEditingMetric({ ...editingMetric, measurementMethod: e.target.value })}
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                      placeholder="e.g. Tensile Test Lab Report"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acceptance Criteria</label>
                    <textarea 
                      value={editingMetric.acceptanceCriteria}
                      onChange={(e) => setEditingMetric({ ...editingMetric, acceptanceCriteria: e.target.value })}
                      rows={3}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                      placeholder="Pulling from QMP logic..."
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 space-y-6 border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-900 font-bold text-sm uppercase tracking-tight">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Numerical Range Logic (Pass/Fail Placeholder)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Value</label>
                      <input 
                        type="number"
                        value={editingMetric.targetValue || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, targetValue: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Limit</label>
                      <input 
                        type="number"
                        value={editingMetric.minValue || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, minValue: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Limit</label>
                      <input 
                        type="number"
                        value={editingMetric.maxValue || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, maxValue: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Version History */}
                {editingMetric.id && versions.length > 0 && (
                  <div className="pt-8 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Revision History
                    </h3>
                    <div className="space-y-3">
                      {versions.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">V{v.version.toFixed(1)}</span>
                            <p className="text-xs font-bold text-slate-900 mt-1">{v.changeSummary}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{v.userName} • {new Date(v.timestamp).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => setEditingMetric(v.data as QualityMetricEntry)}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4" />
                  Standard Definition Protection Active
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsFormOpen(false)}
                    className="px-8 py-4 text-white/60 font-bold text-sm hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleSaveMetric(true)}
                    disabled={isSaving}
                    className="px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-2xl hover:bg-white/20 transition-all"
                  >
                    Save as New Version
                  </button>
                  <button 
                    onClick={() => handleSaveMetric(false)}
                    disabled={isSaving}
                    className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Overwrite Current
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Layers className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Cross-Module Integration</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                {showPrompt.message}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={showPrompt.onConfirm}
                  className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  Yes, Link Standard
                </button>
                <button 
                  onClick={() => setShowPrompt(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all"
                >
                  No, Skip Linking
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block">
    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>
  </div>
);
