import { MetadataRoute } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { isShowWorthIndexing } from '@/lib/showIndexing';
import { isWinnersPageWorthIndexing } from '@/lib/winnerIndexing';

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
        .gt('restaurant_count', 0)
        .order('updated_at', { ascending: false }),
      supabase
        .from('shows')
        .select('id, slug, parent_show_id, is_public')
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

    // Only submit shows with enough chefs to be worth indexing — the thin ones are noindexed
    // by the show page, and submitting a noindexed URL just wastes crawl budget.
    // A show page also lists its child shows' chefs, so those count toward the parent.
    const [{ data: chefShowRows }, { data: winnerRows }, { data: openRestaurantRows }] = await Promise.all([
      supabase.from('chef_shows').select('show_id, chef_id'),
      supabase.from('chef_shows').select('show_id, chef_id').eq('result', 'winner'),
      // Match the winners page's definition of a current restaurant exactly.
      supabase.from('restaurants').select('chef_id').eq('status', 'open'),
    ]);

    const chefIdsByShow = new Map<string, Set<string>>();
    ((chefShowRows || []) as Array<{ show_id: string; chef_id: string }>).forEach((row) => {
      if (!chefIdsByShow.has(row.show_id)) chefIdsByShow.set(row.show_id, new Set());
      chefIdsByShow.get(row.show_id)!.add(row.chef_id);
    });

    const showRows = shows as Array<{
      id: string;
      slug: string;
      parent_show_id: string | null;
      is_public: boolean | null;
    }>;

    const showChefCount = (show: { id: string }) => {
      const chefIds = new Set(chefIdsByShow.get(show.id) ?? []);
      showRows
        .filter((child) => child.parent_show_id === show.id)
        .forEach((child) => chefIdsByShow.get(child.id)?.forEach((id) => chefIds.add(id)));
      return chefIds.size;
    };

    const indexableShows = showRows.filter((show) => isShowWorthIndexing(showChefCount(show)));
    const indexableShowSlugs = new Set(indexableShows.map((show) => show.slug));

    const chefsWithOpenRestaurants = new Set(
      ((openRestaurantRows || []) as Array<{ chef_id: string }>).map((row) => row.chef_id),
    );
    const winnerCountByShow = new Map<string, number>();
    ((winnerRows || []) as Array<{ show_id: string; chef_id: string }>).forEach((row) => {
      if (!chefsWithOpenRestaurants.has(row.chef_id)) return;
      winnerCountByShow.set(row.show_id, (winnerCountByShow.get(row.show_id) || 0) + 1);
    });
    const showsWithIndexableWinnersPages = indexableShows.filter(
      (show) => show.is_public === true
        && isWinnersPageWorthIndexing(winnerCountByShow.get(show.id) || 0),
    );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/chefs`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/restaurants`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/cities`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/shows`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/states`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/countries`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const chefRoutes: MetadataRoute.Sitemap = chefs.map((chef) => ({
    url: `${BASE_URL}/chefs/${chef.slug}`,
    ...(chef.updated_at ? { lastModified: new Date(chef.updated_at) } : {}),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const restaurantRoutes: MetadataRoute.Sitemap = restaurants.map((restaurant) => ({
    url: `${BASE_URL}/restaurants/${restaurant.slug}`,
    ...(restaurant.updated_at ? { lastModified: new Date(restaurant.updated_at) } : {}),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

    const cityRoutes: MetadataRoute.Sitemap = cities.map((city) => ({
      url: `${BASE_URL}/cities/${city.slug}`,
      ...(city.updated_at ? { lastModified: new Date(city.updated_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    const stateRoutes: MetadataRoute.Sitemap = states.map((state) => ({
      url: `${BASE_URL}/states/${state.slug}`,
      ...(state.updated_at ? { lastModified: new Date(state.updated_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const countryRoutes: MetadataRoute.Sitemap = countries.map((country) => ({
      url: `${BASE_URL}/countries/${country.slug}`,
      ...(country.updated_at ? { lastModified: new Date(country.updated_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const showRoutes: MetadataRoute.Sitemap = indexableShows.map((show) => ({
      url: `${BASE_URL}/shows/${show.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const seasonRoutes: MetadataRoute.Sitemap = (allSeasons || [])
      .filter((season: any) => indexableShowSlugs.has(season.show_slug))
      .map((season: any) => ({
        url: `${BASE_URL}/shows/${season.show_slug}/${season.season}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

    const winnersRoutes: MetadataRoute.Sitemap = showsWithIndexableWinnersPages.map((show) => ({
      url: `${BASE_URL}/shows/${show.slug}/winners`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...chefRoutes, ...restaurantRoutes, ...stateRoutes, ...countryRoutes, ...cityRoutes, ...showRoutes, ...seasonRoutes, ...winnersRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    return [
      {
        url: BASE_URL,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${BASE_URL}/chefs`,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/restaurants`,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/cities`,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/shows`,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
    ];
  }
}
