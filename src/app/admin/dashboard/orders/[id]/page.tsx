'use client';

import { useOrders } from '@/hooks/use-orders';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Order } from '@/lib/types';
import { OrderDetails } from '@/components/orders/OrderDetails';
import { AdminDeliveryInfo } from '@/components/admin/AdminDeliveryInfo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PaymentManager } from '@/components/admin/PaymentManager';

export default function AdminOrderDetailsPage() {
    const params = useParams<{ id: string }>();
    const { orders } = useOrders();
    const [order, setOrder] = useState<Order | undefined>();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const foundOrder = orders.find(o => o.id === params.id);
        setOrder(foundOrder);
    }, [params.id, orders]);

    if (!isMounted) {
        return (
            <div className="flex w-full justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!order) {
        notFound();
        return null; // For TypeScript
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
                    <PaymentManager order={order} />
                    <AdminDeliveryInfo order={order} />
                </div>
            </div>
        </div>
    );
}
