import { OrderDetails } from '@/components/orders/OrderDetails';
import { DeliveryVerification } from '@/components/orders/DeliveryVerification';
import { mockOrders } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const order = mockOrders.find(o => o.id === params.id);

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

      {order.status === 'Delivered' && (
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
