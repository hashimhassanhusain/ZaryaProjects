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
import { useAuth } from '../context/UserContext';
import { DriveFolderPromptModal } from './common/DriveFolderPromptModal';
import { db, storage, auth, handleFirestoreError, OperationType } from '../firebase';
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
import { UniversalDataTable } from './common/UniversalDataTable';

interface ProcurementDocument {
  id?: string;
  prId: string;
  projectId: string;
  originator: string;
  category: string;
  docType: string;
  supplierId?: string;
  supplierName?: string;
  refNo: string;
  description: string;
  version: string;
  fullName: string;
  status: string;
  firebaseUrl?: string;
  driveFileId?: string;
  drivePath?: string;
  size?: number;
  mimeType?: string;
  uploadedAt: any;
  uploadedBy: string;
  metadata?: {
    prCode: string;
    projectCode: string;
  };
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
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState<ProcurementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

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
      where('prId', '==', pr.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementDocument));
      // Sort in frontend to avoid composite index requirement
      docs.sort((a, b) => {
        const timeA = a.uploadedAt?.toMillis ? a.uploadedAt.toMillis() : (a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0);
        const timeB = b.uploadedAt?.toMillis ? b.uploadedAt.toMillis() : (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0);
        return timeB - timeA;
      });
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error in procurement_documents:", error);
      handleFirestoreError(error, OperationType.LIST, 'procurement_documents');
      setLoading(false);
    });
    return () => unsub();
  }, [pr.id]);

  const handleDeleteDocument = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'procurement_documents', id));
      toast.success(isRtl ? 'تم حذف المستند بنجاح' : 'Document deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل حذف المستند' : 'Failed to delete document');
    }
  };

  const getSupplierName = useCallback((id: string) => {
    const bidder = bidders.find(b => b.id === id);
    if (bidder) return bidder.companyName;
    const globalSupplier = suppliers.find(s => s.id === id);
    if (globalSupplier) return globalSupplier.name;
    return 'GEN';
  }, [bidders, suppliers]);

  const generateFileName = useCallback(() => {
    const companyCode = selectedProject?.companyCode || 'ZARYA';
    const projectCode = selectedProject?.code || 'PRJ';
    const prCode = pr.id?.slice(-6).toUpperCase() || 'PR';
    const supplier = getSupplierName(formData.supplierId);
    const supplierCode = supplier.substring(0, 3).toUpperCase();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cleanDesc = (formData.description || 'DOC').trim().replace(/\s+/g, '_');
    
    return `${companyCode}-${projectCode}-${supplierCode}-${formData.originator}-${prCode}-${formData.category}-${cleanDesc}-${dateStr}`;
  }, [selectedProject?.code, pr.id, formData, getSupplierName]);

  const performUpload = async (fileToUpload: File, projectRootId: string) => {
    const toastId = toast.loading(isRtl ? '🔍 جاري الرفع...' : '☁️ Uploading...', { duration: 15000 });

    // Check if supplier is available, otherwise allow 'GENERAL'
    const finalSupplierId = formData.supplierId || 'GENERAL';
    const finalSupplierName = bidders.find(b => b.id === finalSupplierId)?.companyName || suppliers.find(s => s.id === finalSupplierId)?.name || 'General Project Doc';

    const fullName = generateFileName();
    const extension = '.' + fileToUpload.name.split('.').pop()?.toLowerCase();

    try {
      console.log('🚀 [PMIS] Starting upload sequence for file:', fileToUpload.name);
      toast.loading(isRtl ? '☁️ جاري رفع الملف الآن...' : '☁️ File is being uploaded...', { id: toastId });

      // 1. Firebase Storage Upload
      const drivePath = '.'; // Export to root since trees are ignored
      console.log(`📡 [Root ID Protocol] Initiating Storage Sync via path: ${drivePath}`);

      let firebaseUrl = '';
      let driveFileId = '';

      try {
        console.log('📦 [Step 1] Uploading to Firebase Storage...');
        const storageRef = ref(storage, `procurement_temp/${selectedProject!.code}/${fullName}${extension}`);
        const uploadResult = await Promise.race([
          uploadBytes(storageRef, fileToUpload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Storage Upload Timeout')), 10000))
        ]) as any;
        firebaseUrl = await getDownloadURL(uploadResult.ref);
        console.log(`✅ [Firebase Storage] Success: ${firebaseUrl}`);
      } catch (storageErr) {
        console.warn('⚠️ [Firebase Storage] Failed or blocked. Attempting Direct Server Upload fallback...', storageErr);
        // Try direct upload to server as fallback regardless of size (let the server/proxy dictate limits)
        console.log('🔄 [Step 1 Fallback] Trying direct server upload...');
        toast.loading(isRtl ? '🔄 جاري الرفع المباشر (تجاوز التخزين المؤقت)...' : '🔄 Direct Upload Fallback...', { id: toastId });
        
        const directFormData = new FormData();
        directFormData.append('file', fileToUpload);
        directFormData.append('projectRootId', projectRootId);
        directFormData.append('path', drivePath);
        directFormData.append('fileName', fullName + extension);
        directFormData.append('projectCode', selectedProject!.code || '16314');

        const directRes = await fetch('/api/drive/upload-by-path', {
          method: 'POST',
          body: directFormData
        });

        if (directRes.ok) {
          const directJson = await directRes.json();
          driveFileId = directJson.fileId;
          console.log('✅ [Direct Drive Sync] Success:', driveFileId);
        } else {
           const errorText = await directRes.text();
           console.error('❌ [Direct Drive Sync] Server Error:', errorText);
           throw new Error(`Storage & Direct Upload both failed: ${errorText}`);
        }
      }

      // 2. Google Drive Upload via Root ID Protocol (Only if not already uploaded via direct fallback)
      if (!driveFileId && firebaseUrl) {
        try {
          console.log('📦 [Step 2] Syncing to Google Drive via Server...');
          const payload = {
            fileUrl: firebaseUrl,
            projectRootId,
            path: drivePath,
            fileName: fullName + extension,
            projectCode: selectedProject!.code || '16314',
            mimeType: fileToUpload.type
          };

          const driveRes = await fetch('/api/drive/upload-by-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (driveRes.ok) {
            const driveJson = await driveRes.json();
            driveFileId = driveJson.fileId || '';
            console.log('✅ [Root ID Protocol] Drive Sync Successful:', driveFileId);
          } else {
            const errorData = await driveRes.json().catch(() => ({ error: 'Unknown server error' }));
            console.error('❌ [Root ID Protocol] Drive Upload Failed:', errorData);
          }
        } catch (e) {
          console.warn('⚠️ [PMIS] Drive Sync failed with network error. File is in Firebase but not in Drive:', e);
        }
      }

      // 3. Firestore Record (Cataloging)
      const newDoc = {
        prId: pr.id,
        projectId: selectedProject!.id,
        originator: formData.originator,
        category: formData.category,
        docType: formData.docType,
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        refNo: formData.refNo || 'N/A',
        description: formData.description || 'No description provided',
        version: formData.version || '1',
        fullName: fullName + extension,
        status: 'Received',
        fileUrl: firebaseUrl,
        firebaseUrl: firebaseUrl,
        driveFileId,
        drivePath,
        size: (fileToUpload.size / (1024 * 1024)).toFixed(2) + ' MB',
        extension,
        uploadedAt: serverTimestamp(),
        uploadedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System',
        metadata: {
          prCode: pr.prNumber || 'N/A',
          projectCode: selectedProject!.code || '16314'
        }
      };

      console.log('📝 [Step 3] Logging Metadata to Firestore...', newDoc);
      await addDoc(collection(db, 'procurement_documents'), newDoc);
      
      toast.success(isRtl ? 'تم رفع الملف بنجاح' : 'Document uploaded successfully', { id: toastId });
    } catch (err) {
      console.error('💥 [PMIS] Cataloging failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to catalog document', { id: toastId });
    }
  };

  const handleFileUpload = async () => {
    if (!pendingFile || !pr.id || !selectedProject) return;
    
    // Immediately close modal and keep a reference to upload it
    const fileToUpload = pendingFile;
    setIsUploadModalOpen(false);

    // Drive folder verification First
    let projectRootId = selectedProject.driveFolderId;
    if (!projectRootId || projectRootId.length < 5 || projectRootId === '.') {
       if (isAdmin) {
         setIsPromptOpen(true);
       } else {
         toast.error(
           isRtl
             ? 'لم يتم العثور على مجلد المشروع الرئيسي. يرجى الاتصال بالآدمن.'
             : 'Project Main Folder not found. Please contact the Admin.',
           { duration: 4000 }
         );
       }
       return;
    }
    
    setPendingFile(null);
    await performUpload(fileToUpload, projectRootId);
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
      </div>

      {/* Docs Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <UniversalDataTable
          primaryAction={{
            label: 'Upload Asset',
            icon: Plus,
            onClick: () => setIsUploadModalOpen(true)
          }}
          config={{
            collection: 'procurement_documents',
            label: 'Procurement Document',
            columns: [
              { key: 'fullName', label: 'Document Registry', type: 'text', render: (val, row) => (
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                    row.category === 'TECHNICAL' ? "bg-indigo-50 border-indigo-100 text-indigo-500" :
                    row.category === 'FINANCIAL' ? "bg-emerald-50 border-emerald-100 text-emerald-500" :
                    "bg-slate-50 border-slate-100 text-slate-400"
                  )}>
                    <FileText className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{val}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-lg">{row.docType}</span>
                      <span className="text-[10px] font-medium text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400 italic">{row.version}</span>
                      <span className="text-[10px] font-medium text-slate-300">•</span>
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title={row.drivePath || `Financials_and_Procurements_6/${row.category || ''}/${row.docType || ''}`}>
                        {row.drivePath || `Financials_and_Procurements_6/${row.category || ''}/${row.docType || ''}`}
                      </span>
                    </div>
                  </div>
                </div>
              ) },
              { key: 'originator', label: 'Originator', type: 'text', render: (val) => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-[8px] font-black border border-orange-100">
                    {val}
                  </div>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{val}</span>
                </div>
              ) },
              { key: 'supplierName', label: 'Supplier', type: 'text', render: (val) => (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{val || '---'}</span>
                </div>
              ) },
              { key: 'status', label: 'Status', type: 'status', render: (val) => (
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  val === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                  val === 'Draft' ? "bg-slate-100 text-slate-500" :
                  "bg-orange-50 text-orange-600 border border-orange-100"
                )}>
                  {val === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {val}
                </div>
              ) }
            ]
          }}
          data={filteredDocs}
          onRowClick={() => {}}
          onDeleteRecord={(id) => handleDeleteDocument(id)}
          title={<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Registry</span>}
        />
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

      <DriveFolderPromptModal 
        isOpen={isPromptOpen}
        onClose={() => {
          setIsPromptOpen(false);
          setPendingFile(null);
        }}
        onSuccess={async (newFolderId) => {
          setIsPromptOpen(false);
          if (pendingFile) {
            const fileToUpload = pendingFile;
            setPendingFile(null);
            await performUpload(fileToUpload, newFolderId);
          }
        }}
      />
    </div>
  );
};
