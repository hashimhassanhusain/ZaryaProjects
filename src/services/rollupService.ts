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

  try {
    let plannedStart: string | null = null;
    let plannedFinish: string | null = null;
    let actualStart: string | null = null;
    let actualFinish: string | null = null;
    let plannedCost = 0;
    let actualCost = 0;
    let totalWeightedProgress = 0;
    let totalPlannedCostForProgress = 0;

    // Helper for cost-weighted progress
    const calculateWeightedProgress = (items: { plannedCost: number, progress: number }[]) => {
      let weight = 0;
      let total = 0;
      items.forEach(i => {
        weight += (i.plannedCost || 0) * (i.progress || 0);
        total += (i.plannedCost || 0);
      });
      return total > 0 ? Math.round(weight / total) : 0;
    };

    if (level === 'lineItem') {
      // Parent is a Purchase Order (PO)
      const poRef = doc(db, 'purchase_orders', parentId);
      const poDoc = await getDoc(poRef);
      if (!poDoc.exists()) return;
      
      const po = poDoc.data() as PurchaseOrder;
      const children = po.lineItems || [];

      children.forEach(child => {
        plannedCost += child.amount || 0;
        const progress = child.completion || 0;
        actualCost += (child.amount || 0) * (progress / 100);
        totalWeightedProgress += (child.amount || 0) * progress;
        totalPlannedCostForProgress += (child.amount || 0);
      });

      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
      const status = deriveStatus(progress, po.actualStartDate, po.actualFinishDate);

      const updateData = {
        amount: plannedCost,
        actualCost: actualCost,
        completion: progress,
        status: status,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(poRef, updateData);
      if (po.activityId) await rollupToParent('po', po.activityId);
    } 
    else if (level === 'po') {
      // Parent is a Work Package (Activity)
      const parentRef = doc(db, 'activities', parentId);
      const parentDoc = await getDoc(parentRef);
      if (!parentDoc.exists()) return;

      const parentData = parentDoc.data() as Activity;
      const q = query(collection(db, 'purchase_orders'), where('activityId', '==', parentId));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(d => d.data() as PurchaseOrder);

      // Rule: parent.plannedCost = max(manualCost, sum(children.plannedCost))
      const manualPlannedCost = parentData.amount || 0; // The BOQ amount linked to it
      
      children.forEach(child => {
        // Date Rollup
        const date = child.date || child.actualStartDate;
        if (date) {
          if (!plannedStart || date < plannedStart) plannedStart = date;
          if (!plannedFinish || date > plannedFinish) plannedFinish = date;
        }
        if (child.actualStartDate) {
          if (!actualStart || child.actualStartDate < actualStart) actualStart = child.actualStartDate;
        }
        if (child.actualFinishDate) {
          if (!actualFinish || child.actualFinishDate > actualFinish) actualFinish = child.actualFinishDate;
        }

        const childPlanned = child.amount || 0;
        plannedCost += childPlanned;
        actualCost += child.actualCost || 0;
        totalWeightedProgress += childPlanned * (child.completion || 0);
        totalPlannedCostForProgress += childPlanned;
      });

      const finalPlannedCost = Math.max(manualPlannedCost, plannedCost);
      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
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

      await updateDoc(parentRef, updateData);
      const nextParentId = parentData.divisionId || parentData.wbsId;
      if (nextParentId) await rollupToParent('workPackage', nextParentId);
    }
    else {
      // Parent is a WBS Level (Division -> Floor -> Building -> Area -> Zone)
      const parentRef = doc(db, 'wbs', parentId);
      const parentDoc = await getDoc(parentRef);
      if (!parentDoc.exists()) return;

      const parentData = parentDoc.data() as WBSLevel;
      
      // Step 1: Collect all children (WBS and Activities)
      const qWbs = query(collection(db, 'wbs'), where('parentId', '==', parentId));
      const qAct = query(collection(db, 'activities'), where('divisionId', '==', parentId));
      const qActAlt = query(collection(db, 'activities'), where('wbsId', '==', parentId));
      
      const [snapWbs, snapAct, snapActAlt] = await Promise.all([
        getDocs(qWbs), getDocs(qAct), getDocs(qActAlt)
      ]);
      
      const wbsChildren = snapWbs.docs.map(d => d.data() as WBSLevel);
      const activityMap = new Map();
      snapAct.docs.forEach(d => activityMap.set(d.id, d.data()));
      snapActAlt.docs.forEach(d => activityMap.set(d.id, d.data()));
      const activityChildren = Array.from(activityMap.values());

      // Rollup Logic
      [...wbsChildren, ...activityChildren].forEach(child => {
        const s = child.plannedStart || child.startDate || '';
        const f = child.plannedFinish || child.finishDate || '';
        const as = child.actualStart || child.actualStartDate || '';
        const af = child.actualFinish || child.actualFinishDate || '';
        const cost = child.plannedCost || child.amount || 0;
        const actual = child.actualCost || child.actualAmount || 0;
        const prog = child.progress || child.percentComplete || 0;

        if (s && (!plannedStart || s < plannedStart)) plannedStart = s;
        if (f && (!plannedFinish || f > plannedFinish)) plannedFinish = f;
        if (as && (!actualStart || as < actualStart)) actualStart = as;
        if (af && (!actualFinish || af > actualFinish)) actualFinish = af;

        plannedCost += cost;
        actualCost += actual;
        totalWeightedProgress += cost * prog;
        totalPlannedCostForProgress += cost;
      });

      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
      const status = deriveStatus(progress, actualStart, actualFinish);

      const updateData: any = {
        plannedCost: plannedCost,
        actualCost: actualCost,
        progress: progress,
        status: status,
        updatedAt: new Date().toISOString()
      };

      if (plannedStart) updateData.plannedStart = plannedStart;
      if (plannedFinish) updateData.plannedFinish = plannedFinish;
      if (actualStart) updateData.actualStart = actualStart;
      if (actualFinish) updateData.actualFinish = actualFinish;

      await updateDoc(parentRef, updateData);
      if (parentData.parentId) await rollupToParent('division', parentData.parentId);
    }

  } catch (error) {
    console.error(`[Rollup Error] Level: ${level}, ParentId: ${parentId}`, error);
    handleFirestoreError(error, OperationType.UPDATE, 'rollup');
  }
}
