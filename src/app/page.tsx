import { Metadata } from 'next';
import { db } from '@/lib/supabase';
import HomePage from './HomePage';
import { RestaurantWithDetails } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const restaurants = 522;
  const chefs = 182;
  const cities = 162;

  const description = `Discover ${restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants. Interactive map with filters, ratings, and detailed profiles of ${chefs} chefs across ${cities} cities.`;
  const shortDescription = `Discover ${restaurants} restaurants owned by Top Chef, Iron Chef, and Tournament of Champions winners and contestants.`;

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
  const [restaurantsData, chefsData] = await Promise.all([
    db.getRestaurants(),
    db.getFeaturedChefs(12)
  ]);

  return (
    <HomePage 
      initialRestaurants={restaurantsData as RestaurantWithDetails[]}
      initialFeaturedChefs={chefsData}
    />
  );
}
