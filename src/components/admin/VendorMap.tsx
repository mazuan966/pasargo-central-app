'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import React from 'react';

// This is a workaround for a known issue with react-leaflet and webpack
// It ensures the default marker icons are loaded correctly.
// This code now runs only on the client.
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
  iconUrl: require('leaflet/dist/images/marker-icon.png').default,
  shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
});


interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

interface VendorMapProps {
    vendors: Vendor[];
}

const MAP_CENTER: LatLngExpression = [4.2105, 101.9758]; // Center of Malaysia
const MAP_ZOOM = 7;


// This is now a simple, "dumb" component that just renders the map based on its props.
export default function VendorMap({ vendors }: VendorMapProps) {
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
