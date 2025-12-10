import Link from 'next/link';
import Image from 'next/image';
import { getRestaurantStatus, getChefAchievements, validateImageUrl } from '@/lib/utils/restaurant';
import { getStorageUrl } from '@/lib/utils/storage';
import { getLocationLink } from '@/lib/utils/location';
import { MichelinStar } from '../icons/MichelinStar';
import { Donut } from 'lucide-react';

interface ChefInfo {
  name: string;
  slug: string;
  james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
  chef_shows?: Array<{
    result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary?: boolean;
  }>;
}

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state?: string | null;
    country?: string | null;
    price_tier?: string | null;
    cuisine_tags?: string[] | null;
    status: 'open' | 'closed' | 'unknown';
    google_rating?: number | null;
    google_review_count?: number | null;
    photo_urls?: string[] | null;
    michelin_stars?: number | null;
    chef?: ChefInfo | null;
    chefs?: Array<{ chef?: ChefInfo | null; is_primary?: boolean }>;
  };
  index?: number;
}

function getChefNames(restaurant: RestaurantCardProps['restaurant']): { names: string; hasWinner: boolean; hasJBWinner: boolean } {
  const allChefs: ChefInfo[] = [];
  
  if (restaurant.chefs && restaurant.chefs.length > 0) {
    const sorted = [...restaurant.chefs].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    sorted.forEach(rc => { if (rc.chef) allChefs.push(rc.chef); });
  } else if (restaurant.chef) {
    allChefs.push(restaurant.chef);
  }
  
  if (allChefs.length === 0) return { names: '', hasWinner: false, hasJBWinner: false };
  
  const names = allChefs.map(c => c.name).join(' & ');
  const hasWinner = allChefs.some(c => getChefAchievements(c).isShowWinner);
  const hasJBWinner = allChefs.some(c => getChefAchievements(c).isJBWinner);
  
  return { names, hasWinner, hasJBWinner };
}

export function RestaurantCard({ restaurant, index = 0 }: RestaurantCardProps) {
  const isPriority = index < 4;
  const status = getRestaurantStatus(restaurant.status);
  const { names: chefNames, hasWinner: isShowWinner, hasJBWinner: isJBWinner } = getChefNames(restaurant);
  
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);
  const locationLink = getLocationLink(restaurant.state, restaurant.country);

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group relative block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
        style={{ background: status.isClosed ? 'var(--text-muted)' : 'var(--accent-primary)' }}
      />

      {photoUrl ? (
        <div className="relative w-full h-48 overflow-hidden bg-gray-100" data-closed={status.isClosed ? "true" : undefined}>
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="restaurant-card-image object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={isPriority}
            quality={60}
          />
          
          {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
            <div className="absolute top-3 right-3">
              <div 
                className="flex items-center gap-1 px-2 py-1"
                style={{ background: '#D3072B' }}
              >
                {Array.from({ length: restaurant.michelin_stars }).map((_, i) => (
                  <MichelinStar key={i} size={12} className="text-white" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div 
          className="relative w-full h-48 overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--slate-900)' }}
        >
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <Donut 
            className="relative w-16 h-16" 
            style={{ color: 'var(--accent-primary)' }}
            strokeWidth={1.5}
          />
          {status.isClosed && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              <span 
                className="font-mono text-lg font-bold tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                CLOSED
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`p-5 pl-6 ${status.isClosed ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 
              className={`font-display text-xl font-bold truncate transition-colors group-hover:text-[var(--accent-primary)] ${status.isClosed ? 'line-through' : ''}`}
              style={{ color: 'var(--text-primary)' }}
            >
              {restaurant.name}
            </h3>
            {locationLink ? (
              <span className="block font-mono text-xs tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
                {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
              </span>
            ) : (
              <p className="font-mono text-xs tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
                {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
              </p>
            )}
          </div>
          {restaurant.price_tier && (
            <span 
              className="font-mono text-sm font-bold flex-shrink-0"
              style={{ color: 'var(--accent-primary)' }}
            >
              {restaurant.price_tier}
            </span>
          )}
        </div>

        {chefNames && (
          <p 
            className="mt-3 font-ui text-sm font-medium truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            by {chefNames}
            {isShowWinner && (
              <span 
                className="ml-2 font-mono text-[10px] tracking-wider px-1.5 py-0.5"
                style={{ background: 'var(--accent-success)', color: 'white' }}
                aria-label="Show winner"
              >
                WINNER
              </span>
            )}
            {isJBWinner && (
              <span 
                className="ml-1 font-mono text-[10px] tracking-wider px-1.5 py-0.5"
                style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f' }}
                aria-label="James Beard Award winner"
              >
                JB
              </span>
            )}
          </p>
        )}

        {restaurant.google_rating && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="font-mono text-sm font-bold">{restaurant.google_rating}</span>
            </div>
            {restaurant.google_review_count && (
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                ({restaurant.google_review_count.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {restaurant.cuisine_tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="font-mono text-[10px] tracking-wide px-2 py-0.5"
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                {tag.toUpperCase()}
              </span>
            ))}
            {restaurant.cuisine_tags.length > 3 && (
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                +{restaurant.cuisine_tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div 
          className="mt-4 pt-4 flex items-center justify-between border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <span 
            className="font-mono text-[10px] tracking-widest"
            style={{ color: status.statusColor }}
          >
            {status.displayStatus}
          </span>
          <span 
            className="font-mono text-xs font-semibold tracking-wide transition-transform group-hover:translate-x-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            VIEW →
          </span>
        </div>
      </div>

      <div className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]" />
    </Link>
  );
}
