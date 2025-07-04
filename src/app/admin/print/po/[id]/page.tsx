'use client';

import { useOrders } from '@/hooks/use-orders';
import { notFound, useParams } from 'next/navigation';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { useEffect, useState } from 'react';
import { OrderProvider } from '@/context/OrderProvider';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function PrintPOComponent() {
    const params = useParams<{ id: string }>();
    const { orders } = useOrders();
    const [order, setOrder] = useState<Order | undefined>(undefined);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);

    useEffect(() => {
        const foundOrder = orders.find(o => o.id === params.id);
        setOrder(foundOrder);
    }, [orders, params.id]);

    useEffect(() => {
        const fetchBusinessDetails = async () => {
            if (!db) return;
            try {
                const docRef = doc(db, 'settings', 'business');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setBusinessDetails(docSnap.data() as BusinessDetails);
                } else {
                    console.log("No business details found!");
                }
            } catch (error) {
                console.error("Error fetching business details:", error);
            }
        };

        fetchBusinessDetails();
    }, []);

    useEffect(() => {
        if (order && businessDetails) {
            // Delay to allow rendering before printing
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [order, businessDetails]);

    if (!order || !businessDetails) {
        return <div>Loading order...</div>;
    }
    
    return <PrintablePO order={order} businessDetails={businessDetails} />;
}

export default function PrintPOPage() {
    return (
        <OrderProvider>
            <PrintPOComponent />
        </OrderProvider>
    )
}
