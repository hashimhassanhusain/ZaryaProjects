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
  FileText,
  Printer,
  Download,
  Save,
  Loader2,
  History,
  X,
  ArrowLeft,
  TrendingUp,
  User,
  Calendar,
  Database,
  AlertTriangle,
  ChevronRight,
  CheckSquare,
  Square,
  DollarSign,
  Box,
  LayoutDashboard,
  Shield
} from 'lucide-react';
import { Page, Stakeholder, Project, EntityConfig } from '../types';
import { toast } from 'react-hot-toast';
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
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface ChangeRequestViewProps {
  page: Page;
}

interface ChangeRequest {
  id: string;
  requestId: string;
  date: string;
  preparer: string;
  contractor: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  projectId: string;
  
  // Header Info
  projectName: string;
  poNumber: string;
  contractNumber: string;
  
  // Category Checkboxes
  categories: {
    quality: boolean;
    scope: boolean;
    schedule: boolean;
    cost: boolean;
    other: boolean;
  };
  
  // Detailed Description
  description: string;
  justification: string;
  
  // Financial Summary
  financialSummary: {
    originalContractValue: number;
    previousChangesValue: number;
    currentChangeValue: number;
    totalValue: number;
  };
  
  // Impact Assessment
  impact: {
    scope: { affected: boolean; details: string };
    quality: { affected: boolean; details: string };
    cost: { affected: boolean; details: string };
    schedule: { affected: boolean; details: string };
  };
  
  version: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
}

interface ChangeRequestVersion {
  id: string;
  version: number;
  timestamp: string;
  editorName: string;
  actionType: string;
  data: ChangeRequest;
}

