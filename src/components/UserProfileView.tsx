import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Camera, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const UserProfileView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    photoURL: '',
    role: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData({
            name: data.name || '',
            email: data.email || '',
            photoURL: data.photoURL || '',
            role: data.role || 'engineer',
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: formData.name,
        photoURL: formData.photoURL,
        updatedAt: new Date().toISOString()
      });
      toast.success('Profile updated successfully!');
      navigate(-1);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="flex items-center gap-4 mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Profile</h1>
          <p className="text-slate-500 text-sm">Manage your personal information and account settings.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Profile Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
            <div className="relative mt-8">
              <div className="relative inline-block">
                <img 
                  src={formData.photoURL || 'https://via.placeholder.com/150'} 
                  alt={formData.name} 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover mx-auto"
                  referrerPolicy="no-referrer"
                />
                <button className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-full border-2 border-white shadow-lg hover:bg-blue-700 transition-all">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-4">{formData.name}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider mt-2 border border-blue-100">
                <Shield className="w-3 h-3" /> {formData.role}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Access Control
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Your account is managed by the Zarya Admin. Email changes require administrative approval.
            </p>
            <div className="text-xs font-mono text-slate-500 bg-slate-800 p-4 rounded-xl border border-slate-700">
              UID: {auth.currentUser?.uid.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> Full Name
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  disabled
                  className="w-full px-5 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm text-slate-400 cursor-not-allowed font-medium"
                />
                <p className="text-[10px] text-slate-400 italic">Email cannot be changed without admin approval.</p>
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
                />
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="px-8 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
