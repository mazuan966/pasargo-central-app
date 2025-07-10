
'use client';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import type React from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
       <div className="absolute top-4 right-4">
         <LanguageSwitcher />
       </div>
      {children}
    </main>
  );
}
