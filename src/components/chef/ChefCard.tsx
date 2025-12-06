import Link from 'next/link';
import { abbreviateShowName, formatSeasonDisplay } from '@/lib/utils/showBadges';
import { ShowBadgeCompact } from './ShowBadgeCompact';

interface ChefCardProps {
  chef: {
    id: string;
    name: string;
    slug: string;
    photo_url?: string | null;
    instagram_handle?: string | null;
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
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const totalShows = chef.chef_shows?.length || 0;
  const additionalShowCount = totalShows > 1 ? totalShows - 1 : 0;
  
  const hasJamesBeard = chef.james_beard_status === 'winner' || chef.james_beard_status === 'nominated';

  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group relative flex flex-col bg-white border border-slate-200 overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-[#B87333] hover:-translate-y-2"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Copper accent bar */}
      <div 
        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
        style={{ background: '#B87333' }}
      />

      {/* Main content - flexible */}
      <div className="p-5 pl-6 flex-1 relative">
        {/* Top-right: James Beard badge (floated) */}
        {hasJamesBeard && (
          <div className="absolute top-0 right-0">
            {chef.james_beard_status === 'winner' && (
              <span 
                className="font-mono text-[10px] tracking-wider px-2 py-1 flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff' }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                JB AWARD
              </span>
            )}
            {chef.james_beard_status === 'nominated' && (
              <span 
                className="font-mono text-[10px] tracking-wider px-2 py-1"
                style={{ background: '#1d4ed8', color: '#ffffff' }}
              >
                JB NOMINEE
              </span>
            )}
          </div>
        )}

        {/* Chef name */}
        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-slate-900 mb-2 pr-24">
          {chef.name}
        </h3>

        {/* Restaurant count */}
        <div className="mb-3">
          {typeof chef.restaurant_count === 'number' && chef.restaurant_count > 0 && (
            <span className="font-mono text-xs tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>
              {chef.restaurant_count} RESTAURANT{chef.restaurant_count !== 1 ? 'S' : ''}
            </span>
          )}
        </div>

        {/* Show indicator (primary show + count) */}
        {primaryShow && (
          <div className="flex items-center gap-2">
            <ShowBadgeCompact 
              show={primaryShow.show}
              season={null}
              result={primaryShow.result}
              hideSeason
            />
            {additionalShowCount > 0 && (
              <span 
                className="font-mono text-[9px] tracking-wider font-medium uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                + {additionalShowCount} MORE SHOW{additionalShowCount !== 1 ? 'S' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer with view indicator - fixed height */}
      <div className="px-5 pl-6 py-4 border-t mt-auto" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex items-center justify-end">
          <span 
            className="font-mono text-xs font-semibold tracking-wide transition-all duration-300 group-hover:translate-x-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            VIEW →
          </span>
        </div>
      </div>

      {/* Hover effects */}
      <div 
        className="absolute inset-0 border-2 border-transparent transition-all duration-300 pointer-events-none group-hover:border-[#B87333] group-hover:shadow-[0_0_0_1px_#B87333]"
      />
    </Link>
  );
}