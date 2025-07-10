
'use client';

import { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: AppUser | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const value = useMemo(() => ({ currentUser, userData, loading }), [currentUser, userData, loading]);

  useEffect(() => {
    // Only run this on the client
    if (typeof window === "undefined" || !auth || !db) {
      setLoading(false);
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Use onSnapshot to listen for real-time updates to user data
        const userDocRef = doc(db, 'users', user.uid);
        const unsubUserDoc = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setUserData({ id: doc.id, ...doc.data() } as AppUser);
            } else {
                console.warn("User document not found in Firestore for UID:", user.uid);
                setUserData(null);
            }
        }, (error) => {
           console.error("Error listening to user data from Firestore:", error);
           setUserData(null);
        });

        // Detach the listener when the auth state changes
        return () => unsubUserDoc();
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    // Set loading to false once the initial auth state check is complete
    const initialAuthCheck = () => {
        setLoading(false);
    };
    const unsubInitial = onAuthStateChanged(auth, user => {
        initialAuthCheck();
        unsubInitial(); // Unsubscribe after the first callback
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
