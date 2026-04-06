import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Layout, Calendar, ArrowLeft, MoreVertical, CheckCircle2, Clock, Loader2, ShieldAlert, Download, CloudUpload, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Project } from '../types';
import { onAuthStateChanged, User } from 'firebase/auth';

import { useProject } from '../context/ProjectContext';

export const AdminProjectsView: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useProject();
  const [isAdding, setIsAdding] = useState(false);
  const [isInitializingDrive, setIsInitializingDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    code: '', 
    manager: '', 
    status: 'active' as const 
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'hashim.h.husain@gmail.com';

  const handleBackupCode = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/backup-code', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      alert(`Codebase backed up successfully to Google Drive!\nFile: ${data.fileName}`);
    } catch (error: any) {
      console.error('Backup error:', error);
      alert(`Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    console.log('Testing Drive connection...');
    try {
      const res = await fetch('/api/admin/test-drive', { 
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Server error';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      alert(`✅ Success! Connected to Google Drive.\n\nFolder Name: ${data.folderName}\nService Account: ${data.clientEmail}`);
    } catch (error: any) {
      console.error('Test Drive Error:', error);
      alert(`❌ Connection Failed!\n\nReason: ${error.message}\n\nCheck the server logs for more details.`);
    } finally {
      setIsTestingDrive(false);
    }
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      // 1. Initialize Google Drive Folders for the demo project
      const driveRes = await fetch('/api/projects/init-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: 'Zarya Oil Field Dev',
          projectCode: 'ZRY-001'
        })
      });

      let rootFolderId = 'demo-folder-id';
      if (driveRes.ok) {
        const driveData = await driveRes.json();
        rootFolderId = driveData.rootFolderId;
      } else {
        console.warn('Drive initialization failed for demo project, using placeholder ID');
      }

      const demoProject = {
        name: 'Zarya Oil Field Dev',
        code: 'ZRY-001',
        manager: 'Hashim Hassan',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        driveFolderId: rootFolderId
      };
      await addDoc(collection(db, 'projects'), demoProject);
      alert('✅ Demo project added to database and Google Drive structure initialized!');
    } catch (error: any) {
      alert(`❌ Failed to add demo project: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name || !newProject.code) return;
    
    setIsInitializingDrive(true);
    try {
      // 1. Initialize Google Drive Folders
      const driveRes = await fetch('/api/projects/init-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: newProject.name,
          projectCode: newProject.code
        })
      });

      if (!driveRes.ok) {
        const errorData = await driveRes.json().catch(() => ({ error: 'Failed to initialize Google Drive' }));
        throw new Error(errorData.error);
      }
      const { rootFolderId } = await driveRes.json();

      // 2. Save to Firestore
      const projectData = {
        ...newProject,
        driveFolderId: rootFolderId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      
      setIsAdding(false);
      setNewProject({ name: '', code: '', manager: '', status: 'active' });
      alert('Project created successfully with Google Drive workspace!');
      
      // Navigate to the new project's dashboard
      navigate(`/project/${docRef.id}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error.message || 'Unknown error'}`);
    } finally {
      setIsInitializingDrive(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? This will only remove it from the database.')) return;
    
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      alert('Project deleted from database.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto py-24 px-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            You do not have administrative privileges to manage projects. 
            Please sign in with an authorized account.
          </p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Management</h1>
            <p className="text-slate-500 text-sm">Create and manage project instances within the Zarya ecosystem.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-4 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-blue-500" />}
            Seed Demo Project
          </button>
          <button 
            onClick={handleTestDrive}
            disabled={isTestingDrive}
            className="px-4 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isTestingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-emerald-500" />}
            Test Drive
          </button>
          <button 
            onClick={handleBackupCode}
            disabled={isBackingUp}
            className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
            title="Backup source code to Google Drive for Antigravity review"
          >
            {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
            {isBackingUp ? 'Backing up...' : 'Backup Codebase'}
          </button>
          <button 
            onClick={() => navigate('/admin/projects/new')}
            className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Project
          </button>
        </div>
      </header>

      {projectsLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading projects...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
              <div className={`h-2 w-full ${project.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                    project.status === 'active' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {project.name.charAt(0)}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/projects/${project.id}`);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                      onClick={(e) => handleDeleteProject(project.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-slate-900">{project.name}</h3>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {project.code || 'NO-CODE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <Layout className="w-3 h-3" /> 
                    <span>PM: {project.manager || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    {project.status === 'active' ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> Archived
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-300">ID: {project.id.toUpperCase()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
