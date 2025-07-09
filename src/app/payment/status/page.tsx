
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // This is the Firestore Doc ID for redirect purposes.

  useEffect(() => {
    // Redirect user to the relevant order page after 5 seconds.
    // The actual order processing is handled by the server callback.
    if (orderId) {
      const timer = setTimeout(() => {
        router.replace(`/orders/${orderId}`);
      }, 5000); // 5-second delay before redirecting
      return () => clearTimeout(timer);
    }
  }, [orderId, router]);

  let title, description, icon;

  if (statusId === '1') {
    title = 'Payment Successful!';
    description = "Your payment has been received. The order status will be updated shortly via a confirmation from the server. You will be redirected soon.";
    icon = <CheckCircle className="h-16 w-16 text-green-500" />;
  } else if (statusId === '2') {
    title = 'Payment Pending';
    description = "Your payment is still pending. We will update the order status once confirmed. You can close this window.";
    icon = <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />;
  } else {
    title = 'Payment Failed';
    description = "There was a problem with your payment. Please try again or contact support.";
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
            Go to Order Details Now
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
  );
}
