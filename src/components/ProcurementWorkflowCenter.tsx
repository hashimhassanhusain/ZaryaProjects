import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Page, PurchaseRequest, WBSLevel, CostCenter, StandardItem } from '../types';
import { toast } from 'react-hot-toast';
import { addPurchaseRequest, approvePurchaseRequest, convertToPurchaseOrder, updatePurchaseRequest, deletePurchaseRequest } from '../services/procurementService';
import { getProjectWBS } from '../services/wbsService';
import { getCostCenters, getStandardItems } from '../services/masterDataService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { PRManagementDashboard } from './PRManagementDashboard';

interface ProcurementWorkflowCenterProps {
  page: Page;
}

export const ProcurementWorkflowCenter: React.FC<ProcurementWorkflowCenterProps> = ({ page }) => {
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
          <PRManagementDashboard 
            pr={selectedPR} 
            onBack={() => setSelectedPR(null)} 
            onArchive={() => { updatePurchaseRequest(selectedPR.id!, {status: 'Archived'}); setSelectedPR(null); }}
            onConvertToPO={() => { convertToPurchaseOrder(selectedPR.id!); setSelectedPR(null); }}
            onDelete={async () => { await deletePurchaseRequest(selectedPR.id!); setSelectedPR(null); }}
          />
      ) : (
          <div style={{ padding: '40px', backgroundColor: '#f0f0f0', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ color: '#1a1a1a', fontWeight: 'bold' }}>PURCHASE REQUISITIONS</h1>
                <button 
                onClick={() => setIsModalOpen(true)}
                style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                + PR
                </button>
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label>
                    <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} /> Show Archived PRs
                </label>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>PR #</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Action</th>
                </tr>
                </thead>
                <tbody>
                {requests.filter(r => showArchived ? true : r.status !== 'Archived').map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => setSelectedPR(req)}>
                    <td style={{ padding: '12px' }}>{req.id?.slice(-6) || 'NEW'}</td>
                    <td style={{ padding: '12px' }}>{req.prName}</td>
                    <td style={{ padding: '12px' }}>{req.status}</td>
                    <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
                        {req.status === 'Approved' && (
                            <button 
                            onClick={() => convertToPurchaseOrder(req.id!)} 
                            style={{ padding: '4px 8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                            >
                            Convert to PO
                            </button>
                        )}
                        {req.status !== 'Approved' && req.status !== 'Archived' && (
                            <button onClick={()=>updatePurchaseRequest(req.id!, {status: 'Approved'})} style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '10px' }}>Approve</button>
                        )}
                        {req.status !== 'Archived' ? (
                            <button onClick={()=>updatePurchaseRequest(req.id!, {status: 'Archived'})} style={{ padding: '4px 8px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '10px' }}>Archive</button>
                        ) : (
                            <button onClick={()=>deletePurchaseRequest(req.id!)} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '10px' }}>Delete</button>
                        )}
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '500px' }}>
                    <h2 style={{ marginBottom: '20px' }}>New Purchase Request</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input value={prName} onChange={e => setPrName(e.target.value)} placeholder="Purchase Requisition Name" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <select value={currency} onChange={e => setCurrency(e.target.value as any)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="IQD">IQD</option>
                            <option value="USD">USD</option>
                        </select>
                        <input type="number" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} placeholder="Exchange Rate" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>

                    <select value={workPackageId} onChange={e => setWorkPackageId(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value="">Select Work Package</option>
                        {wbsLevels.map(w => <option key={w.id} value={w.id}>{w.code} - {w.title}</option>)}
                    </select>

                    {selectedWP && (
                        <div style={{ fontSize: '12px', color: '#666', background: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                            <strong>Cost Center:</strong> {costCenter?.name || 'N/A'}<br/>
                            <strong>Standard Item:</strong> {standardItem?.name || 'N/A'}
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px' }}>Cancel</button>
                        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none' }}>Submit PR</button>
                    </div>
                    </form>
                </div>
                </div>
            )}
        </div>
      )}
    </>
  );
};
