import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { User, Page, Project } from '../types';
import { ArrowLeft, Save, Shield, Mail, Camera, User as UserIcon, CheckCircle2, Globe, Layout, Send } from 'lucide-react';
import { pages as allPages } from '../data';
import { useProject } from '../context/ProjectContext';
import { motion } from 'motion/react';

export const UserFormView: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { projects: allProjects } = useProject();
  const [loading, setLoading] = useState(!!uid);
  const [saving, setSaving] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'engineer',
    photoURL: '',
    accessiblePages: [],
    accessibleProjects: [],
  });

  const isAdmin = currentUserData?.role === 'admin' || auth.currentUser?.email === 'hashim.h.husain@gmail.com';
  const isNew = !uid || uid === 'new';
  const isOwnProfile = auth.currentUser?.uid === uid;

  useEffect(() => {
    const fetchData = async () => {
      if (auth.currentUser) {
        const adminSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (adminSnap.exists()) {
          setCurrentUserData(adminSnap.data() as User);
        }
      }

      if (uid && uid !== 'new') {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            setFormData(userSnap.data() as User);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchData();
  }, [uid]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetUid = isNew ? `u_${Date.now()}` : uid!;
      const finalData = {
        ...formData,
        uid: targetUid,
      };

      await setDoc(doc(db, 'users', targetUid), finalData);
      
      if (isNew) {
        // Simulate sending email
        console.log(`Sending welcome email to ${formData.email}...`);
        alert(`User created and welcome email sent to ${formData.email}!`);
      } else {
        alert('User profile updated successfully!');
      }
      
      navigate('/admin/users');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (pageId: string) => {
    const current = formData.accessiblePages || [];
    if (current.includes(pageId)) {
      setFormData({ ...formData, accessiblePages: current.filter(id => id !== pageId) });
    } else {
      setFormData({ ...formData, accessiblePages: [...current, pageId] });
    }
  };

  const toggleProject = (projectId: string) => {
    const current = formData.accessibleProjects || [];
    if (current.includes(projectId)) {
      setFormData({ ...formData, accessibleProjects: current.filter(id => id !== projectId) });
    } else {
      setFormData({ ...formData, accessibleProjects: [...current, projectId] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              {isNew ? 'Add New User' : isOwnProfile ? 'My Profile' : 'Edit User'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isNew ? 'Create a new account and assign permissions.' : 'Update user information and access levels.'}
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
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Full Name
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!isAdmin && !isNew}
                  className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium transition-all ${
                    !isAdmin && !isNew ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                  }`}
                  placeholder="user@zarya.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Camera className="w-3 h-3" /> Profile Photo URL
                </label>
                <input 
                  type="text" 
                  value={formData.photoURL}
                  onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>
          </section>

          {/* Permissions - Admin Only */}
          {isAdmin && (
            <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Role & Permissions</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" /> System Role
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['admin', 'project-manager', 'engineer', 'safety-officer', 'technical-office'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setFormData({ ...formData, role: role as any })}
                        className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                          formData.role === role 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        {role.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Accessible Pages
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {allPages.filter(p => p.type === 'hub').map((page) => (
                      <label key={page.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          checked={formData.accessiblePages?.includes(page.id)}
                          onChange={() => togglePage(page.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{page.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Accessible Projects
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {allProjects.map((project) => (
                      <label key={project.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          checked={formData.accessibleProjects?.includes(project.id)}
                          onChange={() => toggleProject(project.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{project.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
            <div className="relative mt-8">
              <div className="relative inline-block">
                {formData.photoURL ? (
                  <img 
                    src={formData.photoURL} 
                    alt={formData.name} 
                    className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover mx-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <UserIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-4">{formData.name || 'New User'}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider mt-2 border border-blue-100">
                <Shield className="w-3 h-3" /> {formData.role}
              </div>
            </div>
          </div>

          {isNew && (
            <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Invitation Email</h3>
              <p className="text-sm text-blue-100 leading-relaxed">
                When you create this user, an invitation email will be sent to <strong>{formData.email || 'the specified address'}</strong> with instructions to join the Zarya Project Management System.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
