import React, { useState, useEffect } from 'react';
import { Folder, File, Upload, ChevronRight, ChevronDown, Loader2, HardDrive, Search, Filter, MoreVertical, Download, Trash2, ExternalLink, ShieldAlert, CloudUpload, Plus, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage, db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Project } from '../types';
import { useAuth } from '../context/UserContext';
import { generateZaryaFileName, cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

import { useLanguage } from '../context/LanguageContext';

interface FileExplorerProps {
  projectId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    category: 'Management',
    dept: 'INIT',
    type: 'FRM',
    description: '',
    path: '/'
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [allFolders, setAllFolders] = useState<{ id: string, name: string, path: string }[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  const [driveStatus, setDriveStatus] = useState<{ isConfigured: boolean, hasParentFolder: boolean, parentFolderId?: string } | null>(null);

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const checkDriveStatus = async () => {
    try {
      const res = await fetch('/api/admin/drive-status');
      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data);
      }
    } catch (error) {
      console.error('Failed to check drive status:', error);
    }
  };

  const fetchProjects = async () => {
    const { collection, getDocs } = await import('firebase/firestore');
    const querySnapshot = await getDocs(collection(db, 'projects'));
    let projectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    
    // Permission Filter
    if (!isAdmin && userProfile) {
      projectsList = projectsList.filter(p => userProfile.accessibleProjects?.includes(p.id));
    }

    setProjects(projectsList);
    if (!selectedProjectId && projectsList.length > 0) {
      setSelectedProjectId(projectsList[0].id);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    fetchFiles(folderId);
  };

  const navigateBack = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    const target = newBreadcrumbs[newBreadcrumbs.length - 1];
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(target.id);
    fetchFiles(target.id);
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
        
        // Granular Permission Filter for folders
        if (!isAdmin && userProfile) {
          filesList = filesList.filter((f: any) => {
            if (f.mimeType === 'application/vnd.google-apps.folder') {
              // Check if folder is explicitly allowed or if it's the root project folder
              const permission = userProfile.folderPermissions?.[f.id];
              return permission && permission !== 'none';
            }
            return true; // Files in an allowed folder are visible
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

  const handleFileUpload = async () => {
    if (!pendingFile || !project || !selectedProjectId) return;

    setUploading(true);
    try {
      // 1. Get files in target path to determine version
      const targetPath = uploadMetadata.path === '/' ? '' : uploadMetadata.path;
      const resFiles = await fetch(`/api/drive/files-by-path?rootId=${project.driveFolderId}&path=${targetPath}`);
      const existingFiles = resFiles.ok ? (await resFiles.json()).files : [];
      
      // 2. Generate name and check for version
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

      // Simple version increment logic
      const baseNameNoVersion = baseName.split('-V')[0];
      const sameFiles = existingFiles.filter((f: any) => f.name.startsWith(baseNameNoVersion));
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
        setActiveTab('browse');
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

  const categories = ['Management', 'Engineering', 'Procurement', 'Finance', 'Legal'];
  const depts = ['INIT', 'PLAN', 'EXEC', 'MON', 'CLS'];
  const types = ['FRM', 'PLN', 'RPT', 'LOG', 'DRW', 'SPC', 'MS'];

  const generatedName = project ? generateZaryaFileName({
    projectCode: project.code,
    category: uploadMetadata.category,
    dept: uploadMetadata.dept,
    type: uploadMetadata.type,
    description: uploadMetadata.description || 'DESC',
    version: '1'
  }) : '';

  const isEditAllowed = isAdmin || (() => {
    if (!userProfile) return false;
    if (!currentFolderId) return false;
    const permission = userProfile.folderPermissions?.[currentFolderId];
    return permission === 'edit' || project?.driveFolderId === currentFolderId; // Root folder usually allowed if project is accessible
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Main Header with Large Icon */}
      <div className="flex items-center gap-4 px-2">
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
          <HardDrive className="w-8 h-8 text-slate-900" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">
          {t('drive')}
        </h1>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[850px]">
        <header className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight">{t('project_files')}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <select 
                    value={selectedProjectId} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveTab('browse')}
              className={cn(
                "px-6 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all",
                activeTab === 'browse' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Browse
            </button>
            <button 
              onClick={() => {
                if (!isEditAllowed) {
                  toast.error("You don't have permission to upload to this folder");
                  return;
                }
                setActiveTab('upload');
              }}
              className={cn(
                "px-6 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all",
                activeTab === 'upload' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700",
                !isEditAllowed && "opacity-50 cursor-not-allowed"
              )}
            >
              Upload
            </button>
          </div>
        </div>

        {activeTab === 'browse' && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-widest bg-white/50 p-3 rounded-xl border border-slate-100">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={bc.id}>
                <span 
                  className={cn(
                    "hover:text-blue-600 cursor-pointer transition-colors",
                    i === breadcrumbs.length - 1 ? "text-slate-900" : ""
                  )}
                  onClick={() => navigateBack(i)}
                >
                  {bc.name}
                </span>
                {i < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'browse' ? (
            <motion.div
              key="browse"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Folders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {files.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(folder => (
                  <motion.div 
                    key={folder.id} 
                    whileHover={{ y: -4 }}
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                    className="p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                        <Folder className="w-10 h-10 text-blue-500 fill-blue-500/10" />
                      </div>
                      <MoreVertical className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate uppercase tracking-tight">{folder.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-widest">Directory</p>
                  </motion.div>
                ))}
              </div>

              {/* Files Table */}
              {files.some(f => f.mimeType !== 'application/vnd.google-apps.folder') ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">File Name</th>
                        <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').map((file) => (
                        <tr key={file.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                <File className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-slate-700 block">{file.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-medium tracking-widest">Document</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a 
                                href={file.webViewLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="View in Drive"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                              <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Download">
                                <Download className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <CloudUpload className="w-20 h-20 text-slate-200 mb-6" />
                  <p className="text-slate-400 font-medium uppercase tracking-widest">No files in this directory</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-10"
            >
              <div className="space-y-8 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                <div className="space-y-6">
                  <label className="block">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] ml-2">1. Select Resource</span>
                    <div className="mt-3 flex justify-center px-10 pt-10 pb-12 border-2 border-slate-200 border-dashed rounded-[2rem] bg-white hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5 transition-all cursor-pointer group relative overflow-hidden">
                      <div className="space-y-2 text-center relative z-10">
                        <Upload className="mx-auto h-14 w-14 text-slate-300 group-hover:text-blue-500 transition-all duration-500 group-hover:scale-110" />
                        <div className="flex flex-col text-sm text-slate-600">
                          <span className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                            {pendingFile ? pendingFile.name : 'Drop file here or click to browse'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">PDF, DOCX, XLSX up to 10MB</span>
                        </div>
                      </div>
                      <input type="file" className="sr-only" onChange={(e) => setPendingFile(e.target.files?.[0] || null)} />
                    </div>
                  </label>

                  <div className="space-y-6">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] ml-2">2. Naming Wizard (Zarya FNC)</span>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                        <select 
                          value={uploadMetadata.category}
                          onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest ml-1">Department</label>
                        <select 
                          value={uploadMetadata.dept}
                          onChange={(e) => setUploadMetadata(prev => ({ ...prev, dept: e.target.value }))}
                          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        >
                          {depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest ml-1">Type</label>
                        <select 
                          value={uploadMetadata.type}
                          onChange={(e) => setUploadMetadata(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        >
                          {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest ml-1">Target Path</label>
                        <select 
                          value={uploadMetadata.path}
                          onChange={(e) => setUploadMetadata(prev => ({ ...prev, path: e.target.value }))}
                          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        >
                          <option value="/">Project Root</option>
                          {allFolders.map(f => <option key={f.id} value={f.path}>{f.path}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                      <input 
                        type="text"
                        value={uploadMetadata.description}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g. SITE_SURVEY_REPORT"
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldAlert className="w-20 h-20" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-400 mb-3">Final Zarya Compliant Filename</p>
                  <div className="flex flex-wrap items-center gap-1 font-mono text-sm break-all">
                    {generatedName.split('-').map((part, i) => (
                      <span key={i} className={cn(
                        "px-1.5 py-0.5 rounded",
                        i === 0 ? "text-white" :
                        i === 1 ? "text-slate-500" :
                        i === 2 ? "text-emerald-400" :
                        i === 3 ? "text-amber-400" :
                        i === 4 ? "text-purple-400" :
                        "text-blue-400"
                      )}>
                        {part}{i < generatedName.split('-').length - 1 ? '-' : ''}
                      </span>
                    ))}
                    <span className="text-slate-500">
                      {pendingFile ? `.${pendingFile.name.split('.').pop()}` : '.pdf'}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-4 font-medium uppercase tracking-widest">System will automatically increment version if file exists</p>
                </div>

                <button 
                  onClick={handleFileUpload}
                  disabled={uploading || !pendingFile || !uploadMetadata.description}
                  className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-semibold uppercase tracking-[0.2em] text-sm shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CloudUpload className="w-6 h-6" />}
                  {uploading ? 'Processing Architecture...' : 'Rename & Upload to Drive'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
};
