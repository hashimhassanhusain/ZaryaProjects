import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Layout, Calendar, ArrowLeft, MoreVertical, CheckCircle2, Clock, Loader2, ShieldAlert, Download, CloudUpload, Edit2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Project } from '../types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

import { useProject } from '../context/ProjectContext';

export const AdminProjectsView: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useProject();
  const { t, language, isRtl } = useLanguage();
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

  const [repairingId, setRepairingId] = useState<string | null>(null);

  const handleRepairDrive = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (repairingId) return;
    
    setRepairingId(project.id);
    const loadingToast = toast.loading(`${t('repairing_drive_link')}...`);
    
    try {
      const driveRes = await fetch('/api/projects/init-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          projectCode: project.code,
          userEmail: auth.currentUser?.email ?? undefined
        })
      });

      if (!driveRes.ok) {
        const errorData = await driveRes.json().catch(() => ({ error: 'Invalid response from server' }));
        throw new Error(errorData.error || 'Failed to initialize Drive');
      }

      const driveData = await driveRes.json().catch(() => ({ rootFolderId: null }));
      const rootFolderId = driveData.rootFolderId;
      
      // Update Firestore
      await updateDoc(doc(db, 'projects', project.id), {
        driveFolderId: rootFolderId,
        updatedAt: new Date().toISOString()
      });

      toast.success(t('drive_link_repaired_success'), { id: loadingToast });
    } catch (error: any) {
      console.error('Repair error:', error);
      toast.error(`${t('repair_failed')}: ${error.message}`, { id: loadingToast });
    } finally {
      setRepairingId(null);
    }
  };

  const isAdmin = user?.email === 'hashim.h.husain@gmail.com';

  const handleBackupCode = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/backup-code', {
        method: 'POST'
      });
      const text = await res.text();
      let data = { error: t('backup_failed'), fileName: '' };
      try { data = JSON.parse(text); } catch (e) {}
      if (!res.ok) throw new Error(data.error || t('backup_failed'));
      toast.success(`${t('backup_success')}\nFile: ${data.fileName}`);
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(`${t('backup_failed')}: ${error.message}`);
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
      toast.success(`✅ ${t('drive_connected_success')}\n\nFolder Name: ${data.folderName}\nService Account: ${data.clientEmail}`);
    } catch (error: any) {
      console.error('Test Drive Error:', error);
      toast.error(`❌ ${t('connection_failed')}\n\nReason: ${error.message}\n\nCheck the server logs for more details.`);
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
          projectName: 'PMIS Demo Project',
          projectCode: 'PMIS-001',
          userEmail: auth.currentUser?.email ?? undefined
        })
      });

      if (!driveRes.ok) {
        let errData;
        try { errData = await driveRes.json(); } catch(e) { errData = { error: 'Drive initialization failed' }; }
        throw new Error(errData.error || 'Drive initialization failed');
      }
      const driveData = await driveRes.json().catch(() => ({ rootFolderId: null }));
      const rootFolderId = driveData.rootFolderId;

      const demoProject = {
        name: 'PMIS Demo Project',
        code: 'PMIS-001',
        manager: 'Hashim Hassan',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        driveFolderId: rootFolderId
      };
      await addDoc(collection(db, 'projects'), demoProject);
      toast.success(`✅ ${t('demo_project_added_success')}`);
    } catch (error: any) {
      toast.error(`❌ ${t('failed_to_add_demo_project')}: ${error.message}`);
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
          projectCode: newProject.code,
          userEmail: auth.currentUser?.email ?? undefined
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
      toast.success(t('project_created_success'));
      
      // Navigate to the new project's dashboard
      navigate(`/project/${docRef.id}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(`${t('failed_to_save_project')}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsInitializingDrive(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(projectId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    setIsLoading(true);
    try {
      console.log('Attempting to delete project:', deleteConfirmId);
      await deleteDoc(doc(db, 'projects', deleteConfirmId));
      console.log('Project deleted successfully:', deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      handleFirestoreError(error, OperationType.DELETE, `projects/${deleteConfirmId}`);
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
          <h2 className="text-2xl font-bold text-slate-900">{t('access_denied')}</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            {t('no_admin_privileges')}
          </p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
        >
          {t('return_to_dashboard')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-8">
        <button 
          onClick={handleSeedData}
          disabled={isSeeding}
          className="px-4 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-blue-500" />}
          {t('seed_demo_project')}
        </button>
        <button 
          onClick={handleTestDrive}
          disabled={isTestingDrive}
          className="px-4 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isTestingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-emerald-500" />}
          {t('test_drive')}
        </button>
        <button 
          onClick={handleBackupCode}
          disabled={isBackingUp}
          className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
          title="Backup source code to Google Drive for Antigravity review"
        >
          {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
          {isBackingUp ? t('backing_up') : t('backup_codebase')}
        </button>
        <button 
          onClick={() => navigate('/admin/projects/new')}
          className="px-8 py-3.5 bg-[#ff6d00] text-white rounded-2xl text-sm font-bold shadow-xl shadow-orange-200 hover:bg-[#ff6d00]/90 hover:shadow-orange-300 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('create_new_project')}
        </button>
      </div>

      {projectsLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">{t('loading_projects')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, idx) => (
            <div key={`${project.id}-${idx}`} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
              <div className={`h-2 w-full ${project.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                    project.status === 'active' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {project.name.charAt(0)}
                  </div>
                  <div className="flex gap-1">
                    {!project.driveFolderId && (
                      <button 
                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all flex items-center gap-1 group/repair" 
                        title="Repair Drive Folders"
                        onClick={(e) => handleRepairDrive(project, e)}
                        disabled={repairingId === project.id}
                      >
                        {repairingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                        <span className="text-[9px] font-bold uppercase hidden group-hover/repair:inline">Fix Link</span>
                      </button>
                    )}
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
                    <span>{t('manager')}: {project.manager || t('unassigned')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    {project.status === 'active' ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> {t('active')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> {t('archived')}
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
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto text-center space-y-2 custom-scrollbar">
                <h3 className="text-xl font-bold text-slate-900">{t('confirm_delete_project')}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  This action is permanent and will delete all associated data. Are you sure you want to proceed?
                </p>
              </div>

              <div className="flex-shrink-0 flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
