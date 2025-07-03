'use client';

import { useMemo } from 'react';
import { mockOrders } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import React from 'react';

// Import marker images directly.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


// This is a workaround for a known issue with react-leaflet and webpack
// It ensures the default marker icons are loaded correctly.
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

const MAP_CENTER: LatLngExpression = [4.2105, 101.9758]; // Center of Malaysia
const MAP_ZOOM = 7;

interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

// Define the map component outside the main page component to prevent re-creation on render.
const Map = ({ vendors }: { vendors: Vendor[] }) => {
    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} scrollWheelZoom={true} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}>
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

// Memoize the map component to prevent unnecessary re-renders.
const MemoizedMap = React.memo(Map);

export default function AdminMapPage() {
  const vendors = useMemo(() => {
    return mockOrders
      .map(order => order.user)
      .filter(user => user.latitude && user.longitude)
      // Deduplicate vendors based on their ID
      .reduce((acc, current) => {
          if (!acc.find(item => item.id === current.id)) {
              acc.push(current as Vendor);
          }
          return acc;
      }, [] as Vendor[]);
  }, []);
  
  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Vendor Map</CardTitle>
            <CardDescription>Visualizing vendor locations across the region.</CardDescription>
        </Header>
        <CardContent>
            <MemoizedMap vendors={vendors} />
        </CardContent>
    </Card>
  );
}
