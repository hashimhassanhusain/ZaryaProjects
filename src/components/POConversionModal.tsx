import React, { useState } from 'react';
import { PurchaseRequest, TenderBidder, PurchaseOrder } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Calculator, X, Sparkles, Building2, AlignLeft, Hash } from 'lucide-react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import toast from 'react-hot-toast';
import { SearchableSelect } from './common/SearchableSelect';

interface POConversionModalProps {
  pr: PurchaseRequest;
  selectedBidder: TenderBidder | null;
  suppliers: {id: string, name: string}[];
  onClose: () => void;
  onPOConverted: (poId: string) => void;
}

export const POConversionModal: React.FC<POConversionModalProps> = ({ pr, selectedBidder, suppliers, onClose, onPOConverted }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: selectedBidder?.id || '',
    supplierName: selectedBidder?.companyName || '',
    date: new Date().toISOString().split('T')[0],
    amount: selectedBidder?.financialOffer || boqTotal(),
    currency: pr.currency || 'IQD',
    exchangeRate: pr.exchangeRate || 1,
    contractDuration: 30,
    contractDurationType: 'Work Days',
  });

  function boqTotal() {
    return (pr.boqItems || []).reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);
  }

  const handleIssuePO = async () => {
    if (!formData.supplierName) {
      toast.error('Please specify a supplier');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Finalizing Purchase Order...');
    try {
      // 1. Create Purchase Order document in the exact format defined in types.ts
      const poData: Omit<PurchaseOrder, 'id'> = {
        projectId: pr.projectId,
        supplier: formData.supplierName,
        date: formData.date,
        status: 'Draft',
        amount: formData.amount,
        inputCurrency: formData.currency as any,
        exchangeRateUsed: formData.exchangeRate,
        workPackageId: pr.workPackageId || '',
        wbsId: pr.wbsId || '',
        activityId: pr.activityId || '',
        prName: pr.prName,
        prId: pr.id,
        lineItems: (pr.boqItems || []).map(item => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
        createdAt: new Date().toISOString(),
        buyerName: auth.currentUser?.displayName || 'System API',
        contractDuration: formData.contractDuration,
        contractDurationType: formData.contractDurationType as 'Work Days' | 'Calendar Days',
      };

      const docRef = await addDoc(collection(db, 'purchase_orders'), poData);

      // 2. Update PR Status
      await updateDoc(doc(db, 'purchase_requests', pr.id!), {
        status: 'PO Issued',
        linkedPOId: docRef.id
      });

      toast.success('Purchase Order Generated Successfully!', { id: toastId });
      onPOConverted(docRef.id);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'purchase_orders');
      toast.error('Failed to isolate PO parameters', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar bg-slate-950/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="relative bg-white rounded-[3rem] p-10 w-full max-w-4xl shadow-2xl overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50 pointer-events-none" />
        
        <div className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-7 h-7" />
              </div>
              Convert to Purchase Order
            </h3>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 ml-16">Link specifications, costs, and chosen supplier into final PO</p>
          </div>
          <button onClick={onClose} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">PO Primary Parameters</h4>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selected Supplier</label>
              <SearchableSelect 
                  options={suppliers}
                  value={formData.supplierId}
                  onChange={(id, name) => setFormData({...formData, supplierId: id, supplierName: name || ''})}
                  onAddClick={async () => {
                    const name = window.prompt('Enter New Supplier Name:');
                    if (name) {
                      try {
                        const docRef = await addDoc(collection(db, 'suppliers'), {
                          name,
                          status: 'Active',
                          createdAt: new Date().toISOString()
                        });
                        toast.success('Supplier added. Please select it from the list.');
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to add supplier');
                      }
                    }
                  }}
                  placeholder="Search and attach vendor from Master Database..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Date</label>
                 <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PR Reference</label>
                 <input 
                  disabled
                  value={pr?.prName}
                  className="w-full bg-slate-100 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold text-slate-500 uppercase tracking-tight"
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract Duration</label>
                 <input 
                  type="number"
                  value={formData.contractDuration}
                  onChange={(e) => setFormData({...formData, contractDuration: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration Type</label>
                 <select 
                  value={formData.contractDurationType}
                  onChange={(e) => setFormData({...formData, contractDurationType: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                 >
                   <option>Work Days</option>
                   <option>Calendar Days</option>
                 </select>
               </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-inner mt-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Financial Commitment</p>
               <div className="flex items-end gap-3 text-white">
                 <span className="text-xl font-bold text-slate-500 mb-1">{formData.currency}</span>
                 <input 
                   type="number"
                   value={formData.amount}
                   onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                   className="bg-transparent border-none focus:ring-0 text-5xl font-black p-0 tracking-tighter w-full outline-none"
                 />
               </div>
            </div>

          </div>

          <div className="space-y-6">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Line Items Included</h4>
             <div className="bg-slate-50 rounded-[2rem] p-4 max-h-[350px] overflow-y-auto space-y-2 border border-slate-100">
                {(pr.boqItems || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">
                    No Line Items Derived from PR
                  </div>
                ) : (
                  (pr.boqItems || []).map((item, i) => (
                    <div key={item.id || i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{item.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">QTY: {item.quantity} {item.unit}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-emerald-600">
                          {((item.quantity * item.rate * formData.exchangeRate)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        <div className="mt-10 flex gap-4 pt-8 border-t border-slate-100 relative z-10">
          <button 
            onClick={onClose}
            className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button 
            disabled={loading}
            onClick={handleIssuePO}
            className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all outline-none"
          >
            {loading ? 'Processing...' : 'Authorize Commitment & Issue PO'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
