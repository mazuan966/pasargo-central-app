
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusId = searchParams.get('status_id');
  const orderId = searchParams.get('order_id'); // This is the Firestore doc ID

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (orderId && statusId === '1') {
      // Redirect to the printable invoice page after 5 seconds on success
      timer = setTimeout(() => {
        router.replace(`/print/invoice/${orderId}`);
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

  let title, description, icon, buttonText, buttonLink, warning;
  
  if (statusId === '1') {
    title = 'Payment Successful!';
    description = "Your payment has been confirmed. You will be redirected to your invoice shortly.";
    icon = <CheckCircle className="h-16 w-16 text-green-500" />;
    buttonText = 'View Invoice Now';
    buttonLink = `/print/invoice/${orderId}`;
    warning = "Important: Please do not close this window. You will be redirected automatically.";
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
        <CardContent className="space-y-4">
           {warning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Do Not Close This Page</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
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
