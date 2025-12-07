import Link from 'next/link';
import { abbreviateShowName } from '@/lib/utils/showBadges';

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
  hideShowName?: boolean;
}

export function ChefCard({ chef, index = 0, hideShowName = false }: ChefCardProps) {
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const totalShows = chef.chef_shows?.length || 0;
  const additionalShowCount = totalShows > 1 ? totalShows - 1 : 0;
  
  const hasJamesBeard = chef.james_beard_status === 'winner' || chef.james_beard_status === 'nominated';

  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group relative flex flex-col bg-white border border-slate-200 overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-[#B87333] hover:-translate-y-1"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Copper accent bar */}
      <div 
        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-1.5"
        style={{ background: '#B87333' }}
      />

      {/* Main content */}
      <div className="p-6 pl-7 flex-1 relative min-h-[140px] flex flex-col">
        {/* Chef name - PRIMARY */}
        <h3 className="font-display text-[1.75rem] font-bold leading-[1.1] tracking-tight text-slate-900 mb-4">
          {chef.name}
        </h3>

        {/* Metadata row - SECONDARY */}
        <div className="mt-auto space-y-3">
          {/* Restaurant count + James Beard inline */}
          <div className="flex items-baseline gap-3">
            {typeof chef.restaurant_count === 'number' && chef.restaurant_count > 0 && (
              <span className="font-mono text-[11px] tracking-wide font-medium text-slate-500">
                {chef.restaurant_count} restaurant{chef.restaurant_count !== 1 ? 's' : ''}
              </span>
            )}
            {hasJamesBeard && (
              <span className="font-mono text-[10px] tracking-wider font-medium text-blue-600/80">
                {chef.james_beard_status === 'winner' ? '★ James Beard' : 'JB Nominee'}
              </span>
            )}
          </div>

          {/* Shows row - TERTIARY */}
          {primaryShow && (
            <div className="flex items-center gap-2">
              <span 
                className="inline-flex items-center font-mono text-[10px] font-semibold tracking-wide uppercase px-2 py-1"
                style={{
                  background: primaryShow.result === 'winner' ? 'var(--accent-success)' 
                    : primaryShow.result === 'judge' ? '#7C3AED'
                    : primaryShow.result === 'finalist' ? '#0284C7'
                    : 'var(--slate-800)',
                  color: primaryShow.result === 'winner' || primaryShow.result === 'judge' || primaryShow.result === 'finalist' 
                    ? 'white' : 'var(--copper-400)',
                }}
              >
                {hideShowName ? (
                  <>
                    {primaryShow.result === 'winner' ? 'WINNER ✓' 
                      : primaryShow.result === 'judge' ? 'JUDGE ★'
                      : primaryShow.result === 'finalist' ? 'FINALIST'
                      : 'CONTESTANT'}
                  </>
                ) : (
                  <>
                    {abbreviateShowName(primaryShow.show?.name || '')}
                    {primaryShow.result === 'winner' && <span className="ml-1 opacity-80">✓</span>}
                    {primaryShow.result === 'judge' && <span className="ml-1 opacity-80">★</span>}
                  </>
                )}
              </span>
              {additionalShowCount > 0 && (
                <span className="font-mono text-[10px] tracking-wide text-slate-400">
                  +{additionalShowCount} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div 
        className="px-6 pl-7 py-3 border-t transition-colors duration-300 group-hover:bg-slate-50"
        style={{ borderColor: 'var(--border-light)' }}
      >
        <span 
          className="font-mono text-[11px] font-semibold tracking-wide transition-all duration-300 group-hover:tracking-wider"
          style={{ color: 'var(--accent-primary)' }}
        >
          VIEW →
        </span>
      </div>

      {/* Subtle hover border */}
      <div 
        className="absolute inset-0 border-2 border-transparent transition-all duration-300 pointer-events-none group-hover:border-[#B87333]/60"
      />
    </Link>
  );
}
