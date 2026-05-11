import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  HardDrive, 
  Loader2, 
  Download, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  Building2,
  Tag,
  Hash,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { PurchaseRequest, TenderBidder } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { db, storage, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { SearchableSelect } from './common/SearchableSelect';

interface ProcurementDocument {
  id: string;
  prId: string;
  projectId: string;
  originator: 'PRO' | 'ENG' | 'SUP' | 'PM' | 'CLT';
  category: 'TECHNICAL' | 'FINANCIAL' | 'LEGAL' | 'CORR' | 'CATALOG';
  docType: string;
  supplierId?: string;
  supplierName?: string;
  refNo: string;
  description: string;
  version: string;
  date: string;
  fullName: string;
  status: 'Draft' | 'Sent' | 'Received' | 'Approved' | 'Rejected';
  fileUrl?: string;
  driveFileId?: string;
  size?: string;
  extension?: string;
  uploadedAt: any;
  uploadedBy: string;
}

const ORIGINATORS = [
  { code: 'PRO', label: 'Procurement' },
  { code: 'ENG', label: 'Engineering' },
  { code: 'SUP', label: 'Supplier/Vendor' },
  { code: 'PM', label: 'Project Management' },
  { code: 'CLT', label: 'Client' },
];

const CATEGORIES = [
  { code: 'TECHNICAL', label: 'Technical Docs', icon: FileText },
  { code: 'FINANCIAL', label: 'Financial Offers', icon: Hash },
  { code: 'LEGAL', label: 'Regulatory/Compliance', icon: CheckCircle2 },
  { code: 'CORR', label: 'Correspondence', icon: Tag },
  { code: 'CATALOG', label: 'Supplier Catalogs', icon: Building2 },
];

const DOC_TYPES: Record<string, string[]> = {
  TECHNICAL: ['Drawings', 'Specs', 'Method Statement', 'Material Submittal', 'Data Sheets'],
  FINANCIAL: ['Quote', 'BOQ', 'Payment Schedule', 'Tax Clearance'],
  LEGAL: ['Contract Agreement', 'Terms & Conditions', 'Registration Certificate', 'License'],
  CORR: ['Clarification Request', 'Memo', 'Email Log', 'Meeting Minutes'],
  CATALOG: ['Product Brochure', 'Company Profile', 'Reference List'],
};

interface ProcurementDocumentHubProps {
  pr: PurchaseRequest;
  bidders: TenderBidder[];
  suppliers: {id: string, name: string}[];
}

export const ProcurementDocumentHub: React.FC<ProcurementDocumentHubProps> = ({ pr, bidders, suppliers }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [documents, setDocuments] = useState<ProcurementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [formData, setFormData] = useState({
    originator: 'PRO',
    category: 'TECHNICAL',
    docType: 'Drawings',
    supplierId: '',
    refNo: '001',
    description: '',
    version: 'V01',
  });

  useEffect(() => {
    if (!pr.id) return;
    setLoading(true);
    const q = query(
      collection(db, 'procurement_documents'),
      where('prId', '==', pr.id),
      orderBy('uploadedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementDocument)));
      setLoading(false);
    });
    return () => unsub();
  }, [pr.id]);

  const getSupplierName = useCallback((id: string) => {
    const bidder = bidders.find(b => b.id === id);
    if (bidder) return bidder.companyName;
    const globalSupplier = suppliers.find(s => s.id === id);
    if (globalSupplier) return globalSupplier.name;
    return 'GEN';
  }, [bidders, suppliers]);

  const generateFileName = useCallback(() => {
    const projectCode = selectedProject?.code || 'PRJ';
    const prCode = pr.id?.slice(-6).toUpperCase() || 'PR';
    const supplier = getSupplierName(formData.supplierId);
    const supplierCode = supplier.substring(0, 3).toUpperCase();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cleanDesc = (formData.description || 'DOC').trim().replace(/\s+/g, '_');
    
    return `${supplierCode}-${projectCode}-${formData.originator}-${prCode}-${formData.category}-${formData.refNo}-${cleanDesc}-${formData.version}-${dateStr}`;
  }, [selectedProject?.code, pr.id, formData, getSupplierName]);

  const handleFileUpload = async () => {
    if (!pendingFile || !pr.id || !selectedProject) return;
    
    if (!formData.supplierId) {
      toast.error('You must select a Related Bidder or Company Originator before uploading.');
      return;
    }

    const toastId = toast.loading('Processing Procurement Asset...');
    const fullName = generateFileName();
    const extension = '.' + pendingFile.name.split('.').pop()?.toLowerCase();
    const supplierName = getSupplierName(formData.supplierId);
    const supplierFound = supplierName !== 'GEN' ? supplierName : undefined;

    try {
      // 1. Firebase Storage Upload
      const storageRef = ref(storage, `procurement/${selectedProject.id}/${pr.id}/${fullName}${extension}`);
      const uploadRes = await uploadBytes(storageRef, pendingFile);
      const fileUrl = await getDownloadURL(uploadRes.ref);

      // 2. Drive Upload (Simulation/Placeholder for actual API)
      let driveFileId = '';
      if (pr.driveFolderId) {
        try {
          const driveData = new FormData();
          driveData.append('file', pendingFile);
          driveData.append('folderId', pr.driveFolderId);
          driveData.append('name', fullName + extension);
          // Actual Drive API call would go here
        } catch (e) {
          console.warn('Drive upload error:', e);
        }
      }

      // 3. Firestore Entry
      const newDoc: Omit<ProcurementDocument, 'id'> = {
        prId: pr.id,
        projectId: selectedProject.id,
        originator: formData.originator as any,
        category: formData.category as any,
        docType: formData.docType,
        supplierId: formData.supplierId,
        supplierName: supplierFound,
        refNo: formData.refNo,
        description: formData.description,
        version: formData.version,
        date: new Date().toISOString(),
        fullName: fullName + extension,
        status: 'Received',
        fileUrl,
        driveFileId,
        size: (pendingFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        extension,
        uploadedAt: serverTimestamp(),
        uploadedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System',
      };

      await addDoc(collection(db, 'procurement_documents'), newDoc);
      toast.success('Document cataloged successfully', { id: toastId });
      setIsUploadModalOpen(false);
      setPendingFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to catalog document', { id: toastId });
    }
  };

  const filteredDocs = documents.filter(d => {
    const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
    const matchesSearch = d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search documents, suppliers, or descriptions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
          />
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-[1.2rem]">
          <button 
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeCategory === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.code}
              onClick={() => setActiveCategory(cat.code)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeCategory === cat.code ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10">Total Files</p>
          <p className="text-3xl font-black text-slate-900 mt-1 relative z-10">{documents.length}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10">Financials</p>
          <p className="text-3xl font-black text-slate-900 mt-1 relative z-10">
            {documents.filter(d => d.category === 'FINANCIAL').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] relative z-10">Technical</p>
          <p className="text-3xl font-black text-slate-900 mt-1 relative z-10">
            {documents.filter(d => d.category === 'TECHNICAL').length}
          </p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 p-5 rounded-[2rem] shadow-xl shadow-blue-500/20 flex flex-col justify-center items-center text-white hover:bg-blue-700 transition-all active:scale-95 group"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">Upload Asset</p>
        </button>
      </div>

      {/* Docs Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Registry</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Originator</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Supplier</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm">No procurement assets cataloged yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                          doc.category === 'TECHNICAL' ? "bg-indigo-50 border-indigo-100 text-indigo-500" :
                          doc.category === 'FINANCIAL' ? "bg-emerald-50 border-emerald-100 text-emerald-500" :
                          "bg-slate-50 border-slate-100 text-slate-400"
                        )}>
                          <FileText className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{doc.fullName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-lg">{doc.docType}</span>
                            <span className="text-[10px] font-medium text-slate-300">•</span>
                            <span className="text-[10px] font-bold text-slate-400 italic">{doc.version}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-[8px] font-black border border-orange-100">
                          {doc.originator}
                        </div>
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{doc.originator}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{doc.supplierName || '---'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        doc.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        doc.status === 'Draft' ? "bg-slate-100 text-slate-500" :
                        "bg-orange-50 text-orange-600 border border-orange-100"
                      )}>
                        {doc.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {doc.status}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all">
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

      {/* Smart Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 pointer-events-none" />
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    Asset Cataloging
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 ml-13">Smart Naming & Folder Organization</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!pendingFile ? (
                <div 
                  className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-center hover:border-blue-100 hover:bg-blue-50/10 transition-all cursor-pointer group"
                  onClick={() => document.getElementById('procurement-file-input')?.click()}
                >
                  <input 
                    type="file" 
                    id="procurement-file-input" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && setPendingFile(e.target.files[0])}
                  />
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-10 h-10 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">Drop Procurement Asset</p>
                  <p className="text-xs font-bold text-slate-400 mt-2">Technical Drawings, Specs, Quotes, or Correspondence</p>
                </div>
              ) : (
                <div className="space-y-6 relative z-10">
                  {/* Filename Preview */}
                  <div className="bg-slate-900 rounded-[1.5rem] p-5 border-l-4 border-blue-500 shadow-inner">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Auto-Generated Naming String</p>
                    <code className="text-white font-mono text-sm break-all leading-relaxed">{generateFileName()}</code>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Originator</label>
                      <select 
                        value={formData.originator}
                        onChange={(e) => setFormData({...formData, originator: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      >
                        {ORIGINATORS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value, docType: DOC_TYPES[e.target.value][0]})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      >
                        {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Type</label>
                      <select 
                        value={formData.docType}
                        onChange={(e) => setFormData({...formData, docType: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      >
                        {DOC_TYPES[formData.category].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Originator / Company (Required)</label>
                      <SearchableSelect 
                        options={[
                           {id: 'GEN', name: 'General Project Document'},
                           ...bidders.map(b => ({ id: b.id, name: b.companyName })),
                           ...suppliers.map(s => ({ id: s.id, name: s.name }))
                        ]}
                        value={formData.supplierId}
                        onChange={(id) => setFormData({...formData, supplierId: id})}
                        placeholder="Search Company..."
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Description</label>
                      <input 
                        type="text"
                        placeholder="Brief description for naming..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref No</label>
                      <input 
                        type="text"
                        value={formData.refNo}
                        onChange={(e) => setFormData({...formData, refNo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Version</label>
                      <input 
                        type="text"
                        value={formData.version}
                        onChange={(e) => setFormData({...formData, version: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setPendingFile(null)}
                      className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                      Clear & Change
                    </button>
                    <button 
                      onClick={handleFileUpload}
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                    >
                      Catalog Asset
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
