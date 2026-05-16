import React, { useState, useEffect, useMemo } from 'react';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig, Page, PurchaseOrder } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { DriveUploadButton } from './common/DriveUploadButton';
import { SearchableSelect } from './common/SearchableSelect';
import { FileText, ShieldCheck, Download, ExternalLink, Calendar, Users, FileSignature, Cloud, FilePlus, X, LayoutGrid, List, Kanban, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export const ContractsRegistryView: React.FC<{ page: Page; costCenterId?: string | null }> = ({ page, costCenterId }) => {
  const { selectedProject } = useProject();
  const { formatAmount, baseCurrency } = useCurrency();
  const { t, isRtl } = useLanguage();
  const [contracts, setContracts] = useState<PurchaseOrder[]>([]);
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContractData, setNewContractData] = useState<Partial<PurchaseOrder>>({
    id: '', 
    contractId: '', // Manual Number
    status: 'Draft',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    supplier: '',
    description: '',
    masterFormat: costCenterId || '',
    wbsId: '',
    lineItems: []
  });
  const [isSaving, setIsSaving] = useState(false);

  // Filtered contracts based on costCenterId and archived status
  const filteredContracts = useMemo(() => {
    let result = contracts;

    if (!showArchived) {
      result = result.filter(c => c.status !== 'Archived');
    }

    if (costCenterId) {
      const normalizedPropId = String(costCenterId).replace(/^CC-/, '').replace(/^0+/, '');
      result = result.filter(po => {
        const cc = (po as any).costCenterId || po.masterFormat || '';
        const normalizedCc = String(cc).replace(/^CC-/, '').replace(/^0+/, '');
        return normalizedCc === normalizedPropId || normalizedCc.startsWith(normalizedPropId + '.');
      });
    }
    return result;
  }, [contracts, costCenterId, showArchived]);

  const contractConfig: EntityConfig = {
    id: 'purchase_orders',
    icon: FileSignature,
    collection: 'purchase_orders',
    label: 'Contract',
    columns: [
      { key: 'contractId', label: 'Contract Ref', type: 'string', render: (val) => <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[10px] font-black tracking-widest uppercase">{val || 'N/A'}</span> },
      { key: 'wbsId', label: 'WBS', type: 'string', render: (val) => <span className="px-3 py-1 bg-orange-100 text-slate-700 border border-orange-200 rounded-full text-[10px] font-black uppercase tracking-widest">{val || 'N/A'}</span> },
      { key: 'masterFormat', label: 'Cost Account', type: 'string' },
      { key: 'id', label: 'System ID', type: 'string', render: (val) => <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[10px] font-bold tracking-widest uppercase">{val}</span> },
      { key: 'date', label: 'Order Date', type: 'date' },
      { key: 'supplier', label: 'Suppliers', type: 'string' },
      { key: 'amount', label: 'Total', type: 'currency' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'completion', label: '% Completion', type: 'progress' },
       { key: 'draftDocUrl', label: 'Files', type: 'string', render: (val, row) => (
        <div className="flex items-center gap-1.5">
           {row.draftDocUrl && (
             <div className="flex items-center gap-1">
               <a 
                 href={row.draftDocUrl} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" 
                 title="Open Draft"
                 onClick={(e) => e.stopPropagation()}
               >
                 <ExternalLink className="w-4 h-4" />
               </a>
               {row.draftDocUrl.includes('/file/d/') && (
                 <a 
                   href={row.draftDocUrl.replace('/view', '/export?format=pdf').replace('/edit', '/export?format=pdf')} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="p-1.5 bg-blue-50 text-blue-400 rounded-lg hover:bg-blue-100 transition-colors" 
                   title="Download PDF"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <Download className="w-3 h-3" />
                 </a>
               )}
             </div>
           )}
           {row.contractDriveUrl && (
             <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-0.5">
               <a 
                 href={row.contractDriveUrl} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" 
                 title="Open Signed"
                 onClick={(e) => e.stopPropagation()}
               >
                 <ShieldCheck className="w-4 h-4" />
               </a>
               {row.contractDriveUrl.includes('/file/d/') && (
                 <a 
                   href={row.contractDriveUrl.replace('/view', '/view?export=download')} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="p-1.5 bg-emerald-50 text-emerald-400 rounded-lg hover:bg-emerald-100 transition-colors" 
                   title="Download"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <Download className="w-3 h-3" />
                 </a>
               )}
             </div>
           )}
           {!row.draftDocUrl && !row.contractDriveUrl && <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest pl-1">No Files</span>}
        </div>
      )}
    ]
  };

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snap) => {
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setAllPOs(allData);
      
      // Filter for contracts: >= 15M OR has a manual contractId
      const filtered = allData.filter(po => (po.amount || 0) >= 15000000 || po.contractId);
      setContracts(filtered);
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

  const handleDeleteContract = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'purchase_orders', id));
      toast.success('Contract deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete contract');
    }
  };

  const handleArchiveContract = async (id: string) => {
    try {
      const record = contracts.find(c => c.id === id);
      if (!record) return;
      const newStatus = record.status === 'Archived' ? 'Approved' : 'Archived';
      await updateDoc(doc(db, 'purchase_orders', id), { status: newStatus });
      toast.success(record.status === 'Archived' ? 'Contract restored' : 'Contract archived');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update contract status');
    }
  };

  const handleAddNew = () => {
    setNewContractData({
      id: '', // User will pick or type
      contractId: '', // Manual Ref
      status: 'Draft',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      supplier: '',
      description: '',
      masterFormat: costCenterId || '',
      wbsId: '',
      lineItems: []
    });
    setIsModalOpen(true);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!newContractData.supplier || !newContractData.id) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const contractData = {
        ...newContractData,
        projectId: selectedProject.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // If we are linking an existing PO, we update it. If it's a new ID, we create it.
      // But user said "link to PO", so if a PO is selected, we should use its ID.
      await setDoc(doc(db, 'purchase_orders', newContractData.id!), contractData);
      
      toast.success('Contract registered successfully');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to register contract');
    } finally {
      setIsSaving(false);
    }
  };

  const poOptions = useMemo(() => {
    return allPOs.map(po => ({
      id: po.id,
      name: `${po.id} - ${po.supplier} (${formatAmount(po.amount || 0)})`
    }));
  }, [allPOs, formatAmount]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Contracts...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div className="flex-1 p-6 z-0">
        <UniversalDataTable 
          config={contractConfig}
          data={filteredContracts}
          onRowClick={(po) => setEditingPO(po)}
          onDeleteRecord={handleDeleteContract}
          onArchiveRecord={(record) => handleArchiveContract(record.id)}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(!showArchived)}
          showAddButton={true}
          onNewClick={handleAddNew}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                  {isRtl ? 'سجل العقود المتكاملة' : 'Contracts Registry'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {isRtl ? 'إدارة واعتماد العقود من أوامر الشراء' : 'Integrated contracts system and repository'}
                </p>
              </div>
            </div>
          }
        />
      </div>

      {selectedPO && (
        <div className="absolute inset-0 z-[100] flex justify-end bg-slate-900/10 backdrop-blur-sm" onClick={() => setSelectedPO(null)}>
          <motion.div 
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
            onClick={e => e.stopPropagation()}
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
                      drivePath={`Financials_and_Procurements_6/Contracts/${costCenterId || 'General'}/${selectedPO.supplier.replace(/[^a-zA-Z0-9]/g, '_')}`}
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

      <AnimatePresence>
        {isModalOpen && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Register New Contract</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual initialization of legal binding</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateContract} className="p-10 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] space-y-4">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Link to Purchase Order (امر شراء)</label>
                  <SearchableSelect 
                    options={poOptions}
                    value={newContractData.id || ''}
                    onChange={(id) => {
                      const selected = allPOs.find(p => p.id === id);
                      if (selected) {
                        setNewContractData({
                          ...newContractData,
                          id: selected.id,
                          supplier: selected.supplier,
                          amount: selected.amount,
                          wbsId: selected.wbsId || '',
                          masterFormat: selected.masterFormat || costCenterId || '',
                          description: selected.name || selected.description || ''
                        });
                      } else {
                        setNewContractData({ ...newContractData, id });
                      }
                    }}
                    placeholder="Search existing POs in center..."
                  />
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest pl-1">
                    {newContractData.id ? `Linked to System ID: ${newContractData.id}` : 'Manual registration will create/override record'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Contract ID (رقم العقد المعتمد)</label>
                    <input 
                      type="text"
                      value={newContractData.contractId || ''}
                      onChange={e => setNewContractData({...newContractData, contractId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase tracking-widest"
                      placeholder="E.G. CON-01/2026"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input 
                      type="date"
                      value={newContractData.date}
                      onChange={e => setNewContractData({...newContractData, date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier / Contractor</label>
                    <input 
                      type="text"
                      value={newContractData.supplier}
                      readOnly={!!allPOs.find(p => p.id === newContractData.id)}
                      className={cn(
                        "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none transition-all",
                        allPOs.find(p => p.id === newContractData.id) ? "bg-slate-100 text-slate-500" : "bg-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                      )}
                      placeholder="Enter company name..."
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      value={newContractData.description}
                      onChange={e => setNewContractData({...newContractData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                      placeholder="Contract scope summary..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (IQD)</label>
                    <input 
                      type="number"
                      value={newContractData.amount}
                      readOnly={!!allPOs.find(p => p.id === newContractData.id)}
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl text-sm font-mono transition-all",
                        allPOs.find(p => p.id === newContractData.id) ? "bg-slate-800 text-blue-300 border-slate-700" : "bg-slate-900 text-blue-400 border-slate-800 focus:ring-4 focus:ring-blue-500/10"
                      )}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WBS Ref</label>
                    <input 
                      type="text"
                      value={newContractData.wbsId}
                      onChange={e => setNewContractData({...newContractData, wbsId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase tracking-tight"
                      placeholder="e.g. 5.1.1"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50">
                    {isSaving ? 'Creating...' : 'Register Contract'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingPO && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingPO(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <FileSignature className="w-6 h-6" />
                   </div>
                   <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Edit Contract Details</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: {editingPO.id}</p>
                  </div>
                </div>
                <button onClick={() => setEditingPO(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-10 space-y-8 overflow-y-auto max-h-[75vh]">
                {/* File Upload Section */}
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem] space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Draft Contract</span>
                         {editingPO.draftDocUrl && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>}
                      </div>
                      <DriveUploadButton
                        drivePath={`Financials_and_Procurements_6/Contracts/${costCenterId || 'General'}/${editingPO.supplier.replace(/[^a-zA-Z0-9]/g, '_')}`}
                        label={editingPO.draftDocUrl ? "Replace Draft" : "Upload Draft"}
                        onUploadSuccess={(fileId) => {
                           const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
                           handleUpdateContract(editingPO.id, { draftDocUrl: fileUrl });
                           setEditingPO({ ...editingPO, draftDocUrl: fileUrl });
                        }}
                      />
                   </div>

                   <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Signed PDF</span>
                         {editingPO.contractDriveUrl && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Signed</span>}
                      </div>
                      <DriveUploadButton
                        drivePath={`Financials_and_Procurements_6/Contracts/${costCenterId || 'General'}/${editingPO.supplier.replace(/[^a-zA-Z0-9]/g, '_')}`}
                        label={editingPO.contractDriveUrl ? "Replace PDF" : "Upload SIGNED"}
                        onUploadSuccess={(fileId) => {
                           const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
                           handleUpdateContract(editingPO.id, { contractDriveUrl: fileUrl, status: 'Signed' });
                           setEditingPO({ ...editingPO, contractDriveUrl: fileUrl, status: 'Signed' });
                        }}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official ID</label>
                    <input 
                      type="text"
                      value={editingPO.contractId || ''}
                      onChange={e => setEditingPO({...editingPO, contractId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      placeholder="E.G. CON-01/2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={editingPO.status}
                      onChange={e => setEditingPO({...editingPO, status: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Signed">Signed</option>
                      <option value="Approved">Approved</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      value={editingPO.description || ''}
                      onChange={e => setEditingPO({...editingPO, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setEditingPO(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Close</button>
                  <button 
                    onClick={() => {
                      handleUpdateContract(editingPO.id, editingPO);
                      setEditingPO(null);
                    }} 
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
