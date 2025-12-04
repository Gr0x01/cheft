import Link from 'next/link';
import Image from 'next/image';
import { RestaurantPreviewCard } from '../restaurant/RestaurantPreviewCard';
import { abbreviateShowName, formatSeasonDisplay } from '@/lib/utils/showBadges';
import { InstagramIcon } from '@/components/icons/InstagramIcon';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface FeaturedChefHeroProps {
  chef: {
    id: string;
    name: string;
    slug: string;
    photo_url?: string | null;
    instagram_handle?: string | null;
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
  const isJBNominee = chef.james_beard_status === 'nominated';
  const isJBSemifinalist = chef.james_beard_status === 'semifinalist';
  const isFinalist = primaryShow?.result === 'finalist';
  const isJudge = primaryShow?.result === 'judge';
  const photoUrl = chef.photo_url;
  const restaurants = chef.restaurants || [];
  const openRestaurants = restaurants.filter(r => r.status === 'open');
  const displayRestaurants = openRestaurants.slice(0, 4);

  return (
    <section 
      className="featured-chef-hero relative overflow-hidden"
      style={{
        background: 'var(--slate-900)',
        borderTop: '3px solid var(--accent-primary)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Left: Chef Portrait with Floating Badges */}
          <div className="hidden md:block md:col-span-4 lg:col-span-5 relative">
            <div className="relative">
              <div
                className="relative overflow-hidden mx-auto"
                style={{
                  width: '100%',
                  maxWidth: '280px',
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
                ) : chef.instagram_handle ? (
                  <a
                    href={`https://instagram.com/${chef.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 transition-colors hover:bg-slate-700/50"
                    style={{ background: 'linear-gradient(135deg, var(--slate-700) 0%, var(--slate-800) 100%)' }}
                  >
                    <InstagramIcon size={100} className="text-white/40" />
                    <span className="font-mono text-base text-white/60">@{chef.instagram_handle}</span>
                  </a>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--slate-700) 0%, var(--slate-800) 100%)' }}
                  >
                    <span className="font-display text-9xl font-bold text-white/20">
                      {getInitials(chef.name)}
                    </span>
                  </div>
                )}

                {/* Gradient overlay for mobile text */}
                <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>


            </div>
          </div>

          {/* Right: Chef Details and Restaurants */}
          <div className="md:col-span-8 lg:col-span-7">
            <div className="space-y-6">
              {/* Show/Season + Awards - Single Row */}
              {(primaryShow?.show?.name || isWinner || isJBWinner || isJBNominee || isJBSemifinalist || isFinalist || isJudge) && (
                <div className="flex flex-wrap items-center gap-4">
                  {/* Show/Season */}
                  {primaryShow?.show?.name && (
                    <span className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {primaryShow.show.name}
                      {primaryShow.season && (
                        <>
                          <span className="mx-2" style={{ color: 'var(--accent-primary)' }}>•</span>
                          {primaryShow.season}
                        </>
                      )}
                    </span>
                  )}
                  
                  {/* Award Badges */}
                  {isWinner && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase"
                      style={{
                        background: 'var(--accent-success)',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      WINNER
                    </span>
                  )}
                  {isJBWinner && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase flex items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      JAMES BEARD
                    </span>
                  )}
                  {isJBNominee && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase flex items-center gap-1"
                      style={{
                        background: '#1d4ed8',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      JB NOMINEE
                    </span>
                  )}
                  {isJBSemifinalist && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase"
                      style={{
                        background: '#dbeafe',
                        color: '#1e3a8a',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      JB SEMIFINALIST
                    </span>
                  )}
                  {isFinalist && !isWinner && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase"
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      FINALIST
                    </span>
                  )}
                  {isJudge && !isWinner && !isFinalist && (
                    <span
                      className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase"
                      style={{
                        background: '#6366f1',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      JUDGE
                    </span>
                  )}
                </div>
              )}

              {/* Chef Name */}
              <h2
                className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-none tracking-tight text-white"
              >
                {chef.name}
              </h2>

              {/* Bio */}
              {chef.mini_bio && (
                <p
                  className="font-ui text-lg leading-relaxed max-w-2xl"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {chef.mini_bio.replace(/<[^>]*>/g, '')}
                </p>
              )}

              {/* Restaurants Preview */}
              {displayRestaurants.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {displayRestaurants.map((restaurant, index) => (
                      <RestaurantPreviewCard key={restaurant.id} restaurant={restaurant} index={index} />
                    ))}
                  </div>
                  <Link
                    href={`/chefs/${chef.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 font-mono text-sm font-bold tracking-wider uppercase transition-all duration-200 group"
                    style={{
                      background: 'var(--accent-primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--accent-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                  >
                    View Full Profile
                    <svg
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
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
