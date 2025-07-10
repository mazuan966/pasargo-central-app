
'use client';

import { OrderListItem } from '@/components/orders/OrderListItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/hooks/use-auth';
import type { Order } from '@/lib/types';
import { useLanguage } from '@/context/LanguageProvider';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersPage() {
  const { orders } = useOrders();
  const { loading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  const isLoading = authLoading || !orders;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{t('orders.title')}</CardTitle>
        <CardDescription>{t('orders.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
            {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full my-2" />)
            ) : orders.length > 0 ? (
                orders.map((order: Order) => (
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
