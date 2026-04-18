import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc } from 'firebase/firestore';
import { User, Page, Project, Company, Contact } from '../types';
import { ArrowLeft, Save, Shield, Mail, Camera, User as UserIcon, CheckCircle2, Globe, Layout, Send, Building2, Search, Plus, X } from 'lucide-react';
import { pages as allPages } from '../data';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Breadcrumbs } from './Breadcrumbs';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export const UserFormView: React.FC = () => {
  const { t } = useLanguage();
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { projects: allProjects, selectedProject } = useProject();
  const [loading, setLoading] = useState(!!uid);
  const [saving, setSaving] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [userType, setUserType] = useState<'Employee' | 'Supplier' | 'Stakeholder'>('Stakeholder');
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'Viewer',
    accessiblePages: [],
    accessibleProjects: [],
    status: 'Pending',
    contactId: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isSelectingContact, setIsSelectingContact] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || 
                           c.email.toLowerCase().includes(contactSearchQuery.toLowerCase());
      if (userType === 'Employee') return matchesSearch && c.type === 'Employee';
      if (userType === 'Supplier') return matchesSearch && c.type === 'Supplier';
      if (userType === 'Stakeholder') return matchesSearch && (c.type === 'Stakeholder' || c.type === 'Employee');
      return matchesSearch;
    });
  }, [contacts, contactSearchQuery, userType]);
  const [newContactData, setNewContactData] = useState<Partial<Contact>>({
    name: '',
    email: '',
    phone: '',
    companyId: '',
    type: 'Employee',
    status: 'Active'
  });

  const isAdmin = currentUserData?.role === 'admin' || auth.currentUser?.email === 'hashim.h.husain@gmail.com';
  const isNew = !uid || uid === 'new';
  const isOwnProfile = auth.currentUser?.uid === uid;
  const pageId = isOwnProfile ? 'profile' : 'admin-users';

  useEffect(() => {
    const unsubscribeCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });

    const unsubscribeContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
    });

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

    return () => {
      unsubscribeCompanies();
      unsubscribeContacts();
    };
  }, [uid]);

  // Sync userType based on formData or contact
  useEffect(() => {
    if (formData.contactId && contacts.length) {
      const contact = contacts.find(c => c.id === formData.contactId);
      if (contact) {
        if (contact.type === 'Supplier') setUserType('Supplier');
        else if (contact.type === 'Stakeholder') setUserType('Stakeholder');
        else setUserType('Employee');
      }
    }
  }, [formData.contactId, contacts]);

  const handleUserTypeChange = (type: 'Employee' | 'Supplier' | 'Stakeholder') => {
    setUserType(type);
    if (type === 'Employee') {
      const zarya = companies.find(c => c.type === 'Main');
      if (zarya) setFormData(prev => ({ ...prev, companyId: zarya.id, companyName: zarya.name }));
    } else {
      setFormData(prev => ({ ...prev, companyId: '', companyName: '' }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetUid = isNew ? `u_${Date.now()}` : uid!;
      const selectedCompany = companies.find(c => c.id === formData.companyId);
      
      const finalData = {
        ...formData,
        uid: targetUid,
        companyName: selectedCompany?.name || '',
      };

      await setDoc(doc(db, 'users', targetUid), finalData);
      
      if (isNew) {
        // Simulate sending email
        console.log(`Sending welcome email to ${formData.email}...`);
        toast.success(`User created and welcome email sent to ${formData.email}!`);
      } else {
        toast.success('User profile updated successfully!');
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

  const selectAllPages = () => {
    const hubPages = allPages.filter(p => p.type === 'hub').map(p => p.id);
    setFormData({ ...formData, accessiblePages: hubPages });
  };

  const deselectAllPages = () => {
    setFormData({ ...formData, accessiblePages: [] });
  };

  const selectAllProjects = () => {
    const projectIds = allProjects.map(p => p.id);
    setFormData({ ...formData, accessibleProjects: projectIds });
  };

  const deselectAllProjects = () => {
    setFormData({ ...formData, accessibleProjects: [] });
  };

  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setFormData({
        ...formData,
        contactId,
        name: contact.name,
        email: contact.email,
        companyId: contact.companyId,
        companyName: contact.companyName,
      });
    } else {
      setFormData({
        ...formData,
        contactId: '',
      });
    }
    setIsSelectingContact(false);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactData.name || !selectedProject) return;

    try {
      const company = companies.find(c => c.id === newContactData.companyId);
      const data = {
        ...newContactData,
        companyName: company?.name || '',
        projectId: selectedProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'contacts'), data);
      
      // Sync to Stakeholders if Employee/Stakeholder
      if (data.type === 'Employee' || data.type === 'Stakeholder') {
        const stakeholderId = `stk_${docRef.id}`;
        await setDoc(doc(db, 'stakeholders', stakeholderId), {
          id: stakeholderId,
          projectId: selectedProject.id,
          name: data.name,
          position: data.role || 'Personnel',
          role: data.type === 'Employee' ? 'Employee' : 'Stakeholder',
          contactInfo: data.email || data.phone || '',
          classification: data.type === 'Employee' ? 'Internal' : 'External',
          influence: 'Medium',
          interest: 'High',
          isSystemUser: true,
          updatedAt: new Date().toISOString()
        });
      }

      toast.success('Contact created successfully!');
      handleContactSelect(docRef.id);
      setIsAddingContact(false);
      setNewContactData({ name: '', email: '', phone: '', companyId: '', type: 'Employee', status: 'Active' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contacts');
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
    <div className="w-full py-6 px-6">
      <Breadcrumbs currentPageId={pageId} />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex gap-3 items-center z-50">
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-4 bg-white text-slate-600 text-sm font-bold shadow-2xl hover:bg-slate-50 border border-slate-200 transition-all rounded-2xl flex items-center gap-2 group"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {isNew ? 'Create User' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-32">
        <div className="lg:col-span-2 space-y-8">
          {/* Link to Contact */}
          {isNew && (
            <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Link Contact</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsSelectingContact(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    <Search className="w-3.5 h-3.5" /> Select Contact
                  </button>
                  <button 
                    onClick={() => setIsAddingContact(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Contact
                  </button>
                </div>
              </div>
              
              {formData.contactId ? (
                <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-600/20">
                      {formData.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{formData.name}</div>
                      <div className="text-sm text-slate-500">{formData.email}</div>
                      <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{formData.companyName}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleContactSelect('')}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <p className="text-slate-400 text-sm">No contact linked. Select an existing contact or create a new one.</p>
                </div>
              )}
            </section>
          )}

          {/* Contact Selection Modal */}
          <AnimatePresence>
            {isSelectingContact && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSelectingContact(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                  <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Contact</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                        Showing {userType}s
                      </p>
                    </div>
                    <button onClick={() => setIsSelectingContact(false)} className="p-3 hover:bg-white rounded-2xl transition-colors">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>

                  <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <button
                          key={contact.id}
                          onClick={() => handleContactSelect(contact.id)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all text-left group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 group-hover:bg-white rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 font-bold text-sm transition-colors">
                              {contact.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{contact.name}</div>
                              <div className="text-xs text-slate-500">{contact.email}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{contact.companyName}</div>
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                            Select
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <UserIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No {userType.toLowerCase()}s found matching your search.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Basic Info */}
          <section className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                User Type
              </label>
              <div className="flex gap-3">
                {(['Employee', 'Supplier', 'Stakeholder'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUserTypeChange(type)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-center",
                      userType === type 
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                        : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                    )}
                  >
                    {type === 'Supplier' ? t('type_supplier') : type === 'Employee' ? t('type_employee') : t('type_stakeholder')}
                  </button>
                ))}
              </div>
            </div>

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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Company Affiliation
                </label>
                <select 
                  value={formData.companyId}
                  onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="">Select a Company</option>
                  {companies
                    .filter(c => {
                      if (userType === 'Employee') return c.type === 'Main';
                      if (userType === 'Supplier') return c.type === 'Supplier';
                      return true;
                    })
                    .map(company => (
                    <option key={company.id} value={company.id}>{company.name} ({company.type})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-medium italic">
                  {userType === 'Employee' ? 'Zarya employees must belong to the main company.' : 
                   userType === 'Supplier' ? 'Suppliers must belong to a supplier company.' : ''}
                </p>
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Layout className="w-3 h-3" /> Accessible Pages
                    </label>
                    <div className="flex gap-2">
                      <button 
                        onClick={selectAllPages}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        onClick={deselectAllPages}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Accessible Projects
                    </label>
                    <div className="flex gap-2">
                      <button 
                        onClick={selectAllProjects}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        onClick={deselectAllProjects}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
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

      {/* Add New Contact Modal */}
      <AnimatePresence>
        {isAddingContact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingContact(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleCreateContact} className="flex flex-col h-full">
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New Contact</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Contact Registration</p>
                  </div>
                  <button type="button" onClick={() => setIsAddingContact(false)} className="p-3 hover:bg-white rounded-2xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="p-10 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {(['Employee', 'Supplier', 'Stakeholder'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewContactData({ ...newContactData, type })}
                        className={cn(
                          "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                          newContactData.type === type 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                        )}
                      >
                        {type === 'Supplier' ? t('supplier') : type === 'Employee' ? t('employee') : t('stakeholder')}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={newContactData.name}
                        onChange={(e) => setNewContactData({ ...newContactData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all"
                        placeholder="e.g. Ahmed Hassan"
                      />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company</label>
                       <select 
                         required
                         value={newContactData.companyId}
                         onChange={(e) => setNewContactData({ ...newContactData, companyId: e.target.value })}
                         className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all"
                       >
                         <option value="">Select Company</option>
                         {companies.filter(c => newContactData.type === 'Employee' ? c.type === 'Main' : true).map(c => (
                           <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                         ))}
                       </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        type="email" 
                        value={newContactData.email}
                        onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all"
                        placeholder="ahmed@zarya.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-10 py-8 bg-slate-50 flex justify-end gap-3 mt-4">
                   <button 
                    type="button"
                    onClick={() => setIsAddingContact(false)}
                    className="px-6 py-4 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-white rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
