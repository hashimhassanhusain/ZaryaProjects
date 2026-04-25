import React, { useState, useEffect } from 'react';
import { 
  Folder, File, Upload, ChevronRight, ChevronDown, 
  Loader2, HardDrive, Search, Filter, MoreVertical, 
  Download, Trash2, ExternalLink, ShieldAlert, CloudUpload, 
  Plus, Clock, User 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Project } from '../types';
import { useAuth } from '../context/UserContext';
import { generateZaryaFileName, cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

interface FileExplorerProps {
  projectId: string;
}

interface FolderTreeItemProps {
  folder: any;
  level?: number;
  allFolders: any[];
  currentFolderId: string | null;
  navigateToFolder: (id: string, name: string) => void;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({ 
  folder, 
  level = 0, 
  allFolders, 
  currentFolderId, 
  navigateToFolder 
}) => {
  const isSelected = currentFolderId === folder.id;
  const children = allFolders.filter(f => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const [isOpen, setIsOpen] = useState(isSelected || level < 1);
  
  return (
    <div className="select-none">
      <div 
        onClick={() => {
          navigateToFolder(folder.id, folder.name);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-all text-[11px] font-bold uppercase tracking-wider group",
          isSelected ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-500 hover:bg-slate-100",
          level > 0 ? "ml-4" : ""
        )}
      >
        <div className="flex items-center gap-1">
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
          ) : (
            <div className="w-3 h-3" />
          )}
          <Folder className={cn("w-4 h-4", isSelected ? "text-blue-400 fill-blue-400/20" : "text-slate-400 group-hover:text-blue-500 transition-colors")} />
        </div>
        <span className="truncate">{folder.name}</span>
      </div>
      
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {children.map(child => (
            <FolderTreeItem 
              key={child.id} 
              folder={child} 
              level={level + 1} 
              allFolders={allFolders}
              currentFolderId={currentFolderId}
              navigateToFolder={navigateToFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [uploadMetadata, setUploadMetadata] = useState({
    category: 'Management',
    dept: 'INIT',
    type: 'FRM',
    description: '',
    path: '/'
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [allFolders, setAllFolders] = useState<{ id: string, name: string, path: string, parentId?: string }[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    const { collection, getDocs } = await import('firebase/firestore');
    const querySnapshot = await getDocs(collection(db, 'projects'));
    let projectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    
    if (!isAdmin && userProfile) {
      projectsList = projectsList.filter(p => userProfile.accessibleProjects?.includes(p.id));
    }

    setProjects(projectsList);
    if (!selectedProjectId && projectsList.length > 0) {
      setSelectedProjectId(projectsList[0].id);
    }
  };

  const fetchProject = async (id: string) => {
    setIsLoading(true);
    const docRef = doc(db, 'projects', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Project;
      setProject(data);
      if (data.driveFolderId) {
        setCurrentFolderId(data.driveFolderId);
        setBreadcrumbs([{ id: data.driveFolderId, name: data.name }]);
        fetchFiles(data.driveFolderId);
        fetchAllFolders(data.driveFolderId);
      } else {
        setFiles([]);
        setBreadcrumbs([]);
      }
    }
    setIsLoading(false);
  };

  const fetchAllFolders = async (rootId: string) => {
    try {
      const res = await fetch(`/api/drive/folders-recursive/${rootId}`);
      if (res.ok) {
        const data = await res.json();
        setAllFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch all folders:', error);
    }
  };

  const fetchFiles = async (folderId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/drive/files/${folderId}?details=true`);
      if (res.ok) {
        const data = await res.json();
        let filesList = data.files || [];
        
        if (!isAdmin && userProfile) {
          filesList = filesList.filter((f: any) => {
            if (f.mimeType === 'application/vnd.google-apps.folder') {
              const permission = userProfile.folderPermissions?.[f.id];
              return permission && permission !== 'none';
            }
            return true;
          });
        }

        setFiles(filesList);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => {
      const existingIndex = prev.findIndex(b => b.id === folderId);
      if (existingIndex !== -1) {
        return prev.slice(0, existingIndex + 1);
      }
      return [...prev, { id: folderId, name: folderName }];
    });
    fetchFiles(folderId);
  };

  const handleFileUploadRaw = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowUploadModal(true);
    }
  };

  const executeUpload = async () => {
    if (!pendingFile || !project || !selectedProjectId) return;

    setUploading(true);
    try {
      const targetPath = uploadMetadata.path === '/' ? '' : uploadMetadata.path;
      const resFiles = await fetch(`/api/drive/files-by-path?rootId=${project.driveFolderId}&path=${targetPath}`);
      const existingFiles = resFiles.ok ? (await resFiles.json()).files : [];
      
      let version = 1;
      const baseName = generateZaryaFileName({
        projectCode: project.code,
        category: uploadMetadata.category,
        dept: uploadMetadata.dept,
        type: uploadMetadata.type,
        description: uploadMetadata.description,
        version: version.toString()
      });
      
      const extension = pendingFile.name.split('.').pop();
      let finalName = `${baseName}.${extension}`;

      const baseNameNoVersion = baseName.split('-V')[0];
      const sameFiles = existingFiles?.filter((f: any) => f.name.startsWith(baseNameNoVersion)) || [];
      if (sameFiles.length > 0) {
        version = sameFiles.length + 1;
        const newBaseName = generateZaryaFileName({
          projectCode: project.code,
          category: uploadMetadata.category,
          dept: uploadMetadata.dept,
          type: uploadMetadata.type,
          description: uploadMetadata.description,
          version: version.toString()
        });
        finalName = `${newBaseName}.${extension}`;
      }
      
      const formData = new FormData();
      formData.append('file', pendingFile, finalName);
      formData.append('projectRootId', project.driveFolderId || '');
      formData.append('path', targetPath || '/');

      const res = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success(`File uploaded as ${finalName}`);
        setPendingFile(null);
        setUploadMetadata(prev => ({ ...prev, description: '' }));
        setShowUploadModal(false);
        if (currentFolderId) fetchFiles(currentFolderId);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: string | number) => {
    const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (!b) return '---';
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Management', 'Engineering', 'Procurement', 'Finance', 'Legal'];
  const depts = ['INIT', 'PLAN', 'EXEC', 'MON', 'CLS'];
  const types = ['FRM', 'PLN', 'RPT', 'LOG', 'DRW', 'SPC', 'MS'];

  const generatedNamePreview = project ? generateZaryaFileName({
    projectCode: project.code,
    category: uploadMetadata.category,
    dept: uploadMetadata.dept,
    type: uploadMetadata.type,
    description: uploadMetadata.description || 'DESC',
    version: '1'
  }) : '';

  const getFileTypeColor = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'xlsx': case 'xls': case 'csv': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'docx': case 'doc': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'pptx': case 'ppt': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'jpg': case 'jpeg': case 'png': case 'svg': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'zip': case 'rar': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getFileTypeName = (file: any) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') return 'Folder';
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext || 'Document';
  };

  return (
    <div className="flex flex-col h-[850px] bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden relative font-sans">
      {/* ── Toolbar ── */}
      <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
        <div className="flex items-center gap-8">
          {/* Project Selector */}
          <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <select 
              value={selectedProjectId} 
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-sm border-none bg-transparent font-bold text-slate-800 focus:ring-0 cursor-pointer max-w-[200px] uppercase tracking-tight"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer shadow-xl active:scale-95 shadow-slate-200">
              <Upload className="w-4 h-4 text-blue-400" />
              {t('upload_file')}
              <input type="file" className="hidden" onChange={handleFileUploadRaw} />
            </label>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95">
              <Plus className="w-4 h-4 text-slate-400" />
              {t('new_folder')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Search */}
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder={t('search_files')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none font-medium"
              />
           </div>
        </div>
      </header>

      {/* ── Breadcrumbs ── */}
      <div className="px-8 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] overflow-x-auto no-scrollbar">
          {breadcrumbs.map((bc, i) => (
            <React.Fragment key={bc.id}>
              <span 
                className={cn(
                  "hover:text-blue-600 cursor-pointer transition-colors whitespace-nowrap px-1",
                  i === breadcrumbs.length - 1 ? "text-slate-900" : ""
                )}
                onClick={() => navigateToFolder(bc.id, bc.name)}
              >
                {bc.name}
              </span>
              {i < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar: Folder Tree ── */}
        <aside className="w-[300px] border-r border-slate-100 overflow-y-auto no-scrollbar p-5 bg-white">
          <div className="flex items-center gap-2 mb-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <ChevronDown className="w-3.5 h-3.5" />
             Quick Access
          </div>
          <div className="space-y-1">
            {project?.driveFolderId && (
              <FolderTreeItem 
                folder={{ id: project.driveFolderId, name: project.name }} 
                allFolders={allFolders}
                currentFolderId={currentFolderId}
                navigateToFolder={navigateToFolder}
              />
            )}
          </div>
        </aside>

        {/* ── Main Area: Details View ── */}
        <main className="flex-1 overflow-y-auto no-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500/30" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t('syncing_files')}...</span>
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="w-full">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-slate-100">
                  <tr className="border-b border-slate-100">
                    <th className="px-8 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">{t('name')}</th>
                    <th className="px-8 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">{t('date_modified')}</th>
                    <th className="px-8 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">{t('modified_by')}</th>
                    <th className="px-8 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">{t('type')}</th>
                    <th className="px-8 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">{t('size')}</th>
                    <th className="px-8 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredFiles.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    return (
                      <tr 
                        key={file.id} 
                        onClick={() => isFolder && navigateToFolder(file.id, file.name)}
                        className={cn(
                          "group hover:bg-slate-50/80 transition-colors cursor-pointer",
                          isFolder ? "" : "cursor-default"
                        )}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            {isFolder ? (
                              <Folder className="w-6 h-6 text-amber-400 fill-amber-400/10" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                                 <File className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                              </div>
                            )}
                            <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-700 truncate max-w-[300px] tracking-tight">{file.name}</span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isFolder ? 'Directory' : 'File Asset'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 opacity-40" />
                            {formatDate(file.modifiedTime)}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-white shadow-sm">
                                {file.lastModifyingUser?.photoLink ? (
                                  <img src={file.lastModifyingUser.photoLink} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                )}
                             </div>
                             <span className="text-xs text-slate-600 font-bold whitespace-nowrap truncate max-w-[120px]">{file.lastModifyingUser?.displayName || '---'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider",
                            getFileTypeColor(file.name)
                          )}>
                            {getFileTypeName(file)}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFolder ? '--' : formatSize(file.size)}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                             {!isFolder && (
                               <a 
                                 href={file.webViewLink} 
                                 target="_blank" 
                                 rel="noreferrer" 
                                 className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                               >
                                 <ExternalLink className="w-4.5 h-4.5" />
                               </a>
                             )}
                             <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                               <Trash2 className="w-4.5 h-4.5" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center shadow-inner">
                <Search className="w-10 h-10 text-slate-200" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t('no_files_found')}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{t('try_different_search_or_folder')}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Naming Wizard Modal ── */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl shadow-slate-900/20">
                      <CloudUpload className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Zarya Naming Wizard</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">{t('standardization_enforced')}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                   <ChevronDown className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-3 shadow-inner">
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Source Asset</div>
                   <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <File className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-700 truncate block text-lg tracking-tight -mb-1">{pendingFile?.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{formatSize(pendingFile?.size || 0)}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={uploadMetadata.category}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Department</label>
                      <select 
                        value={uploadMetadata.dept}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, dept: e.target.value }))}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {depts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
                      <select 
                        value={uploadMetadata.type}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Auto-Routed Path</label>
                      <div className="px-6 py-4 bg-slate-200/50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-500 italic truncate tracking-wide">
                        {breadcrumbs.map(b => b.name).join(' / ')}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Asset Description</label>
                    <input 
                      type="text"
                      value={uploadMetadata.description}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g. PROGRESS_VALIDATION_Q4"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300 placeholder:italic"
                    />
                  </div>
                </div>

                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-4 opacity-80">Zarya Compliant Sequence</p>
                  <div className="flex flex-wrap items-center gap-1 font-mono text-base break-all font-bold tracking-tighter">
                    {generatedNamePreview.split('-').map((part, i) => (
                      <span key={i} className={cn(
                        i === 0 ? "text-white" :
                        i === 1 ? "text-slate-500" :
                        i === 2 ? "text-emerald-400" :
                        i === 3 ? "text-amber-400" :
                        i === 4 ? "text-purple-400" :
                        "text-blue-400"
                      )}>
                        {part}{i < generatedNamePreview.split('-').length - 1 ? '-' : ''}
                      </span>
                    ))}
                    <span className="text-slate-500 italic">
                      {pendingFile ? `.${pendingFile.name.split('.').pop()}` : '.pdf'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Version control auto-increments if asset exists in target path</p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] font-bold uppercase tracking-widest hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm"
                >
                  {t('abort')}
                </button>
                <button 
                  onClick={executeUpload}
                  disabled={uploading || !uploadMetadata.description}
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold uppercase tracking-[0.2em] hover:bg-slate-800 shadow-2xl shadow-slate-900/30 transition-all flex items-center justify-center gap-4 disabled:opacity-50 group"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-blue-400" /> : <CloudUpload className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />}
                  {uploading ? 'Processing Data Pipeline...' : 'Commit & Sync to Drive'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
