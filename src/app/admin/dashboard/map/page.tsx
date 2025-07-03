'use client';

import { mockOrders } from '@/lib/mock-data';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';

// Dynamically import the map component to prevent SSR issues with Leaflet
const VendorMap = dynamic(() => import('@/components/admin/VendorMap'), { 
    ssr: false,
    loading: () => <div style={{ height: '600px', width: '100%' }} className="bg-muted rounded-md animate-pulse"></div>
});

export default function AdminMapPage() {
  // Memoize the vendors array to prevent unnecessary re-renders of the map component
  const vendors = useMemo(() => {
    return mockOrders
      .map(order => order.user)
      .filter(user => user.latitude && user.longitude)
      .reduce((acc, current) => {
          if (!acc.find(item => item.id === current.id)) {
              acc.push(current);
          }
          return acc;
      }, [] as Order['user'][]);
  }, []); // mockOrders is static, so we can use an empty dependency array

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
