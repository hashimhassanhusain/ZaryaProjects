import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { Page, PurchaseRequest, WBSLevel, CostCenter, StandardItem } from '../types';
import { toast } from 'react-hot-toast';
import { addPurchaseRequest, approvePurchaseRequest, convertToPurchaseOrder, updatePurchaseRequest, deletePurchaseRequest } from '../services/procurementService';
import { getProjectWBS } from '../services/wbsService';
import { getCostCenters, getStandardItems } from '../services/masterDataService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Search, Upload, FileText, X } from 'lucide-react';
import { PRManagementDashboard } from './PRManagementDashboard';
import { UniversalDataTable } from './common/UniversalDataTable';
import { SearchableSelect } from './common/SearchableSelect';
import { cn } from '../lib/utils';

interface ProcurementWorkflowCenterProps {
  page: Page;
  costCenterId?: string | null;
}

export const ProcurementWorkflowCenter: React.FC<ProcurementWorkflowCenterProps> = ({ page, costCenterId }) => {
  const { t, isRtl } = useLanguage();
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
  const [priority, setPriority] = useState<'Low'|'Medium'|'High'|'Critical'>('High');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtered requests based on costCenterId
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (costCenterId) {
      const normalizedPropId = String(costCenterId).replace(/^CC-/, '').replace(/^0+/, '');
      result = result.filter(r => {
        const rawCC = r.costCenterId || (r as any).divisionCode || (r as any).cost_center_id || '';
        const rCcId = String(rawCC).replace(/^CC-/, '').replace(/^0+/, '');
        // Match normalized ID or if it starts with it (for child codes)
        return rCcId === normalizedPropId || (rCcId && rCcId.startsWith(normalizedPropId + '.'));
      });
    }
    return result.filter(r => showArchived ? true : r.status !== 'Archived');
  }, [requests, costCenterId, showArchived]);

  // Filtered Work Packages for the dropdown
  const filteredWorkPackages = useMemo(() => {
    const workPackages = wbsLevels.filter(w => w.type === 'Work Package');
    if (!costCenterId) return workPackages;
    
    const normalizedPropId = String(costCenterId).replace(/^CC-/, '').replace(/^0+/, '');
    
    return workPackages.filter(w => {
      const rawId = w.costCenterId || (w as any).divisionCode || (w as any).cost_center_id || '';
      const wCcId = String(rawId).replace(/^CC-/, '').replace(/^0+/, '');
      return wCcId === normalizedPropId || (wCcId && wCcId.startsWith(normalizedPropId + '.'));
    });
  }, [wbsLevels, costCenterId]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      status: 'Pending',
      approvals: [],
      workPackageId,
      currency,
      exchangeRate,
      priority,
      date,
      costCenterId: selectedWP.costCenterId || (selectedWP as any).divisionCode || costCenterId || 'N/A',
      standardItemId: selectedWP.standardItemId || 'N/A',
      tenderLog: [`[${new Date().toLocaleString()}] PR ADDED`],
      bidders: [],
      boqItems: []
    };

    await addPurchaseRequest(prData);
    toast.success('PR Added Successfully');
    setIsModalOpen(false);
    // Reset form
    setPrName('');
    setWorkPackageId('');
    setPriority('High');
  };

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 relative">
      {isModalOpen ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
             <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                 >
                   <X className="w-5 h-5 text-slate-500" />
                 </button>
                 <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">New Purchase Request</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Complete the requisition details below</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <button 
                   type="button" 
                   onClick={() => setIsModalOpen(false)} 
                   className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-colors text-[10px] uppercase tracking-widest"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => handleSubmit()}
                   className="px-6 py-2.5 bg-[#ff6d00] hover:bg-[#ff6d00]/90 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                 >
                   ADD
                 </button>
               </div>
             </div>
             
              <div className="flex-1 overflow-y-auto p-8 lg:p-12">
               <div className="max-w-3xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Requisition Name</label>
                        <input 
                          value={prName} 
                          onChange={e => setPrName(e.target.value)} 
                          placeholder="e.g. Concrete Materials Q3" 
                          required 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:text-slate-300" 
                        />
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Currency Selection</label>
                        <select 
                          value={currency} 
                          onChange={e => setCurrency(e.target.value as any)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="IQD">IQD - Iraqi Dinar</option>
                            <option value="USD">USD - US Dollar</option>
                        </select>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Exchange Rate (To Base)</label>
                        <input 
                          type="number" 
                          value={exchangeRate} 
                          onChange={e => setExchangeRate(Number(e.target.value))} 
                          placeholder="Exchange Rate" 
                          required 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Priority Level</label>
                        <select 
                          value={priority} 
                          onChange={e => setPriority(e.target.value as any)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Target Date</label>
                        <input 
                          type="date" 
                          value={date} 
                          onChange={e => setDate(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                        />
                     </div>

                     <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Work Package Association</label>
                        <SearchableSelect
                          options={filteredWorkPackages.map(w => ({ id: w.id, name: `${w.code} - ${w.title}` }))}
                          value={workPackageId}
                          onChange={(val) => setWorkPackageId(val)}
                          onAddClick={async () => {
                            const title = window.prompt('Enter New Work Package Title:');
                            if (title && selectedProject) {
                              const code = window.prompt('Enter Package Code (e.g. WP-001):');
                              try {
                                const docRef = await addDoc(collection(db, 'wbs'), {
                                  projectId: selectedProject.id,
                                  title,
                                  code: code || 'WP-' + Date.now().toString().slice(-4),
                                  type: 'Work Package',
                                  costCenterId: costCenterId || 'CC-01',
                                  createdAt: serverTimestamp()
                                });
                                setWbsLevels([...wbsLevels, { id: docRef.id, title, code: code || '', type: 'Work Package', projectId: selectedProject.id, costCenterId: costCenterId || 'CC-01' } as any]);
                                setWorkPackageId(docRef.id);
                                toast.success('Work Package added and selected');
                              } catch (err) {
                                console.error(err);
                                toast.error('Failed to add Work Package');
                              }
                            }
                          }}
                          placeholder="Select Work Package"
                        />
                     </div>
                  </div>

                  {selectedWP && (
                      <div className="bg-slate-900 rounded-lg p-8 text-white relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Cost Center</p>
                                <p className="text-xl font-black text-white italic">{costCenter?.name || 'N/A'}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{costCenter?.code || 'NO-CODE'}</p>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Standard Item</p>
                                <p className="text-xl font-black text-white italic">{standardItem?.name || 'N/A'}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{standardItem?.code || 'NO-REF'}</p>
                             </div>
                          </div>
                      </div>
                  )}

                  <div className="p-8 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document attachments will be available after creation</p>
                  </div>
               </div>
             </div>
          </div>
      ) : selectedPR ? (
          <div className="w-full h-full flex flex-col bg-white">
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
               <button 
                 onClick={() => setSelectedPR(null)}
                 className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors"
               >
                 Purchase Requisitions
               </button>
               <span className="text-slate-300 text-xs font-light">/</span>
               <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest truncate">
                 {selectedPR.prName} ({selectedPR.id?.slice(-6).toUpperCase()})
               </span>
            </div>
            <div className="flex-1 overflow-y-auto">
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
          <div className="w-full flex-1 flex flex-col bg-paper relative pb-[20vh]">
            <div className="flex-1 p-8 lg:p-12 relative z-10">
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
                data={filteredRequests}
                onRowClick={(row) => setSelectedPR(row as PurchaseRequest)}
                onDeleteRecord={(id) => deletePurchaseRequest(id)}
                title={
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                        {isRtl ? 'سجل طلبات الشراء' : 'PR Registry'}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {isRtl ? 'إدارة وتتبع طلبات الشراء الداخلية' : 'Track and manage internal purchase requests'}
                      </p>
                    </div>
                  </div>
                }
                onNewClick={() => setIsModalOpen(true)}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
                onArchiveRecord={(req) => {
                  updatePurchaseRequest(req.id!, { status: 'Archived' });
                  toast.success('Record moved to archive');
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
};
