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
  DollarSign
} from 'lucide-react';
import { Page, Stakeholder, Project } from '../types';
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
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    if (!window.confirm('Are you sure you want to delete this change request?')) return;
    try {
      await deleteDoc(doc(db, 'change_requests', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'change_requests');
    }
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
    doc.save(`${selectedProject.code}-ZRY-MGT-FRM-CHG-${dateStr}-V${vStr}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredEntries = entries.filter(e => 
    e.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.preparer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.contractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Register
        </button>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Change Request Form</h2>
                <p className="text-sm text-slate-500 font-medium">Official request for project modifications and impact assessment.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className={cn(
                  "px-4 py-2 rounded-xl border font-bold text-xs uppercase tracking-widest outline-none transition-all",
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
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Header Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                  <input 
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PO Number</label>
                  <input 
                    type="text"
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preparer</label>
                  <input 
                    type="text"
                    value={formData.preparer}
                    onChange={(e) => setFormData({ ...formData, preparer: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract Number</label>
                  <input 
                    type="text"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contractor</label>
                  <input 
                    type="text"
                    value={formData.contractor}
                    onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Category Checkboxes */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Category of Change</h3>
              <div className="flex flex-wrap gap-8">
                {Object.entries(formData.categories || {}).map(([key, value]) => (
                  <button 
                    key={key}
                    onClick={() => setFormData({
                      ...formData,
                      categories: { ...formData.categories!, [key]: !value }
                    })}
                    className="flex items-center gap-3 group"
                  >
                    {value ? (
                      <CheckSquare className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Square className="w-6 h-6 text-slate-200 group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-bold text-slate-700 capitalize">{key}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Description & Justification */}
            <section className="space-y-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Description of Proposed Change</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification for Proposed Change</label>
                <textarea 
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                />
              </div>
            </section>

            {/* Financial Summary */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Original Contract Value</label>
                  <input 
                    type="number"
                    value={formData.financialSummary?.originalContractValue}
                    onChange={(e) => setFormData({
                      ...formData,
                      financialSummary: { ...formData.financialSummary!, originalContractValue: Number(e.target.value) }
                    })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Previous Changes Value</label>
                  <input 
                    type="number"
                    value={formData.financialSummary?.previousChangesValue}
                    onChange={(e) => setFormData({
                      ...formData,
                      financialSummary: { ...formData.financialSummary!, previousChangesValue: Number(e.target.value) }
                    })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Change Value</label>
                  <input 
                    type="number"
                    value={formData.financialSummary?.currentChangeValue}
                    onChange={(e) => setFormData({
                      ...formData,
                      financialSummary: { ...formData.financialSummary!, currentChangeValue: Number(e.target.value) }
                    })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Contract Value</label>
                  <div className="w-full px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-black text-blue-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {calculateTotal(formData.financialSummary).toLocaleString('en-US')}
                  </div>
                </div>
              </div>
            </section>

            {/* Impact Assessment */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Impact Assessment</h3>
              <div className="space-y-6">
                {(Object.entries(formData.impact || {}) as [keyof ChangeRequest['impact'], { affected: boolean; details: string }][]).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
                    <div className="flex items-center gap-3 pt-4">
                      <button 
                        onClick={() => setFormData({
                          ...formData,
                          impact: { ...formData.impact!, [key]: { ...value, affected: !value.affected } }
                        })}
                        className="flex items-center gap-3 group"
                      >
                        {value.affected ? (
                          <CheckSquare className="w-6 h-6 text-blue-600" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-200 group-hover:text-slate-300 transition-colors" />
                        )}
                        <span className="text-sm font-bold text-slate-700 capitalize">{key} Impact</span>
                      </button>
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impact Details</label>
                      <input 
                        type="text"
                        value={value.details}
                        disabled={!value.affected}
                        onChange={(e) => setFormData({
                          ...formData,
                          impact: { ...formData.impact!, [key]: { ...value, details: e.target.value } }
                        })}
                        className={cn(
                          "w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none",
                          !value.affected && "opacity-50 cursor-not-allowed"
                        )}
                        placeholder={`Describe ${key} impact...`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 mt-12">
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                <History className="w-4 h-4" />
                Version: v{(formData.version || 1.0).toFixed(1)}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="px-8 py-4 text-white font-bold text-sm hover:bg-white/10 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-2xl hover:bg-white/20 transition-all flex items-center gap-2"
                >
                  Save as New Version
                </button>
                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Overwrite Current
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
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Register
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            New Request
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search requests..." 
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Request ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preparer</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contractor</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Requests...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-full">
                        <Database className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No change requests found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    onClick={() => handleEdit(entry)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{entry.requestId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {entry.date}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <User className="w-4 h-4 text-slate-400" />
                        {entry.preparer}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">{entry.contractor}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        getStatusColor(entry.status)
                      )}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
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

      {/* Restricted Data Linking Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Restricted Data Link</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                {showPrompt.message}
              </p>
              <div className="flex items-center gap-4">
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
    </div>
  );
};
