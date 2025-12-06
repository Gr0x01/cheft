import Link from 'next/link';
import Image from 'next/image';
import { RestaurantPreviewCard } from '../restaurant/RestaurantPreviewCard';
import { ShowBadgeCompact } from './ShowBadgeCompact';
import { AwardBadge } from './AwardBadge';
import { sortShowsByImportance } from '@/lib/utils/showBadges';
import { InstagramIcon } from '@/components/icons/InstagramIcon';

function getInitials(name: string): string {
  const parts = name
    .split(' ')
    .filter(part => !part.startsWith('"') && !part.endsWith('"') && part.length > 0);
  
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
  const allShows = chef.chef_shows || [];
  const sortedShows = sortShowsByImportance(allShows);
  const primaryShow = sortedShows[0];
  const secondaryShows = sortedShows.slice(1, 4);
  const totalShows = allShows.length;
  const overflowCount = Math.max(0, totalShows - 4);
  
  const isWinner = primaryShow?.result === 'winner';
  const isJBWinner = chef.james_beard_status === 'winner';
  const isJBNominee = chef.james_beard_status === 'nominated';
  const isJBSemifinalist = chef.james_beard_status === 'semifinalist';
  const isFinalist = primaryShow?.result === 'finalist';
  const isJudge = primaryShow?.result === 'judge';
  const hasAnyAward = isWinner || isJBWinner || isJBNominee || isJBSemifinalist || isFinalist || isJudge;
  const photoUrl = chef.photo_url;
  const restaurants = chef.restaurants || [];
  const openRestaurants = restaurants.filter(r => r.status === 'open');
  const hasPhoto = !!photoUrl;
  const displayRestaurants = hasPhoto ? openRestaurants.slice(0, 4) : openRestaurants.slice(0, 6);

  return (
    <section 
      className="featured-chef-hero relative overflow-hidden"
      style={{
        background: 'var(--slate-900)',
        borderTop: '3px solid var(--accent-primary)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <div className={hasPhoto ? "grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start" : "space-y-8"}>
          {/* Left: Chef Portrait with Floating Badges (only if photo exists) */}
          {hasPhoto && (
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
          )}

          {/* Right: Chef Details and Restaurants */}
          <div className={hasPhoto ? "md:col-span-8 lg:col-span-7" : ""}>
            <div className="space-y-6">
              {/* Multi-Show Badge Display - Horizontal Flow */}
              {allShows.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
                  {/* Primary Show - Large */}
                  {primaryShow?.show?.name && (
                    <>
                      <span className="font-display text-xl sm:text-2xl font-bold text-white whitespace-nowrap">
                        {primaryShow.show.name}
                        {primaryShow.season && (
                          <>
                            <span className="mx-2" style={{ color: 'var(--accent-primary)' }}>•</span>
                            {primaryShow.season}
                          </>
                        )}
                      </span>
                    </>
                  )}
                  
                  {/* Secondary Shows Strip */}
                  {secondaryShows.length > 0 && (
                    <>
                      {secondaryShows.map((show, index) => (
                        <ShowBadgeCompact
                          key={index}
                          show={show.show}
                          season={show.season}
                          result={show.result}
                          hideSeason={true}
                        />
                      ))}
                      {overflowCount > 0 && (
                        <span
                          className="font-mono text-[9px] font-medium tracking-wide uppercase px-2 py-1"
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: 'var(--accent-primary)',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          +{overflowCount} MORE
                        </span>
                      )}
                    </>
                  )}
                  
                </div>
              )}

              {/* Chef Name */}
              <h2
                className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-none tracking-tight text-white"
              >
                {chef.name}
              </h2>

              {/* Result Badges (Winner, James Beard, Finalist) */}
              {(isWinner || isJBWinner || isJBNominee || isJBSemifinalist || isFinalist) && (
                <div className="flex flex-wrap items-center gap-2">
                  {isWinner && <AwardBadge type="winner" />}
                  {isJBWinner && <AwardBadge type="james_beard_winner" />}
                  {isJBNominee && <AwardBadge type="james_beard_nominee" />}
                  {isJBSemifinalist && <AwardBadge type="james_beard_semifinalist" />}
                  {isFinalist && !isWinner && <AwardBadge type="finalist" />}
                </div>
              )}

              {/* Bio */}
              {chef.mini_bio && (
                <p
                  className="font-ui text-lg leading-relaxed max-w-3xl"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {chef.mini_bio.replace(/<[^>]*>/g, '')}
                </p>
              )}

              {/* Restaurants Preview */}
              {displayRestaurants.length > 0 && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayRestaurants.map((restaurant, index) => (
                      <RestaurantPreviewCard key={restaurant.id} restaurant={restaurant} index={index} />
                    ))}
                  </div>
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
