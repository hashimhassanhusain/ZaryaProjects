import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { 
  IssueLog, 
  RiskRegister, 
  ChangeRequest, 
  StakeholderRegister, 
  LessonsLearned, 
  QualityMetric, 
  ProjectFile 
} from '../types/projectDocuments';

// Generic CRUD helper generator
const createDocumentService = <T extends { id: string; projectId: string }>(collectionName: string) => {
  return {
    async getAllByProject(projectId: string): Promise<T[]> {
      try {
        const q = query(
          collection(db, collectionName), 
          where('projectId', '==', projectId),
          where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, collectionName);
        return [];
      }
    },

    async getById(id: string): Promise<T | null> {
      try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().isActive) {
          return { id: docSnap.id, ...docSnap.data() } as T;
        }
        return null;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, collectionName);
        return null;
      }
    },

    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isActive'>): Promise<string> {
      try {
        const docRef = await addDoc(collection(db, collectionName), {
          ...data,
          createdBy: auth.currentUser?.uid || 'system',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true
        });
        return docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, collectionName);
        return '';
      }
    },

    async update(id: string, data: Partial<T>): Promise<void> {
      try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, collectionName);
      }
    },

    async delete(id: string): Promise<void> {
      try {
        const docRef = doc(db, collectionName, id);
        // Soft delete
        await updateDoc(docRef, {
          isActive: false,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, collectionName);
      }
    }
  };
};

export const IssueService = createDocumentService<IssueLog>('issueLogs');
export const RiskService = createDocumentService<RiskRegister>('riskRegisters');
export const ChangeRequestService = createDocumentService<ChangeRequest>('changeRequests');
export const StakeholderService = createDocumentService<StakeholderRegister>('stakeholderRegisters');
export const LessonsLearnedService = createDocumentService<LessonsLearned>('lessonsLearned');
export const QualityMetricService = createDocumentService<QualityMetric>('qualityMetrics');
export const ProjectFileService = createDocumentService<ProjectFile>('projectFiles');

// Specialized functions if needed
export const RiskRegisterService = {
  ...RiskService,
  calculateScore: (probability: number, impact: number) => probability * impact
};
