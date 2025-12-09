import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { createStaticClient } from '@/lib/supabase/static';
import { ChefCard } from '@/components/chef/ChefCard';
import { RestaurantCardCompact } from '@/components/restaurant/RestaurantCardCompact';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { Footer } from '@/components/ui/Footer';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  status: string;
  photo_urls?: string[];
  price_tier?: string;
  cuisine_tags?: string[];
  google_rating?: number;
  google_review_count?: number;
}

interface Chef {
  id: string;
  name: string;
  slug: string;
  photo_url?: string;
  mini_bio?: string;
  restaurants?: Restaurant[];
}

interface ChefShow {
  id: string;
  chef_id: string;
  show_id: string;
  season: string;
  season_name: string | null;
  result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  is_primary: boolean;
  chef: Chef;
}

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
  
  try {
    const { data: allSeasons, error } = await (supabase as any).rpc('get_all_show_seasons_for_sitemap');
    
    if (error) {
      console.error('Error fetching show seasons for static params:', error);
      return [];
    }

    return ((allSeasons || []) as Array<{ show_slug: string; season: string }>).map(season => ({
      slug: season.show_slug,
      season: season.season,
    }));
  } catch (error) {
    console.error('Failed to generate static params for show seasons:', error);
    return [];
  }
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { slug, season } = await params;
  
  let seasonData;
  let showData;
  try {
    [seasonData, showData] = await Promise.all([
      db.getShowSeason(slug, season),
      db.getShow(slug),
    ]);
    if (!seasonData) notFound();
  } catch {
    notFound();
  }

  const seasonName = seasonData.season_name || `Season ${season}`;
  const winner = seasonData.chef_shows?.find((cs: ChefShow) => cs.result === 'winner');
  const finalists = seasonData.chef_shows?.filter((cs: ChefShow) => cs.result === 'finalist') || [];
  const contestants = seasonData.chef_shows?.filter((cs: ChefShow) => cs.result === 'contestant') || [];
  const judges = seasonData.chef_shows?.filter((cs: ChefShow) => cs.result === 'judge') || [];
  const allRestaurants = seasonData.chef_shows?.flatMap((cs: ChefShow) => 
    (cs.chef.restaurants || []).map((r: any) => ({
      ...r,
      chef: cs.chef
    }))
  ) || [];

  const isVariant = showData?.parent_show_id !== null;
  const breadcrumbItems = isVariant && showData?.parent_show_slug
    ? [
        { label: 'Shows', href: '/shows' },
        { label: showData.parent_show_name, href: `/shows/${showData.parent_show_slug}` },
        { label: seasonData.name, href: `/shows/${slug}` },
        { label: seasonName },
      ]
    : [
        { label: 'Shows', href: '/shows' },
        { label: seasonData.name, href: `/shows/${slug}` },
        { label: seasonName },
      ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />
      <PageHero
        title={seasonName}
        subtitle={seasonData.name}
        breadcrumbItems={breadcrumbItems}
        stats={[
          { value: seasonData.chef_shows?.length || 0, label: 'CHEFS' },
          { value: allRestaurants.length, label: 'RESTAURANTS' },
        ]}
      >
        {winner && (
          <div
            className="mt-6 p-4"
            style={{
              background: '#f59e0b',
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
      </PageHero>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {seasonData.chef_shows && seasonData.chef_shows.length > 0 && (
          <div className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[
                ...(winner ? [winner] : []),
                ...finalists,
                ...judges,
                ...contestants,
              ].map((cs: ChefShow, index: number) => (
                <ChefCard key={cs.chef.id} chef={{...cs.chef, chef_shows: [{ result: cs.result }]}} index={index} hideShowName />
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

      <Footer />
    </div>
  );
}
