import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Building2, Mail, Phone, Globe, MapPin, MoreVertical, Edit2, Loader2, ArrowLeft } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Company } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

export const CompaniesView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    website: ''
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
    
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete {selectedIds.length} selected companies?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
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
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingCompany) {
        await updateDoc(doc(db, 'companies', editingCompany.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'companies'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsAdding(false);
      setEditingCompany(null);
      setFormData({ name: '', type: 'Supplier', status: 'Active', address: '', phone: '', email: '', website: '' });
    } catch (error) {
      handleFirestoreError(error, editingCompany ? OperationType.UPDATE : OperationType.CREATE, 'companies');
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('admin-companies')}</h1>
            <p className="text-slate-500 text-sm">Manage partners, suppliers, and stakeholders.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingCompany(null);
            setFormData({ name: '', type: 'Supplier', status: 'Active', address: '', phone: '', email: '', website: '' });
            setIsAdding(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('add_company')}
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search companies by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-4">
            Total: {companies.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              <tr className="divide-x divide-slate-200">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filteredCompanies.length && filteredCompanies.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4">{t('company_name')}</th>
                <th className="px-6 py-4">{t('type')}</th>
                <th className="px-6 py-4">{t('status')}</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">{t('address')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map(company => (
                <tr 
                  key={company.id} 
                  onClick={() => handleEdit(company)}
                  className="hover:bg-slate-50 transition-colors group divide-x divide-slate-100 cursor-pointer"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(company.id)}
                      onChange={(e) => toggleSelect(company.id, e as any)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{company.name}</div>
                        {company.website && (
                          <div className="text-[10px] text-blue-600 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {company.website.replace(/^https?:\/\//, '')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      company.type === 'Main' ? 'bg-blue-50 text-blue-600' :
                      company.type === 'Supplier' ? 'bg-amber-50 text-amber-600' :
                      company.type === 'Stakeholder' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {company.type === 'Supplier' ? t('type_supplier') : 
                       company.type === 'Main' ? t('type_main') :
                       company.type === 'Stakeholder' ? t('type_stakeholder') :
                       company.type === 'Other' ? t('type_other') : company.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${
                      company.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        company.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`} />
                      {company.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {company.email && (
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]">{company.email}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 flex items-start gap-1 max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{company.address || 'No address provided'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-8 border-b border-slate-100">
                  <h2 className="text-2xl font-bold text-slate-900">{editingCompany ? t('edit_company') : t('add_company')}</h2>
                  <p className="text-slate-500 text-sm">{t('company_details_desc')}</p>
                </div>

                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('company_name')}</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                        placeholder={t('company_name_placeholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('type')}</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                      >
                        <option value="Main">{t('type_main')}</option>
                        <option value="Supplier">{t('type_supplier')}</option>
                        <option value="Stakeholder">{t('type_stakeholder')}</option>
                        <option value="Other">{t('type_other')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('status')}</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                      >
                        <option value="Active">{t('active')}</option>
                        <option value="Inactive">{t('inactive')}</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('address')}</label>
                      <input 
                        type="text" 
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                        placeholder={t('address_placeholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('phone')}</label>
                      <input 
                        type="text" 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                        placeholder="+964..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('email')}</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                        placeholder="contact@company.com"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('website')}</label>
                      <input 
                        type="text" 
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="px-10 py-3 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                  >
                    {editingCompany ? t('update_company') : t('save_company')}
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
