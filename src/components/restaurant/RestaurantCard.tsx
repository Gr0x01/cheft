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
    photo_urls?: string[] | null;
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
  const isPriority = index < 4;
  const status = getRestaurantStatus(restaurant.status);
  const chefAchievements = restaurant.chef ? getChefAchievements(restaurant.chef) : { isShowWinner: false, isJBWinner: false, isJBNominee: false, isJBSemifinalist: false };
  
  const sanitizedName = sanitizeText(restaurant.name);
  const sanitizedCity = sanitizeText(restaurant.city);
  const sanitizedState = sanitizeText(restaurant.state);
  const sanitizedChefName = restaurant.chef ? sanitizeText(restaurant.chef.name) : '';
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);

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
        <div className="relative w-full h-48 overflow-hidden bg-gray-100">
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={isPriority}
            quality={60}
          />
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
          <svg 
            className="relative w-16 h-16" 
            style={{ color: 'var(--accent-primary)' }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z"
            />
          </svg>
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
