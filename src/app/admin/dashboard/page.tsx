import { mockOrders } from '@/lib/mock-data';
import type { Order, OrderStatus, PaymentStatus } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cva } from 'class-variance-authority';

const statusBadgeVariants = cva(
  "border-transparent",
  {
    variants: {
      status: {
        'Order Created': "bg-yellow-200 text-yellow-800",
        Processing: "bg-blue-200 text-blue-800",
        'Pick Up': "bg-indigo-200 text-indigo-800",
        Delivered: "bg-green-200 text-green-800",
        Completed: "bg-emerald-200 text-emerald-800",
        Cancelled: "bg-red-200 text-red-800",
      },
    },
    defaultVariants: {
      status: "Order Created",
    },
  }
)

const paymentBadgeVariants = cva(
  "border-transparent",
  {
    variants: {
      status: {
        'Pending Payment': "bg-red-200 text-red-800",
        'Pending Confirmation': "bg-yellow-200 text-yellow-800",
        Paid: "bg-green-200 text-green-800",
      },
    },
    defaultVariants: {
      status: "Pending Payment",
    },
  }
)

function StatusUpdateMenu({ orderId, currentStatus }: { orderId: string, currentStatus: OrderStatus }) {
    const statuses: OrderStatus[] = ['Order Created', 'Processing', 'Pick Up', 'Delivered', 'Cancelled'];
    // In a real app, this would call a server action
    const handleUpdate = (status: OrderStatus) => {
        console.log(`Updating order ${orderId} to ${status}`);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {statuses.map(status => (
                    <DropdownMenuItem key={status} onClick={() => handleUpdate(status)} disabled={status === currentStatus}>
                        Set to {status}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function AdminDashboardPage() {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">All Orders</CardTitle>
            <CardDescription>Manage and track all customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mockOrders.map((order: Order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.user.restaurantName}</TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={statusBadgeVariants({ status: order.status })}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={paymentBadgeVariants({ status: order.paymentStatus })}>
                                {order.paymentStatus}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">RM {order.total.toFixed(2)}</TableCell>
                         <TableCell className="text-right">
                           <StatusUpdateMenu orderId={order.id} currentStatus={order.status} />
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
