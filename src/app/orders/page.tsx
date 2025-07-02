import { OrderListItem } from '@/components/orders/OrderListItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { mockOrders } from '@/lib/mock-data';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const userOrders = mockOrders.filter(o => o.user.id === 'user-01');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Your Orders</CardTitle>
        <CardDescription>View your order history and track current deliveries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
            {userOrders.map((order: Order) => (
                <OrderListItem key={order.id} order={order} />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
