import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Activity, WBSLevel, PurchaseOrder, POLineItem } from '../types';

export type RollupLevel = 'lineItem' | 'po' | 'workPackage' | 'division' | 'floor' | 'building' | 'area' | 'zone';

const LEVEL_ORDER: RollupLevel[] = ['lineItem', 'po', 'workPackage', 'division', 'floor', 'building', 'area', 'zone'];

export async function rollupToParent(
  level: RollupLevel,
  parentId: string
) {
  if (!parentId) return;

  console.log(`Rolling up from level: ${level}, parentId: ${parentId}`);

  try {
    let plannedStart: string | null = null;
    let plannedFinish: string | null = null;
    let actualStart: string | null = null;
    let actualFinish: string | null = null;
    let plannedCost = 0;
    let actualCost = 0;
    let totalWeightedProgress = 0;
    let totalPlannedCostForProgress = 0;

    // 1. Fetch all children and calculate values
    if (level === 'lineItem') {
      // Parent is a PO
      const poDoc = await getDoc(doc(db, 'purchaseOrders', parentId));
      if (!poDoc.exists()) return;
      const po = poDoc.data() as PurchaseOrder;
      const children = po.lineItems || [];

      children.forEach(child => {
        // Line items don't have dates in the current type, but we might need them
        // For now, we use PO dates if line items don't have them
        plannedCost += child.amount || 0;
        // Actual cost for line item is amount * completion
        const childActualCost = (child.amount || 0) * ((child.completion || 0) / 100);
        actualCost += childActualCost;
        
        totalWeightedProgress += (child.amount || 0) * (child.completion || 0);
        totalPlannedCostForProgress += (child.amount || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? totalWeightedProgress / totalPlannedCostForProgress : 0;

      // Update PO
      await updateDoc(doc(db, 'purchaseOrders', parentId), {
        amount: plannedCost,
        actualCost: actualCost,
        completion: Math.round(progress)
      });

      // Continue rollup to Work Package
      if (po.workPackageId) {
        await rollupToParent('po', po.workPackageId);
      }
    } 
    else if (level === 'po') {
      // Parent is a Work Package (Activity)
      const q = query(collection(db, 'purchaseOrders'), where('workPackageId', '==', parentId));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(d => d.data() as PurchaseOrder);

      const parentDoc = await getDoc(doc(db, 'activities', parentId));
      const parentData = parentDoc.exists() ? parentDoc.data() as Activity : null;
      const manualPlannedCost = parentData?.amount || 0;
      const manualActualCost = parentData?.actualAmount || 0;

      children.forEach(child => {
        if (child.date) {
          if (!plannedStart || child.date < plannedStart) plannedStart = child.date;
          if (!plannedFinish || child.date > plannedFinish) plannedFinish = child.date;
        }
        if (child.actualStartDate) {
          if (!actualStart || child.actualStartDate < actualStart) actualStart = child.actualStartDate;
        }
        if (child.actualFinishDate) {
          if (!actualFinish || child.actualFinishDate > actualFinish) actualFinish = child.actualFinishDate;
        }

        plannedCost += child.amount || 0;
        actualCost += child.actualCost || 0;
        totalWeightedProgress += (child.amount || 0) * (child.completion || 0);
        totalPlannedCostForProgress += (child.amount || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? totalWeightedProgress / totalPlannedCostForProgress : 0;
      
      // Rule: plannedCost = max(manualCost, sum(children.plannedCost))
      const finalPlannedCost = Math.max(manualPlannedCost, plannedCost);
      // Rule: actualCost = sum(children.actualCost)
      const finalActualCost = actualCost;

      const updateData: any = {
        plannedCost: finalPlannedCost,
        actualAmount: finalActualCost,
        percentComplete: Math.round(progress)
      };

      if (plannedStart) updateData.startDate = plannedStart;
      if (plannedFinish) updateData.finishDate = plannedFinish;
      if (actualStart) updateData.actualStartDate = actualStart;
      if (actualFinish) updateData.actualFinishDate = actualFinish;

      if (plannedStart && plannedFinish) {
        const start = new Date(plannedStart);
        const finish = new Date(plannedFinish);
        updateData.duration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      await updateDoc(doc(db, 'activities', parentId), updateData);

      // Continue rollup to Division
      if (parentData?.division && parentData?.wbsId) {
        // Division is identified by (floorId + divisionCode)
        const divisionId = `${parentData.wbsId}-${parentData.division}`;
        await rollupToParent('workPackage', divisionId);
      }
    }
    else if (level === 'workPackage') {
      // Parent is a Division
      // Division documents are in 'wbs' collection with type 'Division'
      const q = query(collection(db, 'activities'), where('divisionId', '==', parentId));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(d => d.data() as Activity);

      const parentDoc = await getDoc(doc(db, 'wbs', parentId));
      const parentData = parentDoc.exists() ? parentDoc.data() as any : null;

      children.forEach(child => {
        if (child.startDate) {
          if (!plannedStart || child.startDate < plannedStart) plannedStart = child.startDate;
        }
        if (child.finishDate) {
          if (!plannedFinish || child.finishDate > plannedFinish) plannedFinish = child.finishDate;
        }
        if (child.actualStartDate) {
          if (!actualStart || child.actualStartDate < actualStart) actualStart = child.actualStartDate;
        }
        if (child.actualFinishDate) {
          if (!actualFinish || child.actualFinishDate > actualFinish) actualFinish = child.actualFinishDate;
        }

        plannedCost += child.plannedCost || child.amount || 0;
        actualCost += child.actualAmount || 0;
        totalWeightedProgress += (child.plannedCost || child.amount || 0) * (child.percentComplete || 0);
        totalPlannedCostForProgress += (child.plannedCost || child.amount || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? totalWeightedProgress / totalPlannedCostForProgress : 0;
      const finalPlannedCost = Math.max(parentData?.plannedCost || 0, plannedCost);

      const updateData: any = {
        plannedCost: finalPlannedCost,
        actualCost,
        progress: Math.round(progress)
      };

      if (plannedStart) updateData.plannedStart = plannedStart;
      if (plannedFinish) updateData.plannedFinish = plannedFinish;
      if (actualStart) updateData.actualStart = actualStart;
      if (actualFinish) updateData.actualFinish = actualFinish;

      if (plannedStart && plannedFinish) {
        const start = new Date(plannedStart);
        const finish = new Date(plannedFinish);
        updateData.plannedDuration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      await updateDoc(doc(db, 'wbs', parentId), updateData);

      if (parentData?.parentId) {
        await rollupToParent('division', parentData.parentId);
      }
    }
    else {
      // Parent is Floor, Building, Area, or Zone (all in 'wbs' collection)
      const q = query(collection(db, 'wbs'), where('parentId', '==', parentId));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(d => d.data() as any);

      const parentDoc = await getDoc(doc(db, 'wbs', parentId));
      const parentData = parentDoc.exists() ? parentDoc.data() as any : null;

      children.forEach(child => {
        if (child.plannedStart) {
          if (!plannedStart || child.plannedStart < plannedStart) plannedStart = child.plannedStart;
        }
        if (child.plannedFinish) {
          if (!plannedFinish || child.plannedFinish > plannedFinish) plannedFinish = child.plannedFinish;
        }
        if (child.actualStart) {
          if (!actualStart || child.actualStart < actualStart) actualStart = child.actualStart;
        }
        if (child.actualFinish) {
          if (!actualFinish || child.actualFinish > actualFinish) actualFinish = child.actualFinish;
        }

        plannedCost += child.plannedCost || 0;
        actualCost += child.actualCost || 0;
        totalWeightedProgress += (child.plannedCost || 0) * (child.progress || 0);
        totalPlannedCostForProgress += (child.plannedCost || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? totalWeightedProgress / totalPlannedCostForProgress : 0;
      const finalPlannedCost = Math.max(parentData?.plannedCost || 0, plannedCost);

      const updateData: any = {
        plannedCost: finalPlannedCost,
        actualCost,
        progress: Math.round(progress)
      };

      if (plannedStart) updateData.plannedStart = plannedStart;
      if (plannedFinish) updateData.plannedFinish = plannedFinish;
      if (actualStart) updateData.actualStart = actualStart;
      if (actualFinish) updateData.actualFinish = actualFinish;

      if (plannedStart && plannedFinish) {
        const start = new Date(plannedStart);
        const finish = new Date(plannedFinish);
        updateData.plannedDuration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      await updateDoc(doc(db, 'wbs', parentId), updateData);

      if (parentData?.parentId) {
        const currentLevelIndex = LEVEL_ORDER.indexOf(level);
        const nextLevel = LEVEL_ORDER[currentLevelIndex + 1];
        if (nextLevel) {
          await rollupToParent(nextLevel, parentData.parentId);
        }
      }
    }

  } catch (error) {
    console.error(`Error in rollupToParent at level ${level}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, 'rollup');
  }
}
