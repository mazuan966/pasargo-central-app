
'use client';

import { useParams, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Order, BusinessDetails } from '@/lib/types';
import { PrintHandler } from '@/components/layout/PrintHandler';
import { useLanguage } from '@/context/LanguageProvider';
import { Loader2 } from 'lucide-react';

export default function PrintInvoicePage() {
    const params = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>("Firebase has been removed. Cannot fetch invoice data.");

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="flex h-screen w-full items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }
    
    return (
       <div className="flex h-screen w-full items-center justify-center text-center p-4">
            <div>
                <h1 className="text-2xl font-bold">Feature Disabled</h1>
                <p className="text-muted-foreground">This feature requires a database connection.</p>
            </div>
        </div>
    );
}
