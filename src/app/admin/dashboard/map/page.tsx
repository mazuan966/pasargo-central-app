'use client';

import { mockOrders } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import React from 'react';
import 'leaflet/dist/leaflet.css';
// We need to manually import the marker icon images when using the default icon with webpack.
import L from 'leaflet';

// This is a workaround for a known issue with react-leaflet and webpack
// It ensures the default marker icons are loaded correctly.
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
  iconUrl: require('leaflet/dist/images/marker-icon.png').default,
  shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
});


// Dynamically import the MapContainer and related components.
// We define a simple map component here to ensure it's loaded only on the client.
const Map = dynamic(
  async () => {
    const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');

    // The component that will be dynamically loaded
    return function MapComponent({ vendors }: { vendors: any[] }) {
      return (
        <MapContainer center={[4.2105, 101.9758]} zoom={7} scrollWheelZoom={true} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vendors.map(vendor => (
            <Marker key={vendor.id} position={[vendor.latitude!, vendor.longitude!]}>
              <Popup>
                <p className="font-semibold">{vendor.restaurantName}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => <div style={{ height: '600px', width: '100%' }} className="bg-muted rounded-md animate-pulse"></div>,
  }
);


export default function AdminMapPage() {
  const vendors = React.useMemo(() => {
    return mockOrders
      .map(order => order.user)
      .filter(user => user.latitude && user.longitude)
      .reduce((acc, current) => {
          if (!acc.find(item => item.id === current.id)) {
              acc.push(current);
          }
          return acc;
      }, [] as { id: string; restaurantName: string; latitude?: number; longitude?: number }[]);
  }, []);
  
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Vendor Map</CardTitle>
            <CardDescription>Visualizing vendor locations across the region.</CardDescription>
        </CardHeader>
        <CardContent>
            <Map vendors={vendors} />
        </CardContent>
    </Card>
  );
}
