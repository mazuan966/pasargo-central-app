
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { confirmFpxPaymentAction } from '@/lib/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // Firestore doc ID

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs only once when the component mounts.
    if (statusId === '1' && orderId) {
      startTransition(async () => {
        const result = await confirmFpxPaymentAction(orderId);
        if (result.success) {
          // On success, redirect to the printable invoice.
          router.replace(`/print/invoice/${orderId}`);
        } else {
          setError(result.message || 'An unknown error occurred while confirming your order.');
        }
      });
    }
  }, [statusId, orderId, router]);

  if (isPending) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <CardTitle className="text-2xl">Confirming Payment...</CardTitle>
          <CardDescription>
            Please wait, we are confirming your payment and preparing your notifications.
            <br/>
            <strong>Do not close this window.</strong>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
            <div className="flex justify-center mb-4"><XCircle className="h-16 w-16 text-destructive" /></div>
            <CardTitle className="text-2xl">Confirmation Failed</CardTitle>
            <Alert variant="destructive" className="text-left mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href={orderId ? `/orders/${orderId}` : '/dashboard'}>Return to Order</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  let title, description, icon;
  
  if (statusId === '1') {
    title = 'Payment Confirmed!';
    description = "Your payment has been received. You will be redirected shortly...";
    icon = <CheckCircle className="h-16 w-16 text-green-500" />;
  } else if (statusId === '2') {
    title = 'Payment Pending';
    description = "Your payment is still pending. We will update the order status once confirmed. You can close this window.";
    icon = <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />;
  } else {
    title = 'Payment Failed';
    description = "There was a problem with your payment. Please try again.";
    icon = <XCircle className="h-16 w-16 text-destructive" />;
  }

  return (
    <Card className="w-full max-w-md text-center">
        <CardHeader>
        <div className="flex justify-center mb-4">{icon}</div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href={orderId ? `/orders/${orderId}` : '/dashboard'}>
                View Your Order
                </Link>
            </Button>
        </CardContent>
    </Card>
  );
}

export default function PaymentStatusPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <PaymentStatusContent />
            </Suspense>
        </main>
    )
}
