import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Supplier, PurchaseOrder, Page, Stakeholder, Company } from '../types';
import { useProject } from '../context/ProjectContext';
import { 
  Search, Filter, Plus, MoreHorizontal, Phone, Mail, MapPin, 
  FileText, ExternalLink, X, Loader2, Briefcase, Download, Upload
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const supplierUnsubscribe = onSnapshot(
      query(collection(db, 'companies'), where('type', '==', 'Supplier')),
      (snapshot) => {
        setSuppliers(snapshot.docs.map(d => ({ 
          id: d.id, 
          name: d.data().name,
          vendorCode: d.data().supplierCode || '',
          discipline: d.data().discipline || '',
          status: d.data().status === 'Active' ? 'Active' : 'Contract Ended',
          contactDetails: {
            address: d.data().address || '',
            phone: d.data().phone || '',
            email: d.data().email || ''
          },
          projectId: selectedProject.id
        } as Supplier)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'companies')
    );

    const poUnsubscribe = onSnapshot(
      query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'purchase_orders')
    );

    return () => {
      supplierUnsubscribe();
      poUnsubscribe();
    };
  }, [selectedProject]);

  const supplierTargetColumns = [
    { key: 'vendorCode', label: 'Vendor Code', description: 'Unique supplier code' },
    { key: 'name', label: 'Company Name', required: true },
    { key: 'discipline', label: 'Discipline / Trade', description: 'Primary field of work' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'address', label: 'Office Address' },
    { key: 'status', label: 'Status', description: 'Active or Inactive' },
  ];

  const handleImportSupplierData = async (mappedData: any[]) => {
    if (!selectedProject) return;
    setIsImporting(true);
    let successCount = 0;
    
    try {
      for (const item of mappedData) {
        const id = crypto.randomUUID();
        const companyData: Company = {
          id,
          name: item.name,
          type: 'Supplier',
          supplierCode: item.vendorCode || '',
          discipline: item.discipline || '',
          status: item.status || 'Active',
          is_internal: false,
          entity_type: 'vendor',
          address: item.address || '',
          phone: item.phone || '',
          email: item.email || '',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'companies', id), companyData);
        successCount++;
      }
      toast.success(`Successfully imported ${successCount} suppliers.`);
    } catch (err) {
      console.error("Error importing suppliers:", err);
      toast.error("Failed to import some suppliers.");
    } finally {
      setIsImporting(false);
    }
  };

  const supplierStats = useMemo(() => {
    return suppliers.map(supplier => {
      const supplierPOs = purchaseOrders.filter(po => po.supplier === supplier.name);
      const totalPOAmount = supplierPOs.reduce((sum, po) => sum + po.amount, 0);
      const totalPayments = supplierPOs.reduce((sum, po) => sum + (po.amount * (po.completion || 0) / 100), 0);
      const balance = totalPOAmount - totalPayments;

      return {
        supplierId: supplier.id,
        totalPOAmount,
        totalPayments,
        balance,
        poCount: supplierPOs.length,
        pos: supplierPOs
      };
    });
  }, [suppliers, purchaseOrders]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.discipline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveSupplier = async (supplierData: Partial<Supplier>) => {
    if (!selectedProject) return;
    try {
      const supplierId = editingSupplier?.id || doc(collection(db, 'companies')).id;
      
      const companyData: any = {
        name: supplierData.name,
        type: 'Supplier',
        status: supplierData.status || 'Active',
        address: supplierData.contactDetails?.address || '',
        phone: supplierData.contactDetails?.phone || '',
        email: supplierData.contactDetails?.email || '',
        updatedAt: new Date().toISOString(),
        supplierCode: supplierData.vendorCode || '',
        discipline: supplierData.discipline || '',
        projectId: selectedProject.id
      };

      if (!editingSupplier) {
        companyData.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'companies', supplierId), companyData);
      
      // --- STAKEHOLDER SYNC ---
      try {
        const stakeholderId = `supplier_${supplierId}`;
        const stakeholderRef = doc(db, 'stakeholders', stakeholderId);
        
        const newStakeholder: Stakeholder = {
          id: stakeholderId,
          projectId: selectedProject.id,
          name: companyData.name,
          position: 'External Supplier',
          organization: companyData.name,
          role: 'Supplier/Contractor',
          email: companyData.email || '',
          phone: companyData.phone || '',
          location: '',
          type: 'External',
          influence: 'Medium',
          interest: 'High',
          expectations: `Timely payment and clear technical requirements for ${companyData.discipline}`,
          requirements: 'Payment, Invoice, Contract Compliance',
          powerScore: 6,
          interestScore: 8,
          directionOfInfluence: 'Outward',
          currentEngagement: 'Neutral',
          desiredEngagement: 'Supportive',
          phaseOfMostInterest: 'Construction',
          status: 'Active',
          updatedAt: new Date().toISOString(),
          updatedBy: 'System',
          createdAt: new Date().toISOString(),
          createdBy: 'System'
        };

        await setDoc(stakeholderRef, newStakeholder);
      } catch (e) {
        console.error('Error syncing supplier to stakeholder register:', e);
      }

      setIsAddingSupplier(false);
      setEditingSupplier(null);
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
          className="bg-slate-100 text-slate-700 px-6 py-3 font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all"
          style={{ borderRadius: '0px' }}
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
          {isImporting ? 'Importing...' : 'Import Data'}
        </button>
        <button 
          onClick={() => setIsAddingSupplier(true)}
          className="bg-slate-900 text-white px-6 py-3 font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
          style={{ borderRadius: '0px' }}
        >
          <Plus className="w-4 h-4" />
          {t('add_new_supplier')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 flex flex-wrap items-center gap-4 p-4" style={{ borderRadius: '0px' }}>
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('search_suppliers')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none text-sm font-medium focus:ring-0 transition-all text-slate-900"
            style={{ borderRadius: '0px' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 text-slate-500 hover:bg-slate-100 transition-all" style={{ borderRadius: '0px' }}><Filter className="w-4 h-4" /></button>
          <button className="p-3 text-slate-500 hover:bg-slate-100 transition-all" style={{ borderRadius: '0px' }}><ExternalLink className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Supplier Table */}
      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm" style={{ borderRadius: '0px' }}>
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
              {filteredSuppliers.map(supplier => {
                const stats = supplierStats.find(s => s.supplierId === supplier.id);
                const isEnded = supplier.status === 'Contract Ended';
                
                return (
                  <tr 
                    key={supplier.id} 
                    className={cn(
                      "group hover:bg-slate-50/80 transition-colors cursor-pointer relative",
                      isEnded && "bg-slate-50/50 grayscale-[0.5]"
                    )}
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-bold text-slate-500">{supplier.vendorCode}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{supplier.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{supplier.contactDetails.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 uppercase tracking-wider">
                        {supplier.discipline}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(stats?.totalPOAmount || 0)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-bold text-emerald-600">{formatCurrency(stats?.totalPayments || 0)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-xs font-bold text-blue-600">{formatCurrency(stats?.balance || 0)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "text-[9px] font-semibold px-2 py-1 uppercase tracking-tighter",
                        supplier.status === 'Active' ? "bg-emerald-100 text-emerald-700" :
                        supplier.status === 'Suspended' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-200 text-slate-600"
                      )}>
                        {supplier.status === 'Active' ? t('active') :
                         supplier.status === 'Suspended' ? t('suspended') : 
                         t('contract_ended')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); /* Link to PDF */ }}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingSupplier(supplier); setIsAddingSupplier(true); }}
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

      {/* Side Panel for Supplier Details */}
      <AnimatePresence>
        {selectedSupplier && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSupplier(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
              style={{ borderRadius: '0px' }}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tighter">{t('supplier_profile')}</h3>
                <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-slate-200 transition-all">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.2em]">{t('supplier_details')}</div>
                  <h4 className="text-2xl font-semibold text-slate-900 uppercase leading-tight">{selectedSupplier.name}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
                    <Briefcase className="w-3 h-3" /> {selectedSupplier.vendorCode}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="text-xs font-medium text-slate-600">{selectedSupplier.contactDetails.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{selectedSupplier.contactDetails.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{selectedSupplier.contactDetails.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Financial Summary</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-100">
                      <div className="text-[9px] font-semibold text-blue-400 uppercase mb-1">{t('po_total')}</div>
                      <div className="text-lg font-semibold text-blue-700">
                        {formatCurrency(supplierStats.find(s => s.supplierId === selectedSupplier.id)?.totalPOAmount || 0)}
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100">
                      <div className="text-[9px] font-semibold text-emerald-400 uppercase mb-1">{t('paid')}</div>
                      <div className="text-lg font-semibold text-emerald-700">
                        {formatCurrency(supplierStats.find(s => s.supplierId === selectedSupplier.id)?.totalPayments || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Linked Purchase Orders</div>
                  <div className="space-y-3">
                    {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.pos.map(po => (
                      <div key={po.id} className="p-4 border border-slate-100 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{po.id}</div>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 uppercase">{po.status}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-bold text-slate-400">{po.date}</div>
                          <div className="text-xs font-semibold text-slate-900">{formatCurrency(po.amount)}</div>
                        </div>
                      </div>
                    ))}
                    {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.pos.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold">
                        {t('no_pos_found')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  className="w-full py-4 bg-slate-900 text-white font-semibold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                  style={{ borderRadius: '0px' }}
                >
                  {t('download_statement')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Supplier Modal - Updated to follow Company Window Style as requested */}
      <AnimatePresence>
        {showImportModal && (
          <DataImportModal 
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleImportSupplierData}
            targetColumns={supplierTargetColumns}
            title="Import Suppliers"
            entityName="Suppliers / Vendors"
          />
        )}
        {isAddingSupplier && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white shadow-2xl w-full max-w-xl overflow-hidden flex flex-col rounded-[2.5rem]"
            >
              <div className="px-8 py-8 border-b border-slate-100 bg-white">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingSupplier ? t('edit_supplier_profile') : t('add_new_supplier')}
                </h3>
                <p className="text-slate-500 text-sm mt-1">{t('company_details_desc')}</p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveSupplier({
                    vendorCode: formData.get('vendorCode') as string,
                    name: formData.get('name') as string,
                    discipline: formData.get('discipline') as string,
                    status: formData.get('status') as any,
                    contactDetails: {
                      address: formData.get('address') as string,
                      phone: formData.get('phone') as string,
                      email: formData.get('email') as string,
                    }
                  });
                }}
                className="p-8 space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('supplier_code')}</label>
                    <input 
                      name="vendorCode"
                      defaultValue={editingSupplier?.vendorCode}
                      required
                      placeholder="e.g. S-001"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('operational_status')}</label>
                    <select 
                      name="status"
                      defaultValue={editingSupplier?.status || 'Active'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    >
                      <option value="Active">{t('active')}</option>
                      <option value="Suspended">{t('suspended')}</option>
                      <option value="Contract Ended">{t('contract_ended')}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('legal_supplier_name')}</label>
                    <input 
                      name="name"
                      defaultValue={editingSupplier?.name}
                      required
                      placeholder={t('company_name_placeholder')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('discipline_masterformat')}</label>
                    <select 
                      name="discipline"
                      defaultValue={editingSupplier?.discipline || '01'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    >
                      {masterFormatDivisions.map(div => (
                        <option key={div.id} value={`${div.id} - ${div.title}`}>{div.id} - {div.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('address')}</label>
                    <input 
                      name="address"
                      defaultValue={editingSupplier?.contactDetails.address}
                      placeholder={t('address_placeholder')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('phone')}</label>
                    <input 
                      name="phone"
                      defaultValue={editingSupplier?.contactDetails.phone}
                      placeholder="+964..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('email')}</label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingSupplier?.contactDetails.email}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); }}
                    className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="px-10 py-3 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                  >
                    {editingSupplier ? t('update_supplier') : t('register_supplier')}
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
