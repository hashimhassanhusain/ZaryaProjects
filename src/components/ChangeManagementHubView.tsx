import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Calendar,
  Layers,
  Loader2,
  Search,
  Filter,
  Edit2,
  Trash2,
  Printer,
  ArrowLeft,
  Save,
  X,
  Info,
  Calculator,
  FileSignature,
  History,
  User,
  MoreHorizontal
} from 'lucide-react';
import { Page, PurchaseOrder, Project } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChangeManagementHubViewProps {
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
  projectName: string;
  poNumber: string;
  contractNumber: string;
  type: 'Quantity/Cost' | 'Time' | 'Scope' | 'Quality' | 'Other';
  description: string;
  justification: string;
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

export const ChangeManagementHubView: React.FC<ChangeManagementHubViewProps> = ({ page }) => {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'hub' | 'detail' | 'new'>('hub');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [formData, setFormData] = useState<Partial<ChangeRequest>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    totalImpact: 0
  });
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'change_requests'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const changes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRequests(changes);
      
      const total = changes.length;
      const approved = changes.filter(c => c.status === 'Approved').length;
      const pending = changes.filter(c => c.status === 'Pending').length;
      const totalImpact = changes.reduce((sum, c) => {
        // Handle both schemas if necessary, but prioritize change_requests schema
        const impact = c.financialSummary?.currentChangeValue || c.financials?.netImpact || 0;
        return sum + impact;
      }, 0);

      setStats({ total, approved, pending, totalImpact });
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'change_requests');
      setLoading(false);
    });

    const fetchPOs = async () => {
      const poQuery = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
      const poSnap = await getDocs(poQuery);
      setPos(poSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    };
    fetchPOs();

    return () => unsubscribe();
  }, [selectedProject]);

  const handleAdd = () => {
    const nextNum = requests.length + 1;
    const newRequest: Partial<ChangeRequest> = {
      requestId: `ZRY-CR-${nextNum.toString().padStart(3, '0')}`,
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
      },
      version: 1.0
    };
    setFormData(newRequest);
    setView('new');
  };

  const handleCreate = async () => {
    if (!selectedProject || !formData.requestId) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const entryData = {
        ...formData,
        projectId: selectedProject.id,
        createdAt: timestamp,
        createdBy: user,
        updatedAt: timestamp,
        updatedBy: user,
        version: 1.0
      };

      await addDoc(collection(db, 'change_requests'), entryData);
      setView('hub');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'change_requests');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestClick = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setIsEditing(false);
    setView('detail');
  };

  const handleSave = async () => {
    if (!selectedRequest || !selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updatedData = {
        ...selectedRequest,
        updatedAt: timestamp,
        updatedBy: user,
        version: (selectedRequest.version || 1.0) + 0.1
      };

      await updateDoc(doc(db, 'change_requests', selectedRequest.id), updatedData);
      setSelectedRequest(updatedData as ChangeRequest);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'change_requests');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = (request: ChangeRequest) => {
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = pdfDoc.internal.pageSize.width;

    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text('CHANGE REQUEST FORM', pageWidth / 2, 35, { align: 'center' });

    autoTable(pdfDoc, {
      startY: 50,
      body: [
        ['Request ID:', request.requestId, 'Date:', request.date],
        ['Project:', request.projectName, 'Preparer:', request.preparer],
        ['Status:', request.status, 'Contractor:', request.contractor]
      ],
      theme: 'plain',
      styles: { fontSize: 9 }
    });

    pdfDoc.save(`${request.requestId}.pdf`);
  };

  const kpis = [
    { label: 'Total Change Requests', value: stats.total.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Approved Variations', value: stats.approved.toString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Review', value: stats.pending.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Cost Impact', value: formatCurrency(stats.totalImpact), icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' }
  ];

  const filteredRequests = requests.filter(r => 
    (r.requestId || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (r.description || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (view === 'new') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('hub')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hub
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('hub')}
              className="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Request
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Request ID</label>
                <input 
                  type="text" 
                  value={formData.requestId}
                  onChange={(e) => setFormData({...formData, requestId: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="Quantity/Cost">Quantity/Cost</option>
                  <option value="Time">Time</option>
                  <option value="Scope">Scope</option>
                  <option value="Quality">Quality</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Contractor</label>
                <input 
                  type="text" 
                  value={formData.contractor}
                  onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  placeholder="Enter contractor name..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Description of Change
                  </h3>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[120px]"
                    placeholder="Describe the proposed change..."
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Justification
                  </h3>
                  <textarea 
                    value={formData.justification}
                    onChange={(e) => setFormData({...formData, justification: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px]"
                    placeholder="Why is this change necessary?"
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6">
                  <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Financial Impact</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Original Value</label>
                      <input 
                        type="number"
                        value={formData.financials?.originalContractValue}
                        onChange={(e) => setFormData({
                          ...formData,
                          financials: { ...formData.financials!, originalContractValue: Number(e.target.value) }
                        })}
                        className="w-full bg-transparent border-b border-white/10 text-lg font-semibold focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Net Impact</label>
                      <input 
                        type="number"
                        value={formData.financials?.netImpact}
                        onChange={(e) => setFormData({
                          ...formData,
                          financials: { ...formData.financials!, netImpact: Number(e.target.value) }
                        })}
                        className="w-full bg-transparent border-b border-white/10 text-lg font-semibold focus:border-blue-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Time Impact (Days)</label>
                    <input 
                      type="number"
                      value={formData.timeImpactDays}
                      onChange={(e) => setFormData({...formData, timeImpactDays: Number(e.target.value)})}
                      className="w-full bg-transparent border-none text-xl font-semibold text-slate-900 focus:ring-0 p-0"
                    />
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">PO Number</label>
                    <input 
                      type="text"
                      value={formData.poNumber}
                      onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                      className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:ring-0 p-0"
                      placeholder="PO-XXXX"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedRequest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('hub')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hub
          </button>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit Request
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            )}
            <button 
              onClick={() => generatePDF(selectedRequest)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-10 space-y-10">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Request ID</label>
                <div className="text-lg font-semibold text-slate-900">{selectedRequest.requestId}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</label>
                {isEditing ? (
                  <input 
                    type="date" 
                    value={selectedRequest.date}
                    onChange={(e) => setSelectedRequest({...selectedRequest, date: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                ) : (
                  <div className="text-lg font-bold text-slate-700">{selectedRequest.date}</div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</label>
                {isEditing ? (
                  <select 
                    value={selectedRequest.status}
                    onChange={(e) => setSelectedRequest({...selectedRequest, status: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="In Review">In Review</option>
                  </select>
                ) : (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border block w-fit",
                    selectedRequest.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    selectedRequest.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                    "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {selectedRequest.status}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Version</label>
                <div className="text-lg font-semibold text-blue-600">v{selectedRequest.version.toFixed(1)}</div>
              </div>
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Description of Change
                  </h3>
                  {isEditing ? (
                    <textarea 
                      value={selectedRequest.description}
                      onChange={(e) => setSelectedRequest({...selectedRequest, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[120px]"
                    />
                  ) : (
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      {selectedRequest.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Justification
                  </h3>
                  {isEditing ? (
                    <textarea 
                      value={selectedRequest.justification}
                      onChange={(e) => setSelectedRequest({...selectedRequest, justification: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px]"
                    />
                  ) : (
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      {selectedRequest.justification}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Financial Impact</h3>
                    <Calculator className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Original Value</span>
                      <div className="text-lg font-semibold">{formatCurrency(selectedRequest.financials.originalContractValue)}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Net Impact</span>
                      <div className={cn(
                        "text-lg font-semibold",
                        selectedRequest.financials.netImpact > 0 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {formatCurrency(selectedRequest.financials.netImpact)}
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/10">
                    <span className="text-[9px] font-semibold text-blue-400 uppercase tracking-widest">New Contract Total</span>
                    <div className="text-2xl font-semibold text-blue-400">{formatCurrency(selectedRequest.financials.newContractTotal)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Time Impact</span>
                    <div className="text-xl font-semibold text-slate-900">{selectedRequest.timeImpactDays} Days</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Contractor</span>
                    <div className="text-sm font-bold text-slate-900 truncate">{selectedRequest.contractor}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest">Variation Items</h3>
              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Unit</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Old Qty</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">New Qty</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Rate</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedRequest.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{item.description}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.unit}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 text-right">{item.oldQty}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 text-right">{item.newQty}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.totalVariation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-end">
        <button 
          onClick={() => navigate('/page/2.1.1')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Change Management Plan
        </button>
      </div>

      {/* Change Request Register Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Change Request Register</h3>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
            <button 
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Request
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Impact</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-4 h-16 bg-slate-50/50" />
                  </tr>
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((cr) => (
                  <tr 
                    key={cr.id} 
                    onClick={() => handleRequestClick(cr)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-8 py-5">
                      <div className="text-sm font-semibold text-slate-900">{cr.requestId}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">v{cr.version.toFixed(1)}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-medium text-slate-700 line-clamp-1">{cr.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cr.contractor}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest border",
                        cr.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        cr.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {cr.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "text-sm font-semibold",
                        (cr.financialSummary?.currentChangeValue || cr.financials?.netImpact || 0) > 0 ? "text-red-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(cr.financialSummary?.currentChangeValue || cr.financials?.netImpact || 0)}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="p-2 text-slate-300 group-hover:text-blue-600 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-[10px]">
                    No change requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance Info Card */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
              <h3 className="text-2xl font-semibold tracking-tight">Governance & Control</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              All changes must be assessed for impact on the project baselines. Approved variations will trigger a baseline update prompt to ensure the PO and Schedule domains remain synchronized.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Strict Version Control
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Automated Formulas
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              CCB Approval
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
