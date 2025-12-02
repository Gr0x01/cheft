import { MetadataRoute } from 'next';
import { createStaticClient } from '@/lib/supabase/static';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheft.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();

  try {
    const [chefsResult, restaurantsResult, citiesResult] = await Promise.all([
      supabase
        .from('chefs')
        .select('slug, updated_at')
        .order('updated_at', { ascending: false }),
      supabase
        .from('restaurants')
        .select('slug, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }),
      supabase
        .from('cities')
        .select('slug, updated_at')
        .gte('restaurant_count', 3)
        .order('updated_at', { ascending: false }),
    ]);

    const chefs = chefsResult.data || [];
    const restaurants = restaurantsResult.data || [];
    const cities = citiesResult.data || [];

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/chefs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/restaurants`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  const chefRoutes: MetadataRoute.Sitemap = chefs.map((chef) => ({
    url: `${BASE_URL}/chefs/${chef.slug}`,
    lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const restaurantRoutes: MetadataRoute.Sitemap = restaurants.map((restaurant) => ({
    url: `${BASE_URL}/restaurants/${restaurant.slug}`,
    lastModified: restaurant.updated_at ? new Date(restaurant.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

    const cityRoutes: MetadataRoute.Sitemap = cities.map((city) => ({
      url: `${BASE_URL}/cities/${city.slug}`,
      lastModified: city.updated_at ? new Date(city.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...chefRoutes, ...restaurantRoutes, ...cityRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${BASE_URL}/chefs`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/restaurants`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
    ];
  }
}
