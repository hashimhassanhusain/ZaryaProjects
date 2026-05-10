import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PRTask } from '../types';

export const addGlobalTask = async (task: PRTask, relatedTo: string, projectId: string) => {
    try {
        await addDoc(collection(db, 'tasks'), {
            ...task,
            relatedTo,
            projectId,
            category: 'Procurement',
            createdAt: serverTimestamp()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
};
