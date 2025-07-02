import type React from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}
