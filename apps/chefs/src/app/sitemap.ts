import { MetadataRoute } from 'next';
import { createStaticClient } from '@/lib/supabase/static';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheft.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();

  try {
    const [chefsResult, restaurantsResult, citiesResult, showsResult, statesResult, countriesResult] = await Promise.all([
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
      supabase
        .from('shows')
        .select('id, slug, created_at')
        .order('name'),
      (supabase as any)
        .from('states')
        .select('slug, updated_at')
        .order('name'),
      (supabase as any)
        .from('countries')
        .select('slug, updated_at')
        .order('name'),
    ]);

    const chefs = chefsResult.data || [];
    const restaurants = restaurantsResult.data || [];
    const cities = citiesResult.data || [];
    const shows = showsResult.data || [];
    const states = (statesResult.data || []) as any[];
    const countries = (countriesResult.data || []) as any[];

    const { data: allSeasons } = await (supabase as any).rpc('get_all_show_seasons_for_sitemap');

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
    {
      url: `${BASE_URL}/shows`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/states`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/countries`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
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
      priority: 0.5,
    }));

    const stateRoutes: MetadataRoute.Sitemap = states.map((state) => ({
      url: `${BASE_URL}/states/${state.slug}`,
      lastModified: state.updated_at ? new Date(state.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const countryRoutes: MetadataRoute.Sitemap = countries.map((country) => ({
      url: `${BASE_URL}/countries/${country.slug}`,
      lastModified: country.updated_at ? new Date(country.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const showRoutes: MetadataRoute.Sitemap = shows.map((show) => ({
      url: `${BASE_URL}/shows/${show.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const seasonRoutes: MetadataRoute.Sitemap = (allSeasons || []).map((season: any) => ({
      url: `${BASE_URL}/shows/${season.show_slug}/${season.season}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...chefRoutes, ...restaurantRoutes, ...stateRoutes, ...countryRoutes, ...cityRoutes, ...showRoutes, ...seasonRoutes];
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
      {
        url: `${BASE_URL}/shows`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
    ];
  }
}
