import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Vendor, PurchaseOrder, Page, Stakeholder } from '../types';
import { useProject } from '../context/ProjectContext';
import { 
  Search, Filter, Plus, MoreHorizontal, Phone, Mail, MapPin, 
  FileText, ExternalLink, X, Loader2, Briefcase, Download, Upload,
  ShieldCheck
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { masterFormatDivisions } from '../data';
import { useLanguage } from '../context/LanguageContext';
import { DataImportModal } from './DataImportModal';

interface SupplierMasterRegisterProps {
  page: Page;
}

export const SupplierMasterRegister: React.FC<SupplierMasterRegisterProps> = ({ page }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const vendorUnsubscribe = onSnapshot(
      query(collection(db, 'vendors'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setVendors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'vendors')
    );

    const poUnsubscribe = onSnapshot(
      query(collection(db, 'purchaseOrders'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'purchaseOrders')
    );

    return () => {
      vendorUnsubscribe();
      poUnsubscribe();
    };
  }, [selectedProject]);

  const vendorTargetColumns = [
    { key: 'vendorCode', label: 'Vendor Code', description: 'Unique supplier code' },
    { key: 'name', label: 'Company Name', required: true },
    { key: 'specialty', label: 'Discipline / Trade', description: 'Primary field of work' },
    { key: 'contactPhone', label: 'Phone Number' },
    { key: 'contactEmail', label: 'Email Address' },
    { key: 'country', label: 'Country' },
    { key: 'status', label: 'Status', description: 'Active or Suspended' },
  ];

  const handleImportVendorData = async (mappedData: any[]) => {
    if (!selectedProject) return;
    setIsImporting(true);
    let successCount = 0;
    
    try {
      for (const item of mappedData) {
        const vendorData: Partial<Vendor> = {
          projectId: selectedProject.id,
          name: item.name,
          vendorCode: item.vendorCode || item.supplierCode || '',
          specialty: item.specialty ? (Array.isArray(item.specialty) ? item.specialty : [item.specialty]) : [],
          status: (item.status?.toLowerCase() === 'active' ? 'active' : 'suspended'),
          country: item.country || '',
          contactPhone: item.contactPhone || item.phone || '',
          contactEmail: item.contactEmail || item.email || '',
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.uid || 'system'
        };

        await addDoc(collection(db, 'vendors'), vendorData);
        successCount++;
      }
      toast.success(`Successfully imported ${successCount} vendors.`);
    } catch (err) {
      console.error("Error importing vendors:", err);
      toast.error("Failed to import some vendors.");
    } finally {
      setIsImporting(false);
    }
  };

  const vendorStats = useMemo(() => {
    return vendors.map(vendor => {
      const vendorPOs = purchaseOrders.filter(po => po.supplier === vendor.name);
      const totalPOAmount = vendorPOs.reduce((sum, po) => sum + po.amount, 0);
      const totalPayments = vendorPOs.reduce((sum, po) => sum + (po.amount * (po.completion || 0) / 100), 0);
      const balance = totalPOAmount - totalPayments;

      return {
        vendorId: vendor.id,
        totalPOAmount,
        totalPayments,
        balance,
        poCount: vendorPOs.length,
        pos: vendorPOs
      };
    });
  }, [vendors, purchaseOrders]);

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.specialty?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSaveVendor = async (vendorData: Partial<Vendor>) => {
    if (!selectedProject) return;
    try {
      const data = {
        ...vendorData,
        projectId: selectedProject.id,
        updatedAt: new Date().toISOString()
      };

      if (editingVendor) {
        await updateDoc(doc(db, 'vendors', editingVendor.id), data);
      } else {
        await addDoc(collection(db, 'vendors'), {
          ...data,
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.uid || 'system'
        });
      }
      
      // Stakeholder sync
      try {
        const stakeholderId = `vendor_${vendorData.name?.replace(/\s+/g, '_')}`;
        await setDoc(doc(db, 'stakeholders', stakeholderId), {
          id: stakeholderId,
          projectId: selectedProject.id,
          name: vendorData.name,
          position: 'Project Vendor',
          role: 'Supplier',
          contactInfo: vendorData.contactEmail || vendorData.contactPhone || '',
          classification: 'External',
          category: 'Vendor'
        }, { merge: true });
      } catch (e) {
        console.warn('Stakeholder sync failed:', e);
      }

      setIsAddingVendor(false);
      setEditingVendor(null);
      toast.success(editingVendor ? 'Vendor updated' : 'Vendor registered');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'vendors');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans">
      <div className="flex flex-col md:flex-row justify-end items-start md:items-end gap-3">
        <button 
          onClick={() => setShowImportModal(true)}
          className="bg-slate-100 text-slate-700 px-6 py-3 font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
          style={{ borderRadius: '1rem' }}
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
          {isImporting ? 'Importing...' : 'Import Data'}
        </button>
        <button 
          onClick={() => setIsAddingVendor(true)}
          className="bg-blue-600 text-white px-6 py-3 font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
          style={{ borderRadius: '1rem' }}
        >
          <Plus className="w-4 h-4" />
          {t('add_new_supplier')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 flex flex-wrap items-center gap-4 p-4 rounded-[1.5rem] shadow-sm">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('search_suppliers')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 outline-none"
          />
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm rounded-[2rem]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('supplier_code')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('supplier_name')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('discipline')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">{t('po_total')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">{t('paid')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">{t('balance')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.map(vendor => {
                const stats = vendorStats.find(s => s.vendorId === vendor.id);
                const isSuspended = vendor.status === 'suspended';
                
                return (
                  <tr 
                    key={vendor.id} 
                    className={cn(
                      "group hover:bg-slate-50/80 transition-colors cursor-pointer relative",
                      isSuspended && "bg-slate-50/50 grayscale-[0.5]"
                    )}
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-bold text-slate-500">{vendor.vendorCode}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{vendor.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{vendor.contactEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {vendor.specialty?.map(s => (
                          <span key={s} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 uppercase tracking-wider rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-bold text-slate-900 font-mono tracking-tighter">{formatCurrency(stats?.totalPOAmount || 0)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-bold text-emerald-600 font-mono tracking-tighter">{formatCurrency(stats?.totalPayments || 0)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-bold text-blue-600 font-mono tracking-tighter">{formatCurrency(stats?.balance || 0)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "text-[9px] font-semibold px-2 py-1 uppercase tracking-tighter rounded-md",
                        vendor.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {vendor.status === 'active' ? t('active') : t('suspended')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingVendor(vendor); setIsAddingVendor(true); }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel for Vendor Details */}
      <AnimatePresence>
        {selectedVendor && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVendor(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{t('supplier_profile')}</h3>
                <button onClick={() => setSelectedVendor(null)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-2 text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 text-white text-4xl font-black shadow-xl shadow-blue-600/20">
                    {selectedVendor.name?.[0]}
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 uppercase leading-tight tracking-tight">{selectedVendor.name}</h4>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                    <Briefcase className="w-3 h-3" /> {selectedVendor.vendorCode}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                        <MapPin className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-tight">{selectedVendor.country || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                        <Phone className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 font-mono">{selectedVendor.contactPhone}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 truncate">{selectedVendor.contactEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Intelligence</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-blue-600 rounded-3xl shadow-xl shadow-blue-600/20">
                      <div className="text-[9px] font-bold text-blue-200 uppercase mb-1">{t('po_total')}</div>
                      <div className="text-lg font-black text-white italic tracking-tighter">
                        {formatCurrency(vendorStats.find(s => s.vendorId === selectedVendor.id)?.totalPOAmount || 0)}
                      </div>
                    </div>
                    <div className="p-5 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-600/20">
                      <div className="text-[9px] font-bold text-emerald-200 uppercase mb-1">{t('paid')}</div>
                      <div className="text-lg font-black text-white italic tracking-tighter">
                        {formatCurrency(vendorStats.find(s => s.vendorId === selectedVendor.id)?.totalPayments || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Procurement Log</div>
                  <div className="space-y-3">
                    {vendorStats.find(s => s.vendorId === selectedVendor.id)?.pos.map(po => (
                      <div key={po.id} className="p-5 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight italic">{po.id}</div>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-900 text-white uppercase rounded-md tracking-widest">{po.status}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{po.date}</div>
                          <div className="text-sm font-black text-slate-900 font-mono tracking-tighter">{formatCurrency(po.amount)}</div>
                        </div>
                      </div>
                    ))}
                    {vendorStats.find(s => s.vendorId === selectedVendor.id)?.pos.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        {t('no_pos_found')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50">
                <button 
                  className="w-full py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all hover:scale-[1.02]"
                >
                  {t('download_statement')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Vendor Modal */}
      <AnimatePresence>
        {showImportModal && (
          <DataImportModal 
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleImportVendorData}
            targetColumns={vendorTargetColumns}
            title="Import Vendors"
            entityName="Project Vendors"
          />
        )}
        {isAddingVendor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-sans">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col rounded-[3.5rem]"
            >
              <div className="px-10 py-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
                    {editingVendor ? 'Update Vendor' : 'New Project Vendor'}
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-1.5">Supplier Master Register Integration</p>
                </div>
                <button onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }} className="p-4 bg-white border border-slate-200 rounded-3xl hover:bg-slate-100 transition-all shadow-sm">
                  <X className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveVendor({
                    vendorCode: formData.get('vendorCode') as string,
                    name: formData.get('name') as string,
                    specialty: [formData.get('specialty') as string],
                    status: formData.get('status') as any,
                    country: formData.get('country') as string,
                    contactPhone: formData.get('contactPhone') as string,
                    contactEmail: formData.get('contactEmail') as string,
                  });
                }}
                className="p-10 space-y-10"
              >
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Vendor Master ID</label>
                    <input 
                      name="vendorCode"
                      defaultValue={editingVendor?.vendorCode}
                      required
                      placeholder="e.g. VND-001"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black text-slate-900 focus:ring-8 focus:ring-blue-500/5 transition-all outline-none italic placeholder:text-slate-300"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Operational State</label>
                    <select 
                      name="status"
                      defaultValue={editingVendor?.status || 'active'}
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-8 focus:ring-blue-500/5 appearance-none"
                    >
                      <option value="active">Active Service</option>
                      <option value="suspended">Suspended / Hold</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Legal Entity Name</label>
                    <input 
                      name="name"
                      defaultValue={editingVendor?.name}
                      required
                      placeholder="Corporate Name"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black text-slate-900 outline-none focus:ring-8 focus:ring-blue-500/5 italic"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Trade Specialty</label>
                    <select 
                      name="specialty"
                      defaultValue={editingVendor?.specialty?.[0] || '01'}
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-8 focus:ring-blue-500/5 appearance-none"
                    >
                      {masterFormatDivisions.map(div => (
                        <option key={div.id} value={`${div.id} - ${div.title}`}>{div.id} - {div.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Country of Origin</label>
                    <input 
                      name="country"
                      defaultValue={editingVendor?.country}
                      placeholder="Iraq"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black text-slate-900 outline-none focus:ring-8 focus:ring-blue-500/5 italic"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Technical Contact Phone</label>
                    <input 
                      name="contactPhone"
                      defaultValue={editingVendor?.contactPhone}
                      placeholder="+964..."
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black text-slate-900 outline-none focus:ring-8 focus:ring-blue-500/5 italic font-mono"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Commercial Email</label>
                    <input 
                      name="contactEmail"
                      type="email"
                      defaultValue={editingVendor?.contactEmail}
                      placeholder="procurement@vendor.com"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black text-slate-900 outline-none focus:ring-8 focus:ring-blue-500/5 italic"
                    />
                  </div>
                </div>

                <div className="pt-10 flex justify-end gap-6">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }}
                    className="px-8 py-5 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:text-slate-600 transition-all"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit"
                    className="px-14 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/30 hover:scale-105 active:scale-95"
                  >
                    {editingVendor ? 'Ship Updates' : 'Authorize Vendor'}
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
