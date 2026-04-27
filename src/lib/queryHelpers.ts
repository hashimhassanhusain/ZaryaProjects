import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  QueryConstraint,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';

/**
 * Creates a Firestore query that is automatically scoped to a specific project.
 * Use this for all data collections that belong to a project to ensure data isolation.
 */
export function projectQuery(
  collectionName: string,
  projectId: string,
  additionalFilters: QueryConstraint[] = []
) {
  if (!projectId) {
    throw new Error('projectId is required for projectQuery');
  }

  const colRef = collection(db, collectionName);
  return query(
    colRef,
    where('projectId', '==', projectId),
    ...additionalFilters
  );
}

/**
 * Helper to get a collection reference with type safety if needed.
 */
export function getProjectCollection(collectionName: string): CollectionReference<DocumentData> {
  return collection(db, collectionName);
}
