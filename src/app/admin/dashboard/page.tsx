
'use client';

import { useOrders } from '@/hooks/use-orders';
import type { Order, OrderStatus } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronDown, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const statusBadgeVariants = cva(
  "border-transparent",
  {
    variants: {
      status: {
        'Awaiting Payment': "bg-gray-200 text-gray-800",
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
        'Pending Payment': "bg-yellow-200 text-yellow-800",
        'Awaiting Payment': "bg-gray-200 text-gray-800",
        Paid: "bg-green-200 text-green-800",
        Failed: "bg-red-200 text-red-800",
      },
    },
    defaultVariants: {
      status: "Pending Payment",
    },
  }
)

export default function AdminDashboardPage() {
  const { orders, updateOrder, deleteOrder, bulkUpdateOrderStatus, bulkDeleteOrders } = useOrders();
  const { toast } = useToast();
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const visibleOrders = orders;

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const orderToUpdate = orders.find(order => order.id === orderId);
    if (!orderToUpdate) return;
    
    const newHistory = [...orderToUpdate.statusHistory, { status, timestamp: new Date().toISOString() }];
    const updatedOrder: Order = { ...orderToUpdate, status, statusHistory: newHistory };

    await updateOrder(updatedOrder);

    toast({
      title: 'Order Updated',
      description: `Order ${orderToUpdate.orderNumber} status set to ${status}.`
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrder(orderId);
    toast({
      title: 'Order Deleted',
      description: `Order has been removed.`,
      variant: 'destructive'
    });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedOrderIds(visibleOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectRow = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };
  
  const handleBulkUpdate = async (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    await bulkUpdateOrderStatus(selectedOrderIds, status);
    toast({
      title: 'Bulk Update Successful',
      description: `${selectedOrderIds.length} orders have been updated to "${status}".`
    });
    setSelectedOrderIds([]);
  };

  const handleBulkDelete = async () => {
    if (deleteConfirmation !== 'delete' || selectedOrderIds.length === 0) return;
    await bulkDeleteOrders(selectedOrderIds);
    toast({
      title: 'Bulk Delete Successful',
      description: `${selectedOrderIds.length} orders have been deleted.`,
      variant: 'destructive'
    });
    setSelectedOrderIds([]);
    setIsDeleteDialogOpen(false);
    setDeleteConfirmation('');
  };

  const handleBulkPrintPOs = () => {
    if (selectedOrderIds.length === 0) return;
    const ids = selectedOrderIds.join(',');
    window.open(`/admin/print/po/bulk?ids=${ids}`, '_blank');
  };

  const handleBulkExport = () => {
    if (selectedOrderIds.length === 0) return;

    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));
    
    const aggregatedItems = new Map<string, { name: string; quantity: number; unit: string }>();

    selectedOrders.forEach(order => {
        order.items.forEach(item => {
            const key = item.productId;
            const unit = item.unit || 'item'; 
            if (aggregatedItems.has(key)) {
                aggregatedItems.get(key)!.quantity += item.quantity;
            } else {
                aggregatedItems.set(key, {
                    name: item.name,
                    quantity: item.quantity,
                    unit: unit,
                });
            }
        });
    });

    const escapeCsv = (val: any) => {
      let str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const headers = ['Product Name', 'Total Quantity', 'Unit'];
    const rows = Array.from(aggregatedItems.values()).map(item => [
        item.name,
        item.quantity,
        item.unit
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `warehouse_packing_list_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
        title: 'Export Successful',
        description: 'Your warehouse packing list has been downloaded.',
    });
  };

  const isAllSelected = selectedOrderIds.length > 0 && selectedOrderIds.length === visibleOrders.length;
  const isSomeSelected = selectedOrderIds.length > 0 && selectedOrderIds.length < visibleOrders.length;
  const orderStatuses: OrderStatus[] = ['Order Created', 'Processing', 'Pick Up', 'Delivered', 'Completed', 'Cancelled'];

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">All Orders</CardTitle>
            <CardDescription>Manage and track all customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
             {selectedOrderIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-muted p-2 rounded-md mb-4 border">
                    <p className="text-sm font-medium">{selectedOrderIds.length} selected</p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                Change status
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {orderStatuses.map(status => (
                                <DropdownMenuItem key={status} onSelect={() => handleBulkUpdate(status)}>
                                    Set to {status}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Button variant="outline" size="sm" onClick={handleBulkPrintPOs}>
                        Print Selected POs
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleBulkExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export for Warehouse
                      </Button>
                      <div className="ml-auto">
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                            if (!open) {
                                setDeleteConfirmation('');
                            }
                            setIsDeleteDialogOpen(open);
                        }}>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete ({selectedOrderIds.length})
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete {selectedOrderIds.length} selected order(s).
                                      <br/><br/>
                                      To confirm, please type <strong>delete</strong> below.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                  value={deleteConfirmation}
                                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                                  placeholder='Type "delete" to confirm'
                                  className="my-2"
                              />
                              <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                      onClick={handleBulkDelete}
                                      disabled={deleteConfirmation !== 'delete'}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                      Delete
                                  </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      </div>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                          onCheckedChange={handleSelectAll}
                          checked={isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false)}
                          aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visibleOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          <p className="text-muted-foreground">No orders found.</p>
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleOrders.map((order: Order) => (
                    <TableRow key={order.id} data-state={selectedOrderIds.includes(order.id) ? "selected" : undefined}>
                        <TableCell>
                           <Checkbox
                              onCheckedChange={(checked) => handleSelectRow(order.id, !!checked)}
                              checked={selectedOrderIds.includes(order.id)}
                              aria-label={`Select order ${order.orderNumber}`}
                            />
                        </TableCell>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.user.restaurantName}</TableCell>
                        <TableCell>{format(new Date(order.orderDate), 'dd/MM/yyyy')}</TableCell>
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
                           <StatusUpdateMenu 
                             orderId={order.id} 
                             currentStatus={order.status}
                             onUpdateStatus={handleUpdateStatus}
                             onDeleteOrder={() => handleDeleteOrder(order.id)}
                           />
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
