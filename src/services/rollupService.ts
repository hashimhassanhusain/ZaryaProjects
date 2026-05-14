import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, limit } from 'firebase/firestore';
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
    const calculateWeightedProgress = (items: { cost: number, progress: number }[]) => {
      let weight = 0;
      let total = 0;
      items.forEach(i => {
        weight += (i.cost || 0) * (i.progress || 0);
        total += (i.cost || 0);
      });
      return total > 0 ? Math.round(weight / total) : 0;
    };

    const getProjectStartDate = async () => {
      // Find the project context if available
      const projectSnap = await getDocs(query(collection(db, 'projects'), limit(1)));
      if (!projectSnap.empty) {
        const proj = projectSnap.docs[0].data();
        return proj.charterData?.['Date Prepared'] || proj.createdAt || new Date().toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    };

    const calculateDuration = (start: string | null, finish: string | null) => {
      if (!start || !finish) return 1;
      const s = new Date(start);
      const f = new Date(finish);
      const diff = Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff);
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

      const updateData: any = {
        amount: plannedCost,
        actualCost: actualCost,
        completion: progress,
        status: status,
        updatedAt: new Date().toISOString()
      };

      // Set default dates if missing for PO
      if (!po.date && !po.actualStartDate) {
        const defaultDate = await getProjectStartDate();
        updateData.date = defaultDate;
        updateData.plannedDuration = 1;
      }

      await updateDoc(poRef, updateData);
      
      // Cascade to Work Package
      if (po.workPackageId) {
        await rollupToParent('po', po.workPackageId);
      } else if (po.activityId) {
        await rollupToParent('po', po.activityId);
      }
    } 
    else if (level === 'po') {
      // Parent is a Work Package (WBS node or Activity)
      const wbsRef = doc(db, 'wbs', parentId);
      const wbsDoc = await getDoc(wbsRef);
      
      if (wbsDoc.exists()) {
        await rollupToParent('workPackage', parentId);
        return;
      }

      const parentRef = doc(db, 'activities', parentId);
      const parentDoc = await getDoc(parentRef);
      if (!parentDoc.exists()) return;

      const parentData = parentDoc.data() as Activity;
      const q1 = query(collection(db, 'purchase_orders'), where('workPackageId', '==', parentId));
      const q2 = query(collection(db, 'purchase_orders'), where('activityId', '==', parentId));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const childrenMap = new Map<string, PurchaseOrder>();
      snap1.docs.forEach(d => childrenMap.set(d.id, d.data() as PurchaseOrder));
      snap2.docs.forEach(d => childrenMap.set(d.id, d.data() as PurchaseOrder));
      const children = Array.from(childrenMap.values());

      const manualPlannedCost = parentData.amount || 0; 
      
      children.forEach(child => {
        const s = child.date || child.actualStartDate;
        const f = child.actualFinishDate || s;
        if (s) {
          if (!plannedStart || s < plannedStart) plannedStart = s;
          if (!plannedFinish || (f && f > plannedFinish)) plannedFinish = f;
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

      if (!plannedStart) {
        plannedStart = await getProjectStartDate();
        plannedFinish = plannedStart;
      }

      const updateData: any = {
        plannedCost: finalPlannedCost,
        actualAmount: actualCost,
        percentComplete: progress,
        status: status,
        plannedDuration: calculateDuration(plannedStart, plannedFinish),
        actualDuration: calculateDuration(actualStart, actualFinish),
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

      if (!plannedStart) {
        plannedStart = await getProjectStartDate();
        plannedFinish = plannedStart;
      }

      const progress = totalPlannedCostForProgress > 0 ? Math.round(totalWeightedProgress / totalPlannedCostForProgress) : 0;
      const status = deriveStatus(progress, actualStart, actualFinish);

      const updateData: any = {
        plannedCost: plannedCost,
        actualCost: actualCost,
        progress: progress,
        status: status,
        plannedDuration: calculateDuration(plannedStart, plannedFinish),
        actualDuration: calculateDuration(actualStart, actualFinish),
        updatedAt: new Date().toISOString()
      };

      if (plannedStart) updateData.plannedStart = plannedStart;
      if (plannedFinish) updateData.plannedFinish = plannedFinish;
      if (actualStart) updateData.actualStart = actualStart;
      if (actualFinish) updateData.actualFinish = actualFinish;

      await updateDoc(parentRef, updateData);
      if (parentData.parentId) {
        // Find correct next level
        const nextLevelIndex = LEVEL_ORDER.indexOf(level) + 1;
        const nextLevel = LEVEL_ORDER[nextLevelIndex] || 'zone';
        await rollupToParent(nextLevel, parentData.parentId);
      }
    }

  } catch (error) {
    console.error(`[Rollup Error] Level: ${level}, ParentId: ${parentId}`, error);
    handleFirestoreError(error, OperationType.UPDATE, 'rollup');
  }
}
