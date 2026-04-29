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
          "flex items-center gap-2 py-0.5 px-2 rounded cursor-pointer transition-all text-[11px] font-bold uppercase tracking-wider group",
          isSelected ? "bg-[#e5f3ff] text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-100",
          level > 0 ? "ml-4" : ""
        )}
      >
        <div className="flex items-center gap-1">
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
          ) : (
            <div className="w-3 h-3" />
          )}
          <Folder className={cn("w-4 h-4 text-blue-600 stroke-[2.5]", isSelected ? "fill-blue-100/50" : "fill-white")} />
        </div>
        <span className="truncate">{folder.name}</span>
      </div>
      
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {children.map((child, idx) => (
            <FolderTreeItem 
              key={`${child.id}-${idx}`} 
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
  const [selectedFile, setSelectedFile] = useState<any>(null);
  
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

      // Versioning logic for the file name
      const sameFiles = existingFiles?.filter((f: any) => f.name.includes(uploadMetadata.description.toUpperCase().replace(/\s+/g, '_'))) || [];
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
    <div className="flex flex-col h-[850px] bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden relative font-sans">
      {/* ── Toolbar ── */}
      <header className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg">
              <HardDrive className="w-4 h-4" />
            </div>
            <select 
              value={selectedProjectId} 
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs border-none bg-transparent font-bold text-slate-800 focus:ring-0 cursor-pointer max-w-[180px] uppercase tracking-tight"
            >
              {projects.map((p, idx) => (
                <option key={`${p.id}-${idx}`} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer shadow-md active:scale-95 shadow-slate-200">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              {t('upload_file')}
              <input type="file" className="hidden" onChange={handleFileUploadRaw} />
            </label>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95">
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              {t('new_folder')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder={t('search_files')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none font-medium"
              />
           </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Column 1: Navigation Sidebar ── */}
        <aside className="w-64 border-r border-slate-100 overflow-y-auto no-scrollbar p-4 bg-slate-50/20">
          <div className="flex items-center gap-2 mb-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Navigation
          </div>
          <div className="space-y-0.5">
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

        {/* ── Column 2: Main Area (Details) ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <nav className="px-4 py-2 border-b border-slate-100 bg-slate-50/10 flex items-center gap-2 text-[11px] text-slate-400 overflow-x-auto no-scrollbar">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigateToFolder(project?.driveFolderId || '', project?.name || '')}>Home</span>
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={bc.id}>
                <ChevronRight className="w-3 h-3 opacity-30" />
                <span 
                  className={cn(
                    "whitespace-nowrap px-1 rounded hover:bg-slate-100 cursor-pointer transition-colors",
                    i === breadcrumbs.length - 1 ? "text-blue-600 font-bold" : ""
                  )}
                  onClick={() => navigateToFolder(bc.id, bc.name)}
                >
                  {bc.name}
                </span>
              </React.Fragment>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Syncing...</span>
              </div>
            ) : filteredFiles.length > 0 ? (
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-slate-100">
                    <th className="w-[50%] px-4 py-2 text-[11px] font-normal text-slate-500 border-r border-slate-100 hover:bg-slate-50 transition-colors uppercase tracking-tight">Name</th>
                    <th className="w-[20%] px-4 py-2 text-[11px] font-normal text-slate-500 border-r border-slate-100 hover:bg-slate-50 transition-colors uppercase tracking-tight">Modified</th>
                    <th className="w-[15%] px-4 py-2 text-[11px] font-normal text-slate-500 border-r border-slate-100 hover:bg-slate-50 transition-colors uppercase tracking-tight">Type</th>
                    <th className="w-[15%] px-4 py-2 text-[11px] font-normal text-slate-500 hover:bg-slate-50 transition-colors text-right pr-4 uppercase tracking-tight">Size</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {filteredFiles.map((file, idx) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const fileExt = file.name.split('.').pop()?.toUpperCase();
                    const isSelected = selectedFile?.id === file.id;

                    return (
                      <tr 
                        key={`${file.id}-${idx}`} 
                        onClick={() => setSelectedFile(file)}
                        onDoubleClick={() => isFolder && navigateToFolder(file.id, file.name)}
                        className={cn(
                          "group transition-colors cursor-default select-none h-8",
                          isSelected ? "bg-[#e5f3ff] text-blue-700 font-medium" : "hover:bg-[#f5f9ff]"
                        )}
                      >
                        <td className="px-3 py-1 whitespace-nowrap overflow-hidden">
                          <div className="flex items-center gap-2">
                             {isFolder ? (
                               <Folder className="w-4 h-4 text-blue-600 stroke-[2.5] fill-white" />
                             ) : (
                               <File className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                             )}
                             <span className="text-[12px] truncate">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-slate-400">
                          <span className="text-[11px]">{formatDate(file.modifiedTime)}</span>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-slate-400">
                          <span className="text-[11px]">{isFolder ? 'Folder' : `${fileExt} File`}</span>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-right pr-4 text-slate-400">
                          <span className="text-[11px]">{isFolder ? '' : formatSize(file.size)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Search className="w-12 h-12 mb-2 opacity-10" />
                <p className="text-sm font-medium">No items found</p>
              </div>
            )}
          </div>
        </main>

        {/* ── Column 3: Preview Pane ── */}
        <aside className="w-80 border-l border-slate-100 bg-white flex flex-col overflow-y-auto no-scrollbar">
          {selectedFile ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Asset Identity Card */}
              <div className="p-8 flex flex-col items-center text-center bg-slate-50/30 border-b border-slate-50">
                <div className="w-44 h-56 bg-white shadow-2xl border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 relative group overflow-hidden">
                   {selectedFile.thumbnailLink ? (
                     <div className="absolute inset-0 w-full h-full">
                       <img 
                         src={selectedFile.thumbnailLink.replace('s220', 's800')} 
                         alt="Preview" 
                         className="w-full h-full object-cover" 
                         referrerPolicy="no-referrer" 
                       />
                       <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-all" />
                     </div>
                   ) : (
                     <div className="flex flex-col items-center">
                        {selectedFile.mimeType.includes('folder') ? (
                          <Folder className="w-24 h-24 text-blue-600 stroke-[1.5] fill-blue-50/50" />
                        ) : (
                          <>
                            <File className="w-24 h-24 text-slate-100" />
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-xl shadow-blue-500/30 uppercase tracking-widest">
                              {selectedFile.name.split('.').pop()}
                            </div>
                          </>
                        )}
                     </div>
                   )}
                </div>
                
                <div className="mt-8 px-4">
                  <h3 className="text-base font-black text-slate-900 leading-[1.1] tracking-tight line-clamp-2">{selectedFile.name}</h3>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full uppercase tracking-widest border border-slate-200">
                      {selectedFile.mimeType.includes('folder') ? 'Directory' : 'Asset'}
                    </span>
                    {!selectedFile.mimeType.includes('folder') && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full uppercase tracking-widest border border-blue-100">
                        Secure
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="p-8 space-y-8 flex-1">
                <div className="grid grid-cols-1 gap-6">
                   {[
                     { label: 'Sync Modified', val: formatDate(selectedFile.modifiedTime), icon: Clock },
                     { label: 'Total Volume', val: selectedFile.mimeType.includes('folder') ? '--' : formatSize(selectedFile.size), icon: HardDrive },
                     { label: 'Authorized By', val: selectedFile.lastModifyingUser?.displayName || 'System Root', icon: User }
                   ].map((item, idx) => (
                     <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                       <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                          <item.icon className="w-4 h-4 text-slate-400" />
                       </div>
                       <div className="space-y-0.5">
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block opacity-70">{item.label}</span>
                         <p className="text-xs text-slate-800 font-bold tracking-tight">{item.val}</p>
                       </div>
                     </div>
                   ))}
                </div>

                <div className="pt-8 flex flex-col gap-3">
                  <a 
                    href={selectedFile.webViewLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    Live Preview
                  </a>
                  <button className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95">
                    Download Local
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative">
                  <File className="w-8 h-8 text-slate-200" />
                  <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full animate-[spin_10s_linear_infinite]" />
               </div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed max-w-[170px]">Select an object to load detailed metadata preview.</p>
            </div>
          )}
        </aside>
      </div>

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
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl">
                     <CloudUpload className="w-7 h-7 text-blue-400" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Naming Wizard</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Compliance Check Active</p>
                   </div>
                </div>
              </div>

              <div className="p-10 overflow-y-auto space-y-10 no-scrollbar">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <File className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-700 truncate block text-lg tracking-tight">{pendingFile?.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{formatSize(pendingFile?.size || 0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Category</label>
                    <select 
                      value={uploadMetadata.category}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none outline-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Department</label>
                    <select 
                      value={uploadMetadata.dept}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, dept: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none outline-none"
                    >
                      {depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Asset Description</label>
                  <input 
                    type="text"
                    value={uploadMetadata.description}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. PERFORMANCE_REPORT"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30 whitespace-pre-wrap break-all font-mono">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-4 opacity-70">Generated Sequence</p>
                  <div className="text-base tracking-tighter font-bold">
                    {generatedNamePreview}
                    <span className="text-slate-500 italic opacity-50">.{pendingFile?.name.split('.').pop()}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeUpload}
                  disabled={uploading || !uploadMetadata.description}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-800 shadow-2xl transition-all disabled:opacity-50"
                >
                  {uploading ? 'Syncing...' : 'Commit Upload'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
