import Link from 'next/link';
import Image from 'next/image';

interface RestaurantPreviewCardProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state?: string | null;
    photo_urls?: string[] | null;
    google_rating?: number | null;
    price_tier?: '$' | '$$' | '$$$' | '$$$$' | null;
    status: 'open' | 'closed' | 'unknown';
  };
  index?: number;
}

export function RestaurantPreviewCard({ restaurant, index = 0 }: RestaurantPreviewCardProps) {
  const photoUrl = restaurant.photo_urls?.[0];
  const isClosed = restaurant.status === 'closed';

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group/preview flex items-center gap-3 p-3 transition-all duration-200 hover:bg-white/5"
      style={{
        borderRadius: 'var(--radius-md)',
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--slate-200)',
        }}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-300 group-hover/preview:scale-110"
            sizes="80px"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--slate-100) 0%, var(--slate-200) 100%)' }}
          >
            <span className="font-display text-2xl font-bold" style={{ color: 'var(--slate-300)' }}>
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}
        
        {isClosed && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <span className="font-mono text-[9px] font-bold tracking-wider px-2 py-1" style={{ background: 'var(--slate-700)', color: 'white' }}>
              CLOSED
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4
          className="font-display text-base font-bold leading-tight truncate transition-colors duration-200"
          style={{ color: 'var(--text-primary)' }}
        >
          {restaurant.name}
        </h4>
        <p
          className="font-mono text-[11px] tracking-wide mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}
        </p>
        
        <div className="flex items-center gap-2 mt-1.5">
          {restaurant.google_rating && (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {restaurant.google_rating.toFixed(1)}
              </span>
            </div>
          )}
          {restaurant.price_tier && (
            <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
              {restaurant.price_tier}
            </span>
          )}
        </div>
      </div>

      <svg
        className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover/preview:translate-x-1"
        style={{ color: 'var(--accent-primary)' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
