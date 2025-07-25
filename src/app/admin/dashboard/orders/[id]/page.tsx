
'use client';

import { useOrders } from '@/hooks/use-orders';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { Order } from '@/lib/types';
import { OrderDetails } from '@/components/orders/OrderDetails';
import { AdminDeliveryInfo } from '@/components/admin/AdminDeliveryInfo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PaymentManager } from '@/components/admin/PaymentManager';
import { AmendmentManager } from '@/components/admin/AmendmentManager';

export default function AdminOrderDetailsPage() {
    const params = useParams<{ id: string }>();
    const { orders } = useOrders();

    // Derive the order directly from the context/props.
    // This avoids the useEffect/useState loop that caused the error.
    const order = useMemo(() => orders.find(o => o.id === params.id), [orders, params.id]);

    if (orders.length > 0 && !order) {
        notFound();
        return null;
    }
    
    if (!order) {
        return (
            <div className="flex w-full justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/dashboard" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to All Orders
                </Link>
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <OrderDetails order={order} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <AmendmentManager order={order} />
                    <PaymentManager order={order} />
                    <AdminDeliveryInfo order={order} />
                </div>
            </div>
        </div>
    );
}
