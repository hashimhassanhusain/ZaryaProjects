import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ClipboardCheck, 
  Download, 
  History,
  ChevronRight,
  Save,
  X,
  Loader2,
  ArrowLeft,
  Activity,
  Layers,
  ShieldAlert,
  HelpCircle,
  Calculator
} from 'lucide-react';
import { Page, Project, PageVersion, WBSLevel, QualityMetricEntry, QualityMetricVersion, PurchaseOrder, EntityConfig } from '../types';
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
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

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
  const { t, isRtl } = useLanguage();
  const [metrics, setMetrics] = useState<QualityMetricEntry[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [versions, setVersions] = useState<QualityMetricVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
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
      setMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() } as QualityMetricEntry)));
      setLoading(false);
    });

    const wbsQuery = query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id));
    const unsubWbs = onSnapshot(wbsQuery, (snap) => {
      setWbsLevels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WBSLevel)));
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
        await updateDoc(docRef, metricData as any);
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

      setViewMode('grid');
      setEditingMetric(null);
      toast.success(editingMetric.id ? t('entry_updated') : t('entry_created'));

    } catch (err) {
      handleFirestoreError(err, editingMetric.id ? OperationType.UPDATE : OperationType.CREATE, 'quality_metrics');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'quality_metrics', id));
      toast.success(t('entry_deleted'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'quality_metrics');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text(t('quality_metrics').toUpperCase(), pageWidth / 2, 35, { align: 'center' });

    pdfDoc.setFontSize(10);
    pdfDoc.text(`${t('project')}: ${selectedProject.name}`, margin, 45);
    pdfDoc.text(`${t('date')}: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });

    autoTable(pdfDoc, {
      startY: 55,
      head: [['ID', 'Item', 'Metric', 'Measurement Method']],
      body: metrics.map(m => [m.metricId, m.item, m.metric, m.measurementMethod]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });

    pdfDoc.save(`QualityMetrics_${selectedProject.code}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'quality_metrics' as any,
    label: page.title,
    icon: ClipboardCheck,
    collection: 'quality_metrics',
    columns: [
      { key: 'metricId', label: 'ID', type: 'badge' },
      { key: 'item', label: 'Item', type: 'string' },
      { key: 'metric', label: 'Metric', type: 'string' },
      { key: 'measurementMethod', label: 'Method', type: 'string' },
      { key: 'complianceStatus', label: 'Status', type: 'badge' },
      { key: 'updatedAt', label: 'Updated At', type: 'date' }
    ]
  };

  const handleAddNew = () => {
    const nextId = `PMIS-QUA-${(metrics.length + 1).toString().padStart(3, '0')}`;
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
    setViewMode('edit');
  };

  if (loading) return null;

  return (
    <StandardProcessPage
      page={page}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={() => handleSaveMetric(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={page.details?.inputs?.map(id => ({ id, title: id })) || []}
    >
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={metrics}
              onRowClick={(record) => {
                setEditingMetric(record as QualityMetricEntry);
                setViewMode('edit');
              }}
              onNewClick={handleAddNew}
              onDeleteRecord={handleDeleteMetric}
              title={useStandardProcessPage()?.pageHeader}
              favoriteControl={useStandardProcessPage()?.favoriteControl}
            />
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="flex justify-end pr-2">
              <button 
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
              >
                <ArrowLeft className="w-3 h-3" />
                {t('back_to_list')}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-10 space-y-12">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {editingMetric?.id ? 'Update Quality Metric' : 'Log New Quality Metric'}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Quality Standards Definition</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Description</label>
                      <input 
                        type="text"
                        value={editingMetric?.item || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, item: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">MasterFormat Code</label>
                      <select 
                        value={editingMetric?.masterFormatCode || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, masterFormatCode: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                      >
                        <option value="">Select Division...</option>
                        {MASTERFORMAT_DIVISIONS.map(div => (
                          <option key={div.code} value={div.code}>{div.code} - {div.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metric / Threshold</label>
                      <input 
                        type="text"
                        value={editingMetric?.metric || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, metric: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Measurement Method</label>
                      <input 
                        type="text"
                        value={editingMetric?.measurementMethod || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, measurementMethod: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acceptance Criteria</label>
                      <textarea 
                        value={editingMetric?.acceptanceCriteria || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, acceptanceCriteria: e.target.value })}
                        rows={3}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Value</label>
                      <input 
                        type="number"
                        value={editingMetric?.targetValue || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, targetValue: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Limit</label>
                      <input 
                        type="number"
                        value={editingMetric?.minValue || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, minValue: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Limit</label>
                      <input 
                        type="number"
                        value={editingMetric?.maxValue || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, maxValue: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-10">
                <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200 space-y-8">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Controls</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compliance Status</label>
                      <select 
                        value={editingMetric?.complianceStatus || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, complianceStatus: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Compliant">Compliant</option>
                        <option value="Non-Compliant">Non-Compliant</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifecycle Status</label>
                      <select 
                        value={editingMetric?.status || ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
                      >
                        <option value="Active">Active</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                  <div className="flex items-center gap-3 text-blue-600 mb-4">
                    <Layers className="w-5 h-5" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">PMIS Integration</h4>
                  </div>
                  <p className="text-[10px] text-blue-800 font-bold leading-relaxed opacity-70">
                    Quality standards are automatically synced with Procurement and WBS modules for real-time verification.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
