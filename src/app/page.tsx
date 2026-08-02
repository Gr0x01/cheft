import { Metadata } from 'next';
import { db } from '@/lib/supabase';
import HomePage from './HomePage';
import { WebSiteSchema } from '@/components/seo/SchemaOrg';
import { getFooterData } from '@/lib/footer-data';
import { RestaurantWithDetails } from '@/lib/types';

export const revalidate = 3600;

// Computed server-side so mobile LCP doesn't wait on the client fetching the full
// restaurant list. The pool arrives already filtered to open winners and ordered
// michelin-first; this only shuffles within each tier, once per ISR revalidation.
function pickWinnerRestaurants(pool: RestaurantWithDetails[], limit = 12): RestaurantWithDetails[] {
  const michelin = pool.filter(r => r.michelin_stars && r.michelin_stars > 0);
  const nonMichelin = pool.filter(r => !r.michelin_stars || r.michelin_stars === 0);

  const shuffle = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  return [...shuffle(michelin), ...shuffle(nonMichelin)].slice(0, limit);
}

export async function generateMetadata(): Promise<Metadata> {
  const stats = await db.getStats();

  const description = `Discover ${stats.restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants. Interactive map with filters, ratings, and detailed profiles of ${stats.chefs} chefs across ${stats.cities} cities.`;
  const shortDescription = `Discover ${stats.restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants.`;

  return {
    title: 'Cheft | TV Chef Restaurant Map - Find Top Chef & Iron Chef Restaurants',
    description,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: 'Cheft | TV Chef Restaurant Map',
      description: shortDescription,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Cheft | TV Chef Restaurant Map',
      description: shortDescription,
    },
  };
}

export default async function Page() {
  const [stats, featuredChef, shows, footerData, popularRestaurants, winnerPool] = await Promise.all([
    db.getStats(),
    db.getFeaturedChef(),
    db.getShowsWithCounts(),
    getFooterData(),
    db.getPopularRestaurants(),
    db.getWinnerRestaurants(),
  ]);
  const winnerRestaurants = pickWinnerRestaurants(winnerPool);

  const chefsData = await db.getFeaturedChefs(12, featuredChef?.id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';

  return (
    <>
      <WebSiteSchema
        name="Cheft"
        url={baseUrl}
        description={`Discover ${stats.restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants.`}
        searchUrl={`${baseUrl}/restaurants?q={search_term_string}`}
      />
      <HomePage
        initialFeaturedChefs={chefsData}
        stats={stats}
        featuredChef={featuredChef}
        shows={shows}
        footerData={footerData}
        popularRestaurants={popularRestaurants}
        winnerRestaurants={winnerRestaurants}
      />
    </>
  );
}
