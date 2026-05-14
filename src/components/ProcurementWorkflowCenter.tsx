import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { Page, PurchaseRequest, WBSLevel, CostCenter, StandardItem } from '../types';
import { toast } from 'react-hot-toast';
import { addPurchaseRequest, approvePurchaseRequest, convertToPurchaseOrder, updatePurchaseRequest, deletePurchaseRequest } from '../services/procurementService';
import { getProjectWBS } from '../services/wbsService';
import { getCostCenters, getStandardItems } from '../services/masterDataService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Plus, Search, Upload } from 'lucide-react';
import { PRManagementDashboard } from './PRManagementDashboard';
import { UniversalDataTable } from './common/UniversalDataTable';

interface ProcurementWorkflowCenterProps {
  page: Page;
}

export const ProcurementWorkflowCenter: React.FC<ProcurementWorkflowCenterProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [standardItems, setStandardItems] = useState<StandardItem[]>([]);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);

  const [prName, setPrName] = useState('');
  const [workPackageId, setWorkPackageId] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [exchangeRate, setExchangeRate] = useState(1);

  // Derived state
  const selectedWP = useMemo(() => wbsLevels.find(w => w.id === workPackageId), [workPackageId, wbsLevels]);
  const costCenter = useMemo(() => selectedWP?.costCenterId ? costCenters.find(cc => cc.id === selectedWP.costCenterId) : null, [selectedWP, costCenters]);
  const standardItem = useMemo(() => selectedWP?.standardItemId ? standardItems.find(si => si.id === selectedWP.standardItemId) : null, [selectedWP, standardItems]);

  useEffect(() => {
    if (selectedProject) {
      getProjectWBS(selectedProject.id).then(setWbsLevels);
      getCostCenters().then(setCostCenters);
      getStandardItems().then(setStandardItems);

      const q = query(collection(db, 'purchase_requests'), where('projectId', '==', selectedProject.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRequest));
        setRequests(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'purchase_requests');
      });
      return () => unsubscribe();
    }
  }, [selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prName || !workPackageId || !selectedWP) {
      toast.error("Please fill all required fields.");
      return;
    }

    const prData: PurchaseRequest = {
      projectId: selectedProject?.id || 'unknown',
      requestorId: 'current-user-id',
      description: prName,
      prName,
      amount: 0, 
      status: 'Draft',
      approvals: [],
      workPackageId,
      currency,
      exchangeRate,
      costCenterId: selectedWP.costCenterId || 'N/A',
      standardItemId: selectedWP.standardItemId || 'N/A',
    };

    await addPurchaseRequest(prData);
    toast.success('PR Created');
    setIsModalOpen(false);
    // Reset form
    setPrName('');
    setWorkPackageId('');
  };

  return (
    <>
      {selectedPR ? (
          <div className="h-full flex flex-col bg-white">
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
               <button 
                 onClick={() => setSelectedPR(null)}
                 className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#FF5F00] transition-colors"
               >
                 Purchase Requisitions
               </button>
               <span className="text-slate-300 text-xs font-light">/</span>
               <span className="text-[9px] font-black text-[#FF5F00] uppercase tracking-widest truncate">
                 {selectedPR.prName} ({selectedPR.id?.slice(-6).toUpperCase()})
               </span>
            </div>
            <div className="flex-1 overflow-hidden">
                <PRManagementDashboard 
                  pr={selectedPR} 
                  onBack={() => setSelectedPR(null)} 
                  onArchive={() => { updatePurchaseRequest(selectedPR.id!, {status: 'Archived'}); setSelectedPR(null); }}
                  onConvertToPO={() => { convertToPurchaseOrder(selectedPR.id!); setSelectedPR(null); }}
                  onDelete={async () => { await deletePurchaseRequest(selectedPR.id!); setSelectedPR(null); }}
                />
            </div>
          </div>
      ) : (
          <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 p-6 overflow-hidden">
              <UniversalDataTable
                config={{
                  collection: 'purchase_requests',
                  label: 'PR',
                  columns: [
                    { key: 'action', label: 'Action Hub', type: 'text', render: (_, req) => (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {req.status === 'Approved' && (
                                <button onClick={() => convertToPurchaseOrder(req.id!)} className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded text-[9px] uppercase tracking-tighter transition-colors">
                                TO PO
                                </button>
                            )}
                            {req.status !== 'Approved' && req.status !== 'Archived' && (
                                <button onClick={()=>updatePurchaseRequest(req.id!, {status: 'Approved'})} className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded text-[9px] uppercase tracking-tighter transition-colors">APPROVE</button>
                            )}
                            {req.status !== 'Archived' ? (
                                <button onClick={()=>updatePurchaseRequest(req.id!, {status: 'Archived'})} className="px-2 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 font-bold rounded text-[9px] uppercase tracking-tighter transition-colors">ARCHIVE</button>
                            ) : (
                                <button onClick={()=>deletePurchaseRequest(req.id!)} className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded text-[9px] uppercase tracking-tighter transition-colors">DELETE</button>
                            )}
                        </div>
                    ) },
                    { key: 'idRef', label: 'PR Reference', type: 'text', render: (_, req) => (
                      <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {req.id?.slice(-6).toUpperCase() || 'NEW'}
                      </span>
                    ) },
                    { key: 'desc', label: 'Description & Context', type: 'text', render: (_, req) => (
                      <>
                        <div className="font-bold text-slate-800 text-xs leading-none">{req.prName}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5 line-clamp-1">{req.description || 'No extended description'}</div>
                      </>
                    ) },
                    { key: 'status', label: 'Life Cycle', type: 'status', render: (val) => (
                       <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                         val === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                         val === 'Archived' ? 'bg-slate-100 text-slate-500' :
                         'bg-amber-100 text-amber-700'
                       }`}>
                         {val}
                       </span>
                    ) }
                  ]
                }}
                data={requests.filter(r => showArchived ? true : r.status !== 'Archived')}
                onRowClick={(row) => setSelectedPR(row as PurchaseRequest)}
                onDeleteRecord={(id) => deletePurchaseRequest(id)}
                title="Purchase Requisitions (PR)"
                description="Track and manage internal purchase requests before tendering."
                extraActions={
                  <label className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-100 dark:border-white/5">
                      <input 
                        type="checkbox" 
                        checked={showArchived} 
                        onChange={() => setShowArchived(!showArchived)} 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3" 
                      /> 
                      Show Archived
                  </label>
                }
                primaryAction={{
                  label: 'Create PR',
                  icon: Plus,
                  onClick: () => setIsModalOpen(true)
                }}
              />
            </div>
          </div>
        )}
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                  <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-900">New Purchase Request</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                      </div>
                      
                      <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Requisition Name</label>
                        <input value={prName} onChange={e => setPrName(e.target.value)} placeholder="e.g. Concrete Materials Q3" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Currency</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all">
                                <option value="IQD">IQD (Dinar)</option>
                                <option value="USD">USD (Dollar)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Exchange Rate</label>
                            <input type="number" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} placeholder="Exchange Rate" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400" />
                          </div>
                      </div>
  
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Work Package Association</label>
                        <select value={workPackageId} onChange={e => setWorkPackageId(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all">
                            <option value="">Select Work Package</option>
                            {wbsLevels.map(w => <option key={w.id} value={w.id}>{w.code} - {w.title}</option>)}
                        </select>
                      </div>
  
                      {selectedWP && (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm mt-2">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-100">
                                <strong className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cost Center</strong> 
                                <span className="font-bold text-blue-900">{costCenter?.name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <strong className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Standard Item</strong> 
                                <span className="font-bold text-blue-900 opacity-70">{standardItem?.name || 'N/A'}</span>
                              </div>
                          </div>
                      )}
                      
                      <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-sm uppercase tracking-widest">Cancel</button>
                          <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm uppercase tracking-widest">Submit PR</button>
                      </div>
                      </form>
                  </div>
                </div>
            )}
    </>
  );
};
