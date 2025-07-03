'use client';

import { mockOrders } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the map component to prevent SSR issues with Leaflet
const VendorMap = dynamic(() => import('@/components/admin/VendorMap'), { 
    ssr: false,
    loading: () => <div style={{ height: '600px', width: '100%' }} className="bg-muted rounded-md animate-pulse"></div>
});

export default function AdminMapPage() {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Vendor Map</CardTitle>
            <CardDescription>Visualizing vendor locations across the region.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* We pass the user data directly; the map component will handle processing. */}
            <VendorMap vendors={mockOrders.map(order => order.user)} />
        </CardContent>
    </Card>
  );
}
