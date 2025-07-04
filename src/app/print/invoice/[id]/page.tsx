'use client';

import { useOrders } from '@/hooks/use-orders';
import { useParams } from 'next/navigation';
import { PrintableInvoice } from '@/components/orders/PrintableInvoice';
import { useEffect, useState } from 'react';
import { OrderProvider } from '@/context/OrderProvider';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


function PrintInvoiceComponent() {
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
        return <div>Loading invoice...</div>;
    }
    
    return <PrintableInvoice order={order} businessDetails={businessDetails} />;
}

export default function PrintInvoicePage() {
    return (
        <OrderProvider>
            <PrintInvoiceComponent />
        </OrderProvider>
    )
}
