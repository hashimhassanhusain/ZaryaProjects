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
  ArrowRight,
  ShieldCheck,
  FileSignature,
  Calculator,
  Info
} from 'lucide-react';
import { Page, Stakeholder, Project, PurchaseOrder } from '../types';
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

interface ChangeRequestHubViewProps {
  page: Page;
}

interface ChangeRequestItem {
  id: string;
  description: string;
  unit: string;
  oldQty: number;
  newQty: number;
  unitPrice: number;
  totalVariation: number;
}

interface ChangeRequest {
  id: string;
  requestId: string;
  date: string;
  preparer: string;
  contractor: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Review';
  projectId: string;
  
  // Tab 1: General Info
  projectName: string;
  poNumber: string;
  contractNumber: string;
  type: 'Quantity/Cost' | 'Time' | 'Scope' | 'Quality' | 'Other';
  description: string;
  justification: string;
  
  // Tab 2: Impact & Financials
  items: ChangeRequestItem[];
  timeImpactDays: number;
  scopeImpact: string;
  qualityImpact: string;
  
  financials: {
    originalContractValue: number;
    previousApprovedVariations: number;
    currentVariationTotal: number;
    newContractTotal: number;
    credit: number;
    debit: number;
    netImpact: number;
  };
  
  // Tab 3: Approvals
  approvals: {
    preparedBy: { name: string; date: string; signed: boolean };
    reviewedBy: { name: string; date: string; signed: boolean };
    approvedBy: { name: string; date: string; signed: boolean };
  };
  
  version: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
}

interface ChangeRequestVersion {
  id: string;
  requestId: string;
  version: number;
  timestamp: string;
  editorName: string;
  actionType: string;
  data: ChangeRequest;
}

