'use client';

import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression } from 'leaflet';
import { useEffect, useRef } from 'react';

// Icon setup to fix a common issue with webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Create a reusable icon object that will be passed to each marker
const defaultIcon = L.icon({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
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

    // Initialize map
    useEffect(() => {
        // Only initialize the map once
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

        // Cleanup function to destroy the map instance
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount and unmount

    // Update markers when vendors prop changes
    useEffect(() => {
        if (!mapRef.current) return;

        // Clear existing markers from the map
        markersRef.current.forEach(marker => marker.removeFrom(mapRef.current!));
        markersRef.current = []; // Clear the reference array

        // Add new markers to the map
        vendors.forEach(vendor => {
            if (vendor.latitude && vendor.longitude) {
                // Pass the icon directly to each marker instance for reliability
                const marker = L.marker([vendor.latitude, vendor.longitude], { icon: defaultIcon })
                    .addTo(mapRef.current!)
                    .bindPopup(`<p class="font-semibold">${vendor.restaurantName}</p>`);
                markersRef.current.push(marker);
            }
        });
    }, [vendors]); // Re-run this effect only when the vendors prop changes

    // This div is the container for the map
    return (
        <div 
            ref={mapContainerRef} 
            style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }} 
        />
    );
}
