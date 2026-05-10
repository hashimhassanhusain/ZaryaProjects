import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PurchaseOrder, WBSLevel, CostCenter } from '../types';
import toast from 'react-hot-toast';

interface POMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pos: PurchaseOrder[];
  wbsLevels: WBSLevel[];
  costCenters: CostCenter[];
}

export const POMigrationModal: React.FC<POMigrationModalProps> = ({ isOpen, onClose, pos, wbsLevels, costCenters }) => {
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  const orphanedPOs = useMemo(() => pos.filter(po => !po.workPackageId || !wbsLevels.some(w => w.id === po.workPackageId)), [pos, wbsLevels]);

  const handleUpdate = async (poId: string, workPackageId: string, costCenterId: string) => {
    try {
      const ref = doc(db, 'purchase_orders', poId);
      await updateDoc(ref, { workPackageId, costCenterId });
      toast.success('PO Migrated Successfully');
      setEditingPO(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'purchase_orders');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black uppercase text-slate-800">Orphaned PO Migration Tool</h2>
              <button onClick={onClose}><X className="text-slate-400 hover:text-red-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {orphanedPOs.length === 0 ? <p className="text-slate-500">No orphaned POs found.</p> : (
                <table className="w-full text-xs font-bold text-slate-600">
                  <thead className="border-b">
                    <tr><th className="p-2">PO ID</th><th className="p-2">Supplier</th><th className="p-2">New WP</th><th className="p-2">New CC</th><th className="p-2">Action</th></tr>
                  </thead>
                  <tbody>
                    {orphanedPOs.map(po => (
                      <tr key={po.id} className="border-b">
                        <td className="p-2">{po.id}</td>
                        <td className="p-2">{po.supplier}</td>
                        <td className="p-2">
                          <select className="border p-1 w-full" onChange={e => setEditingPO({...po, workPackageId: e.target.value})}>
                            <option value="">Select WP</option>
                            {wbsLevels.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <select className="border p-1 w-full" onChange={e => setEditingPO({...po, lineItems: po.lineItems.map(li => ({...li, costCenterId: e.target.value}))})}>
                            <option value="">Select CC</option>
                            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <button onClick={() => editingPO && handleUpdate(po.id, editingPO.workPackageId, editingPO.lineItems[0].costCenterId || '')} className="bg-blue-600 text-white px-2 py-1 rounded"><Save className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
