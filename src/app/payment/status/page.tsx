
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // This is now the Firestore doc ID

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (orderId && statusId === '1') {
      // Redirect to the printable invoice after a short delay
      timer = setTimeout(() => {
        router.replace(`/print/invoice/${orderId}`);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [orderId, statusId, router]);

  const handleRedirect = () => {
    if (orderId) {
      router.replace(`/orders/${orderId}`);
    } else {
      router.replace('/dashboard');
    }
  };

  let title, description, icon;
  
  if (statusId === '1') {
    title = 'Payment Successful!';
    description = "Your payment has been received and is being processed. You will be redirected to your invoice shortly. A confirmation has been sent via the backend callback.";
    icon = <CheckCircle className="h-16 w-16 text-green-500" />;
  } else if (statusId === '2') {
    title = 'Payment Pending';
    description = "Your payment is still pending. We will update the order status once confirmed. You can close this window.";
    icon = <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />;
  } else if (statusId === '3') {
    title = 'Payment Failed';
    description = "There was a problem with your payment. Please try again.";
    icon = <XCircle className="h-16 w-16 text-destructive" />;
  } else {
    // This fallback is for when the page is accessed without the correct parameters.
    title = 'Invalid Payment Status';
    description = "Could not determine payment status. Please check your orders page or contact support.";
    icon = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
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
