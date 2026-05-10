import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Supplier, PurchaseOrder, Page, Stakeholder, Company } from '../types';
import { useProject } from '../context/ProjectContext';
import { 
  Search, Filter, Plus, MoreHorizontal, Phone, Mail, MapPin, 
  FileText, ExternalLink, X, Loader2, Briefcase, Download, Upload,
  Edit, Printer, Trash2, Clock, CheckCircle2
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
      const supplierPOs = purchaseOrders.filter(po => 
        (po.supplier && po.supplier.toLowerCase() === supplier.name.toLowerCase()) || 
        (po.buyFromPartner && po.buyFromPartner === supplier.vendorCode)
      );

      const totalCommitted = supplierPOs.reduce((sum, po) => sum + (po.amount || 0), 0);
      const totalPaid = supplierPOs.reduce((sum, po) => sum + (po.actualCost || (po.amount || 0) * (po.completion || 0) / 100), 0);
      const outstanding = totalCommitted - totalPaid;
      
      const finishedPOs = supplierPOs.filter(po => po.completion === 100 || po.status?.toLowerCase() === 'completed' || po.status?.toLowerCase() === 'closed');
      const activePOs = supplierPOs.filter(po => (po.completion || 0) < 100 && po.status?.toLowerCase() !== 'completed' && po.status?.toLowerCase() !== 'closed');
      
      const avgCompletion = supplierPOs.length > 0 
        ? supplierPOs.reduce((acc, po) => acc + (po.completion || 0), 0) / supplierPOs.length 
        : 0;

      return {
        supplierId: supplier.id,
        totalPOAmount: totalCommitted,
        totalPayments: totalPaid,
        balance: outstanding,
        poCount: supplierPOs.length,
        finishedCount: finishedPOs.length,
        activeCount: activePOs.length,
        avgCompletion,
        reliability: avgCompletion > 80 ? 'High' : avgCompletion > 40 ? 'Medium' : 'Low',
        pos: supplierPOs,
        finishedPOs,
        activePOs
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

      {/* Detailed Full Screen View for Supplier */}
      <AnimatePresence mode="wait">
        {selectedSupplier && !editingSupplier && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 bg-white z-[500] flex flex-col pt-16 print-report"
          >
            {/* Header / Info Section */}
            <div className="bg-white border-b border-neutral-100 px-8 py-6 flex items-center justify-between sticky top-0 z-20 shadow-sm no-print">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="p-3 hover:bg-neutral-100 rounded-full transition-all"
                >
                  <X className="w-7 h-7 text-neutral-500" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">
                      {selectedSupplier.name}
                    </h3>
                    <div className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 italic">{selectedSupplier.vendorCode}</span>
                      <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                      <span>{selectedSupplier.discipline}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge in Header */}
              <div className="flex items-center gap-3">
                 <div className={cn(
                   "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                   selectedSupplier.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-neutral-50 text-neutral-400 border-neutral-100"
                 )}>
                   {selectedSupplier.status}
                 </div>
              </div>
            </div>

            {/* Content Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 pb-32">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* 1. Profile & Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Strategic Contact Info */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Global Contact ID</div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <MapPin className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                          <div className="text-sm text-slate-600 font-medium leading-relaxed">{selectedSupplier.contactDetails.address || 'Address Not Recorded'}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="text-sm text-slate-600 font-medium">{selectedSupplier.contactDetails.phone || 'Phone Missing'}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="text-sm text-slate-600 font-medium truncate">{selectedSupplier.contactDetails.email || 'Email Missing'}</div>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Coverage</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedSupplier.discipline.split(',').map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High Fidelity Financials */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('po_total')}</div>
                      <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {formatCurrency(supplierStats.find(s => s.supplierId === selectedSupplier.id)?.totalPOAmount || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-4 font-bold">
                        {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.poCount} TOTAL CONTRACTED INSTRUMENTS
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('paid')}</div>
                      <div className="text-3xl font-black text-emerald-600 tracking-tight">
                        {formatCurrency(supplierStats.find(s => s.supplierId === selectedSupplier.id)?.totalPayments || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-4 font-bold">
                        {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.finishedCount} COMPLETELY EXECUTED ORDERS
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding Liability</div>
                      <div className="text-3xl font-black text-amber-600 tracking-tight">
                        {formatCurrency(supplierStats.find(s => s.supplierId === selectedSupplier.id)?.balance || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-widest animate-pulse">
                        Sustained Account Balance
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Detailed PO Registers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Ongoing Contracts */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                          <Loader2 className="w-4 h-4 animate-spin-slow" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Engagements</h4>
                      </div>
                      <div className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-full">
                        {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.activeCount || 0} Open
                      </div>
                    </div>

                    <div className="space-y-4">
                      {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.activePOs.map(po => (
                        <div key={po.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-1 pt-full bg-blue-500 h-full" />
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{po.id}</div>
                              <div className="text-sm font-bold text-slate-900 line-clamp-1 truncate max-w-[200px]">
                                {po.projectName || 'Phase Execution Order'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black text-slate-900">{formatCurrency(po.amount)}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">{po.date}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400">Execution Progress</span>
                              <span className="text-blue-600">{po.completion || 0}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                style={{ width: `${po.completion || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.activeCount === 0 && (
                        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-2">
                          <div className="text-sm font-black text-slate-300 uppercase tracking-widest">No Active Contracts</div>
                          <div className="text-[10px] text-slate-400">All assigned orders have been concluded.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Concluded Contracts */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                          <X className="w-4 h-4 rotate-45" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Concluded Statements</h4>
                      </div>
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase rounded-full">
                        {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.finishedCount || 0} Finished
                      </div>
                    </div>

                    <div className="space-y-4">
                      {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.finishedPOs.map(po => (
                        <div key={po.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm opacity-75 hover:opacity-100 transition-all flex items-center justify-between group overflow-hidden relative">
                           <div className="absolute top-0 right-0 w-1 pt-full bg-emerald-500 h-full opacity-20" />
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                               <FileText className="w-5 h-5" />
                             </div>
                             <div>
                               <div className="text-sm font-bold text-slate-900">{po.id}</div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settled On {po.date}</div>
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="text-md font-black text-slate-900">{formatCurrency(po.amount)}</div>
                             <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fully Disbursed</div>
                           </div>
                        </div>
                      ))}
                      {supplierStats.find(s => s.supplierId === selectedSupplier.id)?.finishedCount === 0 && (
                        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2 grayscale">
                          <div className="text-sm font-black text-slate-300 uppercase tracking-widest">No Concluded Records</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions - Floating Lower Right style */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 no-print">
               <button 
                  onClick={() => window.print()}
                  className="w-14 h-14 bg-white border border-slate-200 shadow-xl rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all group relative"
                >
                  <Printer className="w-6 h-6" />
                  <span className="absolute right-full mr-4 px-2 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap uppercase tracking-widest">
                    {t('download_statement')}
                  </span>
                </button>
                <button 
                  onClick={() => setEditingSupplier(selectedSupplier)}
                  className="w-14 h-14 bg-white border border-slate-200 shadow-xl rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all group relative"
                >
                  <Edit className="w-6 h-6" />
                  <span className="absolute right-full mr-4 px-2 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap uppercase tracking-widest">
                    {t('edit')}
                  </span>
                </button>
                <button 
                  className="w-14 h-14 bg-blue-600 shadow-xl shadow-blue-600/30 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-all group relative"
                >
                  <Download className="w-6 h-6" />
                  <span className="absolute right-full mr-4 px-2 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap uppercase tracking-widest">
                    {t('download_pdf')}
                  </span>
                </button>
            </div>
          </motion.div>
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
          <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col rounded-[2.5rem] relative"
            >
              <div className="px-10 py-10 border-b border-neutral-100 bg-white relative">
                <button 
                  onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); }}
                  className="absolute top-8 right-8 p-2 hover:bg-neutral-100 rounded-full transition-all text-neutral-400"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 tracking-tighter uppercase italic">
                    {editingSupplier ? t('edit_supplier_profile') : t('add_new_supplier')}
                  </h3>
                </div>
                <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest ml-16">{t('company_details_desc')}</p>
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
                className="p-10 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('supplier_code')}</label>
                    <input 
                      name="vendorCode"
                      defaultValue={editingSupplier?.vendorCode}
                      required
                      placeholder="e.g. S-001"
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900 placeholder:text-neutral-300"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('operational_status')}</label>
                    <select 
                      name="status"
                      defaultValue={editingSupplier?.status || 'Active'}
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900"
                    >
                      <option value="Active">{t('active')}</option>
                      <option value="Suspended">{t('suspended')}</option>
                      <option value="Contract Ended">{t('contract_ended')}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('legal_supplier_name')}</label>
                    <input 
                      name="name"
                      defaultValue={editingSupplier?.name}
                      required
                      placeholder={t('company_name_placeholder')}
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900 placeholder:text-neutral-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                      {t('discipline_scope')}
                    </label>
                    <input 
                      name="discipline"
                      defaultValue={editingSupplier?.discipline}
                      required
                      placeholder="e.g. Doors, Furniture, Civil Works"
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900 placeholder:text-neutral-300"
                    />
                    <div className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1 opacity-60">Separate specialties with commas.</div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('address')}</label>
                    <input 
                      name="address"
                      defaultValue={editingSupplier?.contactDetails.address}
                      placeholder={t('address_placeholder')}
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900 placeholder:text-neutral-300"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('phone')}</label>
                    <input 
                      name="phone"
                      defaultValue={editingSupplier?.contactDetails.phone}
                      placeholder="+964..."
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900 placeholder:text-neutral-300"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('email')}</label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingSupplier?.contactDetails.email}
                      placeholder="contact@company.com"
                      className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-neutral-900 placeholder:text-neutral-300"
                    />
                  </div>
                </div>

                <div className="h-20" /> {/* Spacer for floating buttons */}
                
                {/* Save Button - Floating Lower Right style within the modal or relative to screen */}
                <div className="absolute bottom-8 right-8 flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); }}
                    className="px-8 py-3 bg-neutral-100 text-neutral-500 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-neutral-200 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="px-10 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2 inline-block" />
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
