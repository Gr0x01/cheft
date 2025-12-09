'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngTuple, DivIcon, LatLngBounds } from 'leaflet';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

interface RestaurantLocation {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  city: string;
  chef_name: string;
}

interface ShowRestaurantMapInnerProps {
  restaurants: RestaurantLocation[];
}

function FitBounds({ restaurants }: { restaurants: RestaurantLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (restaurants.length === 0) return;
    
    const bounds = new LatLngBounds(
      restaurants.map(r => [r.lat, r.lng] as LatLngTuple)
    );
    
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }, [map, restaurants]);
  
  return null;
}

function RestaurantMarker({ restaurant }: { restaurant: RestaurantLocation }) {
  const markerIcon = useMemo(() => new DivIcon({
    className: 'show-map-marker',
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background: var(--accent-primary, #d35e0f);
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.2s ease;
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8]
  }), []);

  return (
    <Marker 
      position={[restaurant.lat, restaurant.lng] as LatLngTuple}
      icon={markerIcon}
    >
      <Popup className="show-map-popup" closeButton={false}>
        <div className="p-3 min-w-[200px]">
          <Link 
            href={`/restaurants/${restaurant.slug}`}
            className="block group"
          >
            <h4 className="font-display text-base font-bold leading-tight group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
              {restaurant.name}
            </h4>
            <p className="font-mono text-[10px] tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
              {restaurant.city}
            </p>
            <p className="font-ui text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              by {restaurant.chef_name}
            </p>
            <span className="inline-block mt-2 font-mono text-[10px] font-semibold tracking-wider" style={{ color: 'var(--accent-primary)' }}>
              VIEW →
            </span>
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

export default function ShowRestaurantMapInner({ restaurants }: ShowRestaurantMapInnerProps) {
  const centerLat = restaurants.length > 0 
    ? restaurants.reduce((sum, r) => sum + r.lat, 0) / restaurants.length
    : 39.8283;
  
  const centerLng = restaurants.length > 0
    ? restaurants.reduce((sum, r) => sum + r.lng, 0) / restaurants.length  
    : -98.5795;

  const mapCenter: LatLngTuple = [centerLat, centerLng];

  return (
    <MapContainer
      center={mapCenter}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      
      <FitBounds restaurants={restaurants} />
      
      {restaurants.map((restaurant) => (
        <RestaurantMarker key={restaurant.id} restaurant={restaurant} />
      ))}
    </MapContainer>
  );
}
