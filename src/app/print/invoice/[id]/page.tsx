
'use client';

import { useParams, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Order, BusinessDetails } from '@/lib/types';
import { PrintHandler } from '@/components/layout/PrintHandler';
import { useLanguage } from '@/context/LanguageProvider';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PrintableInvoice } from '@/components/orders/PrintableInvoice';

export default function PrintInvoicePage() {
    const params = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getTranslated, t } = useLanguage();

    useEffect(() => {
        if (!params.id) {
            setError("No order ID provided.");
            setIsLoading(false);
            return;
        }

        if (!db) {
            setError("Firebase connection is not available.");
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const orderDocRef = doc(db, 'orders', params.id);
                const businessDocRef = doc(db, 'settings', 'business');

                const [orderDoc, businessDoc] = await Promise.all([
                    getDoc(orderDocRef),
                    getDoc(businessDocRef)
                ]);

                if (!orderDoc.exists()) {
                    return notFound();
                }
                setOrder({ ...orderDoc.data(), id: orderDoc.id } as Order);

                if (businessDoc.exists()) {
                    setBusinessDetails(businessDoc.data() as BusinessDetails);
                } else {
                    setError("Business details are not configured in settings.");
                }

            } catch (err: any) {
                console.error("Error fetching invoice data:", err);
                setError(err.message || "Failed to fetch invoice data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.id]);


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
    
    if (!order || !businessDetails) {
        return notFound();
    }
    
    return (
        <>
            <PrintableInvoice order={order} businessDetails={businessDetails} t={t} getTranslated={getTranslated} />
            <PrintHandler />
        </>
    );
}
