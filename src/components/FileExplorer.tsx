import React, { useState, useEffect } from 'react';
import { Folder, File, Upload, ChevronRight, ChevronDown, Loader2, HardDrive, Search, Filter, MoreVertical, Download, Trash2, ExternalLink, ShieldAlert, CloudUpload, Plus } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Project } from '../types';

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
          charterData: project.charterData
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
      const res = await fetch(`/api/drive/files/${folderId}`);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFolderId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', currentFolderId);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('File uploaded successfully to Google Drive!');
        fetchFiles(currentFolderId);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
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
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
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
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <Folder className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">This folder is empty</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

        {files.some(f => f.mimeType !== 'application/vnd.google-apps.folder') && (
          <div className="mt-12">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Files</h4>
            <div className="space-y-2">
              {files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').map(file => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                      {file.iconLink ? <img src={file.iconLink} className="w-5 h-5" referrerPolicy="no-referrer" /> : <File className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{file.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <a 
                      href={file.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
