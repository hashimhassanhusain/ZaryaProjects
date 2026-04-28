import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, updateDoc, addDoc, getDocFromServer, doc as firestoreDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Improved Firestore initialization
// We use (default) as a fallback, but the provided database ID from config is preferred.
const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

console.log('Initializing Firestore with Database ID:', dbId);

export const db = initializeFirestore(app, {
  // Use auto-detection instead of forced long polling which can sometimes backfire
  experimentalAutoDetectLongPolling: true,
}, dbId);

// Explicitly pass the bucket URL to avoid initialization issues
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Connection Test
async function testConnection() {
  console.log('Testing Firestore connection...');
  try {
    // Try to get a doc from server
    const testDocRef = firestoreDoc(db, 'test_connection', 'status');
    const snapshot = await getDocFromServer(testDocRef);
    console.log('Firestore connection successful. Snapshot exists:', snapshot.exists());
  } catch (error: any) {
    console.error("Firestore initialization or connection failed:", error);
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else if (error?.code === 'permission-denied') {
       console.log("Firestore connection reached, but permission denied (this is expected if not signed in).");
    } else {
       console.error("Unknown Firestore error during connection test:", error.message || error);
    }
  }
}
testConnection();

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { onAuthStateChanged, signInWithPopup, GoogleAuthProvider };
export type { FirebaseUser };
