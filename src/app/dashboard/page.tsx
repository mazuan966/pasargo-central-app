import ProductList from '@/components/shop/ProductList';
import { mockProducts, mockOrders } from '@/lib/mock-data';
import { OrderListItem } from '@/components/orders/OrderListItem';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const userOrders = mockOrders
    .filter(o => o.user.id === 'user-01')
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  
  const recentOrders = userOrders.filter(order => order.status === 'Processing' || order.paymentStatus === 'Unpaid');

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-headline font-bold">Welcome to your Dashboard</h1>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-x-4">
                <div>
                    <CardTitle className="font-headline text-2xl">Action Required</CardTitle>
                    <CardDescription>Orders that are processing or pending payment.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/orders">
                        View All Orders
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {recentOrders.length > 0 ? (
                    <div className="divide-y">
                        {recentOrders.map((order: Order) => (
                            <OrderListItem key={order.id} order={order} />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">You have no orders requiring attention.</p>
                )}
            </CardContent>
        </Card>

        <div>
            <div className="flex items-center mb-6">
                <h2 className="text-2xl font-headline font-bold">Products</h2>
            </div>
            <ProductList products={mockProducts} />
        </div>
    </div>
  );
}
