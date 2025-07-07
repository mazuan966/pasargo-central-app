import { notFound } from 'next/navigation';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PrintHandler } from '@/components/layout/PrintHandler';

// This is now a Server Component
export default async function BulkPrintPOPage({ searchParams }: { searchParams: { ids?: string } }) {
    const orderIds = searchParams.ids ? searchParams.ids.split(',') : [];

    if (orderIds.length === 0 || !db) {
        notFound();
    }

    let ordersToPrint: Order[] = [];
    let businessDetails: BusinessDetails | null = null;

    try {
        const [businessDocSnap, ordersSnapshot] = await Promise.all([
            getDoc(doc(db, 'settings', 'business')),
            getDocs(query(collection(db, 'orders'), where(documentId(), 'in', orderIds)))
        ]);

        if (businessDocSnap.exists()) {
            businessDetails = businessDocSnap.data() as BusinessDetails;
        }

        if (!ordersSnapshot.empty) {
            const foundOrders = ordersSnapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Order);
            const sortedOrders = orderIds.map(id => foundOrders.find(o => o.id === id)).filter(Boolean) as Order[];
            ordersToPrint = sortedOrders;
        }

    } catch (error) {
        console.error("Error fetching bulk print data on server:", error);
        notFound();
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
    
    if (ordersToPrint.length === 0) {
        notFound();
    }
    
    return (
        <div className="bg-white">
            {ordersToPrint.map((order) => (
                <div key={order.id} className="printable-po-container">
                    <PrintablePO order={order} businessDetails={businessDetails!} />
                </div>
            ))}
            <PrintHandler />
        </div>
    );
}
