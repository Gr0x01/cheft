'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngTuple, DivIcon, point } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { MapPin } from '@/lib/types';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

// Rendering all ~1,270 pins individually put roughly 5,000 nodes in the DOM and a
// Leaflet marker object behind each one, which was the bulk of the desktop main-thread
// cost. Clustering keeps that to what's actually on screen.
const CLUSTER_ICON = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 32 : count < 100 ? 40 : 48;
  return new DivIcon({
    html: `<div class="cluster-bubble"><span>${count}</span></div>`,
    className: 'cluster-marker',
    iconSize: point(size, size, true),
  });
};

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
  const isClosed = pin.status === 'closed';

  // No isMounted guard: this component is only ever imported with ssr: false, so it
  // never renders on the server. Gating on mount state cost a useState and a useEffect
  // per pin — over a thousand of each on a full map.
  const markerIcon = useMemo(() => {
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
  }, [isSelected, isClosed]);

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

  // Picking a restaurant in the sidebar only highlighted its pin, which clustering would
  // hide inside a bubble. Fly to it instead — zoom 12 is past disableClusteringAtZoom, so
  // the pin is always rendered individually by the time the map settles.
  const sidebarSelectedPin = useMemo(
    () => (selectedPinId ? validPins.find(p => p.id === selectedPinId) ?? null : null),
    [selectedPinId, validPins]
  );

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
        
        <MapController selectedPin={selectedPin ?? sidebarSelectedPin} />
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          showCoverageOnHover={false}
          // MapController flies to zoom 12 on selection, so stop clustering just below
          // that — otherwise a pin picked from the sidebar could stay inside a cluster.
          disableClusteringAtZoom={11}
          iconCreateFunction={CLUSTER_ICON}
        >
          {validPins.map((pin) => (
            <PinMarker
              key={pin.id}
              pin={pin}
              isSelected={selectedPinId === pin.id || selectedPin?.id === pin.id}
              onSelect={handlePinSelect}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
