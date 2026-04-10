import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Database,
  ChevronRight,
  FileText,
  Printer,
  Download,
  Save,
  Loader2,
  History,
  X,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Page, WBSLevel, User as UserType } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  orderBy
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QualityMetricsViewProps {
  page: Page;
}

interface QualityMetric {
  id: string;
  metricId: string;
  item: string;
  wbsId?: string;
  metric: string;
  measurementMethod: string;
  status: 'Active' | 'Draft' | 'Archived';
  version: number;
  projectId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

interface MetricVersion {
  id: string;
  version: number;
  timestamp: string;
  editorName: string;
  changeType: string;
  data: QualityMetric[];
}

export const QualityMetricsView: React.FC<QualityMetricsViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [versions, setVersions] = useState<MetricVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'history'>('list');
  const [editingMetric, setEditingMetric] = useState<QualityMetric | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<QualityMetric>>({
    metricId: '',
    item: '',
    wbsId: '',
    metric: '',
    measurementMethod: '',
    status: 'Draft'
  });

  useEffect(() => {
    if (!selectedProject) return;

    const metricsQuery = query(
      collection(db, 'quality_metrics'),
      where('projectId', '==', selectedProject.id)
    );

    const wbsQuery = query(
      collection(db, 'wbs'),
      where('projectId', '==', selectedProject.id)
    );

    const versionsQuery = query(
      collection(db, 'quality_metrics_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubMetrics = onSnapshot(metricsQuery, (snap) => {
      setMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() } as QualityMetric)));
      setLoading(false);
    });

    const unsubWbs = onSnapshot(wbsQuery, (snap) => {
      setWbsLevels(snap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
    });

    const unsubVersions = onSnapshot(versionsQuery, (snap) => {
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as MetricVersion)));
    });

    return () => {
      unsubMetrics();
      unsubWbs();
      unsubVersions();
    };
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingMetric(null);
    setFormData({
      metricId: `QM-${(metrics.length + 1).toString().padStart(3, '0')}`,
      item: '',
      wbsId: '',
      metric: '',
      measurementMethod: '',
      status: 'Draft'
    });
    setView('form');
  };

  const handleEdit = (metric: QualityMetric) => {
    setEditingMetric(metric);
    setFormData(metric);
    setView('form');
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.item || !formData.metric) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';

      if (isNewVersion) {
        // Archive current metrics and create a new version entry
        const nextVersion = (versions[0]?.version || 1) + 1;
        
        // 1. Create Version Entry
        await addDoc(collection(db, 'quality_metrics_versions'), {
          projectId: selectedProject.id,
          version: nextVersion,
          timestamp,
          editorName: user,
          changeType: 'Baseline Update',
          data: metrics
        });

        // 2. Update current metrics version number
        for (const m of metrics) {
          await updateDoc(doc(db, 'quality_metrics', m.id), {
            version: nextVersion,
            updatedAt: timestamp,
            updatedBy: user
          });
        }
        
        alert(`New version (v${nextVersion.toFixed(1)}) created successfully.`);
      } else {
        const metricData = {
          ...formData,
          projectId: selectedProject.id,
          version: editingMetric?.version || 1.0,
          updatedAt: timestamp,
          updatedBy: user,
          createdAt: editingMetric?.createdAt || timestamp,
          createdBy: editingMetric?.createdBy || user
        };

        if (editingMetric) {
          await updateDoc(doc(db, 'quality_metrics', editingMetric.id), metricData);
        } else {
          await addDoc(collection(db, 'quality_metrics'), metricData);
        }
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingMetric ? OperationType.UPDATE : OperationType.CREATE, 'quality_metrics');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quality metric?')) return;
    try {
      await deleteDoc(doc(db, 'quality_metrics', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `quality_metrics/${id}`);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('QUALITY METRICS REGISTER', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, margin, 45);
    doc.text(`Project Code: ${selectedProject.code}`, margin, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });
    doc.text(`Version: v${(versions[0]?.version || 1.0).toFixed(1)}`, pageWidth - margin, 50, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['ID', 'ITEM / WBS', 'QUALITY METRIC', 'MEASUREMENT METHOD']],
      body: metrics.map(m => [
        m.metricId,
        m.item,
        m.metric,
        m.measurementMethod
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-QUA-MET-${dateStr}-V${vStr}.pdf`);
  };

  const filteredMetrics = metrics.filter(m => 
    m.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.metricId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.metric.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Metrics Register
        </button>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingMetric ? 'Edit Quality Metric' : 'Define New Quality Metric'}
                </h2>
                <p className="text-sm text-slate-500 font-medium">Specify the standard and measurement method for quality control.</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metric ID</label>
                <input 
                  type="text"
                  value={formData.metricId}
                  onChange={(e) => setFormData({ ...formData, metricId: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="e.g. QM-001"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Linked WBS Item</label>
                <select 
                  value={formData.wbsId}
                  onChange={(e) => {
                    const wbs = wbsLevels.find(l => l.id === e.target.value);
                    setFormData({ ...formData, wbsId: e.target.value, item: wbs?.title || '' });
                  }}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Select WBS Item...</option>
                  {wbsLevels.map(wbs => (
                    <option key={wbs.id} value={wbs.id}>{wbs.code} - {wbs.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Description</label>
              <input 
                type="text"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                placeholder="e.g. Concrete Compressive Strength"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quality Metric (Standard)</label>
              <textarea 
                value={formData.metric}
                onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                rows={3}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="e.g. Minimum 30 MPa after 28 days of curing."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Measurement Method</label>
              <textarea 
                value={formData.measurementMethod}
                onChange={(e) => setFormData({ ...formData, measurementMethod: e.target.value })}
                rows={3}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="e.g. Laboratory crushing test of 150mm cubes according to ASTM C39."
              />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 mt-12">
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                Last Saved: {editingMetric?.updatedAt ? new Date(editingMetric.updatedAt).toLocaleString() : 'Never'}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="px-8 py-4 text-white font-bold text-sm hover:bg-white/10 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Update Current
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-200">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{page.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">REF: {page.id}</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">Version: v{(versions[0]?.version || 1.0).toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Add Metric
          </button>
        </div>
      </header>

      {showVersionHistory && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[2.5rem] p-8 text-white"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-blue-400" />
              Version History
            </h3>
            <button 
              onClick={() => handleSave(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all"
            >
              Release New Baseline (v{((versions[0]?.version || 1.0) + 1).toFixed(1)})
            </button>
          </div>
          <div className="space-y-4">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-black text-blue-400">v{v.version.toFixed(1)}</div>
                  <div>
                    <div className="text-sm font-bold">{v.changeType}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                      {new Date(v.timestamp).toLocaleString()} • {v.editorName}
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search metrics register..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 text-slate-500 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / WBS</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quality Metric</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Register...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMetrics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-full">
                        <Database className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No metrics defined yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMetrics.map((metric) => (
                  <tr 
                    key={metric.id} 
                    onClick={() => handleEdit(metric)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{metric.metricId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-900">{metric.item}</div>
                      {metric.wbsId && (
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          WBS: {wbsLevels.find(l => l.id === metric.wbsId)?.code || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{metric.metric}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-slate-400 font-medium italic">{metric.measurementMethod}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(metric); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(metric.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
