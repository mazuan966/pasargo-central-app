'use client';

import { useMemo } from 'react';
import { useOrders } from '@/hooks/use-orders';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const VendorMap = dynamic(() => import('@/components/admin/VendorMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full rounded-md" />,
});

interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

export default function AdminMapPage() {
    const { orders } = useOrders();

    const vendors = useMemo(() => {
        const vendorsWithLocation = orders
            .map(order => order.user)
            .filter(user => user.latitude !== undefined && user.longitude !== undefined);

        const uniqueVendors = Array.from(
          new Map(vendorsWithLocation.map(vendor => [vendor.id, vendor])).values()
        );

        return uniqueVendors as Vendor[];
    }, [orders]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Vendor Map</CardTitle>
                <CardDescription>Visualizing vendor locations across the region.</CardDescription>
            </CardHeader>
            <CardContent>
                <VendorMap vendors={vendors} />
            </CardContent>
        </Card>
    );
}
