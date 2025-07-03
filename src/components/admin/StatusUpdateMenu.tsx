'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Printer } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';

export function StatusUpdateMenu({ orderId, currentStatus }: { orderId: string, currentStatus: OrderStatus }) {
    const statuses: OrderStatus[] = ['Order Created', 'Processing', 'Pick Up', 'Delivered', 'Completed', 'Cancelled'];
    // In a real app, this would call a server action
    const handleUpdate = (status: OrderStatus) => {
        console.log(`Updating order ${orderId} to ${status}`);
    }
    const handleDelete = () => {
        console.log(`Deleting order ${orderId}`);
    }
    const handlePrintPO = () => {
        window.open(`/admin/print/po/${orderId}`, '_blank');
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
                 <DropdownMenuItem onClick={handlePrintPO}>
                    <Printer className="mr-2 h-4 w-4" />
                    <span>Print PO</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {statuses.map(status => (
                    <DropdownMenuItem key={status} onClick={() => handleUpdate(status)} disabled={status === currentStatus}>
                        Set to {status}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                        >
                            Delete Order
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the order.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