export const ChangeRequestHubView: React.FC<ChangeRequestHubViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [activeTab, setActiveTab] = useState<'general' | 'impact' | 'approvals'>('general');
  const [editingEntry, setEditingEntry] = useState<ChangeRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<ChangeRequest>>({
    requestId: '',
    date: new Date().toISOString().split('T')[0],
    preparer: auth.currentUser?.displayName || '',
    contractor: '',
    status: 'Pending',
    projectName: selectedProject?.name || '',
    poNumber: '',
    contractNumber: '',
    type: 'Quantity/Cost',
    description: '',
    justification: '',
    items: [],
    timeImpactDays: 0,
    scopeImpact: '',
    qualityImpact: '',
    financials: {
      originalContractValue: 0,
      previousApprovedVariations: 0,
      currentVariationTotal: 0,
      newContractTotal: 0,
      credit: 0,
      debit: 0,
      netImpact: 0
    },
    approvals: {
      preparedBy: { name: auth.currentUser?.displayName || '', date: '', signed: false },
      reviewedBy: { name: '', date: '', signed: false },
      approvedBy: { name: '', date: '', signed: false }
    }
  });

  useEffect(() => {
    if (!selectedProject) return;

    const entriesQuery = query(
      collection(db, 'change_requests_hub'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubEntries = onSnapshot(entriesQuery, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangeRequest)));
      setLoading(false);
    });

    // Fetch POs for reference
    const fetchPOs = async () => {
      const poQuery = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
      const poSnap = await getDocs(poQuery);
      setPos(poSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    };
    
    const fetchVendors = async () => {
      const vQuery = query(collection(db, 'vendors'), where('projectId', '==', selectedProject.id));
      const vSnap = await getDocs(vQuery);
      setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchPOs();
    fetchVendors();

    return () => unsubEntries();
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    const nextNum = entries.length + 1;
    setFormData({
      requestId: `ZRY-CR-${nextNum.toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      preparer: auth.currentUser?.displayName || '',
      contractor: 'Dream Quality',
      status: 'Pending',
      projectName: selectedProject?.name || '',
      poNumber: 'COS003646',
      contractNumber: 'Z.Co.25.0090',
      type: 'Quantity/Cost',
      description: 'Replace Gypsum Plaster with Cement Plaster in Basement mechanical areas',
      justification: 'Better moisture resistance for mechanical services',
      items: [
        { id: '1', description: 'Cement Plastering', unit: 'm2', oldQty: 3000, newQty: 4700, unitPrice: 13000, totalVariation: 22100000 }
      ],
      timeImpactDays: 0,
      scopeImpact: '',
      qualityImpact: 'Technical improvement for durability in high-moisture areas.',
      financials: {
        originalContractValue: 588299000,
        previousApprovedVariations: 0,
        currentVariationTotal: 22100000,
        newContractTotal: 610399000,
        credit: 0,
        debit: 22100000,
        netImpact: 22100000
      },
      approvals: {
        preparedBy: { name: 'Muhsin Jalal', date: new Date().toISOString().split('T')[0], signed: true },
        reviewedBy: { name: 'Dana Salih', date: '', signed: false },
        approvedBy: { name: 'Pakzad Taha', date: '', signed: false }
      }
    });
    setActiveTab('general');
    setView('form');
  };

  const handleEdit = (entry: ChangeRequest) => {
    setEditingEntry(entry);
    setFormData(entry);
    setActiveTab('general');
    setView('form');
  };

  const calculateFinancials = (items: ChangeRequestItem[], originalValue: number, prevVariations: number) => {
    const currentTotal = items.reduce((sum, item) => sum + item.totalVariation, 0);
    const debit = items.reduce((sum, item) => sum + (item.totalVariation > 0 ? item.totalVariation : 0), 0);
    const credit = items.reduce((sum, item) => sum + (item.totalVariation < 0 ? Math.abs(item.totalVariation) : 0), 0);
    const netImpact = debit - credit;
    
    return {
      originalContractValue: originalValue,
      previousApprovedVariations: prevVariations,
      currentVariationTotal: netImpact,
      newContractTotal: originalValue + prevVariations + netImpact,
      credit,
      debit,
      netImpact
    };
  };

  const handleItemChange = (index: number, field: keyof ChangeRequestItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'newQty' || field === 'oldQty' || field === 'unitPrice') {
      const item = newItems[index];
      item.totalVariation = (Number(item.newQty) - Number(item.oldQty)) * Number(item.unitPrice);
    }
    
    const newFinancials = calculateFinancials(
      newItems, 
      formData.financials?.originalContractValue || 0, 
      formData.financials?.previousApprovedVariations || 0
    );
    
    setFormData({ ...formData, items: newItems, financials: newFinancials });
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject || !formData.requestId) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const entryData = {
        ...formData,
        projectId: selectedProject.id,
        version: isNewVersion ? (editingEntry?.version || 1.0) + 0.1 : (editingEntry?.version || 1.0),
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingEntry?.createdAt || timestamp,
        createdBy: editingEntry?.createdBy || user
      };

      let docRef;
      if (editingEntry && !isNewVersion) {
        docRef = doc(db, 'change_requests_hub', editingEntry.id);
        await updateDoc(docRef, entryData);
      } else {
        docRef = await addDoc(collection(db, 'change_requests_hub'), entryData);
      }

      // Version History
      await addDoc(collection(db, 'change_request_hub_versions'), {
        requestId: docRef.id,
        version: entryData.version,
        timestamp,
        editorName: user,
        actionType: isNewVersion ? 'New Version' : (editingEntry ? 'Update' : 'Initial Create'),
        data: entryData
      });

      // Restricted Data Linking Prompts
      if (entryData.status === 'Approved') {
        setShowPrompt({
          type: 'PO/Schedule',
          message: "This approval impacts the [PO/Schedule]. Do you want to propose a draft update to the baseline?",
          onConfirm: () => {
            console.log('Draft update proposed for PO/Schedule');
            setShowPrompt(null);
            setView('list');
          }
        });
      } else {
        setView('list');
      }

    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'change_requests_hub');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (shouldSave: boolean = false) => {
    if (!selectedProject || !formData.requestId) return;
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    // Logo
    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('CHANGE REQUEST FORM', pageWidth / 2, 35, { align: 'center' });
    pdfDoc.setFontSize(12);
    pdfDoc.text('(طلب تغيير)', pageWidth / 2, 42, { align: 'center' });

    // Page 1: General Info
    autoTable(pdfDoc, {
      startY: 50,
      body: [
        ['Project Name:', formData.projectName || '', 'Date:', formData.date || ''],
        ['PO Number:', formData.poNumber || '', 'Preparer:', formData.preparer || ''],
        ['Contract No:', formData.contractNumber || '', 'Contractor:', formData.contractor || ''],
        ['Change Type:', formData.type || '', '', '']
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { fontStyle: 'bold', cellWidth: 30 } }
    });

    let y = (pdfDoc as any).lastAutoTable.finalY + 10;
    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('DESCRIPTION OF CHANGE:', margin, y);
    y += 5;
    pdfDoc.setFont('helvetica', 'normal');
    const descLines = pdfDoc.splitTextToSize(formData.description || '', pageWidth - 2 * margin);
    pdfDoc.text(descLines, margin, y);
    y += descLines.length * 5 + 5;

    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('JUSTIFICATION:', margin, y);
    y += 5;
    pdfDoc.setFont('helvetica', 'normal');
    const justLines = pdfDoc.splitTextToSize(formData.justification || '', pageWidth - 2 * margin);
    pdfDoc.text(justLines, margin, y);

    // Page 2: Impact & Financials
    pdfDoc.addPage();
    pdfDoc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    pdfDoc.setFontSize(14);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('IMPACT ASSESSMENT & FINANCIALS', pageWidth / 2, 35, { align: 'center' });

    autoTable(pdfDoc, {
      startY: 45,
      head: [['Description', 'Unit', 'Old Qty', 'New Qty', 'Rate', 'Variation']],
      body: (formData.items || []).map(item => [
        item.description,
        item.unit,
        item.oldQty,
        item.newQty,
        item.unitPrice.toLocaleString(),
        item.totalVariation.toLocaleString()
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = (pdfDoc as any).lastAutoTable.finalY + 10;
    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('FINANCIAL SUMMARY:', margin, y);
    autoTable(pdfDoc, {
      startY: y + 2,
      body: [
        ['Original Contract Value:', (formData.financials?.originalContractValue || 0).toLocaleString()],
        ['Previous Approved Variations:', (formData.financials?.previousApprovedVariations || 0).toLocaleString()],
        ['Current Variation Total:', (formData.financials?.currentVariationTotal || 0).toLocaleString()],
        ['NEW CONTRACT TOTAL:', (formData.financials?.newContractTotal || 0).toLocaleString()]
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    y = (pdfDoc as any).lastAutoTable.finalY + 10;
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('APPROVALS:', margin, y);
    autoTable(pdfDoc, {
      startY: y + 2,
      head: [['Role', 'Name', 'Date', 'Signature']],
      body: [
        ['Prepared By', formData.approvals?.preparedBy?.name || '', formData.approvals?.preparedBy?.date || '', formData.approvals?.preparedBy?.signed ? 'SIGNED' : ''],
        ['Reviewed By', formData.approvals?.reviewedBy?.name || '', formData.approvals?.reviewedBy?.date || '', formData.approvals?.reviewedBy?.signed ? 'SIGNED' : ''],
        ['Approved By', formData.approvals?.approvedBy?.name || '', formData.approvals?.approvedBy?.date || '', formData.approvals?.approvedBy?.signed ? 'SIGNED' : '']
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (formData.version || 1.0).toFixed(1);
    // [P16314]-[Dept]-[Type]-[RefNo]-[Ver]-[Date]
    const fileName = `${selectedProject.code}-PROC-CR-${formData.requestId}-${vStr}-${dateStr}.pdf`;
    
    if (shouldSave) {
      // Simulate saving to drive by adding to savedDocuments
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const newDoc = {
        id: `drive_${Date.now()}`,
        name: fileName,
        date: timestamp,
        url: '#', // In a real app, this would be the actual file URL
        author: user,
        version: formData.version || 1.0,
        pageId: page.id,
        path: '/01-Management/04-Procurement/02-RFQ_Quotations/'
      };

      const projectDoc = await getDoc(doc(db, 'projects', selectedProject.id));
      if (projectDoc.exists()) {
        const pData = projectDoc.data() as Project;
        const updatedDocs = [...(pData.savedDocuments || []), newDoc];
        await updateDoc(doc(db, 'projects', selectedProject.id), { savedDocuments: updatedDocs });
      }
    }

    pdfDoc.save(fileName);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this change request?')) return;
    try {
      await deleteDoc(doc(db, 'change_requests_hub', id));
    } catch (error) {
      console.error('Error deleting change request:', error);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.contractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Register
          </button>
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              formData.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
              formData.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
              "bg-amber-50 text-amber-600 border-amber-100"
            )}>
              {formData.status}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
              VERSION: v{(formData.version || 1.0).toFixed(1)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            {[
              { id: 'general', label: 'General Info & Description', icon: Info },
              { id: 'impact', label: 'Impact Assessment & Financials', icon: Calculator },
              { id: 'approvals', label: 'Approvals & Signatures', icon: FileSignature }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-6 text-xs font-black uppercase tracking-widest transition-all border-b-2",
                  activeTab === tab.id 
                    ? "bg-white text-blue-600 border-blue-600" 
                    : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-10">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Request ID</label>
                      <input 
                        type="text"
                        value={formData.requestId}
                        onChange={(e) => setFormData({ ...formData, requestId: e.target.value })}
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
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Change Type</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      >
                        <option value="Quantity/Cost">Quantity/Cost</option>
                        <option value="Time">Time</option>
                        <option value="Scope">Scope</option>
                        <option value="Quality">Quality</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PO Number</label>
                      <select 
                        value={formData.poNumber}
                        onChange={(e) => {
                          const selectedPO = pos.find(p => p.id === e.target.value);
                          if (selectedPO) {
                            setFormData({ 
                              ...formData, 
                              poNumber: selectedPO.id,
                              contractor: selectedPO.supplier,
                              financials: {
                                ...formData.financials!,
                                originalContractValue: selectedPO.amount
                              }
                            });
                          } else {
                            setFormData({ ...formData, poNumber: e.target.value });
                          }
                        }}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      >
                        <option value="">Select PO...</option>
                        {pos.map(p => (
                          <option key={p.id} value={p.id}>{p.id} - {p.supplier}</option>
                        ))}
                        <option value="COS003646">COS003646 (Manual)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contractor</label>
                      <select 
                        value={formData.contractor}
                        onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      >
                        <option value="">Select Contractor...</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                        <option value="Dream Quality">Dream Quality (Manual)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Description of Change</label>
                      <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={5}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                        placeholder="Describe the proposed change in detail..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification</label>
                      <textarea 
                        value={formData.justification}
                        onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                        rows={3}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                        placeholder="Why is this change necessary?"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'impact' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  {/* Quantity/Cost Variations Table */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Quantity & Cost Variations</h3>
                      <button 
                        onClick={() => setFormData({
                          ...formData,
                          items: [...(formData.items || []), { id: Date.now().toString(), description: '', unit: '', oldQty: 0, newQty: 0, unitPrice: 0, totalVariation: 0 }]
                        })}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        Add Item
                      </button>
                    </div>
                    <div className="overflow-hidden border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Old Qty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">New Qty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Variation</th>
                            <th className="px-6 py-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(formData.items || []).map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3">
                                <input 
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium p-0"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input 
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                  className="w-20 bg-transparent border-none focus:ring-0 text-sm font-medium p-0"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input 
                                  type="number"
                                  value={item.oldQty}
                                  onChange={(e) => handleItemChange(idx, 'oldQty', e.target.value)}
                                  className="w-24 bg-transparent border-none focus:ring-0 text-sm font-medium p-0"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input 
                                  type="number"
                                  value={item.newQty}
                                  onChange={(e) => handleItemChange(idx, 'newQty', e.target.value)}
                                  className="w-24 bg-transparent border-none focus:ring-0 text-sm font-medium p-0"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input 
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                  className="w-32 bg-transparent border-none focus:ring-0 text-sm font-medium p-0"
                                />
                              </td>
                              <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">
                                {item.totalVariation.toLocaleString()}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <button 
                                  onClick={() => {
                                    const newItems = formData.items!.filter((_, i) => i !== idx);
                                    setFormData({ ...formData, items: newItems });
                                  }}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Other Impacts */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Impact (Days)</label>
                      <input 
                        type="number"
                        value={formData.timeImpactDays}
                        onChange={(e) => setFormData({ ...formData, timeImpactDays: Number(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Impact Details</label>
                      <input 
                        type="text"
                        value={formData.scopeImpact}
                        onChange={(e) => setFormData({ ...formData, scopeImpact: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        placeholder="Describe additions or deletions to scope..."
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quality Impact Assessment</label>
                      <input 
                        type="text"
                        value={formData.qualityImpact}
                        onChange={(e) => setFormData({ ...formData, qualityImpact: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        placeholder="Describe technical improvements or changes to quality standards..."
                      />
                    </div>
                  </section>

                  {/* Financial Summary Cards */}
                  <section className="bg-slate-900 rounded-[2rem] p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Financial Summary</h3>
                      <div className="flex items-center gap-2 text-blue-400">
                        <Calculator className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Auto-Calculated</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Original Contract</span>
                        <div className="text-xl font-black text-white">
                          {formData.financials?.originalContractValue.toLocaleString()} <span className="text-[10px] text-white/40">IQD</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Approved Variations</span>
                        <div className="text-xl font-black text-white">
                          {formData.financials?.previousApprovedVariations.toLocaleString()} <span className="text-[10px] text-white/40">IQD</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Current Net Impact</span>
                        <div className={cn(
                          "text-xl font-black",
                          (formData.financials?.netImpact || 0) > 0 ? "text-red-400" : 
                          (formData.financials?.netImpact || 0) < 0 ? "text-emerald-400" : "text-white"
                        )}>
                          {formData.financials?.netImpact.toLocaleString()} <span className="text-[10px] opacity-40">IQD</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">New Contract Total</span>
                        <div className="text-xl font-black text-blue-400">
                          {formData.financials?.newContractTotal.toLocaleString()} <span className="text-[10px] opacity-40">IQD</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Debit: {formData.financials?.debit.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Credit: {formData.financials?.credit.toLocaleString()}</span>
                        </div>
                      </div>
                      {(formData.financials?.credit || 0) === (formData.financials?.debit || 0) && (formData.financials?.credit || 0) > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Financial Offset (Net Zero)</span>
                        </div>
                      )}
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'approvals' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { key: 'preparedBy', label: 'Prepared By (Contractor)', icon: User },
                      { key: 'reviewedBy', label: 'Reviewed By (PM)', icon: ShieldCheck },
                      { key: 'approvedBy', label: 'Approved By (Director)', icon: FileSignature }
                    ].map(role => (
                      <div key={role.key} className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <role.icon className="w-5 h-5 text-slate-400" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role.label}</span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                            <input 
                              type="text"
                              value={(formData.approvals as any)[role.key].name}
                              onChange={(e) => setFormData({
                                ...formData,
                                approvals: {
                                  ...formData.approvals!,
                                  [role.key]: { ...(formData.approvals as any)[role.key], name: e.target.value }
                                }
                              })}
                              className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                            <input 
                              type="date"
                              value={(formData.approvals as any)[role.key].date}
                              onChange={(e) => setFormData({
                                ...formData,
                                approvals: {
                                  ...formData.approvals!,
                                  [role.key]: { ...(formData.approvals as any)[role.key], date: e.target.value }
                                }
                              })}
                              className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                          <button 
                            onClick={() => setFormData({
                              ...formData,
                              approvals: {
                                ...formData.approvals!,
                                [role.key]: { ...(formData.approvals as any)[role.key], signed: !(formData.approvals as any)[role.key].signed }
                              }
                            })}
                            className={cn(
                              "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                              (formData.approvals as any)[role.key].signed 
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20" 
                                : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                            )}
                          >
                            {(formData.approvals as any)[role.key].signed ? <CheckCircle2 className="w-4 h-4" /> : <FileSignature className="w-4 h-4" />}
                            {(formData.approvals as any)[role.key].signed ? 'Signed & Verified' : 'Click to Sign'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Decision Authority Notice</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        Final approval is subject to the Change Control Board (CCB) review. Approved changes will trigger a baseline update prompt for the Cost and Schedule domains.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-[2rem] p-8 mt-12">
              <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-widest">
                <History className="w-4 h-4" />
                Audit Log: Prepared by {formData.approvals?.preparedBy?.name || '---'}
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
                  onClick={() => {
                    handleSave(false);
                    generatePDF(true);
                  }}
                  disabled={isSaving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Finalize & Issue PDF
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
          <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-200">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{page.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">REF: {page.id}</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">Active Variations: {entries.length}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            New Change Request
          </button>
        </div>
      </header>

      {/* Register Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Request ID, Description or Contractor..." 
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Impact</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium">
                    No change requests found.
                  </td>
                </tr>
              ) : filteredEntries.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-slate-900">{entry.requestId}</span>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">v{entry.version.toFixed(1)}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium text-slate-700 line-clamp-1 max-w-xs">{entry.description}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{entry.contractor}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "text-sm font-black",
                      (entry.financials?.netImpact || 0) > 0 ? "text-red-600" : 
                      (entry.financials?.netImpact || 0) < 0 ? "text-emerald-600" : "text-slate-900"
                    )}>
                      {entry.financials?.netImpact.toLocaleString()} <span className="text-[10px] opacity-40">IQD</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      entry.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      entry.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                      "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          setFormData(entry);
                          generatePDF();
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Export PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id)}
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
      </div>

      {/* Prompt Modal */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrompt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-10 h-10 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Baseline Impact Detected</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {showPrompt.message}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={showPrompt.onConfirm}
                    className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                  >
                    Yes, Propose Draft Update
                  </button>
                  <button 
                    onClick={() => {
                      setShowPrompt(null);
                      setView('list');
                    }}
                    className="w-full py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    No, Save Only
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
