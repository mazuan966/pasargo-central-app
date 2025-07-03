'use client';

import { useOrders } from '@/hooks/use-orders';
import { useParams } from 'next/navigation';
import { PrintableInvoice } from '@/components/orders/PrintableInvoice';
import { useEffect, useState } from 'react';
import { OrderProvider } from '@/context/OrderProvider';
import { Order } from '@/lib/types';

function PrintInvoiceComponent() {
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
        return <div>Loading invoice...</div>;
    }
    
    return <PrintableInvoice order={order} />;
}

export default function PrintInvoicePage() {
    return (
        <OrderProvider>
            <PrintInvoiceComponent />
        </OrderProvider>
    )
}
