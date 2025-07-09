
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // This is the Firestore doc ID

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (orderId && statusId === '1') {
      // Redirect to the specific order details page after a delay on success
      timer = setTimeout(() => {
        router.replace(`/orders/${orderId}`);
      }, 5000); 
    } else if (orderId && (statusId === '2' || statusId === '3')) {
        // Redirect back to the payment page for pending or failed payments
        timer = setTimeout(() => {
            router.replace(`/payment/${orderId}`);
        }, 5000);
    } else {
        // Fallback if no orderId is present
        timer = setTimeout(() => {
            router.replace('/dashboard');
        }, 5000);
    }
    return () => clearTimeout(timer);
  }, [orderId, statusId, router]);

  let title, description, icon, buttonText, buttonLink;
  
  if (statusId === '1') {
    title = 'Payment Successful!';
    description = "Your payment has been confirmed. You will be redirected to your order shortly.";
    icon = <CheckCircle className="h-16 w-16 text-green-500" />;
    buttonText = 'Go to Order Details Now';
    buttonLink = `/orders/${orderId}`;
  } else if (statusId === '2') {
    title = 'Payment Pending';
    description = "Your payment is still pending. We will update the order status once confirmed. Redirecting...";
    icon = <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />;
    buttonText = 'Try Again';
    buttonLink = `/payment/${orderId}`;
  } else if (statusId === '3') {
    title = 'Payment Failed';
    description = "There was a problem with your payment. Please try again or contact support. Redirecting...";
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
        <CardContent>
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
