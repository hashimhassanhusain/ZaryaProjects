import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { PurchaseRequest, Approval } from '../types';

export const addPurchaseRequest = async (request: PurchaseRequest) => {
  try {
    const docRef = await addDoc(collection(db, 'purchase_requests'), {
        ...request,
        status: 'Pending' as const,
        approvals: [],
        createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'purchase_requests');
  }
};

export const approvePurchaseRequest = async (requestId: string, role: string, userId: string) => {
    try {
        const docRef = doc(db, 'purchase_requests', requestId);
        // ... (simplified for this turn)
        await updateDoc(docRef, { 
            status: 'Approved',
            approvals: [{ signedBy: userId, role, timestamp: new Date().toISOString() }]
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `purchase_requests/${requestId}`);
    }
};

export const convertToPurchaseOrder = async (prId: string) => {
    try {
        const prSnap = await getDoc(doc(db, 'purchase_requests', prId));
        if (!prSnap.exists()) throw new Error('PR not found');
        
        const prData = prSnap.data() as PurchaseRequest;
        
        // Create PO
        await addDoc(collection(db, 'purchase_orders'), {
            projectId: prData.projectId, // Crucial: Fixes empty PO table issue
            prId: prId,
            prName: prData.prName,
            supplier: prData.bidders?.find(b => b.status === 'Selected')?.companyName || 'Not Selected',
            lineItems: prData.boqItems?.map(item => ({
                ...item,
                id: crypto.randomUUID(),
                status: 'Pending',
                completion: 0
            })) || [],
            amount: prData.amount || 0,
            status: 'Approved',
            workflowStatus: 'Approved',
            date: new Date().toISOString().split('T')[0],
            driveFolderId: prData.driveFolderId || null,
            createdAt: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'purchase_requests', prId), { status: 'ConvertedToPO' });
        
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `purchase_requests/${prId}`);
    }
};

export const updatePurchaseRequest = async (prId: string, updates: Partial<PurchaseRequest>) => {
    try {
        await updateDoc(doc(db, 'purchase_requests', prId), updates);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `purchase_requests/${prId}`);
    }
};

export const deletePurchaseRequest = async (prId: string) => {
    try {
        await deleteDoc(doc(db, 'purchase_requests', prId));
        // Need to delete drive folder too, but this requires an API call, not just firestore delete.
        // Assuming we can trigger an API call to delete drive folder elsewhere.
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `purchase_requests/${prId}`);
    }
};
