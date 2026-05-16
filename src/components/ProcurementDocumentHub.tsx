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
  Sparkles,
  Folder
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
  updateDoc,
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
  const [showArchived, setShowArchived] = useState(false);

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

  const handleArchiveDocument = async (id: string) => {
    try {
      const record = documents.find(d => d.id === id);
      if (!record) return;
      const newStatus = record.status === 'Archived' ? 'Received' : 'Archived';
      await updateDoc(doc(db, 'procurement_documents', id), { status: newStatus });
      toast.success(record.status === 'Archived' ? 'Document restored' : 'Document archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'procurement_documents');
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

      // 1. Determine Logical Drive Path
      const prFolderName = pr.id ? `PR_${pr.id.slice(-6).toUpperCase()}` : 'General_PR';
      const cleanCategory = (formData.category || 'GENERAL').replace(/\s+/g, '_');
      const cleanDocType = (formData.docType || 'DOC').replace(/\s+/g, '_');
      const drivePath = `Financials_and_Procurements_6/${prFolderName}/${cleanCategory}/${cleanDocType}`;
      console.log(`📡 [Drive Protocol] Initiating Storage Sync via path: ${drivePath}`);

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
      } catch (storageErr: any) {
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

        let directRes;
        try {
          toast.loading(isRtl ? '🔄 جاري إنشاء جلسة الرفع المباشر...' : '🔄 Creating Upload Session...', { id: toastId });
          const sessionRes = await fetch('/api/drive/create-resumable-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectRootId,
              path: drivePath,
              fileName: fullName + extension,
              mimeType: fileToUpload.type || 'application/octet-stream',
              fileSize: fileToUpload.size,
              projectCode: selectedProject!.code || '16314'
            })
          });
          
          if (!sessionRes.ok) throw new Error(await sessionRes.text());
          const { resumableUrl } = await sessionRes.json();

          toast.loading(isRtl ? '🔄 جاري الرفع المباشر بالتقطّع...' : '🔄 Uploading to Proxy...', { id: toastId });
          const CHUNK_SIZE = 512 * 1024;
          let uploadCompleteData = null;
          
          for (let start = 0; start < fileToUpload.size; start += CHUNK_SIZE) {
            const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
            const chunkBlob = fileToUpload.slice(start, end);
            
            // convert blob to base64
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(chunkBlob);
            });
            
            const contentRange = `bytes ${start}-${end - 1}/${fileToUpload.size}`;
            
            const chunkRes = await fetch('/api/drive/proxy-resumable-chunk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resumableUrl,
                contentRange,
                base64Data
              })
            });

            if (chunkRes.status === 200 || chunkRes.status === 201) {
              uploadCompleteData = await chunkRes.json();
              break;
            } else if (chunkRes.status === 308) {
              continue;
            } else {
              throw new Error(`Chunk upload failed with status ${chunkRes.status}: ${await chunkRes.text()}`);
            }
          }
          
          if (!uploadCompleteData) throw new Error("Upload did not complete");

          directRes = { ok: true, text: async () => JSON.stringify({ fileId: uploadCompleteData.id || uploadCompleteData.fileId, folderId: 'unknown' }) }; 
        } catch (fetchErr: any) {
          throw new Error(`Firebase Storage Error: ${storageErr.message || 'Unknown'}. AND Resumable fallback failed: ` + fetchErr.message);
        }

        if (directRes.ok) {
          const directText = await directRes.text();
          if (directText.trim().startsWith('<!doctype html') || directText.trim().startsWith('<html')) {
            console.error('❌ [Direct Drive Sync] Server returned HTML instead of JSON. Platform interception detected.');
            throw new Error(isRtl 
              ? 'فشل الاتصال بالمنصة. يرجى محاولة تحديث الصفحة أو فتح التطبيق في نافذة جديدة.' 
              : 'Platform connection failed. Please try refreshing or opening the app in a new tab.');
          }
          try {
            const directJson = JSON.parse(directText);
            driveFileId = directJson.fileId;
            console.log('✅ [Direct Drive Sync] Success:', driveFileId);
          } catch (e) {
            console.error('❌ [Direct Drive Sync] Invalid JSON response:', directText);
            throw new Error(isRtl
              ? 'تلقى المتصفح استجابة غير صالحة من النظام. قد يكون الملف كبيراً جداً.'
              : `Server returned an invalid response. Likely a size limit or proxy timeout: ${directRes.status}`);
          }
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
            const driveText = await driveRes.text();
            try {
              const driveJson = JSON.parse(driveText);
              driveFileId = driveJson.fileId || '';
              console.log('✅ [Root ID Protocol] Drive Sync Successful:', driveFileId);
            } catch (e) {
              console.warn('⚠️ [Root ID Protocol] Server returned HTML instead of JSON. Assuming failed.', driveText.substring(0, 50));
            }
          } else {
            const errorText = await driveRes.text();
            console.error('❌ [Root ID Protocol] Drive Upload Failed. Status:', driveRes.status, errorText.substring(0, 50));
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
      
      toast.success(
        isRtl 
          ? `تم رفع الملف بنجاح! مسار الملف: ${drivePath}` 
          : `Document uploaded successfully! Path: ${drivePath}`,
        { id: toastId, duration: 6000 }
      );
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
    if (!projectRootId || projectRootId.length < 5 || projectRootId === '.' || projectRootId.includes('eFit1RP')) {
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
    if (!showArchived && d.status === 'Archived') return false;
    const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
    const matchesSearch = d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isUploadModalOpen ? (
          <motion.div 
            key="upload-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-200 shadow-xl overflow-y-auto min-h-[600px]"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-30 pointer-events-none" />
            
            <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  Asset Cataloging Hub
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 ml-16">Smart Naming & Organizational Strategy</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2">
                <X className="w-4 h-4" />
                Discard & Return
              </button>
            </div>

            {!pendingFile ? (
              <div 
                className="border-4 border-dashed border-slate-100 rounded-[3rem] p-24 text-center hover:border-blue-100 hover:bg-blue-50/10 transition-all cursor-pointer group"
                onClick={() => document.getElementById('procurement-file-input')?.click()}
              >
                <input 
                  type="file" 
                  id="procurement-file-input" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && setPendingFile(e.target.files[0])}
                />
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <Upload className="w-12 h-12 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">Drop Procurement Asset</h4>
                <p className="text-sm font-bold text-slate-400 mt-3 max-w-md mx-auto">Upload technical drawings, financial quotes, certifications, or meeting minutes. We'll handle the naming conventions.</p>
              </div>
            ) : (
              <div className="space-y-10 relative z-10 max-w-5xl mx-auto">
                <div className="bg-slate-950 rounded-[2rem] p-8 border-l-8 border-blue-500 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-xl" />
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Auto-Generated Naming String (PMIS Protocol)</p>
                  <code className="text-white font-mono text-lg break-all leading-relaxed block py-2">{generateFileName()}</code>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Originator</label>
                    <select 
                      value={formData.originator}
                      onChange={(e) => setFormData({...formData, originator: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                    >
                      {ORIGINATORS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Process Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value, docType: DOC_TYPES[e.target.value][0]})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                    >
                      {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Document Type</label>
                    <select 
                      value={formData.docType}
                      onChange={(e) => setFormData({...formData, docType: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                    >
                      {DOC_TYPES[formData.category].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Associate Vendor / Company (Critical)</label>
                    <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl">
                      <SearchableSelect 
                        options={[
                           {id: 'GEN', name: 'General Project Document'},
                           ...bidders.map(b => ({ id: b.id, name: b.companyName })),
                           ...suppliers.map(s => ({ id: s.id, name: s.name }))
                        ]}
                        value={formData.supplierId}
                        onChange={(id) => setFormData({...formData, supplierId: id})}
                        onAddClick={async () => {
                          const name = window.prompt('Enter New Supplier Name:');
                          if (name) {
                            try {
                              await addDoc(collection(db, 'suppliers'), {
                                name,
                                status: 'Active',
                                createdAt: serverTimestamp()
                              });
                              toast.success('Supplier added. Refresh dropdown to see it.');
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to add supplier');
                            }
                          }
                        }}
                        placeholder="Search Company or Vendor..."
                      />
                    </div>
                  </div>
                  <div className="col-span-1 space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Version Indicator</label>
                    <input 
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({...formData, version: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Context Description</label>
                    <input 
                      type="text"
                      placeholder="e.g. Structural steel drawings for Level 4"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref Number</label>
                    <input 
                      type="text"
                      value={formData.refNo}
                      onChange={(e) => setFormData({...formData, refNo: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-8 flex gap-6 mt-10 border-t border-slate-100">
                  <button 
                    onClick={() => setPendingFile(null)}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Clear Selection
                  </button>
                  <button 
                    onClick={handleFileUpload}
                    className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <HardDrive className="w-5 h-5" />
                    Commit Asset to Registry
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Search & Tabs */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search documents, suppliers, or descriptions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium shadow-sm"
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
                  All Assets
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

            {/* Docs Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-lg">{row.docType || 'DOC'}</span>
                            <span className="text-[10px] font-medium text-slate-300">•</span>
                            <span className="text-[10px] font-bold text-slate-400 italic">{row.version}</span>
                            <span className="text-[10px] font-medium text-slate-300">•</span>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title={row.drivePath}>
                              {row.drivePath || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) },
                    { key: 'drivePath', label: isRtl ? 'مسار المجلد' : 'Folder Path', type: 'text', render: (val) => (
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">{val || '/'}</span>
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
                onArchiveRecord={(record) => handleArchiveDocument(record.id)}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
                title={<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Registry</span>}
              />
            </div>
          </motion.div>
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
