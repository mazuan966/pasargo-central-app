import { mockOrders } from '@/lib/mock-data';
import type { Order } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cva } from 'class-variance-authority';
import { StatusUpdateMenu } from '@/components/admin/StatusUpdateMenu';

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
