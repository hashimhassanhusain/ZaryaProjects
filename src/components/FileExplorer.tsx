import React, { useState, useEffect } from 'react';
import { Folder, File, Upload, ChevronRight, ChevronDown, Loader2, HardDrive, Search, Filter, MoreVertical, Download, Trash2, ExternalLink, ShieldAlert, CloudUpload, Plus, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage, db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Project } from '../types';
import { generateZaryaFileName, cn } from '../lib/utils';

interface FileExplorerProps {
  projectId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([]);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [namingParams, setNamingParams] = useState({
    category: 'management' as 'technical' | 'management',
    division: '',
    dept: 'MGT',
    type: 'REP',
    refNo: '',
    description: '',
    version: 'V01'
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');

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
    fetchProjects();
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

  const initializeProjectDrive = async () => {
    if (!project || !selectedProjectId) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects/init-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          projectCode: project.code,
          charterData: project.charterData,
          userEmail: (await import('../firebase')).auth.currentUser?.email ?? undefined
        })
      });

      if (res.ok) {
        const { rootFolderId } = await res.json();
        // Update Firestore
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'projects', selectedProjectId), {
          driveFolderId: rootFolderId
        });
        
        alert('Project Drive initialized successfully!');
        fetchProject(selectedProjectId);
      } else {
        const errorData = await res.json();
        alert(`Failed to initialize: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      alert('Initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    const { collection, getDocs } = await import('firebase/firestore');
    const querySnapshot = await getDocs(collection(db, 'projects'));
    const projectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
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
      } else {
        setFiles([]);
        setBreadcrumbs([]);
      }
    }
    setIsLoading(false);
  };

  const fetchFiles = async (folderId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/drive/files/${folderId}?details=true`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFolderId) return;
    setPendingFile(file);
    setShowNamingModal(true);
  };

  const handleFileUpload = async () => {
    console.log('--- Starting Direct Google Drive Upload ---');
    if (!pendingFile) {
      console.error('No file selected');
      return;
    }
    if (!currentFolderId) {
      console.error('No target folder selected (currentFolderId is null)');
      alert('Error: No target folder selected. Please navigate to a folder first.');
      return;
    }
    if (!project || !selectedProjectId) {
      console.error('Project context missing');
      return;
    }

    setUploading(true);
    try {
      const zaryaName = generateZaryaFileName({
        projectCode: project.code,
        ...namingParams
      });
      const extension = pendingFile.name.split('.').pop();
      const finalName = `${zaryaName}.${extension}`;
      
      console.log(`Uploading directly to Google Drive: ${finalName}`);
      
      const formData = new FormData();
      formData.append('file', pendingFile, finalName);
      formData.append('projectRootId', project.driveFolderId || '');
      // Calculate relative path from project root (skip the first breadcrumb which is the project root itself)
      const relativePath = breadcrumbs.slice(1).map(b => b.name).join('/');
      formData.append('path', relativePath || '/');

      const res = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Upload successful:', data);
        
        // Update Firestore with the Drive file reference
        const projectRef = doc(db, 'projects', selectedProjectId);
        await updateDoc(projectRef, {
          files: arrayUnion({
            name: finalName,
            driveId: data.fileId,
            folderId: data.folderId,
            uploadedAt: new Date().toISOString(),
            size: pendingFile.size,
            type: pendingFile.type
          })
        });

        alert(`File uploaded successfully to Google Drive!`);
        setShowNamingModal(false);
        setPendingFile(null);
        fetchFiles(currentFolderId);
      } else {
        const err = await res.json();
        console.error('Upload failed:', err);
        throw new Error(err.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('CRITICAL UPLOAD ERROR:', error);
      alert(`Upload failed: ${error.message}\n\nIMPORTANT: Ensure your Service Account has "Manager" permissions on the Shared Drive.`);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return 'N/A';
    const b = parseInt(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && !uploading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <header className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Project Drive</h3>
            <div className="flex items-center gap-2 mt-1">
              <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 font-bold text-slate-600 focus:outline-none focus:border-blue-400"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={bc.id}>
                    <span 
                      className="hover:text-blue-600 cursor-pointer"
                      onClick={() => navigateBack(i)}
                    >
                      {bc.name}
                    </span>
                    {i < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload File
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Drive Configuration Check */}
        {driveStatus && !driveStatus.isConfigured && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-slate-900">Google Drive Setup Required</h4>
              <p className="text-sm text-slate-500">
                To enable Google Drive integration, you must provide a Service Account JSON in the AI Studio Secrets panel.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setup Steps:</p>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                <li>Create a Google Cloud Project</li>
                <li>Enable Google Drive API</li>
                <li>Create a Service Account & Download JSON key</li>
                <li>Paste JSON into <code className="bg-slate-200 px-1 rounded">GOOGLE_DRIVE_CREDENTIALS</code> secret</li>
              </ol>
            </div>
            <button 
              onClick={checkDriveStatus}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              Check Connection Again
            </button>
          </div>
        )}

        {/* Project Initialization Check */}
        {driveStatus?.isConfigured && project && !project.driveFolderId && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500">
              <CloudUpload className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-slate-900">Initialize Project Workspace</h4>
              <p className="text-sm text-slate-500">
                This project does not have a Google Drive workspace yet. Click below to create the folder structure.
              </p>
            </div>
            <button 
              onClick={initializeProjectDrive}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Workspace Folders
            </button>
          </div>
        )}

        {driveStatus?.isConfigured && project?.driveFolderId && files.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-200">
              <CloudUpload className="w-10 h-10" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-slate-600">This folder is empty</p>
              <p className="text-xs text-slate-400">Drag and drop files here or use the button above</p>
            </div>
            <label className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Upload First File
              <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            </label>
          </div>
        )}

        {/* Folders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {files.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(folder => (
            <div 
              key={folder.id} 
              onClick={() => navigateToFolder(folder.id, folder.name)}
              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Folder className="w-8 h-8 text-blue-500 fill-blue-500/10" />
                <MoreVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-700 truncate">{folder.name}</p>
              <p className="text-[10px] text-slate-400 mt-1">Directory</p>
            </div>
          ))}
        </div>

        {/* Files Table */}
        {files.some(f => f.mimeType !== 'application/vnd.google-apps.folder') && (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Author</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').map((file, idx) => {
                    const firebaseURL = file.description?.startsWith('FIREBASE_URL:') 
                      ? file.description.replace('FIREBASE_URL:', '') 
                      : null;
                    const fileLink = firebaseURL || file.webViewLink;

                    return (
                      <tr key={file.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              firebaseURL ? "bg-amber-50 text-amber-500" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                            )}>
                              {file.iconLink ? <img src={file.iconLink} className="w-4 h-4" referrerPolicy="no-referrer" /> : <File className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col">
                              <a 
                                href={fileLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-slate-700 truncate max-w-[300px] hover:text-blue-600 transition-colors"
                              >
                                {file.name}
                              </a>
                              {firebaseURL && (
                                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Cloud Storage</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <User className="w-3 h-3 text-slate-400" />
                            {file.lastModifyingUser?.displayName || 'System'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDate(file.modifiedTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400 font-mono">{formatSize(file.size)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <a 
                              href={fileLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <a 
                              href={fileLink}
                              download={file.name}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Naming Convention Modal */}
      <AnimatePresence>
        {showNamingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">Zarya Naming Convention</h3>
                <p className="text-xs text-slate-500 mt-1">Ensure the file follows the project's strict naming standards.</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                    <select 
                      value={namingParams.category}
                      onChange={(e) => setNamingParams(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    >
                      <option value="management">General & Management</option>
                      <option value="technical">Contracts & Drawings</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
                    <input 
                      type="text"
                      value={namingParams.type}
                      onChange={(e) => setNamingParams(prev => ({ ...prev, type: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SD, Cont, REP"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {namingParams.category === 'technical' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Division (MasterFormat 16 Divisions)</label>
                      <input 
                        type="text"
                        value={namingParams.division}
                        onChange={(e) => setNamingParams(prev => ({ ...prev, division: e.target.value }))}
                        placeholder="e.g. 03"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ref No</label>
                      <input 
                        type="text"
                        value={namingParams.refNo}
                        onChange={(e) => setNamingParams(prev => ({ ...prev, refNo: e.target.value }))}
                        placeholder="e.g. 001"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                    <input 
                      type="text"
                      value={namingParams.dept}
                      onChange={(e) => setNamingParams(prev => ({ ...prev, dept: e.target.value.toUpperCase() }))}
                      placeholder="e.g. MGT, PROC, TECH"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <input 
                    type="text"
                    value={namingParams.description}
                    onChange={(e) => setNamingParams(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version</label>
                  <input 
                    type="text"
                    value={namingParams.version}
                    onChange={(e) => setNamingParams(prev => ({ ...prev, version: e.target.value.toUpperCase() }))}
                    placeholder="e.g. V01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Preview Name:</p>
                  <p className="text-xs font-mono text-blue-700 break-all">
                    {project && generateZaryaFileName({ projectCode: project.code, ...namingParams })}
                    .{pendingFile?.name.split('.').pop()}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowNamingModal(false)}
                  className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFileUpload}
                  disabled={uploading || !namingParams.description}
                  className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                  Confirm & Upload
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
