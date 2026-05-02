import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Users, Building2, Phone, Mail, MoreVertical, Edit2, Loader2, Filter, User as UserIcon, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, setDoc, orderBy, where } from 'firebase/firestore';
import { Contact, Company } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';

import { useLanguage } from '../context/LanguageContext';

export const ContactsView: React.FC = () => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Employee' | 'Supplier' | 'Stakeholder' | 'Other'>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    email: '',
    phone: '',
    companyId: '',
    companyName: '',
    type: 'Employee',
    role: '',
    status: 'Active'
  });

  // Automatically sync Type and Company
  useEffect(() => {
    if (!formData.companyId || !companies.length) return;
    const selectedCompany = companies.find(c => c.id === formData.companyId);
    if (!selectedCompany) return;

    if (selectedCompany.type === 'Supplier' && formData.type !== 'Supplier') {
      setFormData(prev => ({ ...prev, type: 'Supplier' }));
    } else if (selectedCompany.type === 'Main' && formData.type !== 'Employee') {
      setFormData(prev => ({ ...prev, type: 'Employee' }));
    }
  }, [formData.companyId, companies]);

  const handleTypeChange = (type: Contact['type']) => {
    let companyId = formData.companyId;
    if (type === 'Employee') {
      const mainCompany = companies.find(c => c.type === 'Main');
      if (mainCompany) companyId = mainCompany.id;
    } else if (type === 'Supplier') {
      const currentCompany = companies.find(c => c.id === formData.companyId);
      if (currentCompany && currentCompany.type !== 'Supplier') {
        companyId = ''; // Clear because supplier can't belong to Main
      }
    }
    setFormData(prev => ({ ...prev, type, companyId }));
  };

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'contacts'), 
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setContacts(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
      setIsLoading(false);
    });

    const unsubscribeCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });

    return () => {
      unsubscribe();
      unsubscribeCompanies();
    };
  }, [selectedProject?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !selectedProject) return;

    const company = companies.find(c => c.id === formData.companyId);
    const data = {
      ...formData,
      companyName: company?.name || '',
      projectId: selectedProject.id,
      updatedAt: new Date().toISOString()
    };

    try {
      let contactId = editingContact?.id;
      if (editingContact) {
        await updateDoc(doc(db, 'contacts', editingContact.id), data);
      } else {
        const docRef = await addDoc(collection(db, 'contacts'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        contactId = docRef.id;
      }

      // Sync to Stakeholders if Employee (Required for site access/reports)
      if (data.type === 'Employee' || data.type === 'Stakeholder') {
        const stakeholderId = `stk_${contactId}`;
        const stakeholderData = {
          id: stakeholderId,
          projectId: selectedProject.id,
          name: data.name,
          position: data.role || 'Personnel',
          role: data.type === 'Employee' ? 'Employee' : 'Stakeholder',
          contactInfo: data.email || data.phone || '',
          classification: data.type === 'Employee' ? 'Internal' : 'External',
          influence: 'Medium',
          interest: 'High',
          expectations: 'N/A',
          requirements: 'Access to reports',
          priorityScore: 5,
          influenceScore: 5,
          criticalityIndex: 5,
          communicationFrequency: 'Regular',
          engagementLevel: 'Green',
          isSystemUser: true,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'stakeholders', stakeholderId), stakeholderData);
      }

      setIsAdding(false);
      setView('list');
      setEditingContact(null);
      setFormData({ name: '', email: '', phone: '', companyId: '', companyName: '', type: 'Employee', role: '', status: 'Active' });
    } catch (error) {
      handleFirestoreError(error, editingContact ? OperationType.UPDATE : OperationType.CREATE, 'contacts');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await deleteDoc(doc(db, 'contacts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'contacts');
    }
  };

  const filteredContacts = contacts.filter(c => 
    (filterType === 'All' || c.type === filterType) &&
    ((c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
     (c.companyName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
     (c.email || '').toLowerCase().includes((searchQuery || '').toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {view === 'list' ? (
        <div className="space-y-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Admin Settings</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">Contacts & Manpower</span>
          </nav>

          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all duration-500">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic uppercase">Contacts</h1>
              </div>
              <p className="text-slate-500 font-medium max-w-2xl ml-1">
                Manage project personnel, vendors, and stakeholders.
              </p>
            </div>
            <button 
              onClick={() => {
                setEditingContact(null);
                setFormData({ name: '', email: '', phone: '', companyId: '', companyName: '', type: 'Employee', role: '', status: 'Active' });
                setView('form');
              }}
              className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Contact
            </button>
          </header>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['All', 'Employee', 'Supplier', 'Stakeholder', 'Other'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all",
                    filterType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {type === 'Supplier' ? t('supplier') : type === 'All' ? t('all') : type === 'Employee' ? t('employee') : type === 'Stakeholder' ? t('stakeholder') : type}
                </button>
              ))}
            </div>
            <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, company, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-slate-900/5 transition-all"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map(contact => (
              <motion.div 
                layout
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200 transition-all overflow-hidden group cursor-pointer"
                onClick={() => {
                  setEditingContact(contact);
                  setFormData(contact);
                  setView('form');
                }}
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner text-xl font-black italic",
                      contact.type === 'Employee' ? "bg-blue-50 text-blue-600" :
                      contact.type === 'Supplier' ? "bg-amber-50 text-amber-600" :
                      contact.type === 'Stakeholder' ? "bg-purple-50 text-purple-600" : "bg-slate-50 text-slate-600"
                    )}>
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                        contact.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {contact.status}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                        {contact.type}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-slate-900 mb-1">{contact.name}</h3>
                  <div className="flex items-center gap-2 text-slate-500 mb-6">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">{contact.companyName}</span>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-medium truncate">{contact.email || 'No email provided'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-medium">{contact.phone || 'No phone provided'}</span>
                    </div>
                    {contact.role && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-xs font-medium italic">{contact.role}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-8 py-5 bg-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingContact(contact);
                      setFormData(contact);
                      setView('form');
                    }}
                    className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Contact
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(contact.id);
                    }}
                    className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-20 text-center shadow-sm">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto ring-8 ring-slate-50/50">
                  <Users className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 italic uppercase mb-2">{t('no_contacts_found')}</h3>
                  <p className="text-slate-500 font-medium">{t('no_contacts_desc')}</p>
                </div>
                <button 
                  onClick={() => setView('form')}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  {t('add_contact')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex flex-col h-full italic">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setView('list')} 
                  className="p-3 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-slate-100"
                >
                  <ArrowLeft className="w-6 h-6 text-slate-400" />
                </button>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    {editingContact ? 'Edit Contact' : 'New Contact'}
                  </h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Personnel & Manpower Details
                  </p>
                </div>
              </div>
            </div>

            <div className="p-12 space-y-10">
              <div className="grid grid-cols-2 gap-10">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Contact Type</label>
                  <div className="flex gap-4">
                    {(['Employee', 'Supplier', 'Stakeholder', 'Other'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeChange(type)}
                        className={cn(
                          "flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all italic",
                          formData.type === type 
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-200" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                        )}
                      >
                        {type === 'Supplier' ? t('supplier') : type === 'Employee' ? t('employee') : type === 'Stakeholder' ? t('stakeholder') : type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-lg font-black focus:ring-8 focus:ring-slate-900/5 transition-all outline-none"
                    placeholder="e.g. Ahmed Hassan"
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Company</label>
                  <select 
                    required
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-slate-900/5 transition-all outline-none"
                  >
                    <option value="">Select Company</option>
                    {companies
                      .filter(c => {
                        if (formData.type === 'Employee') return c.type === 'Main';
                        if (formData.type === 'Supplier') return c.type === 'Supplier';
                        return true;
                      })
                      .map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-slate-900/5 transition-all outline-none"
                    placeholder="ahmed@example.com"
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Phone Number</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-slate-900/5 transition-all outline-none"
                    placeholder="+964 770 000 0000"
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Role / Position</label>
                  <input 
                    type="text" 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-slate-900/5 transition-all outline-none"
                    placeholder="e.g. Site Engineer"
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 italic">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-slate-900/5 transition-all outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-12 py-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-6 shadow-inner mt-6">
              <button 
                type="button"
                onClick={() => setView('list')}
                className="px-10 py-5 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-all italic hover:underline"
              >
                Cancel / Return
              </button>
              <button 
                type="submit"
                className="px-16 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 italic"
              >
                {editingContact ? 'Update Contact Record' : 'Deploy New Contact'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
