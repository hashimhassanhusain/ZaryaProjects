import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { Project, Company } from '../types';
import { ArrowLeft, Save, Layout, Calendar, User as UserIcon, Building, MapPin, FileText, Loader2, Globe, Shield, X, Building2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Breadcrumbs } from './Breadcrumbs';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export const ProjectFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setSelectedProject } = useProject();
  const { t, language, isRtl } = useLanguage();
  const [loading, setLoading] = useState(!!id && id !== 'new');
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    code: '',
    companyId: '',
    manager: '',
    sponsor: '',
    customer: '',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    location: '',
    description: '',
    adminPin: '1234',
  });

  const isNew = !id || id === 'new';

  useEffect(() => {
    const fetchData = async () => {
      // Fetch active companies for the dropdown
      try {
        const companiesSnap = await getDocs(query(collection(db, 'companies'), where('status', '==', 'Active')));
        setCompanies(companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
      } catch (error) {
        console.error('Error fetching companies:', error);
      }

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
      toast.error(t('project_name_code_required'));
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
            projectCode: formData.code,
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
        
        toast.success(t('project_created_success'));
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
        toast.success(t('project_updated_success'));
        navigate(-1);
      }
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(`${t('failed_to_save_project')}: ${error.message || 'Unknown error'}`);
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
    <div className="w-full py-6 px-6">
      <Breadcrumbs currentPageId="admin-projects" />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex gap-3 items-center z-50">
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-4 bg-white text-slate-600 text-sm font-bold shadow-2xl hover:bg-slate-50 border border-slate-200 transition-all rounded-2xl flex items-center gap-2 group"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          {t('cancel')}
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isNew ? t('initialize_project') : t('save_changes')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-32">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">{t('identity_identification')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" /> {t('project_name')}
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
                  <Layout className="w-3 h-3" /> {t('project_code')}
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
                  <Building2 className="w-3 h-3" /> {t('company')}
                </label>
                <select 
                  value={formData.companyId || ''}
                  onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="">{t('select_company')}</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> {t('project_manager')}
                </label>
                <input 
                  type="text" 
                  value={formData.manager}
                  onChange={(e) => setFormData({...formData, manager: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder={t('name')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> {t('project_sponsor')}
                </label>
                <input 
                  type="text" 
                  value={formData.sponsor}
                  onChange={(e) => setFormData({...formData, sponsor: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder={t('name')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building className="w-3 h-3" /> {t('project_customer')}
                </label>
                <input 
                  type="text" 
                  value={formData.customer}
                  onChange={(e) => setFormData({...formData, customer: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder={t('name')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> {t('project_location')}
                </label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. Basra, Iraq"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> {t('admin_pin')}
                </label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={formData.adminPin}
                  onChange={(e) => setFormData({...formData, adminPin: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. 1234"
                />
                <p className="text-[10px] text-slate-400 italic">{t('admin_pin_hint')}</p>
              </div>
            </div>
          </section>

          {/* Timeline & Status */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">{t('timeline_status')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> {t('start_date')}
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
                  <Calendar className="w-3 h-3" /> {t('end_date_est')}
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
                  <Shield className="w-3 h-3" /> {t('status')}
                </label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="active">{t('active')}</option>
                  <option value="archived">{t('archived')}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">{t('project_description')}</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3" /> {t('overview')}
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium resize-none"
                placeholder={t('project_description_placeholder')}
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
              <h2 className="text-xl font-bold text-slate-900 mt-4">{formData.name || (isNew ? t('new_project') : '')}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider mt-2 border border-blue-100">
                {formData.code || 'NO-CODE'}
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 text-start">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{t('manager')}</span>
                <span className="font-bold text-slate-700">{formData.manager || t('not_set')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{t('status')}</span>
                <span className={`font-bold ${formData.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {t(formData.status || 'active').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-bold text-lg">{t('drive_integration')}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('drive_integration_hint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
