import Link from 'next/link';
import type { Order, OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Hash, Package, DollarSign } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { format } from 'date-fns';

const statusBadgeVariants = cva(
  "border-transparent",
  {
    variants: {
      status: {
        'Order Created': "bg-yellow-200 text-yellow-800 hover:bg-yellow-300",
        Processing: "bg-blue-200 text-blue-800 hover:bg-blue-300",
        'Pick Up': "bg-indigo-200 text-indigo-800 hover:bg-indigo-300",
        Delivered: "bg-green-200 text-green-800 hover:bg-green-300",
        Completed: "bg-emerald-200 text-emerald-800 hover:bg-emerald-300",
        Cancelled: "bg-red-200 text-red-800 hover:bg-red-300",
      },
    },
    defaultVariants: {
      status: "Order Created",
    },
  }
)

export function OrderListItem({ order }: { order: Order }) {

  return (
    <div className="py-4 px-2 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-lg text-primary flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Order {order.orderNumber}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(order.orderDate), 'dd/MM/yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{order.items.reduce((acc, item) => acc + item.quantity, 0)} items</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4" />
            <span>RM {order.total.toFixed(2)}</span>
        </div>

        <div>
          <Badge variant="outline" className={statusBadgeVariants({ status: order.status })}>
            {order.status}
          </Badge>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={`/orders/${order.id}`}>
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
