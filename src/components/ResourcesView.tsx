import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Users, Package, Settings, MoreVertical, Edit2, Loader2, ArrowLeft, Filter, User as UserIcon, HardHat, Truck } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, orderBy, where } from 'firebase/firestore';
import { Resource3M, Company, User as UserType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';

export const ResourcesView: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [resources, setResources] = useState<Resource3M[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dbUsers, setDbUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Manpower' | 'Material' | 'Machine'>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource3M | null>(null);
  const [formData, setFormData] = useState<Partial<Resource3M>>({
    type: 'Material',
    name: '',
    unit: 'Unit',
    quantity: 1,
    rate: 0,
    companyId: '',
    companyName: '',
    status: 'Available',
    description: ''
  });

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'resources'), 
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource3M));
      const deDuped: Resource3M[] = [];
      const seen = new Set<string>();
      list.forEach(r => {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          deDuped.push(r);
        }
      });
      setResources(deDuped);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resources');
      setIsLoading(false);
    });

    const unsubscribeCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      const deDuped: Company[] = [];
      const seen = new Set<string>();
      list.forEach(c => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          deDuped.push(c);
        }
      });
      setCompanies(deDuped);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
      const deDuped: UserType[] = [];
      const seen = new Set<string>();
      list.forEach(u => {
        if (!seen.has(u.uid)) {
          seen.add(u.uid);
          deDuped.push(u);
        }
      });
      setDbUsers(deDuped);
    });

    return () => {
      unsubscribe();
      unsubscribeCompanies();
      unsubscribeUsers();
    };
  }, [selectedProject?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.companyId || !selectedProject) return;

    const company = companies.find(c => c.id === formData.companyId);
    const data = {
      ...formData,
      companyName: company?.name || '',
      projectId: selectedProject.id,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), data);
      } else {
        await addDoc(collection(db, 'resources'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      setIsAdding(false);
      setEditingResource(null);
      setFormData({ type: 'Manpower', name: '', unit: 'Unit', quantity: 1, rate: 0, companyId: '', companyName: '', status: 'Available', description: '' });
    } catch (error) {
      handleFirestoreError(error, editingResource ? OperationType.UPDATE : OperationType.CREATE, 'resources');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'resources');
    }
  };

  const filteredResources = resources.filter(r => 
    (filterType === 'All' || r.type === filterType) &&
    (r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'Manpower': return <HardHat className="w-5 h-5" />;
      case 'Material': return <Package className="w-5 h-5" />;
      case 'Machine': return <Truck className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">3M Resource Management</h1>
          <p className="text-slate-500 text-sm">Track Manpower, Material, and Machines (3M).</p>
        </div>
        <button 
          onClick={() => {
            setEditingResource(null);
            setFormData({ type: 'Manpower', name: '', unit: 'Unit', quantity: 1, rate: 0, companyId: '', companyName: '', status: 'Available', description: '' });
            setIsAdding(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['All', 'Manpower', 'Material', 'Machine'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                filterType === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map(resource => (
          <motion.div 
            layout
            key={resource.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  resource.type === 'Manpower' ? "bg-blue-50 text-blue-600" :
                  resource.type === 'Material' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                )}>
                  {getIcon(resource.type)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    resource.status === 'Available' ? "bg-green-50 text-green-600" :
                    resource.status === 'In Use' ? "bg-blue-50 text-blue-600" :
                    resource.status === 'Maintenance' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                  )}>
                    {resource.status}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">{resource.name}</h3>
              <p className="text-slate-500 text-xs mb-4 font-medium">{resource.companyName}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</div>
                  <div className="text-sm font-bold text-slate-700">{resource.quantity} {resource.unit}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rate</div>
                  <div className="text-sm font-bold text-slate-700">${resource.rate.toLocaleString('en-US')}</div>
                </div>
              </div>

              {resource.type === 'Manpower' && resource.userId && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 font-medium">Linked to System User</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={() => {
                  setEditingResource(resource);
                  setFormData(resource);
                  setIsAdding(true);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button 
                onClick={() => handleDelete(resource.id)}
                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </motion.div>
        ))}
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
                  <h2 className="text-2xl font-bold text-slate-900">{editingResource ? 'Edit Resource' : 'Add New Resource'}</h2>
                  <p className="text-slate-500 text-sm">Define resource attributes.</p>
                </div>

                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resource Type</label>
                      <div className="flex gap-2">
                        {(['Manpower', 'Material', 'Machine'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type })}
                            className={cn(
                              "flex-1 py-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2",
                              formData.type === type ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:border-blue-200"
                            )}
                          >
                            {getIcon(type)}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resource Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="e.g. Senior Civil Engineer, Concrete Grade 30, Excavator 20T"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Company / Supplier</label>
                      <select 
                        required
                        value={formData.companyId}
                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="">Select Company</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                      <input 
                        required
                        type="number" 
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit</label>
                      <input 
                        required
                        type="text" 
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="e.g. Man-days, m3, Hours"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rate ($)</label>
                      <input 
                        required
                        type="number" 
                        value={formData.rate}
                        onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="Available">Available</option>
                        <option value="In Use">In Use</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-10 py-3 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                  >
                    {editingResource ? 'Update Resource' : 'Save Resource'}
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
