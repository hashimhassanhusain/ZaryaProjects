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
import { db, auth, storage, OperationType, handleFirestoreError } from '../firebase';
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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface DesignFile {
  id: string;
  projectId: string;
  originator: 'ARCH' | 'STR' | 'MECH' | 'ELEC' | 'SUB' | 'CLT';
  division: string;
  type: 'dwg' | '3d' | 'specs';
  discipline?: string;
  subType?: string;
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

interface Discipline {
  id: string;
  label: string;
  labelAr: string;
  categories: string[];
}

interface DesignHubViewProps {
  page: Page;
}

const ORIGINATORS = ['ARCH', 'STR', 'MECH', 'ELEC' , 'SUB' , 'CLT'] as const;

const DIVISIONS = [
  { code: '01', label: 'General Requirements', div: 'Div 01' },
  { code: '02', label: 'Architectural', div: 'Div 02' },
  { code: '03', label: 'Structural', div: 'Div 03' },
  { code: '15', label: 'Mechanical', div: 'Div 15' },
  { code: '16', label: 'Electrical', div: 'Div 16' }
] as const;

const FILE_TYPES = [
  { code: 'DWG', label: 'Technical Drawing', type: 'dwg' },
  { code: 'IMG', label: 'Visual Render', type: '3d' },
  { code: 'SPE', label: 'Specification', type: 'specs' }
] as const;

export const DesignHubView: React.FC<DesignHubViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [designs, setDesigns] = useState<DesignFile[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'all' | 'dwg' | '3d' | 'specs'>('dwg');
  const [activeDiscipline, setActiveDiscipline] = useState<string | 'all'>('all');
  const [activeSubFilter, setActiveSubFilter] = useState<string | 'all'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings Management State
  const [newDisc, setNewDisc] = useState({ label: '', labelAr: '' });
  const [newCat, setNewCat] = useState({ discId: '', label: '' });
  
  // Modal Form State
  const [formData, setFormData] = useState({
    originator: 'ARCH' as typeof ORIGINATORS[number],
    division: '02' as string,
    type: 'DWG' as string,
    discipline: '' as string,
    subType: '' as string,
    refNo: '001',
    description: '',
    version: 'V01'
  });

  const generateFileName = () => {
    const projectCode = selectedProject?.code || 'PROJECT';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cleanDesc = formData.description.trim().replace(/\s+/g, '_');
    const discCode = formData.type === 'DWG' ? `-${formData.discipline.substring(0, 4).toUpperCase()}` : '';
    return `${projectCode}-${formData.originator}${discCode}-D${formData.division}-${formData.type}-${formData.refNo}-${cleanDesc}-${formData.version}-${dateStr}`;
  };

  const handleSaveUpload = async () => {
    if (!pendingFile || !selectedProject) return;
    if (!formData.description) {
      toast.error("Description is required");
      return;
    }

    try {
      const extension = '.' + pendingFile.name.split('.').pop()?.toLowerCase();
      const fullName = generateFileName();
      const divisionObj = DIVISIONS.find(d => d.code === formData.division);
      const typeObj = FILE_TYPES.find(t => t.code === formData.type);

      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `designs/${selectedProject.id}/${fullName}${extension}`);
      const uploadResult = await uploadBytes(storageRef, pendingFile);
      const fileUrl = await getDownloadURL(uploadResult.ref);

      const newDesign: Omit<DesignFile, 'id'> = {
        projectId: selectedProject.id,
        originator: formData.originator,
        division: (divisionObj?.div || 'Div 02'),
        type: (typeObj?.type || 'dwg') as any,
        discipline: formData.type === 'DWG' ? formData.discipline : undefined,
        subType: formData.type === 'DWG' ? formData.subType : undefined,
        refNo: formData.refNo,
        description: formData.description,
        version: formData.version,
        date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        fullName,
        status: 'Work in Progress',
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System',
        size: (pendingFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        extension,
        fileUrl
      };

      await addDoc(collection(db, 'project_designs'), newDesign);
      toast.success(t('upload_success') || 'File uploaded and cataloged successfully');
      setIsAddOpen(false);
      setPendingFile(null);
      setFormData(prev => ({
        ...prev,
        refNo: (parseInt(prev.refNo) + 1).toString().padStart(3, '0'),
        description: ''
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'project_designs');
    }
  };

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    
    const qDesigns = query(
      collection(db, 'project_designs'),
      where('projectId', '==', selectedProject.id),
      orderBy('uploadedAt', 'desc')
    );

    const unsubDesigns = onSnapshot(qDesigns, (snapshot) => {
      setDesigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DesignFile[]);
      setLoading(false);
    });

    const qDisc = query(collection(db, 'design_disciplines'), orderBy('label', 'asc'));
    const unsubDisc = onSnapshot(qDisc, (snap) => {
      if (snap.empty) {
        const defaults = [
          { label: 'Architectural', labelAr: 'معماري', categories: ['Plans', 'Sections', 'Elevations', 'Details'] },
          { label: 'Structural', labelAr: 'إنشائي', categories: ['Foundations', 'Columns', 'Slabs'] },
          { label: 'Mechanical', labelAr: 'ميكانيك', categories: ['HVAC', 'Plumbing', 'Drainage'] },
          { label: 'Electrical', labelAr: 'كهرباء', categories: ['Lighting', 'Power', 'Low Current'] }
        ];
        defaults.forEach(d => addDoc(collection(db, 'design_disciplines'), d));
      } else {
        const discData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Discipline[];
        setDisciplines(discData);
        if (discData.length > 0 && !formData.discipline) {
           setFormData(f => ({ ...f, discipline: discData[0].label, subType: discData[0].categories[0] || '' }));
        }
      }
    });

    return () => { unsubDesigns(); unsubDisc(); };
  }, [selectedProject]);

  const handleAddDiscipline = async () => {
    if (!newDisc.label) return;
    try {
      await addDoc(collection(db, 'design_disciplines'), {
        label: newDisc.label,
        labelAr: newDisc.labelAr,
        categories: []
      });
      setNewDisc({ label: '', labelAr: '' });
      toast.success('Discipline added');
    } catch (err) {
      toast.error('Failed to add discipline');
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.label || !newCat.discId) return;
    try {
      const disc = disciplines.find(d => d.id === newCat.discId);
      if (disc) {
        await updateDoc(doc(db, 'design_disciplines', newCat.discId), {
          categories: [...disc.categories, newCat.label]
        });
        setNewCat({ discId: '', label: '' });
        toast.success('Category added');
      }
    } catch (err) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteDiscipline = async (id: string) => {
    if(!window.confirm('Delete this discipline?')) return;
    try {
      await deleteDoc(doc(db, 'design_disciplines', id));
      toast.success('Discipline deleted');
    } catch (err) {
      toast.error('Failed delete');
    }
  };

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

    const allowedExtensions = ['.rvt', '.dwg', '.pdf', '.ifc', '.jpg', '.jpeg', '.png'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      toast.error(`${t('invalid_file_type') || 'Invalid file type'}. Allowed: .rvt, .dwg, .pdf, .ifc, .jpg, .png`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFile(file);
    setIsAddOpen(true);
  };

  const filteredDesigns = designs.filter(d => {
    const matchesType = activeType === 'all' || d.type === activeType;
    const matchesDisc = activeType === 'dwg' 
      ? (activeDiscipline === 'all' || d.discipline === activeDiscipline) 
      : true;
    const matchesSub = activeType === 'dwg' && activeDiscipline !== 'all'
      ? (activeSubFilter === 'all' || d.subType === activeSubFilter)
      : true;

    const matchesSearch = d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesDisc && matchesSub && matchesSearch;
  });

  const handleDownload = (file: DesignFile) => {
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank');
    } else {
      toast.error("File source not found");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className={cn("max-w-7xl mx-auto space-y-6 pb-32 px-4 pt-6", isRtl && "rtl")}>
      {/* Header */}
       <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-slate-900/5 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className={cn("flex items-center gap-6 relative z-10", isRtl && "flex-row-reverse")}>
             <div className="w-14 h-14 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-slate-200 rotate-3 shrink-0">
                <DraftingCompass className="w-7 h-7" />
             </div>
             <div className={cn(isRtl && "text-right")}>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic uppercase">
                   {t('design_hub')}
                </h1>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-relaxed max-w-xl uppercase tracking-wider">
                   {t('design_hub_desc')}
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10 lg:justify-end">
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               className="hidden" 
               accept=".rvt,.dwg,.pdf,.ifc,.jpg,.jpeg,.png"
             />
             <button 
               onClick={() => {
                 setFormData(prev => ({ ...prev, type: 'DWG' }));
                 triggerUpload();
               }}
               className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
             >
                <Plus className="w-4 h-4" strokeWidth={3} />
                {t('upload_digital_asset') || 'Upload Digital Asset'}
             </button>
             <button 
               onClick={() => setIsSettingsOpen(true)}
               className="p-4 bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-200 transition-all active:scale-95"
               title="Manage Classifications"
             >
                <Filter className="w-5 h-5" />
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
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('asset_type') || 'Asset Type'}</label>
                       <select 
                         value={formData.type}
                         onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, type: val });
                         }}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                       >
                          {FILE_TYPES.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
                       </select>
                    </div>

                    {formData.type === 'DWG' && (
                      <>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discipline</label>
                           <select 
                             value={formData.discipline}
                             onChange={(e) => {
                               const disc = disciplines.find(d => d.label === e.target.value);
                               setFormData({ 
                                 ...formData, 
                                 discipline: e.target.value, 
                                 subType: disc?.categories[0] || '' 
                               });
                             }}
                             className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                           >
                              {disciplines.map(d => <option key={d.id} value={d.label}>{isRtl ? d.labelAr : d.label}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Drawing Classification</label>
                           <select 
                             value={formData.subType}
                             onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                             className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                           >
                              {disciplines.find(d => d.label === formData.discipline)?.categories.map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                        </div>
                      </>
                    )}

                    <div className={cn("space-y-2", formData.type !== 'DWG' && "col-span-2")}>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('division') || 'Division (MasterFormat)'}</label>
                       <select 
                         value={formData.division}
                         onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500"
                       >
                          {DIVISIONS.map(d => <option key={d.code} value={d.code}>{d.div} - {d.label}</option>)}
                       </select>
                    </div>
                    
                    {formData.type !== 'DWG' && <div className="hidden" />}

                    <div className="col-span-1 space-y-2">
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

      <section className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden p-6 space-y-6">
        <div className={cn("flex flex-col lg:flex-row lg:items-center justify-between gap-6", isRtl && "lg:flex-row-reverse")}>
           <div className={cn("flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-full lg:w-fit", isRtl && "flex-row-reverse")}>
              {[
                { id: 'all', label: isRtl ? 'السجل العام' : 'Registry', icon: FileText },
                { id: 'dwg', label: isRtl ? 'المخططات' : 'Drawings', icon: DraftingCompass },
                { id: '3d', label: isRtl ? 'ريندرات' : 'Renders', icon: ImageIcon },
                { id: 'specs', label: isRtl ? 'مواصفات' : 'Specs', icon: FileText }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setActiveType(filter.id as any);
                    setActiveDiscipline('all');
                    setActiveSubFilter('all');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activeType === filter.id 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                   <filter.icon className="w-3.5 h-3.5" />
                   {filter.label}
                </button>
              ))}
           </div>

           <div className="relative group w-full lg:w-72">
              <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400", isRtl && "left-auto right-4")} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? "بحث..." : "Search..."}
                className={cn("w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all", isRtl && "text-right pr-10 pl-4")}
              />
           </div>
        </div>

        <AnimatePresence>
          {activeType === 'dwg' && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-slate-100 overflow-hidden"
              >
                  <div className={cn("flex flex-wrap items-center gap-2", isRtl && "flex-row-reverse")}>
                    <button 
                      onClick={() => { setActiveDiscipline('all'); setActiveSubFilter('all'); }}
                      className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeDiscipline === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                    >
                      {isRtl ? 'الكل' : 'All'}
                    </button>
                    {disciplines.map(d => (
                      <button
                        key={d.id}
                        onClick={() => { setActiveDiscipline(d.label); setActiveSubFilter('all'); }}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          activeDiscipline === d.label ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {isRtl ? d.labelAr : d.label}
                      </button>
                    ))}
                  </div>

                  {activeDiscipline !== 'all' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn("flex items-center gap-2 pl-4 border-l-2 border-blue-500/20", isRtl && "flex-row-reverse border-l-0 border-r-2")}
                    >
                      <button 
                        onClick={() => setActiveSubFilter('all')}
                        className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all", activeSubFilter === 'all' ? "bg-amber-100 text-amber-700 font-bold" : "text-slate-400 hover:text-slate-600")}
                      >
                        {isRtl ? 'جميع التصنيفات' : 'All Categories'}
                      </button>
                      {disciplines.find(d => d.label === activeDiscipline)?.categories.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setActiveSubFilter(sub)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                            activeSubFilter === sub ? "bg-amber-100 text-amber-700 font-bold" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {sub}
                        </button>
                      ))}
                    </motion.div>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </section>

       {/* Settings Modal */}
       <AnimatePresence>
         {isSettingsOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl"
              >
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Manage Classifications</h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Add New Discipline</h3>
                       <div className="space-y-4">
                          <input 
                            placeholder="Label (e.g. Interior Design)"
                            value={newDisc.label}
                            onChange={e => setNewDisc(p => ({ ...p, label: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold"
                          />
                          <input 
                            placeholder="Label Arabic (e.g. تصميم داخلي)"
                            value={newDisc.labelAr}
                            onChange={e => setNewDisc(p => ({ ...p, labelAr: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold"
                          />
                          <button 
                            onClick={handleAddDiscipline}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                          >
                             Add Discipline
                          </button>
                       </div>

                       <div className="pt-8 space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Disciplines</h3>
                          {disciplines.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                               <div className="flex flex-col">
                                  <span className="text-sm font-black text-slate-900">{d.label}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{d.labelAr}</span>
                               </div>
                               <button onClick={() => handleDeleteDiscipline(d.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Add Category to Discipline</h3>
                       <div className="space-y-4">
                          <select 
                            value={newCat.discId}
                            onChange={e => setNewCat(p => ({ ...p, discId: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                          >
                             <option value="">Select Discipline...</option>
                             {disciplines.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                          </select>
                          <input 
                            placeholder="Category Name (e.g. Moodboards)"
                            value={newCat.label}
                            onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold"
                          />
                          <button 
                            onClick={handleAddCategory}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all"
                          >
                             Add Category
                          </button>
                       </div>

                       <div className="pt-8 space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Discipline Categories</h3>
                          {disciplines.map(d => (
                            <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                               <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{d.label}</span>
                               <div className="flex flex-wrap gap-2">
                                  {d.categories.map(cat => (
                                    <span key={cat} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-600 flex items-center gap-2">
                                       {cat}
                                       <button 
                                         onClick={async () => {
                                           const filtered = d.categories.filter(c => c !== cat);
                                           await updateDoc(doc(db, 'design_disciplines', d.id), { categories: filtered });
                                         }}
                                         className="text-slate-300 hover:text-rose-500"
                                       >
                                          ×
                                       </button>
                                    </span>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* Compact Registry List View */}
       <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest", isRtl && "text-right")}>Type</th>
                      <th className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest", isRtl && "text-right")}>Revision Code / Description</th>
                      <th className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest", isRtl && "text-right")}>Originator</th>
                      <th className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest", isRtl && "text-right")}>Classification</th>
                      <th className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest", isRtl && "text-right")}>Status</th>
                      <th className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right", isRtl && "text-left")}>Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   <AnimatePresence mode="popLayout">
                      {filteredDesigns.map((design) => (
                         <motion.tr
                           key={design.id}
                           layout
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           onClick={() => handleDownload(design)}
                           className="group hover:bg-blue-50/50 transition-all text-left cursor-pointer"
                         >
                            <td className="px-6 py-5">
                               <div className={cn(
                                 "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110",
                                 design.type === '3d' ? "bg-indigo-500" : 
                                 design.type === 'dwg' ? "bg-slate-900" : "bg-blue-500"
                               )}>
                                  {design.type === '3d' ? <ImageIcon className="w-5 h-5" /> : <DraftingCompass className="w-5 h-5" />}
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex flex-col gap-1 min-w-[300px]">
                                  <span className="text-[11px] font-mono font-black text-slate-900 break-all group-hover:text-blue-600 transition-colors">{design.fullName}</span>
                                  <span className="text-[10px] font-medium text-slate-500 italic uppercase tracking-wider">{design.description}</span>
                                  <div className="flex items-center gap-3 mt-1.5">
                                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">
                                        <History className="w-3 h-3" />
                                        {design.version}
                                     </div>
                                     <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(design.uploadedAt).toLocaleDateString()}
                                     </span>
                                     <span className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">{design.size}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                                     {design.uploadedBy.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{design.originator}</span>
                                     <span className="text-[8px] font-bold text-slate-400">{design.uploadedBy}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{design.division}</span>
                                  {design.subType && (
                                    <span className="text-[9px] font-bold text-blue-500/70">{design.discipline} - {design.subType}</span>
                                  )}
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <span className={cn(
                                 "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit",
                                 design.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                 design.status === 'Work in Progress' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                 "bg-amber-50 text-amber-600 border border-amber-100"
                               )}>
                                  {design.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  {design.status}
                               </span>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center justify-end gap-2">
                                  {design.status !== 'Approved' && (
                                    <button 
                                      onClick={() => handleApprove(design.id)}
                                      className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                      title="Approve"
                                    >
                                       <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDownload(design)}
                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="Download Asset"
                                  >
                                     <Download className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(design.id)}
                                    className="p-2.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    title="Delete Permanently"
                                  >
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                            </td>
                         </motion.tr>
                      ))}
                   </AnimatePresence>
                </tbody>
             </table>

             {filteredDesigns.length === 0 && (
               <div className="py-32 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                     <Search className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('no_designs_found') || 'No Assets found in this classification'}</p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};
