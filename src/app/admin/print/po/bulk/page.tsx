
'use client';

import { useSearchParams, notFound } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import type { Order, BusinessDetails } from '@/lib/types';
import { PrintHandler } from '@/components/layout/PrintHandler';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { PrintablePO } from '@/components/admin/PrintablePO';

function BulkPrintContent() {
    const searchParams = useSearchParams();
    const ids = searchParams.get('ids');

    const [orders, setOrders] = useState<Order[]>([]);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ids) {
            setError("No order IDs provided.");
            setIsLoading(false);
            return;
        }

        if (!db) {
            setError("Firebase connection is not available.");
            setIsLoading(false);
            return;
        }
        
        const fetchBulkData = async () => {
            const orderIds = ids.split(',');
            if (orderIds.length === 0) {
                setError("No valid order IDs provided.");
                setIsLoading(false);
                return;
            }

            try {
                const ordersRef = collection(db, 'orders');
                const q = query(ordersRef, where('__name__', 'in', orderIds));
                const ordersSnapshot = await getDocs(q);
                const fetchedOrders = ordersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));

                const businessDocRef = doc(db, 'settings', 'business');
                const businessDoc = await getDoc(businessDocRef);

                setOrders(fetchedOrders);

                if (businessDoc.exists()) {
                    setBusinessDetails(businessDoc.data() as BusinessDetails);
                } else {
                    setError("Business details are not configured in settings.");
                }

            } catch (err: any) {
                setError(err.message || "Failed to fetch data for bulk printing.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchBulkData();

    }, [ids]);

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
    
    if (orders.length === 0 || !businessDetails) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-center p-4">
                <p className="text-muted-foreground">No orders found for the provided IDs.</p>
            </div>
        );
    }

    return (
        <>
            {orders.map((order) => (
                <div key={order.id} className="printable-po-container">
                    <PrintablePO order={order} businessDetails={businessDetails} />
                </div>
            ))}
            <PrintHandler />
        </>
    );
}


export default function BulkPrintPOPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <BulkPrintContent />
        </Suspense>
    );
}
