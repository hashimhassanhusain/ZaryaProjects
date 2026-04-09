import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { Project } from '../types';
import { ArrowLeft, Save, Layout, Calendar, User as UserIcon, Building, MapPin, FileText, Loader2, Globe, Shield } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { motion } from 'motion/react';

export const ProjectFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setSelectedProject } = useProject();
  const [loading, setLoading] = useState(!!id && id !== 'new');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    code: '',
    manager: '',
    sponsor: '',
    customer: '',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    location: '',
    description: '',
  });

  const isNew = !id || id === 'new';

  useEffect(() => {
    const fetchData = async () => {
      if (id && id !== 'new') {
        try {
          const projectSnap = await getDoc(doc(db, 'projects', id));
          if (projectSnap.exists()) {
            setFormData(projectSnap.data() as Project);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `projects/${id}`);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      alert('Project Name and Code are required.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        // 1. Initialize Google Drive Folders
        const driveRes = await fetch('/api/projects/init-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: formData.name,
            projectCode: formData.code
          })
        });

        if (!driveRes.ok) {
          const errorData = await driveRes.json().catch(() => ({ error: 'Failed to initialize Google Drive' }));
          throw new Error(errorData.error);
        }
        const { rootFolderId } = await driveRes.json();

        // 2. Save to Firestore
        const projectData = {
          ...formData,
          driveFolderId: rootFolderId,
          createdAt: new Date().toISOString(),
          // Pre-populate charter data with common fields
          charterData: {
            'Project Title': formData.name || '',
            'Project Code': formData.code || '',
            'Project Manager': formData.manager || '',
            'Project Sponsor': formData.sponsor || '',
            'Project Customer': formData.customer || '',
            'Date Prepared': formData.startDate || new Date().toISOString().split('T')[0],
            'Project Description': formData.description || '',
            'Due Date': formData.endDate || '',
          }
        };

        const docRef = await addDoc(collection(db, 'projects'), projectData);
        const newProject = { id: docRef.id, ...projectData } as Project;
        setSelectedProject(newProject);
        
        alert('Project created successfully with Google Drive workspace!');
        navigate(`/project/${docRef.id}`);
      } else {
        // Update existing project
        const projectRef = doc(db, 'projects', id!);
        
        // Also update charterData if it exists to keep them in sync
        const updatedCharterData = { ...(formData.charterData || {}) };
        updatedCharterData['Project Title'] = formData.name || '';
        updatedCharterData['Project Code'] = formData.code || '';
        updatedCharterData['Project Manager'] = formData.manager || '';
        updatedCharterData['Project Sponsor'] = formData.sponsor || '';
        updatedCharterData['Project Customer'] = formData.customer || '';
        updatedCharterData['Date Prepared'] = formData.startDate || '';
        updatedCharterData['Project Description'] = formData.description || '';
        updatedCharterData['Due Date'] = formData.endDate || '';

        const finalData = {
          ...formData,
          charterData: updatedCharterData
        };

        await setDoc(projectRef, finalData, { merge: true });
        alert('Project information updated successfully!');
        navigate(-1);
      }
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(`Failed to save project: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isNew ? 'Create New Project' : 'Edit Project Details'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isNew ? 'Initialize a new project workspace and Google Drive structure.' : 'Update core project information and metadata.'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Initialize Project' : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Identity & Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Project Name
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. Zarya Oil Field Development"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-3 h-3" /> Project Code
                </label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. ZRY-2024-001"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Project Manager
                </label>
                <input 
                  type="text" 
                  value={formData.manager}
                  onChange={(e) => setFormData({...formData, manager: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="Enter manager name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Project Sponsor
                </label>
                <input 
                  type="text" 
                  value={formData.sponsor}
                  onChange={(e) => setFormData({...formData, sponsor: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="Enter sponsor name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building className="w-3 h-3" /> Project Customer
                </label>
                <input 
                  type="text" 
                  value={formData.customer}
                  onChange={(e) => setFormData({...formData, customer: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="Enter customer/client name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Project Location
                </label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. Basra, Iraq"
                />
              </div>
            </div>
          </section>

          {/* Timeline & Status */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Timeline & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Start Date
                </label>
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> End Date (Est.)
                </label>
                <input 
                  type="date" 
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Status
                </label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Project Description</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3" /> Overview
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium resize-none"
                placeholder="Provide a high-level summary of the project scope and objectives..."
              />
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
            <div className="relative mt-8">
              <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto border border-slate-100">
                {formData.name?.charAt(0) || 'P'}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-4">{formData.name || 'New Project'}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider mt-2 border border-blue-100">
                {formData.code || 'NO-CODE'}
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Manager</span>
                <span className="font-bold text-slate-700">{formData.manager || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className={`font-bold ${formData.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {formData.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-bold text-lg">Drive Integration</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              When you initialize this project, Zarya will automatically create a secure folder structure in Google Drive and generate the initial Project Charter PDF based on these details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
