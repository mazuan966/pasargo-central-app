
'use client';

import { notFound, useParams } from 'next/navigation';
import { PrintableInvoice } from '@/components/orders/PrintableInvoice';
import type { Order, BusinessDetails } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { initiatePaymentAction } from '@/lib/actions';
import { useEffect, useState, useTransition } from 'react';

function PaymentButton({ orderId, total }: { orderId: string, total: number }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      initiatePaymentAction(orderId);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Button size="lg" type="submit" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 animate-spin" />
        ) : (
          <CreditCard className="mr-2" />
        )}
        {isPending ? 'Redirecting...' : `Pay Now (RM ${total.toFixed(2)})`}
      </Button>
    </form>
  );
}

// This is a Server Component
export default function PaymentPage() {
    const params = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!params.id || !db) {
            setError("Invalid request.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [orderDocSnap, businessDocSnap] = await Promise.all([
                    getDoc(doc(db, 'orders', params.id as string)),
                    getDoc(doc(db, 'settings', 'business'))
                ]);

                if (orderDocSnap.exists()) {
                    setOrder({ id: orderDocSnap.id, ...orderDocSnap.data() } as Order);
                } else {
                    notFound();
                    return;
                }

                if (businessDocSnap.exists()) {
                    setBusinessDetails(businessDocSnap.data() as BusinessDetails);
                } else {
                     setError("Business details are not set up. An administrator must save settings before payments can be processed.");
                }
            } catch (err) {
                console.error("Error fetching payment page data:", err);
                setError("Could not fetch order details.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params.id]);


    if (loading) {
        return (
            <div className="flex w-full justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
         return (
            <div className="flex h-screen w-full items-center justify-center text-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Configuration Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (!order) {
        notFound();
        return null;
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
                    {businessDetails ? (
                        <PrintableInvoice order={order} businessDetails={businessDetails} />
                    ) : (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Cannot Display Invoice</AlertTitle>
                            <AlertDescription>Business details are missing. Please contact support.</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-end gap-4 border-t pt-6">
                    {order.paymentStatus === 'Paid' ? (
                        <Alert className="bg-green-50 border-green-200 text-green-800">
                           <AlertTriangle className="h-4 w-4 !text-green-800" />
                            <AlertTitle>Payment Complete</AlertTitle>
                            <AlertDescription>
                                This order has already been paid.
                            </AlertDescription>
                        </Alert>
                    ) : (
                       <PaymentButton orderId={order.id} total={order.total} />
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
