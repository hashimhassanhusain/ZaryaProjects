import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useProject } from './ProjectContext';

interface DriveSyncContextType {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  triggerGlobalSync: () => Promise<void>;
}

const DriveSyncContext = createContext<DriveSyncContextType | null>(null);

export const useDriveSync = () => {
  const context = useContext(DriveSyncContext);
  if (!context) throw new Error('useDriveSync must be used within DriveSyncProvider');
  return context;
};

export const DriveSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const { selectedProject } = useProject();

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'system_settings', 'drive_sync');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.lastSyncedAt) setLastSyncedAt(data.lastSyncedAt.toDate());
      }
    } catch (e) {
      console.warn("Could not load sync settings:", e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const triggerGlobalSync = useCallback(async () => {
    if (isSyncing || !selectedProject) return;
    setIsSyncing(true);
    
    try {
      await setDoc(doc(db, 'system_settings', 'drive_sync'), { 
        lastSyncedAt: Timestamp.now() 
      }, { merge: true });
      
      setLastSyncedAt(new Date());
      await fetch('/api/drive/status'); 
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('Global Sync Error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, selectedProject]);

  // Remove interval polling to rely on Webhooks and Real-time listeners
  
  return (
    <DriveSyncContext.Provider value={{ isSyncing, lastSyncedAt, triggerGlobalSync }}>
      {children}
    </DriveSyncContext.Provider>
  );
};
