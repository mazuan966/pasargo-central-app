
'use client';

import { OrderListItem } from '@/components/orders/OrderListItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import type { Order } from '@/lib/types';
import { useLanguage } from '@/context/LanguageProvider';

export default function OrdersPage() {
  const { orders } = useOrders();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  
  const userOrders = orders;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{t('orders.title')}</CardTitle>
        <CardDescription>{t('orders.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
            {userOrders.length > 0 ? (
                userOrders.map((order: Order) => (
                    <OrderListItem key={order.id} order={order} />
                ))
            ) : (
                <p className="text-center text-muted-foreground py-12">{t('orders.no_orders')}</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
