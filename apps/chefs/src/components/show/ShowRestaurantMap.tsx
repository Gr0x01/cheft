'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ExternalLink } from 'lucide-react';

interface RestaurantLocation {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  city: string;
  chef_name: string;
}

interface ShowRestaurantMapProps {
  restaurants: RestaurantLocation[];
  showName: string;
  totalCities: number;
}

const MapComponent = dynamic(
  () => import('./ShowRestaurantMapInner'),
  { 
    ssr: false,
    loading: () => (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--bg-tertiary)' }}
        role="status"
        aria-label="Loading map"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} aria-hidden="true" />
          <span className="font-mono text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>Loading map...</span>
        </div>
      </div>
    )
  }
);

export function ShowRestaurantMap({ restaurants, showName, totalCities }: ShowRestaurantMapProps) {
  if (restaurants.length === 0) return null;

  return (
    <section className="py-12 border-b" style={{ background: 'var(--slate-900)', borderColor: 'var(--accent-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {showName} Restaurants
            </h2>
            <p className="mt-2 font-ui text-sm text-slate-300">
              {restaurants.length} {showName} restaurants across {totalCities} cities
            </p>
          </div>
          <Link 
            href="/discover"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider px-4 py-2 border border-white text-white transition-all hover:bg-white hover:text-slate-900"
          >
            EXPLORE ALL <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div 
          className="relative w-full overflow-hidden border"
          style={{ height: '400px', borderColor: 'var(--accent-primary)' }}
        >
          <MapComponent restaurants={restaurants} />
        </div>
      </div>
    </section>
  );
}
