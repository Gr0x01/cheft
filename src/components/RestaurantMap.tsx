'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { LatLngTuple, DivIcon } from 'leaflet';
import type { RestaurantWithDetails } from '@/lib/types';
import RestaurantPopup from './RestaurantPopup';
import 'leaflet/dist/leaflet.css';

interface RestaurantMapProps {
  restaurants: RestaurantWithDetails[];
  selectedRestaurant?: RestaurantWithDetails | null;
  hoveredRestaurantId?: string | null;
  onRestaurantSelect?: (restaurant: RestaurantWithDetails) => void;
  isLoading?: boolean;
}

function MapController({ selectedRestaurant }: { selectedRestaurant?: RestaurantWithDetails | null }) {
  const map = useMap();
  const prevSelectedIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng) {
      if (prevSelectedIdRef.current !== selectedRestaurant.id) {
        prevSelectedIdRef.current = selectedRestaurant.id;
        map.flyTo([selectedRestaurant.lat, selectedRestaurant.lng], 12, {
          duration: 0.8
        });
      }
    }
  }, [selectedRestaurant, map]);
  
  return null;
}

function RestaurantMarker({ 
  restaurant, 
  isSelected,
  isHovered,
  onSelect 
}: { 
  restaurant: RestaurantWithDetails; 
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (restaurant: RestaurantWithDetails) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const markerRef = useRef<LeafletMarker>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (markerRef.current) {
      if (isSelected) {
        markerRef.current.openPopup();
      } else {
        markerRef.current.closePopup();
      }
    }
  }, [isSelected]);

  const isClosed = restaurant.status === 'closed';

  const markerIcon = useMemo(() => {
    if (!isMounted) return null;
    return new DivIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-wrapper ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isClosed ? 'closed' : ''}">
          <div class="marker-dot">
            <div class="marker-inner"></div>
          </div>
          ${''}
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -8]
    });
  }, [isMounted, isSelected, isHovered, restaurant.name, isClosed]);

  if (!restaurant.lat || !restaurant.lng || !markerIcon) return null;

  return (
    <Marker 
      ref={markerRef}
      position={[restaurant.lat, restaurant.lng] as LatLngTuple}
      icon={markerIcon}
      eventHandlers={{
        click: () => onSelect(restaurant)
      }}
    >
      <Popup className="restaurant-popup-enhanced" closeButton={false}>
        <RestaurantPopup restaurant={restaurant} />
      </Popup>
    </Marker>
  );
}

export default function RestaurantMap({ 
  restaurants, 
  selectedRestaurant, 
  hoveredRestaurantId,
  onRestaurantSelect,
  isLoading 
}: RestaurantMapProps) {
  const validRestaurants = restaurants.filter(r => r.lat && r.lng);
  
  const centerLat = validRestaurants.length > 0 
    ? validRestaurants.reduce((sum, r) => sum + (r.lat || 0), 0) / validRestaurants.length
    : 39.8283;
  
  const centerLng = validRestaurants.length > 0
    ? validRestaurants.reduce((sum, r) => sum + (r.lng || 0), 0) / validRestaurants.length  
    : -98.5795;

  const mapCenter: LatLngTuple = [centerLat, centerLng];
  const defaultZoom = 4;

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="map-loading-spinner"></div>
        <span>Loading map...</span>
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <MapContainer
        center={mapCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController selectedRestaurant={selectedRestaurant} />
        
        {validRestaurants.map((restaurant) => (
          <RestaurantMarker 
            key={restaurant.id}
            restaurant={restaurant}
            isSelected={selectedRestaurant?.id === restaurant.id}
            isHovered={hoveredRestaurantId === restaurant.id}
            onSelect={onRestaurantSelect || (() => {})}
          />
        ))}
      </MapContainer>
    </div>
  );
}
