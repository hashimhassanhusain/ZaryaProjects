import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Building2, Mail, Phone, Globe, MapPin, MoreVertical, Edit2, Loader2, ArrowLeft } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Company } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export const CompaniesView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    type: 'Supplier',
    status: 'Active',
    address: '',
    phone: '',
    email: '',
    website: '',
    parent_entity_id: '',
    entity_type: 'subsidiary',
    is_internal: true
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'companies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCompanies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCompanies.map(c => c.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    toast((toastRef) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete {selectedIds.length} selected companies?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(toastRef.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                const deletePromises = selectedIds.map(id => deleteDoc(doc(db, 'companies', id)));
                await Promise.all(deletePromises);
                setSelectedIds([]);
                toast.success(`${selectedIds.length} companies deleted successfully`);
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'companies');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete All
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData(company);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error(t('name_required') || 'Name is required');
      return;
    }

    const saveToast = toast.loading(editingCompany ? t('updating') : t('saving'));
    try {
      const dataToSave = {
        ...formData,
        name: formData.name.trim(),
        type: formData.type || 'Supplier',
        status: formData.status || 'Active',
        is_internal: !!formData.is_internal,
        entity_type: formData.entity_type || 'subsidiary',
        updatedAt: new Date().toISOString()
      };

      if (editingCompany) {
        await updateDoc(doc(db, 'companies', editingCompany.id), dataToSave);
        toast.success(t('company_updated_success') || 'Company updated successfully', { id: saveToast });
      } else {
        await addDoc(collection(db, 'companies'), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
        toast.success(t('company_added_success') || 'Company added successfully', { id: saveToast });
      }
      setView('list');
      setEditingCompany(null);
      setFormData({ 
        name: '', 
        type: 'Supplier', 
        status: 'Active', 
        address: '', 
        phone: '', 
        email: '', 
        website: '',
        parent_entity_id: '',
        entity_type: 'subsidiary',
        is_internal: true
      });
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error(t('error_saving_company') || 'Error saving company', { id: saveToast });
      handleFirestoreError(error, editingCompany ? OperationType.UPDATE : OperationType.CREATE, 'companies');
    }
  };

  const filteredCompanies = companies.filter(c => 
    (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (c.type || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {view === 'list' ? (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all duration-500">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">{t('companies')}</h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{t('manage_companies_desc')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  placeholder={t('search_companies')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl w-full md:w-80 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>

              {selectedIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3.5 bg-red-50 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 group"
                >
                  <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                  {t('delete_selected')} ({selectedIds.length})
                </button>
              )}

              <button 
                onClick={() => {
                  setEditingCompany(null);
                  setFormData({
                    name: '',
                    type: 'Supplier',
                    status: 'Active',
                    address: '',
                    phone: '',
                    email: '',
                    website: '',
                    parent_entity_id: '',
                    entity_type: 'subsidiary',
                    is_internal: true
                  });
                  setView('form');
                }}
                className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 group"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                {t('add_company')}
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company, idx) => (
              <motion.div
                key={`${company.id}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative cursor-pointer",
                  selectedIds.includes(company.id) && "ring-2 ring-blue-600 ring-offset-4"
                )}
                onClick={() => handleEdit(company)}
              >
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    company.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                  )}>
                    {t(company.status.toLowerCase() as any)}
                  </div>
                  <button 
                    onClick={(e) => toggleSelect(company.id, e)}
                    className={cn(
                      "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                      selectedIds.includes(company.id) ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-transparent"
                    )}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-6 mb-8">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black italic",
                    company.name.charCodeAt(0) % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                  )}>
                    {company.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-2">{company.name}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2rem]">{t(company.type.toLowerCase() as any)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {company.email && (
                    <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                      <Mail className="w-4 h-4 text-slate-300" />
                      {company.email}
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                      <Phone className="w-4 h-4 text-slate-300" />
                      {company.phone}
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-slate-300" />
                      <span className="truncate">{company.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                  {company.parent_entity_id ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {companies.find(c => c.id === company.parent_entity_id)?.name || 'Parent Entity'}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(company); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toast((toastRef) => (
                          <div className="flex flex-col gap-4">
                            <p className="text-sm font-bold text-slate-900">Delete company "{company.name}"?</p>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => toast.dismiss(toastRef.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Cancel</button>
                              <button onClick={async () => {
                                toast.dismiss(toastRef.id);
                                await deleteDoc(doc(db, 'companies', company.id));
                                toast.success('Company deleted');
                              }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold">Delete</button>
                            </div>
                          </div>
                        ));
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredCompanies.length === 0 && !isLoading && (
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-20 text-center shadow-sm">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto ring-8 ring-slate-50/50">
                  <Building2 className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 italic uppercase mb-2">{t('no_companies_found')}</h3>
                  <p className="text-slate-500 font-medium">{t('no_companies_desc')}</p>
                </div>
                <button 
                  onClick={() => setView('form')}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                >
                  {t('add_company')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm max-w-4xl mx-auto overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">{editingCompany ? t('edit_company') : t('add_new_company')}</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{t('company_details_desc')}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setView('list')} 
                className="p-4 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('company_name')}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-lg font-bold focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-300"
                    placeholder={t('company_name_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('is_internal_label')}</label>
                  <select 
                    value={formData.is_internal ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_internal: e.target.value === 'true' })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                  >
                    <option value="true">{t('yes')}</option>
                    <option value="false">{t('no')}</option>
                  </select>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('parent_entity')}</label>
                   <select 
                    value={formData.parent_entity_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_entity_id: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                  >
                    <option value="">{t('no_parent')}</option>
                    {companies.filter(c => c.id !== editingCompany?.id).map((c, idx) => (
                      <option key={`${c.id}-${idx}`} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('entity_type')}</label>
                  <select 
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as any })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                  >
                    <option value="holding">{t('holding')}</option>
                    <option value="holding_division">{t('holding_division')}</option>
                    <option value="department">{t('department')}</option>
                    <option value="subsidiary">{t('subsidiary')}</option>
                    <option value="vendor">{t('vendor')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('type')}</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                  >
                    <option value="Main">{t('type_main')}</option>
                    <option value="Supplier">{t('type_supplier')}</option>
                    <option value="Stakeholder">{t('type_stakeholder')}</option>
                    <option value="Other">{t('type_other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('status')}</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                  >
                    <option value="Active">{t('active')}</option>
                    <option value="Inactive">{t('inactive')}</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('address')}</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                    placeholder={t('address_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('phone')}</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                    placeholder="+964..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('email')}</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                    placeholder="contact@company.com"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 italic">{t('website')}</label>
                  <input 
                    type="text" 
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 p-4 mt-8">
              <button 
                type="button"
                onClick={() => setView('list')}
                className="px-10 py-5 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                type="submit"
                className="px-12 py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/30 italic"
              >
                {editingCompany ? t('update_company') : t('save_company')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
