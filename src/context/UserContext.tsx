import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserGroup } from '../types';
import { auth, db } from '../firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

interface UserContextType {
  userProfile: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubGroups: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      // Clean up previous listeners
      if (unsubProfile) unsubProfile();
      if (unsubGroups) unsubGroups();

      if (firebaseUser) {
        setLoading(true);

        let latestUserData: User | null = null;
        let latestGroups: UserGroup[] = [];

        const updateMergedProfile = () => {
          if (!latestUserData) return;
          const groupPages = latestGroups.flatMap(g => g.accessiblePages || []);
          const mergedPages = Array.from(new Set([...(latestUserData.accessiblePages || []), ...groupPages]));
          
          setUserProfile({
            ...latestUserData,
            accessiblePages: mergedPages,
            groupIds: latestGroups.map(g => g.id)
          });
          setLoading(false);
        };

        // Listen to User Profile
        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            latestUserData = userDoc.data() as User;
            updateMergedProfile();
          } else {
            setUserProfile(null);
            setLoading(false);
          }
        });

        // Listen to Groups
        unsubGroups = onSnapshot(
          query(collection(db, 'groups'), where('memberIds', 'array-contains', firebaseUser.uid)),
          (groupsSnap) => {
            latestGroups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserGroup));
            updateMergedProfile();
          }
        );

      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      if (unsubGroups) unsubGroups();
    };
  }, []);

  const isAdmin = userProfile?.role === 'admin';

  return (
    <UserContext.Provider value={{ userProfile, loading, isAdmin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
};
