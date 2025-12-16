import { Metadata } from 'next';
import { db } from '@/lib/supabase';
import HomePage from './HomePage';
import { WebSiteSchema } from '@/components/seo/SchemaOrg';
import { getFooterData } from '@/lib/footer-data';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await db.getStats();

  const description = `Discover ${stats.restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants. Interactive map with filters, ratings, and detailed profiles of ${stats.chefs} chefs across ${stats.cities} cities.`;
  const shortDescription = `Discover ${stats.restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants.`;

  return {
    title: 'Cheft | TV Chef Restaurant Map - Find Top Chef & Iron Chef Restaurants',
    description,
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
  const [stats, featuredChef, shows, footerData] = await Promise.all([
    db.getStats(),
    db.getFeaturedChef(),
    db.getShowsWithCounts(),
    getFooterData(),
  ]);

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
      />
    </>
  );
}
