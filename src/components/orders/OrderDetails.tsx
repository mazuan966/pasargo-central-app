import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Calendar, Truck, CheckCircle, Clock, CheckCheck } from 'lucide-react';

export function OrderDetails({ order }: { order: Order }) {
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
            <CardTitle>Order #{order.id}</CardTitle>
            <CardDescription>
              Placed on {new Date(order.orderDate).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">Items Ordered</h3>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.productId} className="flex justify-between items-center">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x RM {item.price.toFixed(2)}
                    </p>
                  </div>
                  <p>RM {(item.quantity * item.price).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-bold text-lg">
              <p>Total</p>
              <p>RM {order.total.toFixed(2)}</p>
            </div>
             <Separator className="my-4" />
             <div className="space-y-2">
                <p><span className="font-semibold">Payment Method:</span> {order.paymentMethod}</p>
                <p><span className="font-semibold">Payment Status:</span> {order.paymentStatus}</p>
             </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
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
                    <p className="font-semibold">{history.status}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(history.timestamp).toLocaleString()}
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
