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
  name: string;
  type: 'dwg' | '3d' | 'specs';
  version: string;
  status: 'Draft' | 'Approved' | 'Work in Progress';
  uploadedAt: string;
  uploadedBy: string;
  fileUrl?: string;
  previewUrl?: string;
  size?: string;
  description?: string;
}

interface DesignHubViewProps {
  page: Page;
}

export const DesignHubView: React.FC<DesignHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [designs, setDesigns] = useState<DesignFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'all' | 'dwg' | '3d' | 'specs'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    
    // Listen to designs collection for this project
    const q = query(
      collection(db, 'projectDesigns'),
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
      await deleteDoc(doc(db, 'projectDesigns', id));
      toast.success("File deleted successfully");
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  const simulateUpload = async (type: 'dwg' | '3d' | 'specs') => {
    if (!selectedProject) return;
    const name = prompt("Enter file name:");
    if (!name) return;

    try {
      const newDesign: Partial<DesignFile> & { projectId: string } = {
        name: name + (type === 'dwg' ? '.dwg' : type === '3d' ? '.png' : '.pdf'),
        type,
        version: '1.0',
        status: 'Work in Progress',
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System',
        projectId: selectedProject.id,
        size: '1.2 MB',
        description: `Initial design upload for ${name}`
      };

      await addDoc(collection(db, 'projectDesigns'), newDesign);
      toast.success(t('upload_success') || 'File uploaded successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projectDesigns');
    }
  };

  const filteredDesigns = designs.filter(d => {
    const matchesType = activeType === 'all' || d.type === activeType;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
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
             <button 
               onClick={() => simulateUpload('dwg')}
               className="flex items-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
             >
                <Plus className="w-4 h-4" strokeWidth={3} />
                {t('upload_dwg')}
             </button>
             <button 
               onClick={() => simulateUpload('3d')}
               className="flex items-center gap-3 px-8 py-5 bg-slate-950 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
             >
                <ImageIcon className="w-4 h-4" />
                {t('upload_3d')}
             </button>
          </div>
       </header>

       {/* Filters & Search */}
       <div className={cn("flex flex-col md:flex-row items-center justify-between gap-6", isRtl && "md:flex-row-reverse")}>
          <div className={cn("flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-full md:w-fit", isRtl && "flex-row-reverse")}>
             {[
               { id: 'all', label: 'All Files', icon: FileText },
               { id: 'dwg', label: 'AutoCAD', icon: DraftingCompass },
               { id: '3d', label: '3D Models', icon: Box },
               { id: 'specs', label: 'Tech Specs', icon: FileText }
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
               placeholder="Search designs..."
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
                 className="group bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-500/10 transition-all flex flex-col justify-between h-[340px] relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-50 transition-all opacity-50" />
                  
                  <div className="space-y-6 relative z-10">
                     <div className={cn("flex items-start justify-between", isRtl && "flex-row-reverse")}>
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner",
                          design.type === 'dwg' ? "bg-indigo-50 text-indigo-600" :
                          design.type === '3d' ? "bg-amber-50 text-amber-600" :
                          "bg-emerald-50 text-emerald-600"
                        )}>
                           {design.type === 'dwg' ? <DraftingCompass className="w-8 h-8" /> :
                            design.type === '3d' ? <Box className="w-8 h-8" /> :
                            <FileText className="w-8 h-8" />}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                             design.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                             design.status === 'Work in Progress' ? "bg-blue-50 text-blue-600" :
                             "bg-slate-100 text-slate-500"
                           )}>
                              {design.status}
                           </span>
                           <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">V{design.version}</span>
                        </div>
                     </div>

                     <div className={cn(isRtl && "text-right")}>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase line-clamp-1 group-hover:text-blue-600 transition-colors">
                           {design.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-2 leading-relaxed opacity-60">
                           {design.description || 'No description provided for this blueprint.'}
                        </p>
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
