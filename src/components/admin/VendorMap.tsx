'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import { useMemo } from 'react';

interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

interface VendorMapProps {
    vendors: Vendor[];
}

// Create the icon once, outside of the component render cycle
const redPinIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin" style="color: #ef4444; fill: #fef2f2;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    className: 'bg-transparent border-0',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});


export default function VendorMap({ vendors }: VendorMapProps) {
    const position: LatLngExpression = [4.2105, 101.9758]; // Center of Malaysia
    const zoom = 7;

    // Memoize the filtering of vendors to avoid recalculating on every render
    const validVendors = useMemo(() => 
        vendors.filter(v => v.latitude && v.longitude),
        [vendors]
    );

    return (
        <MapContainer center={position} zoom={zoom} scrollWheelZoom={true} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validVendors.map(vendor => (
                <Marker key={vendor.id} position={[vendor.latitude!, vendor.longitude!]} icon={redPinIcon}>
                    <Popup>
                        <p className="font-semibold">{vendor.restaurantName}</p>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
