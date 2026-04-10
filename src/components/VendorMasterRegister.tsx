import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Vendor, PurchaseOrder, Page } from '../types';
import { useProject } from '../context/ProjectContext';
import { 
  Search, Filter, Plus, MoreHorizontal, Phone, Mail, MapPin, 
  FileText, ExternalLink, ChevronRight, X, Loader2, AlertCircle,
  TrendingUp, DollarSign, Briefcase
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { masterFormatDivisions } from '../data';

interface VendorMasterRegisterProps {
  page: Page;
}

export const VendorMasterRegister: React.FC<VendorMasterRegisterProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

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

  const vendorStats = useMemo(() => {
    return vendors.map(vendor => {
      const vendorPOs = purchaseOrders.filter(po => po.supplier === vendor.name);
      const totalPOAmount = vendorPOs.reduce((sum, po) => sum + po.amount, 0);
      // Assuming payments are tracked somewhere, for now let's mock or use a field if it exists
      // In a real scenario, we might have a 'payments' collection
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
    v.discipline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveVendor = async (vendorData: Partial<Vendor>) => {
    if (!selectedProject) return;
    try {
      const vendorId = editingVendor?.id || doc(collection(db, 'vendors')).id;
      const newVendor = {
        ...vendorData,
        id: vendorId,
        projectId: selectedProject.id,
      } as Vendor;

      await setDoc(doc(db, 'vendors', vendorId), newVendor);
      
      // Mirror to Google Drive if configured
      if (selectedProject.driveFolderId) {
        const vendorJson = JSON.stringify(newVendor, null, 2);
        const blob = new Blob([vendorJson], { type: 'application/json' });
        const file = new File([blob], `${newVendor.vendorCode}_${newVendor.name.replace(/\s+/g, '_')}.json`, { type: 'application/json' });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectRootId', selectedProject.driveFolderId);
        formData.append('path', 'PROCUREMENT_AND_SUBCONTRACTORS_03/03.1_Vendors_and_Suppliers_Database');

        try {
          const driveRes = await fetch('/api/drive/upload-by-path', {
            method: 'POST',
            body: formData
          });
          if (!driveRes.ok) {
            const errData = await driveRes.json().catch(() => ({ error: 'Drive upload failed' }));
            alert(`⚠️ Vendor saved to database, but Drive backup failed:\n${errData.error || 'Unknown error'}`);
          }
        } catch (driveErr: any) {
          alert(`⚠️ Vendor saved to database, but Drive backup failed:\n${driveErr.message}`);
        }
      }

      setIsAddingVendor(false);
      setEditingVendor(null);
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-[0.2em]">Resources Performance Domain</div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Vendor Master Register</h2>
          <p className="text-slate-500 font-medium">Project P16314 - Procurement & Subcontractor Database</p>
        </div>
        <button 
          onClick={() => setIsAddingVendor(true)}
          className="bg-slate-900 text-white px-6 py-3 font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
          style={{ borderRadius: '0px' }}
        >
          <Plus className="w-4 h-4" />
          Add New Vendor
        </button>
      </header>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 flex flex-wrap items-center gap-4 p-4" style={{ borderRadius: '0px' }}>
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Vendor Name, Code or Discipline..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none text-sm font-medium focus:ring-0 transition-all"
            style={{ borderRadius: '0px' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 text-slate-500 hover:bg-slate-100 transition-all" style={{ borderRadius: '0px' }}><Filter className="w-4 h-4" /></button>
          <button className="p-3 text-slate-500 hover:bg-slate-100 transition-all" style={{ borderRadius: '0px' }}><ExternalLink className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm" style={{ borderRadius: '0px' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discipline</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">PO Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.map(vendor => {
                const stats = vendorStats.find(s => s.vendorId === vendor.id);
                const isEnded = vendor.status === 'Contract Ended';
                
                return (
                  <tr 
                    key={vendor.id} 
                    className={cn(
                      "group hover:bg-slate-50/80 transition-colors cursor-pointer relative",
                      isEnded && "bg-slate-50/50 grayscale-[0.5]"
                    )}
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-bold text-slate-500">{vendor.vendorCode}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{vendor.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{vendor.contactDetails.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 uppercase tracking-wider">
                        {vendor.discipline}
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
                        "text-[9px] font-black px-2 py-1 uppercase tracking-tighter",
                        vendor.status === 'Active' ? "bg-emerald-100 text-emerald-700" :
                        vendor.status === 'Suspended' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-200 text-slate-600"
                      )}>
                        {vendor.status}
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
              style={{ borderRadius: '0px' }}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Vendor Profile</h3>
                <button onClick={() => setSelectedVendor(null)} className="p-2 hover:bg-slate-200 transition-all">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Vendor Details</div>
                  <h4 className="text-2xl font-black text-slate-900 uppercase leading-tight">{selectedVendor.name}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
                    <Briefcase className="w-3 h-3" /> {selectedVendor.vendorCode}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="text-xs font-medium text-slate-600">{selectedVendor.contactDetails.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{selectedVendor.contactDetails.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{selectedVendor.contactDetails.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Summary</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-100">
                      <div className="text-[9px] font-black text-blue-400 uppercase mb-1">Total PO Value</div>
                      <div className="text-lg font-black text-blue-700">
                        {formatCurrency(vendorStats.find(s => s.vendorId === selectedVendor.id)?.totalPOAmount || 0)}
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100">
                      <div className="text-[9px] font-black text-emerald-400 uppercase mb-1">Total Paid</div>
                      <div className="text-lg font-black text-emerald-700">
                        {formatCurrency(vendorStats.find(s => s.vendorId === selectedVendor.id)?.totalPayments || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Linked Purchase Orders</div>
                  <div className="space-y-3">
                    {vendorStats.find(s => s.vendorId === selectedVendor.id)?.pos.map(po => (
                      <div key={po.id} className="p-4 border border-slate-100 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{po.id}</div>
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 uppercase">{po.status}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-bold text-slate-400">{po.date}</div>
                          <div className="text-xs font-black text-slate-900">{formatCurrency(po.amount)}</div>
                        </div>
                      </div>
                    ))}
                    {vendorStats.find(s => s.vendorId === selectedVendor.id)?.pos.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold">
                        No Purchase Orders found for this vendor.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                  style={{ borderRadius: '0px' }}
                >
                  Download Full Statement
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Vendor Modal */}
      <AnimatePresence>
        {isAddingVendor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
              style={{ borderRadius: '0px' }}
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {editingVendor ? 'Edit Vendor Profile' : 'Register New Vendor'}
                </h3>
                <button onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }} className="p-2 hover:bg-slate-200 transition-all">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveVendor({
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendor Code</label>
                    <input 
                      name="vendorCode"
                      defaultValue={editingVendor?.vendorCode}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Status</label>
                    <select 
                      name="status"
                      defaultValue={editingVendor?.status || 'Active'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Contract Ended">Contract Ended</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Legal Vendor Name</label>
                    <input 
                      name="name"
                      defaultValue={editingVendor?.name}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discipline (MasterFormat)</label>
                    <select 
                      name="discipline"
                      defaultValue={editingVendor?.discipline || '01'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    >
                      {masterFormatDivisions.map(div => (
                        <option key={div.id} value={`${div.id} - ${div.title}`}>{div.id} - {div.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Address</label>
                    <input 
                      name="address"
                      defaultValue={editingVendor?.contactDetails.address}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phone</label>
                    <input 
                      name="phone"
                      defaultValue={editingVendor?.contactDetails.phone}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingVendor?.contactDetails.email}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-0 outline-none"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }}
                    className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    style={{ borderRadius: '0px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-12 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                    style={{ borderRadius: '0px' }}
                  >
                    {editingVendor ? 'Update Vendor' : 'Register Vendor'}
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
