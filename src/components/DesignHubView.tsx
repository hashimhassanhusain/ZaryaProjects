import React, { useState, useEffect } from 'react';
import { 
  DraftingCompass, 
  Box, 
  Upload, 
  FileText, 
  MoreVertical, 
  Trash2, 
  ExternalLink, 
  Eye, 
  History,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { Page } from '../types';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface DesignFile {
  id: string;
  projectId: string;
  originator: 'ARCH' | 'STR' | 'MECH' | 'ELEC' | 'SUB' | 'CLT';
  division: 'Div 02' | 'Div 03' | 'Div 15' | 'Div 16';
  type: 'PLN' | 'SEC' | 'DET' | 'SCH' | '3DM';
  refNo: string;
  description: string;
  version: string;
  date: string;
  fullName: string;
  status: 'Pending' | 'Approved' | 'Work in Progress';
  uploadedAt: string;
  uploadedBy: string;
  approvedBy?: string;
  fileUrl?: string;
  previewUrl?: string;
  size?: string;
  extension?: string;
}

interface DesignHubViewProps {
  page: Page;
}

const ORIGINATORS = ['ARCH', 'STR', 'MECH', 'ELEC', 'SUB', 'CLT'] as const;
const DIVISIONS = [
  { code: '02', label: 'Architectural', div: 'Div 02' },
  { code: '03', label: 'Concrete/Structural', div: 'Div 03' },
  { code: '15', label: 'Mechanical/HVAC', div: 'Div 15' },
  { code: '16', label: 'Electrical', div: 'Div 16' }
] as const;
const FILE_TYPES = [
  { code: 'PLN', label: 'Plan', type: 'dwg' },
  { code: 'SEC', label: 'Section', type: 'dwg' },
  { code: 'DET', label: 'Detail', type: 'dwg' },
  { code: 'SCH', label: 'Schematic', type: 'dwg' },
  { code: '3DM', label: '3D Model', type: '3d' }
] as const;

export const DesignHubView: React.FC<DesignHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [designs, setDesigns] = useState<DesignFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'all' | 'dwg' | '3d' | 'specs'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Form State
  const [formData, setFormData] = useState({
    originator: 'ARCH' as typeof ORIGINATORS[number],
    division: '02' as string,
    type: 'PLN' as string,
    refNo: '001',
    description: '',
    version: 'V01'
  });

  const generateFileName = () => {
    const projectCode = selectedProject?.code || 'P16314';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cleanDesc = formData.description.trim().replace(/\s+/g, '_');
    return `${projectCode}-${formData.originator}-D${formData.division}-${formData.type}-${formData.refNo}-${cleanDesc}-${formData.version}-${dateStr}`;
  };

  const handleSaveUpload = async () => {
    if (!pendingFile || !selectedProject) return;
    if (!formData.description) {
      toast.error("Description is required");
      return;
    }

    try {
      const fullName = generateFileName();
      const existingFile = designs.find(d => d.refNo === formData.refNo && d.type === formData.type && d.originator === formData.originator);
      
      let finalVersion = formData.version;
      if (existingFile) {
        // Auto version increment logic
      }

      const extension = '.' + pendingFile.name.split('.').pop()?.toLowerCase();
      const divisionObj = DIVISIONS.find(d => d.code === formData.division);
      const typeObj = FILE_TYPES.find(t => t.code === formData.type);

      const newDesign: Omit<DesignFile, 'id'> = {
        projectId: selectedProject.id,
        originator: formData.originator,
        division: divisionObj?.div as any,
        type: (typeObj?.type || 'dwg') as any,
        refNo: formData.refNo,
        description: formData.description,
        version: finalVersion,
        date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        fullName,
        status: 'Work in Progress',
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System',
        size: (pendingFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        extension
      };

      await addDoc(collection(db, 'project_designs'), newDesign);
      toast.success(t('upload_success') || 'File uploaded and cataloged successfully');
      setIsAddOpen(false);
      setPendingFile(null);
      setFormData({
        originator: 'ARCH',
        division: '02',
        type: 'PLN',
        refNo: '001',
        description: '',
        version: 'V01'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'project_designs');
    }
  };

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    
    // Listen to designs collection for this project
    const q = query(
      collection(db, 'project_designs'),
      where('projectId', '==', selectedProject.id),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const designList: DesignFile[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DesignFile[];
      setDesigns(designList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching designs:", error);
      toast.error("Failed to load design files");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this design file?")) return;
    try {
      await deleteDoc(doc(db, 'project_designs', id));
      toast.success("File deleted successfully");
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'project_designs', id), {
        status: 'Approved',
        approvedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System',
        updatedAt: new Date().toISOString()
      });
      toast.success("Blueprint approved successfully");
    } catch (err) {
      toast.error("Failed to approve blueprint");
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.rvt', '.dwg', '.pdf', '.ifc'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      toast.error(`${t('invalid_file_type') || 'Invalid file type'}. Allowed: .rvt, .dwg, .pdf, .ifc`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFile(file);
    setIsAddOpen(true);
  };

  const filteredDesigns = designs.filter(d => {
    const matchesType = activeType === 'all' || d.type === activeType;
    const matchesSearch = d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className={cn("max-w-7xl mx-auto space-y-8 pb-32 px-4 pt-8", isRtl && "rtl")}>
      {/* Header */}
       <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className={cn("flex items-center gap-8 relative z-10", isRtl && "flex-row-reverse")}>
             <div className="w-20 h-20 bg-slate-950 rounded-[1.75rem] md:rounded-[2.25rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200 rotate-3 shrink-0">
                <DraftingCompass className="w-10 h-10" />
             </div>
             <div className={cn(isRtl && "text-right")}>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight italic uppercase">
                   {t('design_hub')}
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-xl">
                   {t('design_hub_desc')}
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               className="hidden" 
               accept=".rvt,.dwg,.pdf,.ifc"
             />
             <button 
               onClick={triggerUpload}
               className="flex items-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 cursor-pointer active:scale-95"
             >
                <Plus className="w-4 h-4" strokeWidth={3} />
                {t('upload_digital_asset') || 'Upload Digital Asset'}
             </button>
          </div>
       </header>

       {/* Smart Upload Modal */}
       <AnimatePresence>
         {isAddOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsAddOpen(false)}
               className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase mb-8 flex items-center gap-4">
                   <Upload className="w-8 h-8 text-blue-600" />
                   {t('smart_asset_cataloging') || 'Smart Asset Cataloging'}
                </h2>

                <div className="grid grid-cols-2 gap-6 relative z-10">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('originator') || 'Originator'}</label>
                      <select 
                        value={formData.originator}
                        onChange={(e) => setFormData({ ...formData, originator: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      >
                         {ORIGINATORS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('division') || 'Division (MasterFormat)'}</label>
                      <select 
                        value={formData.division}
                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      >
                         {DIVISIONS.map(d => <option key={d.code} value={d.code}>{d.div} - {d.label}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('asset_type') || 'Asset Type'}</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      >
                         {FILE_TYPES.map(f => <option key={f.code} value={f.code}>{f.code} - {f.label}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('ref_no') || 'Reference No.'}</label>
                      <input 
                        type="number"
                        value={formData.refNo}
                        onChange={(e) => setFormData({ ...formData, refNo: e.target.value.padStart(3, '0') })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      />
                   </div>
                   <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('description') || 'Description'}</label>
                      <input 
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g. GroundFloor_Layout"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('version') || 'Version'}</label>
                      <select 
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                      >
                         {Array.from({ length: 10 }, (_, i) => `V${(i + 1).toString().padStart(2, '0')}`).map(v => (
                           <option key={v} value={v}>{v}</option>
                         ))}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('naming_preview') || 'Naming Preview'}</label>
                      <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl px-5 py-4 text-[10px] font-mono font-bold text-blue-600 break-all leading-relaxed p-4">
                         {generateFileName()}
                      </div>
                   </div>
                </div>

                <div className="mt-10 flex gap-4">
                   <button 
                     onClick={() => setIsAddOpen(false)}
                     className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                   >
                      {t('cancel') || 'Cancel'}
                   </button>
                   <button 
                     onClick={handleSaveUpload}
                     className="flex-[2] py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                   >
                      {t('confirm_catalog') || 'Confirm & Catalog'}
                   </button>
                </div>
             </motion.div>
          </div>
         )}
       </AnimatePresence>

       {/* Filters & Search */}
       <div className={cn("flex flex-col md:flex-row items-center justify-between gap-6", isRtl && "md:flex-row-reverse")}>
          <div className={cn("flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-full md:w-fit", isRtl && "flex-row-reverse")}>
             {[
               { id: 'all', label: 'All Files', icon: FileText },
               { id: 'dwg', label: 'Drawings', icon: DraftingCompass },
               { id: '3d', label: '3D Models', icon: Box }
             ].map(filter => (
               <button
                 key={filter.id}
                 onClick={() => setActiveType(filter.id as any)}
                 className={cn(
                   "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeType === filter.id 
                     ? "bg-white text-blue-600 shadow-sm" 
                     : "text-slate-500 hover:text-slate-900"
                 )}
               >
                  <filter.icon className="w-4 h-4" />
                  {filter.label}
               </button>
             ))}
          </div>

          <div className="relative group w-full md:w-80">
             <Search className={cn("absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors", isRtl && "left-auto right-5")} />
             <input 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search registry..."
               className={cn("w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-left", isRtl && "pl-6 pr-12 text-right")}
             />
          </div>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
             {filteredDesigns.map((design) => (
                <motion.div
                  key={design.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-500/10 transition-all flex flex-col justify-between h-[360px] relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-50 transition-all opacity-50" />
                   
                   <div className="space-y-6 relative z-10">
                      <div className={cn("flex items-start justify-between", isRtl && "flex-row-reverse")}>
                         <div className={cn(
                           "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner text-white",
                           design.originator === 'ARCH' ? "bg-indigo-600" :
                           design.originator === 'STR' ? "bg-slate-900" :
                           design.originator === 'MECH' ? "bg-amber-600" :
                           "bg-blue-600"
                         )}>
                            {design.type === '3DM' ? <Box className="w-8 h-8" /> : <DraftingCompass className="w-8 h-8" />}
                         </div>
                         <div className="flex flex-col items-end gap-2">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              design.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                              design.status === 'Work in Progress' ? "bg-blue-50 text-blue-600" :
                              design.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                              "bg-slate-100 text-slate-500"
                            )}>
                               {design.status}
                            </span>
                            <div className="flex items-center gap-1.5">
                               <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{design.originator}</span>
                               <span className="w-1 h-1 bg-slate-200 rounded-full" />
                               <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{design.division}</span>
                            </div>
                         </div>
                      </div>

                      <div className={cn(isRtl && "text-right")}>
                         <h3 className="text-sm font-mono font-bold text-slate-900 tracking-tight break-all group-hover:text-blue-600 transition-colors leading-relaxed">
                            {design.fullName}
                         </h3>
                         <div className="flex flex-wrap gap-2 mt-4">
                            <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{design.extension}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{design.size}</span>
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                      <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                         <div className="w-8 h-8 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[10px] font-bold">
                            {design.uploadedBy.charAt(0)}
                         </div>
                         <div className={cn(isRtl && "text-right")}>
                            <div className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{design.uploadedBy}</div>
                            <div className="text-[8px] font-medium text-slate-400">{new Date(design.uploadedAt).toLocaleDateString()}</div>
                         </div>
                      </div>
                      
                      <div className="flex gap-2">
                         {design.status !== 'Approved' && (
                           <button 
                             onClick={() => handleApprove(design.id)}
                             className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                             title="Approve"
                           >
                              <CheckCircle2 className="w-4 h-4" />
                           </button>
                         )}
                         <button 
                           className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group/btn"
                           title="Preview"
                         >
                            <Eye className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDelete(design.id)}
                           className="p-3 bg-slate-50 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                           title="Delete"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </motion.div>
             ))}
          </AnimatePresence>

          {filteredDesigns.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                  <DraftingCompass className="w-10 h-10" />
               </div>
               <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">{t('no_designs_found')}</p>
            </div>
          )}
       </div>
    </div>
  );
};
