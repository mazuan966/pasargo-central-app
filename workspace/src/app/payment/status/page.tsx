'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // Toyyibpay calls it billExternalReferenceNo

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (orderId) {
      timer = setTimeout(() => {
        router.replace(`/orders/${orderId}`);
      }, 5000); // Redirect after 5 seconds
    }
    return () => clearTimeout(timer);
  }, [orderId, router]);

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
    description = "Your payment has been confirmed. You will be redirected to your order shortly.";
    icon = <CheckCircle className="h-16 w-16 text-green-500" />;
  } else if (statusId === '2') {
    title = 'Payment Pending';
    description = "Your payment is still pending. We will update the order status once confirmed. Redirecting...";
    icon = <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />;
  } else if (statusId === '3') {
    title = 'Payment Failed';
    description = "There was a problem with your payment. Please try again. Redirecting...";
    icon = <XCircle className="h-16 w-16 text-destructive" />;
  } else {
    title = 'Processing Payment';
    description = "Please wait while we confirm your payment status...";
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
          <Button onClick={handleRedirect}>
            {orderId ? 'Go to Order Details' : 'Go to Dashboard'}
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
