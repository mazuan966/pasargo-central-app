
'use client';

import { createContext, ReactNode, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

// This is a placeholder AuthProvider now that Firebase has been removed.
// It will allow the app to render without authentication.

interface AuthContextType {
  currentUser: null;
  userData: null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const loading = false; // App is never in a loading state.
  
  const value = useMemo(() => ({ currentUser: null, userData: null, loading }), []);

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
