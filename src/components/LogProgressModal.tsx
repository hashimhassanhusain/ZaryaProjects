import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, TrendingUp } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PurchaseOrder } from '../types';
import { rollupToParent } from '../services/rollupService';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface LogProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder;
}

export const LogProgressModal: React.FC<LogProgressModalProps> = ({ isOpen, onClose, po }) => {
  const [lineItems, setLineItems] = useState(po.lineItems || []);

  const handleUpdateProgress = async () => {
    try {
      const ref = doc(db, 'purchase_orders', po.id);
      await updateDoc(ref, { 
        lineItems: lineItems,
        updatedAt: new Date().toISOString()
      });

      // Trigger automatic rollup cascade
      await rollupToParent('lineItem', po.id);
      
      toast.success('Progress updated and earned value recalculated');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'purchase_orders');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Log Progress: {po.id}
              </h2>
              <button onClick={onClose}><X className="text-slate-400 hover:text-red-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-xs font-bold text-slate-600">
                <thead className="border-b uppercase text-slate-400">
                  <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Prog %</th></tr>
                </thead>
                <tbody>
                  {lineItems.map((li, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{li.description}</td>
                      <td className="p-2 text-right">{li.quantity}</td>
                      <td className="p-2 w-32">
                        <input 
                            type="number"
                            min="0"
                            max="100"
                            value={li.completion || 0}
                            onChange={(e) => {
                                const newItems = [...lineItems];
                                newItems[idx].completion = Number(e.target.value);
                                setLineItems(newItems);
                            }}
                            className="w-full text-right border rounded p-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-400 text-xs font-bold uppercase">Cancel</button>
                <button onClick={handleUpdateProgress} className="px-6 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center gap-2 uppercase">
                    <Save className="w-3 h-3" /> Save Progress
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
