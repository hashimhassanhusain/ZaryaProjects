import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Activity, WBSLevel, PurchaseOrder, POLineItem } from '../types';

export type RollupLevel = 'lineItem' | 'po' | 'workPackage' | 'division' | 'floor' | 'building' | 'area' | 'zone';

const LEVEL_ORDER: RollupLevel[] = ['lineItem', 'po', 'workPackage', 'division', 'floor', 'building', 'area', 'zone'];

export function deriveStatus(progress: number, actualStart?: string | null, actualFinish?: string | null): string {
  if (actualFinish || progress >= 100) return 'Completed';
  if (actualStart || progress > 0) return 'In Progress';
  return 'Not Started';
}

export async function rollupToParent(
  level: RollupLevel,
  parentId: string
) {
  if (!parentId) return;

  console.log(`[Rollup] Executing rollup for ${level} -> parentId: ${parentId}`);

  try {
    let plannedStart: string | null = null;
    let plannedFinish: string | null = null;
    let actualStart: string | null = null;
    let actualFinish: string | null = null;
    let plannedCost = 0;
    let actualCost = 0;
    let totalWeightedProgress = 0;
    let totalPlannedCostForProgress = 0;

    // 1. Fetch children based on level
    if (level === 'lineItem') {
      // Parent is a Purchase Order (PO)
      const poRef = doc(db, 'purchase_orders', parentId);
      const poDoc = await getDoc(poRef);
      if (!poDoc.exists()) return;
      
      const po = poDoc.data() as PurchaseOrder;
      const children = po.lineItems || [];

      children.forEach(child => {
        plannedCost += child.amount || 0;
        const completion = child.completion || 0;
        const childActualCost = (child.amount || 0) * (completion / 100);
        actualCost += childActualCost;
        
        totalWeightedProgress += (child.amount || 0) * completion;
        totalPlannedCostForProgress += (child.amount || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
      const status = deriveStatus(progress, po.actualStartDate, po.actualFinishDate);

      // Update PO
      await updateDoc(poRef, {
        amount: plannedCost,
        actualCost: actualCost,
        completion: progress,
        status: status,
        updatedAt: new Date().toISOString()
      });

      // Continue rollup to Activity (Work Package level in schedule)
      if (po.activityId) {
        await rollupToParent('po', po.activityId);
      }
    } 
    else if (level === 'po') {
      // Parent is an Activity
      const parentRef = doc(db, 'activities', parentId);
      const parentDoc = await getDoc(parentRef);
      if (!parentDoc.exists()) return;

      const parentData = parentDoc.data() as Activity;
      
      // Get all POs for this activity
      const q = query(collection(db, 'purchase_orders'), where('activityId', '==', parentId));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(d => d.data() as PurchaseOrder);

      const manualPlannedCost = parentData.amount || 0; // The BOQ amount

      children.forEach(child => {
        // Dates rollup
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

      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
      // Rule: parent.plannedCost = max(manualCost, sum(children.plannedCost))
      const finalPlannedCost = Math.max(manualPlannedCost, plannedCost);
      const status = deriveStatus(progress, actualStart, actualFinish);

      const updateData: any = {
        plannedCost: finalPlannedCost,
        actualAmount: actualCost,
        percentComplete: progress,
        status: status,
        updatedAt: new Date().toISOString()
      };

      if (plannedStart) updateData.startDate = plannedStart;
      if (plannedFinish) updateData.finishDate = plannedFinish;
      if (actualStart) updateData.actualStartDate = actualStart;
      if (actualFinish) updateData.actualFinishDate = actualFinish;

      if (plannedStart && plannedFinish) {
        const start = new Date(plannedStart);
        const finish = new Date(plannedFinish);
        updateData.duration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      }

      await updateDoc(parentRef, updateData);

      // Continue rollup to WBS node (could be divisionId or a direct parent wbsId)
      // Usually activities are linked to a WBS node via wbsId or divisionId
      const nextParentId = parentData.divisionId || parentData.wbsId;
      if (nextParentId) {
        await rollupToParent('workPackage', nextParentId);
      }
    }
    else {
      // Parent is a WBS Level (Division, Cost Account, Floor, Building, Area, Zone)
      const parentRef = doc(db, 'wbs', parentId);
      const parentDoc = await getDoc(parentRef);
      if (!parentDoc.exists()) return;

      const parentData = parentDoc.data() as WBSLevel;
      
      // A WBS node can have:
      // A) Activities as direct children (if it's a leaf node like Work Package)
      // B) Other WBS nodes as children
      
      // Check for Activity children
      const qAct = query(collection(db, 'activities'), where('divisionId', '==', parentId));
      const qActAlt = query(collection(db, 'activities'), where('wbsId', '==', parentId));
      
      const [snapAct, snapActAlt] = await Promise.all([getDocs(qAct), getDocs(qActAlt)]);
      
      const activityMap = new Map<string, Activity>();
      snapAct.docs.forEach(d => activityMap.set(d.id, d.data() as Activity));
      snapActAlt.docs.forEach(d => activityMap.set(d.id, d.data() as Activity));

      // Adoption logic (by division code)
      const divCode = parentData.divisionCode || parentData.code;
      if (divCode && (parentData.type === 'Division' || parentData.type === 'Cost Account')) {
        const qAdopted = query(collection(db, 'activities'), where('division', '==', divCode), where('projectId', '==', parentData.projectId));
        const snapAdopted = await getDocs(qAdopted);
        snapAdopted.docs.forEach(d => {
          const data = d.data() as Activity;
          if (!data.wbsId && !data.divisionId) {
            activityMap.set(d.id, data);
          }
        });
      }
      
      const activityChildren = Array.from(activityMap.values());
      
      // Check for WBS children
      const qWbs = query(collection(db, 'wbs'), where('parentId', '==', parentId));
      const snapWbs = await getDocs(qWbs);
      const wbsChildren = snapWbs.docs.map(d => d.data() as WBSLevel);

      // Process Activity Children
      activityChildren.forEach(child => {
        const s = child.startDate || (child as any).plannedStart || '';
        const f = child.finishDate || (child as any).plannedFinish || '';
        
        if (s) {
          if (!plannedStart || s < plannedStart) plannedStart = s;
        }
        if (f) {
          if (!plannedFinish || f > plannedFinish) plannedFinish = f;
        }
        if (child.actualStartDate) {
          if (!actualStart || child.actualStartDate < actualStart) actualStart = child.actualStartDate;
        }
        if (child.actualFinishDate) {
          if (!actualFinish || child.actualFinishDate > actualFinish) actualFinish = child.actualFinishDate;
        }

        const childPlanned = child.plannedCost || child.amount || 0;
        plannedCost += childPlanned;
        actualCost += child.actualAmount || 0;
        totalWeightedProgress += childPlanned * (child.percentComplete || 0);
        totalPlannedCostForProgress += childPlanned;
      });

      // Fetch direct POs for this WBS node (and filter out those belonging to activities in memory)
      const qDirectPo = query(collection(db, 'purchase_orders'), where('wbsId', '==', parentId));
      const snapDirectPo = await getDocs(qDirectPo);
      const directPoChildren = snapDirectPo.docs
        .map(d => d.data() as PurchaseOrder)
        .filter(po => !po.activityId);

      directPoChildren.forEach(po => {
        plannedCost += po.amount || 0;
        const completion = po.completion || 0;
        actualCost += (po.amount || 0) * (completion / 100);
        
        totalWeightedProgress += (po.amount || 0) * completion;
        totalPlannedCostForProgress += (po.amount || 0);
      });

      // Process WBS Children
      wbsChildren.forEach(child => {
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
          if (!actualFinish || child.actualFinish < actualFinish) actualFinish = child.actualFinish;
        }

        plannedCost += child.plannedCost || 0;
        actualCost += child.actualCost || 0;
        totalWeightedProgress += (child.plannedCost || 0) * (child.progress || 0);
        totalPlannedCostForProgress += (child.plannedCost || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
      const status = deriveStatus(progress, actualStart, actualFinish);

      const updateData: any = {
        plannedCost: plannedCost, // Note: For WBS, we strictly sum children if they exist
        actualCost: actualCost,
        progress: progress,
        status: status,
        updatedAt: new Date().toISOString()
      };

      if (plannedStart) updateData.plannedStart = plannedStart;
      if (plannedFinish) updateData.plannedFinish = plannedFinish;
      if (actualStart) updateData.actualStart = actualStart;
      if (actualFinish) updateData.actualFinish = actualFinish;

      if (plannedStart && plannedFinish) {
        const start = new Date(plannedStart);
        const finish = new Date(plannedFinish);
        updateData.plannedDuration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      }

      if (actualStart && actualFinish) {
        const start = new Date(actualStart);
        const finish = new Date(actualFinish);
        updateData.actualDuration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      } else if (actualStart) {
        const start = new Date(actualStart);
        const today = new Date();
        updateData.actualDuration = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      }

      await updateDoc(parentRef, updateData);

      // Recursive call to parent WBS node
      if (parentData.parentId) {
        await rollupToParent('division', parentData.parentId);
      }
    }

  } catch (error) {
    console.error(`[Rollup Error] Level: ${level}, ParentId: ${parentId}`, error);
    handleFirestoreError(error, OperationType.UPDATE, 'rollup');
  }
}
