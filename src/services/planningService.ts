import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';

export interface ProjectMasterBasis {
  title: string;
  code: string;
  manager: string;
  sponsor: string;
  budget: number;
  currency: string;
  startDate: string;
  description: string;
}

export const getProjectMasterBasis = async (projectId: string): Promise<ProjectMasterBasis | null> => {
  try {
    const q = query(
      collection(db, 'projectCharters'),
      where('projectId', '==', projectId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return {
        title: data.projectTitle || '',
        code: projectId, // Fallback to ID if code not in charter
        manager: data.projectManager || '',
        sponsor: data.projectSponsor || '',
        budget: data.estimatedBudget || 0,
        currency: data.currency || 'USD',
        startDate: data.datePrepared || '',
        description: data.description || ''
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching master basis:', err);
    return null;
  }
};
