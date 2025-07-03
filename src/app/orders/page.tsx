'use client';

import { OrderListItem } from '@/components/orders/OrderListItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const { orders } = useOrders();
  const { currentUser } = useAuth();
  
  // The useOrders hook now fetches filtered orders if a user is logged in.
  // If not, it fetches all (for admin, which we'll handle separately).
  // So, we don't need to filter here again.
  const userOrders = orders;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Your Orders</CardTitle>
        <CardDescription>View your order history and track current deliveries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
            {userOrders.length > 0 ? (
                userOrders.map((order: Order) => (
                    <OrderListItem key={order.id} order={order} />
                ))
            ) : (
                <p className="text-center text-muted-foreground py-12">You haven&apos;t placed any orders yet.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
