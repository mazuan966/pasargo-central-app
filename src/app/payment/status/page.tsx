
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendOrderConfirmationNotifications } from '@/lib/actions';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // This is the Firestore doc ID
  const [isProcessing, setIsProcessing] = useState(true);
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    if (statusId === '1' && orderId) {
      const confirmPayment = async () => {
        setIsProcessing(true);
        setMessage("Payment successful! Finalizing your order... Do not close this page.");

        if (!db) {
          setMessage("Error: Database connection failed.");
          setIsProcessing(false);
          return;
        }

        try {
          // Perform the update directly on the client with user's auth
          const orderRef = doc(db, 'orders', orderId);
          const orderDoc = await getDoc(orderRef);

          if (orderDoc.exists() && orderDoc.data().paymentStatus !== 'Paid') {
            const orderData = orderDoc.data() as Order;
            const newHistory = [...orderData.statusHistory, { status: 'Processing', timestamp: new Date().toISOString() }];
            
            await updateDoc(orderRef, {
              paymentStatus: 'Paid',
              status: 'Processing',
              statusHistory: newHistory
            });
            
            // Now that the status is updated, trigger server-side notifications
            await sendOrderConfirmationNotifications(orderId);
          }

          // Redirect after everything is done.
          const timer = setTimeout(() => {
            router.replace(`/print/invoice/${orderId}`);
          }, 1000);
          return () => clearTimeout(timer);

        } catch (error: any) {
          setMessage(`Error: ${error.message || 'Failed to confirm order.'}`);
          setIsProcessing(false);
        }
      };
      
      confirmPayment();
    } else {
      setIsProcessing(false);
    }
  }, [statusId, orderId, router]);

  let title, description, icon, buttonText, buttonLink;
  
  if (statusId === '1') {
    title = 'Payment Successful!';
    description = message;
    icon = <Loader2 className="h-16 w-16 animate-spin text-green-500" />;
    buttonText = 'View Invoice Now';
    buttonLink = `/print/invoice/${orderId}`;
  } else if (statusId === '2') {
    title = 'Payment Pending';
    description = "Your payment is still pending. We will update the order status once confirmed.";
    icon = <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />;
    buttonText = 'Go to Orders';
    buttonLink = `/orders/${orderId}`;
  } else if (statusId === '3') {
    title = 'Payment Failed';
    description = "There was a problem with your payment. Please try again or contact support.";
    icon = <XCircle className="h-16 w-16 text-destructive" />;
    buttonText = 'Try Payment Again';
    buttonLink = `/payment/${orderId}`;
  } else {
    // Fallback for when status_id is not present or invalid
    title = 'Processing Payment Status';
    description = "We are confirming your payment status. You will be redirected shortly.";
    icon = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
    buttonText = 'Go to Dashboard';
    buttonLink = '/dashboard';
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">{icon}</div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {statusId === '1' && isProcessing && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Do Not Close This Page</AlertTitle>
              <AlertDescription>You will be redirected automatically once your order is confirmed.</AlertDescription>
            </Alert>
          )}
          <Button asChild>
            <Link href={buttonLink || '/dashboard'}>{buttonText}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function PaymentStatusPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <PaymentStatusContent />
        </Suspense>
    )
}
