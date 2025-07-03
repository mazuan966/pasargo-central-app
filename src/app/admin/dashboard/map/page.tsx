'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { mockOrders } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the map component to prevent SSR issues with Leaflet
const VendorMap = dynamic(() => import('@/components/admin/VendorMap'), { 
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full" />
});

interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

export default function AdminMapPage() {
  const vendors = useMemo(() => {
    const vendorsWithLocation = mockOrders
      .map(order => order.user)
      .filter(user => user.latitude && user.longitude);
      
    // Deduplicate vendors using a Map to ensure each vendor appears only once
    const uniqueVendors = Array.from(
      new Map(vendorsWithLocation.map(vendor => [vendor.id, vendor])).values()
    );

    return uniqueVendors as Vendor[];
  }, []);
  
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
