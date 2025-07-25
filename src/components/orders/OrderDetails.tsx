
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Calendar, Truck, CheckCircle, Clock, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageProvider';

export function OrderDetails({ order }: { order: Order }) {
  const [isMounted, setIsMounted] = useState(false);
  const { getTranslated, t } = useLanguage();
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Order Created':
        return <Package className="h-5 w-5 text-gray-500" />;
      case 'Processing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'Pick Up':
        return <Truck className="h-5 w-5 text-indigo-500" />;
      case 'Delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Completed':
        return <CheckCheck className="h-5 w-5 text-emerald-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('invoice.number')} {order.orderNumber}</CardTitle>
            <CardDescription>
              {t('order_details.placed_on')} {isMounted ? format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm') : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">{t('order_details.items_ordered')}</h3>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={`${item.productId}-${item.variantId}-${index}`} className="flex justify-between items-center">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {getTranslated(item, 'name')} ({item.variantName})
                      {item.amendmentStatus === 'added' && <Badge className="bg-blue-200 text-blue-800 font-normal">Added</Badge>}
                      {item.amendmentStatus === 'updated' && <Badge className="bg-yellow-200 text-yellow-800 font-normal">Updated</Badge>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x RM {item.price.toFixed(2)}
                    </p>
                  </div>
                  <p>RM {(item.quantity * item.price).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {order.subtotal !== undefined && order.sst !== undefined ? (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <p>{t('cart.subtotal')}</p>
                        <p>RM {order.subtotal.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                        <p>{t('cart.sst')}</p>
                        <p>RM {order.sst.toFixed(2)}</p>
                    </div>
                </div>
              </>
            ) : null}

            <Separator className="my-4" />
            <div className="flex justify-between font-bold text-lg">
              <p>{t('cart.total')}</p>
              <p>RM {order.total.toFixed(2)}</p>
            </div>
             <Separator className="my-4" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold mb-2">{t('order_details.delivery_details')}</h4>
                    <p className="text-sm"><span className="text-muted-foreground">{t('checkout.delivery_date')}:</span> {isMounted ? format(new Date(order.deliveryDate), 'dd/MM/yyyy') : ''}</p>
                    <p className="text-sm"><span className="text-muted-foreground">{t('checkout.delivery_time')}:</span> {order.deliveryTimeSlot}</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">{t('order_details.payment_info')}</h4>
                    <p className="text-sm"><span className="text-muted-foreground">{t('checkout.payment_method_title')}:</span> {order.paymentMethod}</p>
                    <p className="text-sm"><span className="text-muted-foreground">{t('order_details.payment_status')}:</span> {t(`payment_status.${order.paymentStatus.toLowerCase().replace(/ /g, '_')}`)}</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>{t('order_details.order_status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {order.statusHistory.map((history, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-primary/20 p-2">
                      {getStatusIcon(history.status)}
                    </div>
                    {index < order.statusHistory.length - 1 && (
                        <div className="w-px h-8 bg-border"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{t(`status.${history.status.toLowerCase().replace(/ /g, '_')}`)}</p>
                    <p className="text-sm text-muted-foreground">
                      {isMounted ? format(new Date(history.timestamp), 'dd/MM/yyyy HH:mm') : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
