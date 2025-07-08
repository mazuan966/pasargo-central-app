
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function PaymentStatusContent() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
    );
}


export default function PaymentStatusPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <PaymentStatusContent />
        </Suspense>
    )
}
