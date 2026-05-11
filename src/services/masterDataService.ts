import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { CostCenter, StandardItem } from '../types';

/**
 * Service for managing Cost Centers and Standard Items metadata catalogs.
 */

// --- Cost Centers ---

export const getCostCenters = async (): Promise<CostCenter[]> => {
  try {
    const snap = await getDocs(collection(db, 'cost_centers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CostCenter));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'cost_centers');
    return [];
  }
};

export const addCostCenter = async (data: Omit<CostCenter, 'id'>) => {
  try {
    const ref = doc(collection(db, 'cost_centers'));
    await setDoc(ref, { ...data, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'cost_centers');
  }
};

// --- Standard Items ---

export const getStandardItems = async (): Promise<StandardItem[]> => {
  try {
    const snap = await getDocs(collection(db, 'standard_items'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StandardItem));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'standard_items');
    return [];
  }
};

export const addStandardItem = async (data: Omit<StandardItem, 'id'>) => {
  try {
    const ref = doc(collection(db, 'standard_items'));
    await setDoc(ref, { ...data, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'standard_items');
  }
};

export const getSuppliers = async (): Promise<{id:string, name:string}[]> => {
  try {
    const q = query(collection(db, 'companies'), where('type', '==', 'Supplier'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, name: d.data().name }));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'companies');
    return [];
  }
};

export const getUsers = async (): Promise<{id:string, name:string}[]> => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().email }));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'users');
    return [];
  }
};
