
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
    // Check if Firebase services are available. If not, stop loading and do nothing.
    if (!auth || !db) {
        console.error("Firebase not initialized, AuthProvider cannot function.");
        setLoading(false);
        return;
    }

    // This listener handles auth state changes.
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // If user is logged in, listen for their user document changes.
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setUserData({ id: doc.id, ...doc.data() } as User);
            } else {
                setUserData(null);
            }
            // Once we have user data (or know it doesn't exist), we're done loading.
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user data:", error);
            setUserData(null);
            setLoading(false); // Also done loading on error.
        });
        return () => unsubscribeSnapshot();
      } else {
        // If no user, we're also done loading.
        setUserData(null);
        setLoading(false);
      }
    });

    // Cleanup the auth listener on unmount.
    return () => unsubscribeAuth();
  }, []); // <-- Empty dependency array means this effect runs only once on mount.

  useEffect(() => {
    if (loading) return;

    // Do not run route protection logic if firebase is not configured
    if (!auth || !db) return;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isAdminAuthPage = pathname.startsWith('/admin/login');
    const isPrintPage = pathname.startsWith('/print/') || pathname.startsWith('/admin/print/');
    const isPublicPage = pathname === '/' || isAuthPage || isAdminAuthPage || isPrintPage;
    
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
  
  // If firebase is not configured, don't render the app to prevent errors.
  if (!auth || !db) {
    return (
        <div className="flex h-screen w-full items-center justify-center text-center p-4">
            <div>
                <h1 className="text-2xl font-bold text-destructive mb-2">Configuration Error</h1>
                <p className="text-muted-foreground">Firebase is not configured correctly.</p>
                <p className="text-muted-foreground mt-1">Please ensure your Firebase environment variables are set up.</p>
            </div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
