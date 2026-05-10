import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { WBSLevel, Activity } from '../types';

/**
 * Service for managing the spatial Work Breakdown Structure (WBS).
 */

export const getProjectWBS = async (projectId: string): Promise<WBSLevel[]> => {
  try {
    const q = query(
      collection(db, 'wbs'),
      where('projectId', '==', projectId)
    );
    
    const snap = await getDocs(q);
    const levels = snap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel));
    
    // Directive: Strip out any Cost Center branches. 
    // We only keep spatial/deliverable-oriented nodes.
    const deliverableTypes = ['Zone', 'Area', 'Building', 'Floor', 'Work Package', 'Deliverable', 'Phase'];
    
    return levels.filter(l => deliverableTypes.includes(l.type));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'wbs');
    return [];
  }
};

/**
 * Multi-dimensional Financial Aggregation logic.
 */

interface FinancialMatrix {
  deliverableCosts: Record<string, number>; // Grouped by WBS ID
  costCenterCosts: Record<string, number>; // Grouped by Cost Center ID
}

export const calculateFinancialMatrix = async (projectId: string): Promise<FinancialMatrix> => {
  try {
    const q = query(
      collection(db, 'purchase_orders'),
      where('projectId', '==', projectId)
    );
    
    const snap = await getDocs(q);
    const pos = snap.docs.map(d => d.data());
    
    const matrix: FinancialMatrix = {
      deliverableCosts: {},
      costCenterCosts: {}
    };
    
    pos.forEach(po => {
      const lineItems = po.lineItems || [];
      lineItems.forEach((li: any) => {
        const amount = li.amount || 0;
        
        // Group by Deliverable (Work Package)
        if (li.workPackageId) {
          matrix.deliverableCosts[li.workPackageId] = (matrix.deliverableCosts[li.workPackageId] || 0) + amount;
        } else if (po.workPackageId) {
          // Fallback to PO level WP link
          matrix.deliverableCosts[po.workPackageId] = (matrix.deliverableCosts[po.workPackageId] || 0) + amount;
        }
        
        // Group by Cost Center
        if (li.costCenterId) {
          matrix.costCenterCosts[li.costCenterId] = (matrix.costCenterCosts[li.costCenterId] || 0) + amount;
        } else if (po.costCenterId) {
          // Fallback to PO level CC link
          matrix.costCenterCosts[po.costCenterId] = (matrix.costCenterCosts[po.costCenterId] || 0) + amount;
        }
      });
    });
    
    return matrix;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'financial_aggregation');
    return { deliverableCosts: {}, costCenterCosts: {} };
  }
};
