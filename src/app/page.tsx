import { Metadata } from 'next';
import { db } from '@/lib/supabase';
import HomePage from './HomePage';
import { RestaurantWithDetails } from '@/lib/types';

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
  const [restaurantsData, stats, featuredChef] = await Promise.all([
    db.getRestaurants(),
    db.getStats(),
    db.getFeaturedChef()
  ]);

  const chefsData = await db.getFeaturedChefs(12, featuredChef?.id);

  return (
    <HomePage 
      initialRestaurants={restaurantsData as RestaurantWithDetails[]}
      initialFeaturedChefs={chefsData}
      stats={stats}
      featuredChef={featuredChef}
    />
  );
}
