import Link from 'next/link';
import Image from 'next/image';
import { ShowBadgeStrip } from './ShowBadgeStrip';
import { abbreviateShowName, formatSeasonDisplay } from '@/lib/utils/showBadges';

interface ChefCardProps {
  chef: {
    id: string;
    name: string;
    slug: string;
    photo_url?: string | null;
    mini_bio?: string | null;
    james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
    restaurant_count?: number;
    chef_shows?: Array<{
      show?: { name: string } | null;
      season?: string | null;
      result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary?: boolean;
    }>;
  };
  className?: string;
  index?: number;
}

export function ChefCard({ chef, index = 0 }: ChefCardProps) {
  const isPriority = index < 4;
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const result = primaryShow?.result;
  const season = primaryShow?.season;
  const showName = primaryShow?.show?.name;
  const isWinner = result === 'winner';
  const isJBWinner = chef.james_beard_status === 'winner';
  const photoUrl = chef.photo_url;
  const hasMultipleShows = (chef.chef_shows?.length || 0) > 1;

  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group relative block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Copper accent bar */}
      <div 
        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
        style={{ background: 'var(--accent-primary)' }}
      />

      {/* Image container with overlay */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--slate-100)' }}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={chef.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={isPriority}
            quality={60}
          />
        ) : (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--slate-100) 0%, var(--slate-200) 100%)' }}
          >
            <span 
              className="font-display text-7xl font-bold"
              style={{ color: 'var(--slate-300)' }}
            >
              {chef.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Badges - top right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {isWinner && (
            <span 
              className="font-mono text-[10px] font-bold tracking-wider px-2 py-1"
              style={{ background: 'var(--accent-success)', color: 'white' }}
            >
              WINNER
            </span>
          )}
          {isJBWinner && (
            <span 
              className="font-mono text-[10px] font-bold tracking-wider px-2 py-1 flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f' }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              JB AWARD
            </span>
          )}
        </div>

        {/* Name and info - bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ paddingBottom: hasMultipleShows ? '48px' : '16px' }}>
          <h3 
            className="font-display text-2xl font-bold leading-tight tracking-tight text-white"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            {chef.name}
          </h3>
          
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {result && result !== 'contestant' && (
              <span 
                className="font-mono text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5"
                style={{ 
                  background: result === 'winner' ? 'rgba(16, 185, 129, 0.9)' : 
                             result === 'finalist' ? 'rgba(245, 158, 11, 0.9)' : 
                             result === 'judge' ? 'rgba(99, 102, 241, 0.9)' : 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              >
                {result}
              </span>
            )}
            {showName && (
              <span 
                className="font-mono text-[10px] tracking-wide px-2 py-0.5 flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
              >
                <span className="font-bold">{abbreviateShowName(showName)}</span>
                {season && (
                  <>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span>{formatSeasonDisplay(season)}</span>
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Secondary shows strip */}
        {hasMultipleShows && (
          <ShowBadgeStrip 
            shows={chef.chef_shows || []} 
            maxVisible={3}
            className="hidden sm:flex"
          />
        )}
        {hasMultipleShows && (
          <ShowBadgeStrip 
            shows={chef.chef_shows || []} 
            maxVisible={2}
            className="flex sm:hidden"
          />
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex items-center justify-between">
          {typeof chef.restaurant_count === 'number' && chef.restaurant_count > 0 ? (
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {chef.restaurant_count} RESTAURANT{chef.restaurant_count !== 1 ? 'S' : ''}
            </span>
          ) : (
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              —
            </span>
          )}
          <span 
            className="font-mono text-xs font-semibold tracking-wide transition-colors duration-200 group-hover:translate-x-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            VIEW →
          </span>
        </div>
      </div>

      {/* Hover border effect */}
      <div 
        className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]"
      />
    </Link>
  );
}
