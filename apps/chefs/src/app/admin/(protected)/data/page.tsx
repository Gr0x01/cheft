import { createClient } from '@/lib/supabase/server';
import { DataDashboardClient } from './DataDashboardClient';

type ChefPreview = {
  id: string;
  name: string;
  slug: string;
};

type RestaurantPreview = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
};

async function getDataStats() {
  const supabase = await createClient();

  const [
    { count: totalChefs },
    { count: chefsWithPhotos },
    { count: chefsWithBios },
    { count: totalRestaurants },
    { count: restaurantsWithPhotos },
    { count: restaurantsWithRatings },
    { count: restaurantsWithPlaceIds },
  ] = await Promise.all([
    supabase.from('chefs').select('*', { count: 'exact', head: true }),
    supabase.from('chefs').select('*', { count: 'exact', head: true }).not('photo_url', 'is', null),
    supabase.from('chefs').select('*', { count: 'exact', head: true }).not('mini_bio', 'is', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('photo_urls', 'is', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('google_rating', 'is', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('google_place_id', 'is', null),
  ]);

  return {
    chefs: {
      total: totalChefs || 0,
      withPhotos: chefsWithPhotos || 0,
      withBios: chefsWithBios || 0,
    },
    restaurants: {
      total: totalRestaurants || 0,
      withPhotos: restaurantsWithPhotos || 0,
      withRatings: restaurantsWithRatings || 0,
      withPlaceIds: restaurantsWithPlaceIds || 0,
    },
  };
}

async function getMissingData(): Promise<{
  chefsNoPhotos: ChefPreview[];
  chefsNoBios: ChefPreview[];
  restaurantsNoPlaces: RestaurantPreview[];
}> {
  const supabase = await createClient();

  const [
    { data: chefsNoPhotos },
    { data: chefsNoBios },
    { data: restaurantsNoPlaces },
  ] = await Promise.all([
    supabase
      .from('chefs')
      .select('id, name, slug')
      .is('photo_url', null)
      .order('name')
      .limit(50),
    supabase
      .from('chefs')
      .select('id, name, slug')
      .is('mini_bio', null)
      .order('name')
      .limit(50),
    supabase
      .from('restaurants')
      .select('id, name, slug, city, state')
      .is('google_place_id', null)
      .order('name')
      .limit(50),
  ]);

  return {
    chefsNoPhotos: (chefsNoPhotos || []) as ChefPreview[],
    chefsNoBios: (chefsNoBios || []) as ChefPreview[],
    restaurantsNoPlaces: (restaurantsNoPlaces || []) as RestaurantPreview[],
  };
}

export default async function DataDashboard() {
  const stats = await getDataStats();
  const missing = await getMissingData();

  return <DataDashboardClient stats={stats} missing={missing} />;
}
