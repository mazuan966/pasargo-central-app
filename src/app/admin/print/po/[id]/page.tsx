'use client';

import { notFound, useParams } from 'next/navigation';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { useEffect, useState } from 'react';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

function PrintPOComponent() {
    const params = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                    console.log("No such order document!");
                    setOrder(null);
                }

                if (businessDocSnap.exists()) {
                    setBusinessDetails(businessDocSnap.data() as BusinessDetails);
                } else {
                    console.log("No business details found!");
                    setBusinessDetails(null);
                }
            } catch (error) {
                console.error("Error fetching print data:", error);
                setOrder(null);
                setBusinessDetails(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.id]);


    useEffect(() => {
        if (!isLoading && order && businessDetails) {
            // Delay to allow rendering before printing
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, order, businessDetails]);

    if (isLoading) {
       return (
             <div className="flex h-screen w-full items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                 Loading document...
            </div>
        );
    }
    
    if (!businessDetails) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-2xl font-bold text-destructive mb-2">Configuration Error</h1>
                    <p className="text-muted-foreground">Business details are not set up.</p>
                    <p className="text-muted-foreground mt-1">An administrator must save the business settings in the admin dashboard before POs can be printed.</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return notFound();
    }
    
    return <PrintablePO order={order} businessDetails={businessDetails} />;
}

export default function PrintPOPage() {
    return <PrintPOComponent />;
}