export const ChangeRequestView: React.FC<ChangeRequestViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const [entries, setEntries] = useState<ChangeRequest[]>([]);
  const [versions, setVersions] = useState<ChangeRequestVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<ChangeRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);

  const [formData, setFormData] = useState<Partial<ChangeRequest>>({
    requestId: '',
    date: new Date().toISOString().split('T')[0],
    preparer: '',
    contractor: '',
    status: 'Pending',
    projectName: selectedProject?.name || '',
    poNumber: '',
    contractNumber: '',
    categories: {
      quality: false,
      scope: false,
      schedule: false,
      cost: false,
      other: false
    },
    description: '',
    justification: '',
    financialSummary: {
      originalContractValue: 0,
      previousChangesValue: 0,
      currentChangeValue: 0,
      totalValue: 0
    },
    impact: {
      scope: { affected: false, details: '' },
      quality: { affected: false, details: '' },
      cost: { affected: false, details: '' },
      schedule: { affected: false, details: '' }
    }
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'change_requests'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeRequest)));
      setLoading(false);
    });

    return () => unsubEntries();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (editingEntry) {
      const versionsQuery = query(
        collection(db, 'change_request_versions'),
        where('requestId', '==', editingEntry.id),
        orderBy('version', 'desc')
      );
      const unsubVersions = onSnapshot(versionsQuery, (snap) => {
        setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeRequestVersion)));
      });
      return () => unsubVersions();
    }
  }, [editingEntry]);

  const handleAdd = () => {
    setEditingEntry(null);
    const nextNum = entries.length + 1;
    setFormData({
      requestId: `CR-${nextNum.toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      preparer: auth.currentUser?.displayName || '',
      contractor: '',
      status: 'Pending',
      projectName: selectedProject?.name || '',
      poNumber: '',
      contractNumber: '',
      categories: {
        quality: false,
        scope: false,
        schedule: false,
        cost: false,
        other: false
      },
      description: '',
      justification: '',
      financialSummary: {
        originalContractValue: 0,
        previousChangesValue: 0,
        currentChangeValue: 0,
        totalValue: 0
      },
      impact: {
        scope: { affected: false, details: '' },
        quality: { affected: false, details: '' },
        cost: { affected: false, details: '' },
        schedule: { affected: false, details: '' }
      }
    });
    setView('form');
  };

  const handleEdit = (entry: ChangeRequest) => {
    setEditingEntry(entry);
    setFormData(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Are you sure you want to delete this change request?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'change_requests', id));
                toast.success('Change request deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'change_requests');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const calculateTotal = (summary: any) => {
    return (Number(summary.originalContractValue) || 0) + 
           (Number(summary.previousChangesValue) || 0) + 
           (Number(summary.currentChangeValue) || 0);
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.requestId) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updatedFinancialSummary = {
        ...formData.financialSummary,
        totalValue: calculateTotal(formData.financialSummary)
      };

      const entryData = {
        ...formData,
        financialSummary: updatedFinancialSummary,
        projectId: selectedProject.id,
        version: isNewVersion ? (editingEntry?.version || 1.0) + 0.1 : (editingEntry?.version || 1.0),
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingEntry?.createdAt || timestamp,
        createdBy: editingEntry?.createdBy || user
      };

      let docRef;
      if (editingEntry && !isNewVersion) {
        docRef = doc(db, 'change_requests', editingEntry.id);
        await updateDoc(docRef, entryData);
      } else {
        docRef = await addDoc(collection(db, 'change_requests'), entryData);
      }

      // Version History
      await addDoc(collection(db, 'change_request_versions'), {
        requestId: docRef.id,
        version: entryData.version,
        timestamp,
        editorName: user,
        actionType: isNewVersion ? 'New Version' : (editingEntry ? 'Update' : 'Initial Create'),
        data: entryData
      });

      // Data Routing to Change Log & PMP
      if (entryData.status === 'Approved') {
        await addDoc(collection(db, 'change_log'), {
          changeId: entryData.requestId,
          category: Object.entries(entryData.categories || {}).filter(([_, v]) => v).map(([k, _]) => k).join(', '),
          description: entryData.description,
          submittedBy: entryData.preparer,
          date: entryData.date,
          status: entryData.status,
          disposition: 'Approved',
          projectId: selectedProject.id,
          costImpact: entryData.financialSummary?.currentChangeValue || 0,
          scheduleImpact: entryData.impact?.schedule?.details || ''
        });

        // Update PMP Cost Variance
        const projectDoc = await getDoc(doc(db, 'projects', selectedProject.id));
        if (projectDoc.exists()) {
          const pData = projectDoc.data() as Project;
          if (pData.pmpData) {
            const currentVariance = pData.pmpData.baselines?.costVariance || '';
            const newImpact = entryData.financialSummary?.currentChangeValue || 0;
            const updatedPmp = {
              ...pData.pmpData,
              baselines: {
                ...pData.pmpData.baselines,
                costVariance: `${currentVariance}\n[CR ${entryData.requestId}]: +${newImpact.toLocaleString('en-US')} IQD`
              }
            };
            await updateDoc(doc(db, 'projects', selectedProject.id), { pmpData: updatedPmp });
          }
        }
      }

      // Restricted Data Linking Prompts
      const impacts = [];
      if (entryData.impact?.schedule?.affected) impacts.push('Schedule');
      if (entryData.impact?.cost?.affected) impacts.push('PO/Finance');
      
      if (impacts.length > 0) {
        setShowPrompt({
          type: impacts.join(' & '),
          message: `This change affects ${impacts.join(' and ')}. Do you want to propose a link?`,
          onConfirm: () => {
            console.log('Linking proposed for:', impacts);
            setShowPrompt(null);
            setView('list');
          }
        });
      } else {
        setView('list');
      }

    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'change_requests');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject || !formData.requestId) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Logo
    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANGE REQUEST FORM', pageWidth / 2, 35, { align: 'center' });
    doc.setFontSize(12);
    doc.text('(طلب تغيير)', pageWidth / 2, 42, { align: 'center' });

    // Header Info Table
    autoTable(doc, {
      startY: 50,
      body: [
        ['Project Name:', formData.projectName || '', 'Date:', formData.date || ''],
        ['PO Number:', formData.poNumber || '', 'Preparer:', formData.preparer || ''],
        ['Contract No:', formData.contractNumber || '', 'Contractor:', formData.contractor || '']
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { fontStyle: 'bold', cellWidth: 30 } }
    });

    // Categories
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CATEGORY OF CHANGE:', margin, (doc as any).lastAutoTable.finalY + 10);
    
    let y = (doc as any).lastAutoTable.finalY + 15;
    const cats = Object.entries(formData.categories || {}).map(([k, v]) => `${k.toUpperCase()}: ${v ? '[X]' : '[ ]'}`);
    doc.setFont('helvetica', 'normal');
    doc.text(cats.join('    '), margin, y);

    // Description
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILED DESCRIPTION OF PROPOSED CHANGE:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(formData.description || '', pageWidth - 2 * margin);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text('JUSTIFICATION FOR PROPOSED CHANGE:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const justLines = doc.splitTextToSize(formData.justification || '', pageWidth - 2 * margin);
    doc.text(justLines, margin, y);
    y += justLines.length * 5 + 10;

    // Financial Summary
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY:', margin, y);
    autoTable(doc, {
      startY: y + 2,
      body: [
        ['Original Contract Value:', formData.financialSummary?.originalContractValue?.toLocaleString('en-US') || '0'],
        ['Previous Changes Value:', formData.financialSummary?.previousChangesValue?.toLocaleString('en-US') || '0'],
        ['Current Change Value:', formData.financialSummary?.currentChangeValue?.toLocaleString('en-US') || '0'],
        ['TOTAL CONTRACT VALUE:', calculateTotal(formData.financialSummary).toLocaleString('en-US') || '0']
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    // Impact Assessment
    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('IMPACT ASSESSMENT:', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Area', 'Affected', 'Details']],
      body: [
        ['Scope', formData.impact?.scope?.affected ? 'Yes' : 'No', formData.impact?.scope?.details || ''],
        ['Quality', formData.impact?.quality?.affected ? 'Yes' : 'No', formData.impact?.quality?.details || ''],
        ['Cost', formData.impact?.cost?.affected ? 'Yes' : 'No', formData.impact?.cost?.details || ''],
        ['Schedule', formData.impact?.schedule?.affected ? 'Yes' : 'No', formData.impact?.schedule?.details || '']
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (formData.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-PMIS-MGT-FRM-CHG-${dateStr}-V${vStr}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const gridConfig: EntityConfig = {
    id: 'changes' as any,
    label: page.title,
    icon: FileText,
    collection: 'change_requests',
    columns: [
      { key: 'requestId', label: 'ID', type: 'badge' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'preparer', label: 'Preparer', type: 'string' },
      { key: 'contractor', label: 'Contractor', type: 'string' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'updatedAt', label: 'Last Updated', type: 'date' }
    ]
  };

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={page.details?.inputs?.map(id => ({ id, title: id })) || []}
    >
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left Column: Form Inputs */}
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('change_request_form')}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('official_documentation')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className={cn(
                          "px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest outline-none transition-all shadow-sm",
                          getStatusColor(formData.status || 'Pending')
                        )}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    {/* Header Info */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Header Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('request_id')}</label>
                          <input 
                            type="text"
                            value={formData.requestId}
                            onChange={(e) => setFormData({ ...formData, requestId: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            placeholder="CR-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('date')}</label>
                          <input 
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('preparer')}</label>
                          <input 
                            type="text"
                            value={formData.preparer}
                            onChange={(e) => setFormData({ ...formData, preparer: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('contractor')}</label>
                          <input 
                            type="text"
                            value={formData.contractor}
                            onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('po_number')}</label>
                          <input 
                            type="text"
                            value={formData.poNumber}
                            onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                           <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <Shield className="w-4 h-4 text-blue-600" />
                               <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Linked Project</span>
                             </div>
                             <span className="text-xs font-black text-blue-700 italic tracking-tight">{selectedProject?.code}</span>
                           </div>
                        </div>
                      </div>
                    </section>

                    {/* Change Categories */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Category of Change
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {Object.entries(formData.categories || {}).map(([key, value]) => (
                          <button 
                            key={key}
                            onClick={() => setFormData({
                              ...formData,
                              categories: { ...formData.categories!, [key]: !value }
                            })}
                            className={cn(
                              "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all group",
                              value 
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-white"
                            )}
                          >
                            <Box className={cn("w-6 h-6", value ? "text-white" : "group-hover:text-blue-500 transition-colors")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t(key)}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Description & Justification */}
                    <section className="space-y-8">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('detailed_description')}</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('justification_for_change')}</label>
                        <textarea 
                          value={formData.justification}
                          onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                          rows={4}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                        />
                      </div>
                    </section>

                    {/* Financial Summary */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        Financial Summary
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('original_contract_value')}</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="number"
                              value={formData.financialSummary?.originalContractValue}
                              onChange={(e) => setFormData({
                                ...formData,
                                financialSummary: { ...formData.financialSummary!, originalContractValue: Number(e.target.value) }
                              })}
                              className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('previous_changes_value')}</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="number"
                              value={formData.financialSummary?.previousChangesValue}
                              onChange={(e) => setFormData({
                                ...formData,
                                financialSummary: { ...formData.financialSummary!, previousChangesValue: Number(e.target.value) }
                              })}
                              className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('current_change_value')}</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="number"
                              value={formData.financialSummary?.currentChangeValue}
                              onChange={(e) => setFormData({
                                ...formData,
                                financialSummary: { ...formData.financialSummary!, currentChangeValue: Number(e.target.value) }
                              })}
                              className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('total_revised_value')}</label>
                          <div className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-black text-blue-400 flex items-center justify-between shadow-inner">
                            <div className="flex items-center gap-3">
                              <DollarSign className="w-5 h-5 opacity-50" />
                              <span className="tracking-tight italic">{calculateTotal(formData.financialSummary).toLocaleString('en-US')}</span>
                            </div>
                            <span className="text-[10px] opacity-40 uppercase tracking-widest">IQD</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </section>

                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 space-y-8">
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    Impact Assessment
                  </h3>
                  <div className="space-y-10">
                    {(Object.entries(formData.impact || {}) as [keyof ChangeRequest['impact'], { affected: boolean; details: string }][]).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
                        <div className="flex items-center gap-3 pt-3">
                          <button 
                            onClick={() => setFormData({
                              ...formData,
                              impact: { ...formData.impact!, [key]: { ...value, affected: !value.affected } }
                            })}
                            className={cn(
                              "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all group",
                              value.affected 
                                ? "bg-amber-50 border-amber-500 shadow-lg shadow-amber-100" 
                                : "bg-slate-50 border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                              value.affected ? "bg-amber-600 text-white" : "bg-white border border-slate-200 text-slate-200"
                            )}>
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{t(key)}</span>
                          </button>
                        </div>
                        <div className="md:col-span-3 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Impact Details</label>
                          <textarea 
                            value={value.details}
                            disabled={!value.affected}
                            onChange={(e) => setFormData({
                              ...formData,
                              impact: { ...formData.impact!, [key]: { ...value, details: e.target.value } }
                            })}
                            rows={2}
                            className={cn(
                              "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none",
                              !value.affected && "opacity-30 grayscale cursor-not-allowed border-dashed"
                            )}
                            placeholder={`Describe ${key} impact if applicable...`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column: Summaries & Quick Info */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-blue-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400">Impact Analysis</h3>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Automatic Risk Scoring</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('variance_index')}</div>
                        <div className="text-2xl font-black italic text-blue-400 tracking-tighter">
                          +{(calculateTotal(formData.financialSummary) / (formData.financialSummary?.originalContractValue || 1) * 100 - 100).toFixed(1)}%
                        </div>
                      </div>

                      <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('linked_artifacts')}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(formData.impact || {}).filter(([_, v]) => (v as any).affected).map(([k]) => (
                            <span key={k} className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                              {k}
                            </span>
                          ))}
                          {Object.entries(formData.impact || {}).filter(([_, v]) => (v as any).affected).length === 0 && (
                            <span className="text-[10px] text-slate-600 font-bold italic lowercase tracking-wider">no impacts flagged</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-6">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>{t('approval_chain')}</span>
                        <span className="text-blue-500">Active</span>
                      </div>
                      <div className="mt-4 flex items-center -space-x-3">
                         {[1,2,3].map(i => (
                           <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black italic">
                             JD
                           </div>
                         ))}
                         <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-[10px] font-black italic">
                           +4
                         </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-[3rem] p-1 shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-8 bg-slate-50/50 border-b border-slate-100 italic font-bold text-[10px] text-slate-500 uppercase tracking-[0.2em]">{t('activity_history')}</div>
                   <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                     {versions.map((v, i) => (
                       <div key={v.id} className="p-4 bg-white rounded-[1.5rem] border border-slate-100 flex items-start gap-3 relative overflow-hidden group hover:border-blue-200 transition-all">
                         <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transition-all scale-y-0 group-hover:scale-y-100" />
                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                           <History className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                         </div>
                         <div className="min-w-0">
                           <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{v.editorName}</div>
                           <div className="text-[9px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleString()}</div>
                           <div className="mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black inline-block uppercase">{v.actionType}</div>
                         </div>
                       </div>
                     ))}
                     {versions.length === 0 && (
                       <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">{t('no_history_available')}</div>
                     )}
                   </div>
                </section>

                <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 space-y-4">
                  <div className="flex items-center gap-3 text-amber-600">
                    <Database className="w-5 h-5" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">{t('system_sync')}</h4>
                  </div>
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed opacity-70">
                    Approved change requests automatically sync with the Project Finance engine and update the PMP Baselines in real-time.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={entries}
              onRowClick={(record) => handleEdit(record as ChangeRequest)}
              onNewClick={handleAdd}
              onDeleteRecord={handleDelete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Restricted Data Link</h3>
              </div>
              <div className="flex-1 overflow-y-auto mb-8 custom-scrollbar">
                <p className="text-slate-500 font-medium leading-relaxed">
                  {showPrompt.message}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-4">
                <button 
                  onClick={() => { setShowPrompt(null); setView('list'); }}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  No
                </button>
                <button 
                  onClick={showPrompt.onConfirm}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
