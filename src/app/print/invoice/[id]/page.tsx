'use client';

import { useParams, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PrintableInvoice } from '@/components/orders/PrintableInvoice';
import type { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PrintHandler } from '@/components/layout/PrintHandler';
import { useLanguage } from '@/context/LanguageProvider';
import { Loader2 } from 'lucide-react';

export default function PrintInvoicePage() {
    const params = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t, getTranslated } = useLanguage();

    useEffect(() => {
        if (!params.id || !db) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [orderDocSnap, businessDocSnap] = await Promise.all([
                    getDoc(doc(db, 'orders', params.id as string)),
                    getDoc(doc(db, 'settings', 'business'))
                ]);

                if (orderDocSnap.exists()) {
                    setOrder({ id: orderDocSnap.id, ...orderDocSnap.data() } as Order);
                } else {
                    setError('Order not found.');
                }

                if (businessDocSnap.exists()) {
                    setBusinessDetails(businessDocSnap.data() as BusinessDetails);
                } else {
                    setError('Business details are not set up. An administrator must save them in the admin dashboard.');
                }
            } catch (err) {
                console.error("Error fetching print data:", err);
                setError('Failed to fetch data.');
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
        notFound();
        return null;
    }
    
    return (
        <div className="bg-white">
            <PrintableInvoice 
                order={order} 
                businessDetails={businessDetails} 
                t={t} 
                getTranslated={getTranslated} 
            />
            <PrintHandler />
        </div>
    );
}
