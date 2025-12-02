import Link from 'next/link';
import Image from 'next/image';
import { getRestaurantStatus, getChefAchievements, sanitizeText, validateImageUrl } from '@/lib/utils/restaurant';
import { getStorageUrl } from '@/lib/utils/storage';

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state?: string | null;
    price_tier?: string | null;
    cuisine_tags?: string[] | null;
    status: 'open' | 'closed' | 'unknown';
    google_rating?: number | null;
    google_review_count?: number | null;
    google_photos?: string[] | null;
    chef?: {
      name: string;
      slug: string;
      james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
      chef_shows?: Array<{
        result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
        is_primary?: boolean;
      }>;
    } | null;
  };
  index?: number;
}

export function RestaurantCard({ restaurant, index = 0 }: RestaurantCardProps) {
  const status = getRestaurantStatus(restaurant.status);
  const chefAchievements = restaurant.chef ? getChefAchievements(restaurant.chef) : { isShowWinner: false, isJBWinner: false, isJBNominee: false, isJBSemifinalist: false };
  
  const sanitizedName = sanitizeText(restaurant.name);
  const sanitizedCity = sanitizeText(restaurant.city);
  const sanitizedState = sanitizeText(restaurant.state);
  const sanitizedChefName = restaurant.chef ? sanitizeText(restaurant.chef.name) : '';
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.google_photos?.[0]);

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

      {photoUrl && (
        <div className="relative w-full h-48 overflow-hidden bg-gray-100">
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        </div>
      )}

      <div className={`p-5 pl-6 ${status.isClosed ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 
              className={`font-display text-xl font-bold truncate transition-colors group-hover:text-[var(--accent-primary)] ${status.isClosed ? 'line-through' : ''}`}
              style={{ color: 'var(--text-primary)' }}
            >
              {sanitizedName}
            </h3>
            <p className="font-mono text-xs tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
              {sanitizedCity}{sanitizedState ? `, ${sanitizedState}` : ''}
            </p>
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

        {restaurant.chef && (
          <p 
            className="mt-3 font-ui text-sm font-medium truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            by {sanitizedChefName}
            {chefAchievements.isShowWinner && (
              <span 
                className="ml-2 font-mono text-[10px] tracking-wider px-1.5 py-0.5"
                style={{ background: 'var(--accent-success)', color: 'white' }}
                aria-label="Show winner"
              >
                WINNER
              </span>
            )}
            {chefAchievements.isJBWinner && (
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
