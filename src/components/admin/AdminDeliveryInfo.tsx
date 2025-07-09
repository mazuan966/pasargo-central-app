'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, FileImage, Sparkles, CameraOff } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export function AdminDeliveryInfo({ order }: { order: Order }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery & Verification</CardTitle>
        <CardDescription>Review uploaded proof of delivery and AI analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Delivery Photo</h4>
          {order.deliveryPhotoUrl ? (
            <div className="relative w-full max-w-md aspect-video rounded-md overflow-hidden border">
              <Image src={order.deliveryPhotoUrl} alt={`Delivery receipt for order ${order.id}`} fill className="object-contain" />
            </div>
          ) : (
            <div className="p-4 border-dashed border-2 rounded-md text-center text-muted-foreground bg-muted/50">
              <CameraOff className="mx-auto h-8 w-8 mb-2" />
              <p>No delivery photo has been uploaded yet.</p>
            </div>
          )}
        </div>

        <div>
            <h4 className="font-semibold text-sm mb-2">AI Verification Result</h4>
            {order.deliveryVerification ? (
                 <Alert variant={order.deliveryVerification.isOrderCompleted ? "default" : "destructive"} className="bg-background">
                    {order.deliveryVerification.isOrderCompleted ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <AlertTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Verification Analysis
                    </AlertTitle>
                    <AlertDescription>
                        <div className="space-y-2 mt-2">
                            <p><strong>Status:</strong> {order.deliveryVerification.isOrderCompleted ? "Order Completed" : "Verification Failed"}</p>
                            <p><strong>Confidence:</strong> {(order.deliveryVerification.confidence * 100).toFixed(0)}%</p>
                            {order.deliveryVerification.notes && <p><strong>Notes:</strong> {order.deliveryVerification.notes}</p>}
                            <p className="text-xs text-muted-foreground pt-1">Verified at: {isMounted ? format(new Date(order.deliveryVerification.verifiedAt), 'dd/MM/yyyy HH:mm') : ''}</p>
                        </div>
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="p-4 border-dashed border-2 rounded-md text-center text-muted-foreground bg-muted/50">
                    <FileImage className="mx-auto h-8 w-8 mb-2" />
                    <p>Verification has not been run for this order.</p>
                </div>
            )}
        </div>

      </CardContent>
    </Card>
  );
}
