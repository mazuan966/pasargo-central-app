'use client';

import { OrderDetails } from '@/components/orders/OrderDetails';
import { DeliveryVerification } from '@/components/orders/DeliveryVerification';
import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const { orders } = useOrders();
  const order = orders.find(o => o.id === params.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <Button asChild variant="outline" size="sm" className="mb-4">
         <Link href="/orders" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
         </Link>
       </Button>
       
      <OrderDetails order={order} />

      {(order.status === 'Delivered' || order.status === 'Completed') && (
        <Card>
            <CardHeader>
                <CardTitle>Delivery Verification</CardTitle>
                <CardDescription>
                    {order.deliveryVerification 
                        ? 'Verification has been completed for this order.'
                        : 'Please upload a photo of the signed receipt to complete the order.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DeliveryVerification order={order} />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
