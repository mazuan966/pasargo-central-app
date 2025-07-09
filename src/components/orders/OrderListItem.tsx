
import Link from 'next/link';
import type { Order, OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Hash, Package, DollarSign, Loader2 } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cancelAwaitingPaymentOrderAction } from '@/lib/actions';

const statusBadgeVariants = cva(
  "border-transparent",
  {
    variants: {
      status: {
        'Awaiting Payment': "bg-gray-200 text-gray-800 hover:bg-gray-300",
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
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    const result = await cancelAwaitingPaymentOrderAction(order.id);
    if (result.success) {
        toast({ title: 'Order Cancelled', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Cancellation Failed', description: result.message });
        setIsCancelling(false);
    }
  };

  const isAwaitingPayment = order.status === 'Awaiting Payment';
  const buttonLink = isAwaitingPayment ? `/payment/${order.id}` : `/orders/${order.id}`;
  const buttonText = isAwaitingPayment ? 'Complete Payment' : 'View Details';

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

        <div className="flex items-center gap-2">
            {isAwaitingPayment ? (
                <>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isCancelling}>
                                Cancel Order
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will cancel your order #{order.orderNumber} and return the items to stock. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Go Back</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleCancelOrder}
                                    disabled={isCancelling}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Yes, Cancel
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button asChild variant="default" size="sm">
                        <Link href={buttonLink}>
                            {buttonText}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </>
            ) : (
                <Button asChild variant="outline" size="sm">
                    <Link href={buttonLink}>
                        {buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}
