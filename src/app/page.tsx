import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import HomePage from './HomePage';

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();

  const [
    { count: restaurantCount },
    { count: chefCount },
    { count: cityCount }
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('chefs').select('*', { count: 'exact', head: true }),
    supabase.from('cities').select('*', { count: 'exact', head: true })
  ]);

  const restaurants = restaurantCount || 311;
  const chefs = chefCount || 180;
  const cities = cityCount || 162;

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

export default function Page() {
  return <HomePage />;
}
