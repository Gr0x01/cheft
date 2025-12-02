import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { createStaticClient } from '@/lib/supabase/static';
import { ChefCard } from '@/components/chef/ChefCard';
import { RestaurantCardCompact } from '@/components/restaurant/RestaurantCardCompact';

export const revalidate = 604800;

interface SeasonPageProps {
  params: Promise<{
    slug: string;
    season: string;
  }>;
}

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const { slug, season } = await params;
  try {
    const seasonData = await db.getShowSeason(slug, season);
    if (!seasonData) return { title: 'Season Not Found' };

    const seasonName = seasonData.season_name || `Season ${season}`;
    const chefCount = seasonData.chef_shows?.length || 0;
    const restaurantCount = seasonData.chef_shows?.reduce((sum: number, cs: any) => sum + (cs.chef.restaurants?.length || 0), 0) || 0;
    const winner = seasonData.chef_shows?.find((cs: any) => cs.result === 'winner');

    return {
      title: `${seasonData.name} ${seasonName} | Chefs & Restaurants`,
      description: winner 
        ? `${seasonData.name} ${seasonName} winner ${winner.chef.name} and ${chefCount - 1} other contestants. Find their ${restaurantCount} restaurants.`
        : `${chefCount} chefs from ${seasonData.name} ${seasonName} and their ${restaurantCount} restaurants.`,
      openGraph: {
        title: `${seasonData.name} ${seasonName}`,
        description: `${chefCount} chefs • ${restaurantCount} restaurants`,
      },
    };
  } catch {
    return {
      title: 'Season Not Found',
    };
  }
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  
  const { data: allSeasons } = await (supabase as any).rpc('get_all_show_seasons_for_sitemap');

  return ((allSeasons || []) as Array<{ show_slug: string; season: string }>).map(season => ({
    slug: season.show_slug,
    season: season.season,
  }));
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { slug, season } = await params;
  
  let seasonData;
  try {
    seasonData = await db.getShowSeason(slug, season);
    if (!seasonData) notFound();
  } catch {
    notFound();
  }

  const seasonName = seasonData.season_name || `Season ${season}`;
  const winner = seasonData.chef_shows?.find((cs: any) => cs.result === 'winner');
  const finalists = seasonData.chef_shows?.filter((cs: any) => cs.result === 'finalist') || [];
  const contestants = seasonData.chef_shows?.filter((cs: any) => cs.result === 'contestant') || [];
  const allRestaurants = seasonData.chef_shows?.flatMap((cs: any) => 
    (cs.chef.restaurants || []).map((r: any) => ({
      ...r,
      chef: cs.chef
    }))
  ) || [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/shows"
              className="font-mono text-sm hover:text-[var(--accent-primary)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Shows
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <Link
              href={`/shows/${slug}`}
              className="font-mono text-sm hover:text-[var(--accent-primary)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {seasonData.name}
            </Link>
          </div>

          <h1
            className="font-display text-5xl sm:text-6xl font-bold mb-6 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {seasonName}
          </h1>

          <div className="flex flex-wrap gap-6 mb-8">
            <div>
              <div
                className="font-mono text-4xl font-bold"
                style={{ color: 'var(--accent-primary)' }}
              >
                {seasonData.chef_shows?.length || 0}
              </div>
              <div
                className="font-mono text-sm tracking-wide uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Chefs
              </div>
            </div>
            <div>
              <div
                className="font-mono text-4xl font-bold"
                style={{ color: 'var(--accent-primary)' }}
              >
                {allRestaurants.length}
              </div>
              <div
                className="font-mono text-sm tracking-wide uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Restaurants
              </div>
            </div>
          </div>

          {winner && (
            <div
              className="p-4 mb-8"
              style={{
                background: 'var(--accent-success)',
                color: 'white',
              }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="font-mono text-sm font-bold tracking-wide uppercase">
                  Winner: {winner.chef.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {winner && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Winner
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <ChefCard chef={winner.chef} index={0} />
            </div>
          </div>
        )}

        {finalists.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Finalists
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {finalists.map((cs: any, index: number) => (
                <ChefCard key={cs.chef.id} chef={cs.chef} index={index} />
              ))}
            </div>
          </div>
        )}

        {contestants.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Contestants
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {contestants.map((cs: any, index: number) => (
                <ChefCard key={cs.chef.id} chef={cs.chef} index={index} />
              ))}
            </div>
          </div>
        )}

        {allRestaurants.length > 0 && (
          <div className="mb-12">
            <h2
              className="font-display text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Restaurants from {seasonName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allRestaurants.map((restaurant: any) => (
                <RestaurantCardCompact
                  key={restaurant.id}
                  restaurant={restaurant}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
