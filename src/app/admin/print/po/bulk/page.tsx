'use client';

import { useSearchParams } from 'next/navigation';
import { useOrders } from '@/hooks/use-orders';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { useEffect, useState, useMemo } from 'react';
import { OrderProvider } from '@/context/OrderProvider';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

function BulkPrintPOComponent() {
    const searchParams = useSearchParams();
    const { orders } = useOrders();
    const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const orderIds = useMemo(() => {
        const ids = searchParams.get('ids');
        return ids ? ids.split(',') : [];
    }, [searchParams]);

    useEffect(() => {
        const foundOrders = orders.filter(o => orderIds.includes(o.id));
        if (foundOrders.length > 0) {
          // Sort them in the order of the IDs provided in the URL
          const sortedOrders = orderIds.map(id => foundOrders.find(o => o.id === id)).filter(Boolean) as Order[];
          setOrdersToPrint(sortedOrders);
        }
    }, [orders, orderIds]);

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
        if (ordersToPrint.length > 0 && businessDetails) {
            setIsLoading(false);
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [ordersToPrint, businessDetails]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                 Loading documents...
            </div>
        );
    }
    
    return (
        <div className="bg-white">
            {ordersToPrint.map((order) => (
                <div key={order.id} className="printable-po-container">
                    <PrintablePO order={order} businessDetails={businessDetails!} />
                </div>
            ))}
        </div>
    );
}


export default function BulkPrintPOPage() {
    return (
        <OrderProvider>
            <BulkPrintPOComponent />
        </OrderProvider>
    )
}
