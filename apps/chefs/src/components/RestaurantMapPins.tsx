'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngTuple, DivIcon } from 'leaflet';
import type { MapPin } from '@/lib/types';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

interface RestaurantMapPinsProps {
  pins: MapPin[];
  selectedPinId?: string | null;
  onPinSelect?: (pin: MapPin) => void;
  isLoading?: boolean;
}

function PinMarker({ 
  pin, 
  isSelected,
  onSelect 
}: { 
  pin: MapPin; 
  isSelected: boolean;
  onSelect: (pin: MapPin) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const isClosed = pin.status === 'closed';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const markerIcon = useMemo(() => {
    if (!isMounted) return null;
    return new DivIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-wrapper ${isSelected ? 'selected' : ''} ${isClosed ? 'closed' : ''}">
          <div class="marker-dot">
            <div class="marker-inner"></div>
          </div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -8]
    });
  }, [isMounted, isSelected, isClosed]);

  if (!markerIcon) return null;

  return (
    <Marker 
      position={[pin.lat, pin.lng] as LatLngTuple}
      icon={markerIcon}
      eventHandlers={{
        click: () => onSelect(pin)
      }}
    >
      <Popup className="restaurant-popup-simple" closeButton={false}>
        <div className="popup-simple">
          <h3 className="popup-simple-name">{pin.name}</h3>
          <p className="popup-simple-chef">by {pin.chef_name}</p>
          <p className="popup-simple-location">
            {pin.city}{pin.state ? `, ${pin.state}` : ''}
            {pin.price_tier && <span className="popup-simple-price"> · {pin.price_tier}</span>}
          </p>
          <Link 
            href={`/restaurants/${pin.slug}`}
            className="popup-simple-link"
          >
            View Details →
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

function MapController({ selectedPin }: { selectedPin?: MapPin | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedPin) {
      map.flyTo([selectedPin.lat, selectedPin.lng], 12, { duration: 0.8 });
    }
  }, [selectedPin, map]);
  
  return null;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export default function RestaurantMapPins({ 
  pins, 
  selectedPinId,
  onPinSelect,
  isLoading 
}: RestaurantMapPinsProps) {
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const validPins = useMemo(() => 
    pins.filter(p => isValidCoordinate(p.lat, p.lng)),
    [pins]
  );

  const mapCenter = useMemo((): LatLngTuple => {
    if (validPins.length === 0) {
      return [39.8283, -98.5795];
    }
    const centerLat = validPins.reduce((sum, p) => sum + p.lat, 0) / validPins.length;
    const centerLng = validPins.reduce((sum, p) => sum + p.lng, 0) / validPins.length;
    return [centerLat, centerLng];
  }, [validPins]);

  const defaultZoom = 4;

  const handlePinSelect = (pin: MapPin) => {
    setSelectedPin(pin);
    onPinSelect?.(pin);
  };

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
        
        <MapController selectedPin={selectedPin} />
        
        {validPins.map((pin) => (
          <PinMarker 
            key={pin.id}
            pin={pin}
            isSelected={selectedPinId === pin.id || selectedPin?.id === pin.id}
            onSelect={handlePinSelect}
          />
        ))}
      </MapContainer>
    </div>
  );
}
