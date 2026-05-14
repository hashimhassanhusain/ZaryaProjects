import React, { useState, useEffect } from 'react';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig, Page, PurchaseOrder } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { DriveUploadButton } from './common/DriveUploadButton';
import { FileText, ShieldCheck, Download, ExternalLink, Calendar, Users, FileSignature, Cloud, FilePlus, X, LayoutGrid, List, Kanban } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export const ContractsRegistryView: React.FC<{ page: Page }> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatAmount, baseCurrency } = useCurrency();
  const { t } = useLanguage();
  const [contracts, setContracts] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const contractConfig: EntityConfig = {
    id: 'purchase_orders',
    icon: FileSignature,
    collection: 'purchase_orders',
    label: 'Contract',
    columns: [
      { key: 'wbsId', label: 'WBS', type: 'string', render: (val) => <span className="px-3 py-1 bg-orange-100 text-[#FF5F00] border border-orange-200 rounded-full text-[10px] font-black uppercase tracking-widest">{val || 'N/A'}</span> },
      { key: 'masterFormat', label: 'Cost Account', type: 'string' },
      { key: 'activityId', label: 'Activity', type: 'string' },
      { key: 'id', label: 'Order / Contract', type: 'string', render: (val) => <span className="px-3 py-1 bg-orange-50 border border-orange-200 text-[#FF5F00] rounded-full text-[10px] font-black tracking-widest uppercase">{val}</span> },
      { key: 'date', label: 'Order Date', type: 'date' },
      { key: 'supplier', label: 'Suppliers', type: 'string' },
      { key: 'amount', label: 'Total', type: 'currency' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'completion', label: '% Completion', type: 'progress' },
      { key: 'draftDocUrl', label: 'Draft Contract', type: 'string', render: (val, row) => (
         <div className="flex items-center gap-3">
            {val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 font-bold"><ExternalLink className="w-3 h-3" /> Link</a> : <span className="text-slate-400 italic">None</span>}
            <button onClick={(e) => { e.stopPropagation(); setSelectedPO({ ...row, _target: 'draft' } as any); }} className="p-1 hover:bg-blue-50 rounded text-blue-600"><FilePlus className="w-4 h-4" /></button>
         </div>
      )},
      { key: 'contractDriveUrl', label: 'Signed PDF', type: 'string', render: (val, row) => (
         <div className="flex items-center gap-3">
            {val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 font-bold"><ExternalLink className="w-3 h-3" /> PDF</a> : <span className="text-slate-400 italic">None</span>}
            <button onClick={(e) => { e.stopPropagation(); setSelectedPO({ ...row, _target: 'pdf' } as any); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600"><Cloud className="w-4 h-4" /></button>
         </div>
      )}
    ]
  };

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snap) => {
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      // Filter for contracts only (>= 15,000,000 IQD)
      const filteredContracts = allData.filter(po => (po.amount || 0) >= 15000000);
      setContracts(filteredContracts);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject]);

  const handleUpdateContract = async (poId: string, updates: Partial<PurchaseOrder>) => {
    try {
      await updateDoc(doc(db, 'purchase_orders', poId), updates);
      toast.success('Contract updated successfully');
      setSelectedPO(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update contract');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Contracts...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div className="flex-1 p-6 z-0">
        <UniversalDataTable 
          config={contractConfig}
          data={contracts}
          onRowClick={(po) => {}}
          onDeleteRecord={async (id) => {
             // Optional: allow delete or omit
          }}
          showAddButton={false}
          title={
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 not-italic normal-case">Contracts Registry</h3>
              </div>
            </div>
          }
          favoriteControl={
            <div className="text-[10px] font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg uppercase tracking-widest">
              {contracts.length} Integrated Contracts
            </div>
          }
        />
      </div>

      {selectedPO && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {(selectedPO as any)._target === 'draft' ? 'Upload Contract Draft' : 'Upload Signed PDF'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">PO: {selectedPO.id}</p>
              </div>
              <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
               <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600">
                     {(selectedPO as any)._target === 'draft' ? <FileText className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Automated Drive Sync</h4>
                    <p className="text-xs text-slate-500 mt-1 px-4 leading-relaxed">
                      Files will be verified and stored in the project's root Google Drive directory under Contracts & Procurement.
                    </p>
                  </div>

                  <div className="mt-2 text-center w-full flex justify-center">
                    <DriveUploadButton
                      drivePath={`Financials_and_Procurements_6/Contracts/${selectedPO.supplier.replace(/[^a-zA-Z0-9]/g, '_')}`}
                      label="Select & Upload File"
                      onUploadSuccess={(fileId) => {
                         const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
                         if ((selectedPO as any)._target === 'draft') {
                           handleUpdateContract(selectedPO.id, { draftDocUrl: fileUrl });
                         } else {
                           handleUpdateContract(selectedPO.id, { contractDriveUrl: fileUrl });
                         }
                      }}
                    />
                  </div>
               </div>

               {(selectedPO as any)._target === 'draft' && (
                 <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                   <h4 className="text-xs font-bold text-slate-900 mb-2">Or Provide Google Doc Link</h4>
                   <form onSubmit={(e) => {
                     e.preventDefault();
                     const formData = new FormData(e.currentTarget);
                     const url = formData.get('docUrl') as string;
                     if (url) {
                       handleUpdateContract(selectedPO.id, { draftDocUrl: url });
                     }
                   }} className="flex flex-col gap-2">
                     <input type="url" name="docUrl" placeholder="https://docs.google.com/..." className="p-2 border border-slate-300 rounded-lg text-sm w-full" required />
                     <button type="submit" className="bg-slate-900 text-white font-bold py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors">
                       Save Link
                     </button>
                   </form>
                 </div>
               )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
