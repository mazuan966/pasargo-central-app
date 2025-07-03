'use client';

import { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!auth || !db) {
        setLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setUserData({ id: doc.id, ...doc.data() } as User);
            } else {
                setUserData(null);
            }
             if (loading) setLoading(false);
        }, (error) => {
            console.error("Error fetching user data:", error);
            setUserData(null);
            if (loading) setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setUserData(null);
        if (loading) setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isAdminAuthPage = pathname.startsWith('/admin/login');
    const isPublicPage = pathname === '/' || isAuthPage || isAdminAuthPage;
    
    // Admin routes are not protected by this logic for now
    const isAdminPage = pathname.startsWith('/admin');

    if (currentUser && isAuthPage) {
      router.push('/dashboard');
    } else if (!currentUser && !isPublicPage && !isAdminPage) {
      router.push('/login');
    }
  }, [loading, currentUser, pathname, router]);

  const value = useMemo(() => ({ currentUser, userData, loading }), [currentUser, userData, loading]);

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
