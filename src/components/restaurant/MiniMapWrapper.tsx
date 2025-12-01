'use client';

import dynamic from 'next/dynamic';

const MiniMap = dynamic(
  () => import('./MiniMap').then(mod => mod.MiniMap),
  { 
    ssr: false, 
    loading: () => (
      <div 
        className="w-full h-full animate-pulse" 
        style={{ background: 'var(--bg-tertiary)' }} 
      />
    )
  }
);

interface MiniMapWrapperProps {
  lat: number;
  lng: number;
  name: string;
  className?: string;
}

export function MiniMapWrapper({ lat, lng, name, className }: MiniMapWrapperProps) {
  return <MiniMap lat={lat} lng={lng} name={name} className={className} />;
}
