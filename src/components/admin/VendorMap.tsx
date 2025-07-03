'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import React from 'react';

interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

interface VendorMapProps {
    vendors: Vendor[];
}

// Define constants outside the component to prevent re-creation on render
const MAP_CENTER: LatLngExpression = [4.2105, 101.9758]; // Center of Malaysia
const MAP_ZOOM = 7;
const RED_PIN_ICON = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin" style="color: #ef4444; fill: #fef2f2;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    className: 'bg-transparent border-0',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

// This is now a simple, "dumb" component that just renders the map based on its props.
export default function VendorMap({ vendors }: VendorMapProps) {
    return (
        <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} scrollWheelZoom={true} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {vendors.map(vendor => (
                <Marker key={vendor.id} position={[vendor.latitude!, vendor.longitude!]} icon={RED_PIN_ICON}>
                    <Popup>
                        <p className="font-semibold">{vendor.restaurantName}</p>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};
