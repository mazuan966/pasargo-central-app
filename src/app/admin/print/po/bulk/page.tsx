'use client';

import { useSearchParams, notFound } from 'next/navigation';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { useEffect, useState, useMemo } from 'react';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

function BulkPrintPOComponent() {
    const searchParams = useSearchParams();
    const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const orderIds = useMemo(() => {
        const ids = searchParams.get('ids');
        return ids ? ids.split(',') : [];
    }, [searchParams]);

    useEffect(() => {
        if (!orderIds.length || !db) {
            setIsLoading(false);
            return;
        }

        const fetchBulkData = async () => {
            setIsLoading(true);
            try {
                // Fetch business details and orders in parallel
                const [businessDocSnap, ordersSnapshot] = await Promise.all([
                    getDoc(doc(db, 'settings', 'business')),
                    getDocs(query(collection(db, 'orders'), where(documentId(), 'in', orderIds)))
                ]);

                if (businessDocSnap.exists()) {
                    setBusinessDetails(businessDocSnap.data() as BusinessDetails);
                } else {
                    console.log("No business details found!");
                }

                if (!ordersSnapshot.empty) {
                    const foundOrders = ordersSnapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Order);
                     // Sort them in the order of the IDs provided in the URL
                    const sortedOrders = orderIds.map(id => foundOrders.find(o => o.id === id)).filter(Boolean) as Order[];
                    setOrdersToPrint(sortedOrders);
                }

            } catch (error) {
                console.error("Error fetching bulk print data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchBulkData();
    }, [orderIds]);

    useEffect(() => {
        if (!isLoading && ordersToPrint.length > 0 && businessDetails) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, ordersToPrint, businessDetails]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                 Loading documents...
            </div>
        );
    }
    
    if (ordersToPrint.length === 0 || !businessDetails) {
        return notFound();
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
    return <BulkPrintPOComponent />;
}
