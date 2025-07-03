'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPinOff } from 'lucide-react';

export default function AdminMapPage() {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Vendor Map</CardTitle>
            <CardDescription>Visualizing vendor locations across the region.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center h-[600px] bg-muted/50 rounded-md">
                <MapPinOff className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Map Feature Unavailable</h3>
                <p className="text-muted-foreground">This feature is currently under maintenance. Please check back later.</p>
            </div>
        </CardContent>
    </Card>
  );
}
