
import { notFound } from 'next/navigation';
import { PrintableInvoice } from '@/components/orders/PrintableInvoice';
import type { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// This is a Server Component
export default async function PaymentPage({ params }: { params: { id: string } }) {
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
        console.error("Error fetching payment page data on server:", error);
        notFound();
    }

    if (!businessDetails) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-2xl font-bold text-destructive mb-2">Configuration Error</h1>
                    <p className="text-muted-foreground">Business details are not set up.</p>
                    <p className="text-muted-foreground mt-1">An administrator must save the business settings in the admin dashboard before payments can be processed.</p>
                </div>
            </div>
        );
    }
    
    if (!order) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Complete Your Payment</CardTitle>
                    <CardDescription>
                        Please review your order details below and proceed to payment. This order will not be processed until payment is complete.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PrintableInvoice order={order} businessDetails={businessDetails} />
                </CardContent>
                <CardFooter className="flex-col items-end gap-4 border-t pt-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            This is a placeholder. The "Pay Now" button is not functional yet.
                        </AlertDescription>
                    </Alert>
                    <Button size="lg" disabled>
                        <CreditCard className="mr-2" />
                        Pay Now (RM {order.total.toFixed(2)})
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
