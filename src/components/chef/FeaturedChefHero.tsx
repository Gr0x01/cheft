import Link from 'next/link';
import Image from 'next/image';
import { FloatingBadge } from './FloatingBadge';
import { RestaurantPreviewCard } from '../restaurant/RestaurantPreviewCard';
import { abbreviateShowName, formatSeasonDisplay } from '@/lib/utils/showBadges';

interface FeaturedChefHeroProps {
  chef: {
    id: string;
    name: string;
    slug: string;
    photo_url?: string | null;
    mini_bio?: string | null;
    james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows?: Array<{
      show?: { name: string } | null;
      season?: string | null;
      result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary?: boolean;
    }>;
    restaurants?: Array<{
      id: string;
      name: string;
      slug: string;
      city: string;
      state?: string | null;
      photo_urls?: string[] | null;
      google_rating?: number | null;
      price_tier?: '$' | '$$' | '$$$' | '$$$$' | null;
      status: 'open' | 'closed' | 'unknown';
    }>;
    restaurant_count?: number;
  };
}

export function FeaturedChefHero({ chef }: FeaturedChefHeroProps) {
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const isWinner = primaryShow?.result === 'winner';
  const isJBWinner = chef.james_beard_status === 'winner';
  const isFinalist = primaryShow?.result === 'finalist';
  const isJudge = primaryShow?.result === 'judge';
  const photoUrl = chef.photo_url;
  const restaurants = chef.restaurants || [];
  const displayRestaurants = restaurants.slice(0, 4);

  return (
    <section 
      className="featured-chef-hero relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%)',
        borderTop: '3px solid var(--accent-primary)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Chef Portrait with Floating Badges */}
          <div className="lg:col-span-5 relative">
            <div className="relative">
              <div
                className="relative overflow-hidden mx-auto"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  aspectRatio: '3/4',
                  border: '4px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '12px 12px 0 var(--accent-primary)',
                }}
              >
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={chef.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 400px"
                    priority
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--slate-700) 0%, var(--slate-800) 100%)' }}
                  >
                    <span className="font-display text-9xl font-bold text-white/20">
                      {chef.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Gradient overlay for mobile text */}
                <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              {/* Floating Badges (Desktop) */}
              <div className="hidden lg:block">
                {isWinner && (
                  <FloatingBadge
                    type="winner"
                    label="WINNER"
                    rotation={8}
                    position={{ top: '15%', right: '-20px' }}
                    tooltip={primaryShow?.show?.name ? `${primaryShow.show.name} Winner` : 'Competition Winner'}
                  />
                )}
                {isJBWinner && (
                  <FloatingBadge
                    type="james-beard"
                    label="JAMES BEARD"
                    rotation={-12}
                    position={{ top: '50%', left: '-30px' }}
                    tooltip="James Beard Award Winner"
                  />
                )}
                {isFinalist && !isWinner && (
                  <FloatingBadge
                    type="finalist"
                    label="FINALIST"
                    rotation={5}
                    position={{ top: '20%', right: '-15px' }}
                    tooltip={primaryShow?.show?.name ? `${primaryShow.show.name} Finalist` : 'Competition Finalist'}
                  />
                )}
                {isJudge && !isWinner && !isFinalist && (
                  <FloatingBadge
                    type="judge"
                    label="JUDGE"
                    rotation={-8}
                    position={{ top: '25%', right: '-10px' }}
                    tooltip={primaryShow?.show?.name ? `${primaryShow.show.name} Judge` : 'Competition Judge'}
                  />
                )}
                {primaryShow?.show?.name && (
                  <FloatingBadge
                    type="show"
                    label={`${abbreviateShowName(primaryShow.show.name)}${primaryShow.season ? ` • ${formatSeasonDisplay(primaryShow.season)}` : ''}`}
                    rotation={-5}
                    position={{ bottom: '20%', right: '-25px' }}
                    tooltip={`${primaryShow.show.name}${primaryShow.season ? ` ${primaryShow.season}` : ''}`}
                  />
                )}
              </div>

              {/* Mobile Badges (Overlay on Photo) */}
              <div className="lg:hidden absolute top-4 right-4 flex flex-col gap-2 items-end">
                {isWinner && (
                  <span 
                    className="font-mono text-[10px] font-bold tracking-wider px-2 py-1"
                    style={{ background: 'var(--accent-success)', color: 'white', borderRadius: '4px' }}
                  >
                    WINNER
                  </span>
                )}
                {isJBWinner && (
                  <span 
                    className="font-mono text-[10px] font-bold tracking-wider px-2 py-1 flex items-center gap-1"
                    style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f', borderRadius: '4px' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    JB
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Chef Details and Restaurants */}
          <div className="lg:col-span-7">
            <div className="space-y-6">
              {/* Chef Name */}
              <h2
                className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-none tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {chef.name}
              </h2>

              {/* Show/Result Info */}
              {primaryShow?.show?.name && (
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="font-ui text-sm font-medium px-3 py-1.5"
                    style={{
                      background: 'var(--accent-primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {primaryShow.show.name}
                  </span>
                  {primaryShow.result && primaryShow.result !== 'contestant' && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase"
                      style={{
                        background:
                          primaryShow.result === 'winner'
                            ? 'var(--accent-success)'
                            : primaryShow.result === 'finalist'
                            ? '#f59e0b'
                            : '#6366f1',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {primaryShow.result}
                    </span>
                  )}
                </div>
              )}

              {/* Bio */}
              {chef.mini_bio && (
                <p
                  className="font-ui text-lg leading-relaxed max-w-2xl"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {chef.mini_bio.replace(/<[^>]*>/g, '')}
                </p>
              )}

              {/* Restaurants Preview */}
              {displayRestaurants.length > 0 && (
                <div className="space-y-3">
                  <h3
                    className="font-mono text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Restaurants ({chef.restaurant_count || restaurants.length})
                  </h3>
                  <div className="space-y-1">
                    {displayRestaurants.map((restaurant, index) => (
                      <RestaurantPreviewCard key={restaurant.id} restaurant={restaurant} index={index} />
                    ))}
                  </div>
                  {chef.restaurant_count && chef.restaurant_count > 4 && (
                    <Link
                      href={`/chefs/${chef.slug}`}
                      className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-wide transition-colors duration-200 group"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      View All {chef.restaurant_count} Restaurants
                      <svg
                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'var(--accent-primary)' }}
      />
    </section>
  );
}
