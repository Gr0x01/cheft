import Link from 'next/link';
import Image from 'next/image';
import { getStorageUrl } from '@/lib/utils/storage';
import { getLocationLink } from '@/lib/utils/location';
import { MichelinStar } from '@/components/icons/MichelinStar';

interface RestaurantMiniCardProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state?: string | null;
    country?: string | null;
    price_tier?: string | null;
    status: 'open' | 'closed' | 'unknown';
    google_rating?: number | null;
    photo_urls?: string[] | null;
    michelin_stars?: number | null;
  };
  bordered?: boolean;
}

export function RestaurantMiniCard({ restaurant, bordered = false }: RestaurantMiniCardProps) {
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);
  const isClosed = restaurant.status === 'closed';
  const locationLink = getLocationLink(restaurant.state, restaurant.country);

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group relative flex bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={bordered ? { border: '1px solid var(--border-light)' } : {}}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full z-10 transition-all duration-300 group-hover:w-1.5"
        style={{ background: isClosed ? 'var(--text-muted)' : 'var(--accent-primary)' }}
      />
      {photoUrl ? (
        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden">
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="96px"
          />
          {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
            <div className="absolute top-1 right-1">
              <div className="flex items-center gap-0.5 px-1 py-0.5" style={{ background: '#D3072B' }}>
                {Array.from({ length: restaurant.michelin_stars }).map((_, i) => (
                  <MichelinStar key={i} size={8} className="text-white" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div 
          className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--slate-900)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z" />
          </svg>
        </div>
      )}
      <div className={`flex-1 p-4 flex flex-col justify-center ${isClosed ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 
              className={`font-display text-base font-bold truncate transition-colors group-hover:text-[var(--accent-primary)] ${isClosed ? 'line-through' : ''}`}
              style={{ color: 'var(--text-primary)' }}
            >
              {restaurant.name}
            </h3>
            {locationLink ? (
              <span className="block font-mono text-[10px] tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
              </span>
            ) : (
              <p className="font-mono text-[10px] tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
              </p>
            )}
          </div>
          {isClosed ? (
            <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 flex-shrink-0" style={{ background: 'var(--slate-700)', color: 'white' }}>
              CLOSED
            </span>
          ) : restaurant.price_tier ? (
            <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: 'var(--accent-primary)' }}>
              {restaurant.price_tier}
            </span>
          ) : null}
        </div>
        {restaurant.google_rating && (
          <div className="mt-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 fill-current" style={{ color: '#f59e0b' }} viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{restaurant.google_rating}</span>
          </div>
        )}
      </div>
      <div className="absolute inset-0 border border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]" />
    </Link>
  );
}
