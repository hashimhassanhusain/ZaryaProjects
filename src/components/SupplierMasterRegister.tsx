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
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig } from '../types';

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
      const supplierPOs = purchaseOrders.filter(po => po.supplier === supplier.name || po.buyFromPartner === supplier.vendorCode);
      const totalPOAmount = supplierPOs.reduce((sum, po) => sum + (po.amount || 0), 0);
      const totalPayments = supplierPOs.reduce((sum, po) => sum + ((po.amount || 0) * (po.completion || 0) / 100), 0);
      const balance = totalPOAmount - totalPayments;
      
      const avgCompletion = supplierPOs.length > 0 
        ? supplierPOs.reduce((acc, po) => acc + (po.completion || 0), 0) / supplierPOs.length 
        : 0;

      return {
        supplierId: supplier.id,
        totalPOAmount,
        totalPayments,
        balance,
        poCount: supplierPOs.length,
        avgCompletion,
        reliability: avgCompletion > 80 ? 'High' : avgCompletion > 40 ? 'Medium' : 'Low',
        pos: supplierPOs
      };
    });
  }, [suppliers, purchaseOrders]);

  const dashboardMetrics = useMemo(() => {
    const totalCommitted = supplierStats.reduce((sum, s) => sum + s.totalPOAmount, 0);
    const totalPaid = supplierStats.reduce((sum, s) => sum + s.totalPayments, 0);
    const activeVendors = suppliers.filter(s => s.status === 'Active').length;
    
    return {
      totalCommitted,
      totalPaid,
      activeVendors,
      reliabilityIndex: (supplierStats.filter(s => s.reliability === 'High').length / (suppliers.length || 1)) * 100
    };
  }, [supplierStats, suppliers]);

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Financial Pulse</div>
        <div className="text-2xl font-black text-slate-900">{formatCurrency(dashboardMetrics.totalCommitted)}</div>
        <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          Neural Committed Capital
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Disbursed</div>
        <div className="text-2xl font-black text-emerald-600">{formatCurrency(dashboardMetrics.totalPaid)}</div>
        <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          {Math.round((dashboardMetrics.totalPaid / (dashboardMetrics.totalCommitted || 1)) * 100)}% Execution
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendor Ecosystem</div>
        <div className="text-2xl font-black text-slate-900">{dashboardMetrics.activeVendors} <span className="text-xs text-slate-400">Active</span></div>
        <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
          Neural Link: Stable
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reliability Index</div>
        <div className="text-2xl font-black text-amber-600">{Math.round(dashboardMetrics.reliabilityIndex)}%</div>
        <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          Predictive Risk Mitigated
        </div>
      </motion.div>
    </div>
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.discipline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const supplierConfig: EntityConfig = {
    id: 'suppliers',
    label: t('supplier_master'),
    icon: Briefcase,
    collection: 'companies',
    columns: [
      { key: 'vendorCode', label: t('supplier_code') || 'Code', type: 'string' },
      { key: 'name', label: t('supplier_name') || 'Company Name', type: 'string' },
      { key: 'discipline', label: t('discipline'), type: 'string' },
      { key: 'status', label: t('status') || 'Status', type: 'status' },
      { key: 'email', label: t('email') || 'Email', type: 'string' },
      { key: 'phone', label: t('phone') || 'Phone', type: 'string' },
    ]
  };

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
        projectId: selectedProject.id,
        is_internal: false,
        entity_type: 'vendor'
      };

      if (!editingSupplier) {
        companyData.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'companies', supplierId), companyData);
      
      // --- STAKEHOLDER SYNC (Neural Mapping) ---
      try {
        const stakeholderId = `SH-${supplierId}`;
        const stakeholderRef = doc(db, 'stakeholders', stakeholderId);
        
        const newStakeholder: Stakeholder = {
          id: stakeholderId,
          projectId: selectedProject.id,
          name: companyData.name,
          position: 'Vendor / Partner',
          organization: companyData.name,
          role: 'Supplier',
          email: companyData.email || '',
          phone: companyData.phone || '',
          location: companyData.address || '',
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
          updatedBy: 'System AI',
          createdAt: new Date().toISOString(),
          createdBy: 'System AI'
        };

        await setDoc(stakeholderRef, newStakeholder);
      } catch (e) {
        console.error('Error syncing supplier to stakeholder register:', e);
      }

      setIsAddingSupplier(false);
      setEditingSupplier(null);
      toast.success(editingSupplier ? 'Integration Updated' : 'Partner Integrated & Neural Synced');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'companies');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse tracking-tighter">Syncing Intelligence...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans">
      {renderDashboard()}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-xl shadow-black/10">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Intelligent Vendor Ecosystem</h2>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Unified Neural Multi-Supplier Intelligence</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all rounded-full"
          >
            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-slate-400" />}
            Neural Import
          </button>
          <button 
            onClick={() => setIsAddingSupplier(true)}
            className="px-8 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 rounded-full"
          >
            <Plus className="w-4 h-4" />
            Integrate Partner
          </button>
        </div>
      </div>

      {/* Universal Data Table Integration */}
      {!selectedSupplier && !isAddingSupplier && (
        <div className="flex-1 bg-white rounded-3xl overflow-hidden border border-slate-200 min-h-[600px]">
          <UniversalDataTable 
            config={supplierConfig}
            data={suppliers.map(s => ({
              ...s,
              email: s.contactDetails?.email,
              phone: s.contactDetails?.phone
            }))}
            onRowClick={(record) => setSelectedSupplier(record)}
            onDeleteRecord={async (id) => {
              try {
                await deleteDoc(doc(db, 'companies', id));
                toast.success('Supplier removed');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'companies');
              }
            }}
            showAddButton={false}
          />
        </div>
      )}

      {/* Side Panel for Supplier Details */}
      <AnimatePresence>
        {selectedSupplier && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSupplier(null)}
              className="fixed inset-0 bg-neutral-950/20 backdrop-blur-[2px] z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-neutral-200"
              style={{ borderRadius: '0px' }}
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <h3 className="text-lg font-semibold text-neutral-900 uppercase tracking-tighter">{t('supplier_profile')}</h3>
                <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-neutral-200 transition-all">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.2em]">{t('supplier_details')}</div>
                  <h4 className="text-2xl font-semibold text-neutral-900 uppercase leading-tight">{selectedSupplier.name}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400">
                    <Briefcase className="w-3 h-3" /> {selectedSupplier.vendorCode}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-neutral-50 border border-neutral-100 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
                      <span className="text-xs font-medium text-neutral-600">{selectedSupplier.contactDetails.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-600">{selectedSupplier.contactDetails.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-600">{selectedSupplier.contactDetails.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.2em]">Financial Summary</div>
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
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.2em]">Linked Purchase Orders</div>
                  <div className="space-y-3">
                    {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.pos.map(po => (
                      <div key={po.id} className="p-4 border border-neutral-100 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors uppercase">{po.id}</div>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-neutral-100 text-neutral-500 uppercase">{po.status}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-bold text-neutral-400">{po.date}</div>
                          <div className="text-xs font-semibold text-neutral-900">{formatCurrency(po.amount)}</div>
                        </div>
                      </div>
                    ))}
                    {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.pos.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-neutral-100 text-neutral-400 text-xs font-bold">
                        {t('no_pos_found')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-100 bg-neutral-50">
                <button 
                  className="w-full py-4 bg-neutral-900 text-white font-semibold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all"
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
          <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white shadow-2xl w-full max-w-lg overflow-hidden flex flex-col rounded-3xl"
            >
              <div className="px-6 py-6 border-b border-neutral-100 bg-white">
                <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
                  {editingSupplier ? t('edit_supplier_profile') : t('add_new_supplier')}
                </h3>
                <p className="text-neutral-400 text-xs mt-1">{t('company_details_desc')}</p>
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
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{t('supplier_code')}</label>
                    <input 
                      name="vendorCode"
                      defaultValue={editingSupplier?.vendorCode}
                      required
                      placeholder="e.g. S-001"
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{t('operational_status')}</label>
                    <select 
                      name="status"
                      defaultValue={editingSupplier?.status || 'Active'}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    >
                      <option value="Active">{t('active')}</option>
                      <option value="Suspended">{t('suspended')}</option>
                      <option value="Contract Ended">{t('contract_ended')}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{t('legal_supplier_name')}</label>
                    <input 
                      name="name"
                      defaultValue={editingSupplier?.name}
                      required
                      placeholder={t('company_name_placeholder')}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking_widest mb-1">{t('discipline_masterformat')}</label>
                    <select 
                      name="discipline"
                      defaultValue={editingSupplier?.discipline || '01'}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    >
                      {masterFormatDivisions.map(div => (
                        <option key={div.id} value={`${div.id} - ${div.title}`}>{div.id} - {div.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{t('address')}</label>
                    <input 
                      name="address"
                      defaultValue={editingSupplier?.contactDetails.address}
                      placeholder={t('address_placeholder')}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{t('phone')}</label>
                    <input 
                      name="phone"
                      defaultValue={editingSupplier?.contactDetails.phone}
                      placeholder="+964..."
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{t('email')}</label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingSupplier?.contactDetails.email}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-neutral-900"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); }}
                    className="px-4 py-2 text-neutral-600 font-bold text-sm hover:bg-neutral-100 rounded-xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
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
