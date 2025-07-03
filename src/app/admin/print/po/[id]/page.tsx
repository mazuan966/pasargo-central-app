'use client';

import { useOrders } from '@/hooks/use-orders';
import { notFound, useParams } from 'next/navigation';
import { PrintablePO } from '@/components/admin/PrintablePO';
import { useEffect, useState } from 'react';
import { OrderProvider } from '@/context/OrderProvider';
import { Order } from '@/lib/types';

function PrintPOComponent() {
    const params = useParams<{ id: string }>();
    const { orders } = useOrders();
    const [order, setOrder] = useState<Order | undefined>(undefined);

    useEffect(() => {
        const foundOrder = orders.find(o => o.id === params.id);
        setOrder(foundOrder);
    }, [orders, params.id]);

    useEffect(() => {
        if (order) {
            // Delay to allow rendering before printing
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [order]);

    if (!order) {
        // You can render a loading state or just null
        return <div>Loading order...</div>;
    }
    
    return <PrintablePO order={order} />;
}

export default function PrintPOPage() {
    return (
        <OrderProvider>
            <PrintPOComponent />
        </OrderProvider>
    )
}
