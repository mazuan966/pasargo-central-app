'use client';

import { useEffect } from 'react';

// This component's sole purpose is to trigger the browser's print dialog
// on the client side after the server-rendered content has loaded.
export function PrintHandler() {
  useEffect(() => {
    // A small delay ensures the content is fully rendered before printing.
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []); // Runs only once on mount

  return null; // This component renders nothing.
}
