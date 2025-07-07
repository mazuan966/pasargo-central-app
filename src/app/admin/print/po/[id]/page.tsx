import { notFound } from 'next/navigation';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PrintHandler } from '@/components/layout/PrintHandler';

// This is now a Server Component
export default async function PrintPOPage({ params }: { params: { id: string } }) {
    if (!params.id || !db) {
        notFound();
    }

    let order: Order | null = null;
    let businessDetails: BusinessDetails | null = null;

    try {
        const [orderDocSnap, businessDocSnap] = await Promise.all([
            getDoc(doc(db, 'orders', params.id as string)),
            getDoc(doc(db, 'settings', 'business'))
        ]);

        if (orderDocSnap.exists()) {
            order = { id: orderDocSnap.id, ...orderDocSnap.data() } as Order;
        }

        if (businessDocSnap.exists()) {
            businessDetails = businessDocSnap.data() as BusinessDetails;
        }
    } catch (error) {
        console.error("Error fetching print data on server:", error);
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
    
    if (!order) {
        notFound();
    }
    
    return (
        <div className="bg-white">
            <PrintablePO order={order} businessDetails={businessDetails} />
            <PrintHandler />
        </div>
    );
}
