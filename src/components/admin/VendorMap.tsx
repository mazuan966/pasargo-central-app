
'use client';

import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression } from 'leaflet';
import { useEffect, useRef } from 'react';

// Use CDN URLs for the marker icons to bypass Next.js bundling issues.
// This is a definitive fix for the "iconUrl not set" error.
const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


const MAP_CENTER: LatLngExpression = [4.2105, 101.9758];
const MAP_ZOOM = 7;

interface Vendor {
    id: string;
    restaurantName: string;
    latitude?: number;
    longitude?: number;
}

interface VendorMapProps {
    vendors: Vendor[];
}

export default function VendorMap({ vendors }: VendorMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: MAP_CENTER,
                zoom: MAP_ZOOM,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (mapRef.current) {
            // Clear existing markers
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            // Add new markers
            vendors.forEach(vendor => {
                if (vendor.latitude && vendor.longitude) {
                    const marker = L.marker(
                        [vendor.latitude, vendor.longitude], 
                        { icon: defaultIcon }
                    )
                        .addTo(mapRef.current!)
                        .bindPopup(`<p class="font-semibold">${vendor.restaurantName}</p>`);
                    markersRef.current.push(marker);
                }
            });
        }
    }, [vendors]);

    return (
        <div 
            ref={mapContainerRef} 
            style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }} 
        />
    );
}
