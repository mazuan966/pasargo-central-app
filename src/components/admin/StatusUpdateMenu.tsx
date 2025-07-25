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
import { MoreHorizontal, Printer, Trash2, FileText } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';
import Link from 'next/link';

interface StatusUpdateMenuProps {
  orderId: string;
  currentStatus: OrderStatus;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function StatusUpdateMenu({ orderId, currentStatus, onUpdateStatus, onDeleteOrder }: StatusUpdateMenuProps) {
    const statuses: OrderStatus[] = ['Order Created', 'Processing', 'Pick Up', 'Delivered', 'Completed', 'Cancelled'];
    
    const handleUpdate = (status: OrderStatus) => {
        onUpdateStatus(orderId, status);
    }
    const handleDelete = () => {
        onDeleteOrder(orderId);
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
                 <DropdownMenuItem asChild>
                    <Link href={`/admin/dashboard/orders/${orderId}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                    </Link>
                 </DropdownMenuItem>
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
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Order</span>
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
