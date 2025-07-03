
'use client';

import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression } from 'leaflet';
import { useEffect, useRef } from 'react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = new L.Icon({
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
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

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
