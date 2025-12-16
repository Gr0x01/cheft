import { cache } from 'react';
import { createStaticClient } from '@/lib/supabase/static';

export interface FooterData {
  topStates: Array<{ name: string; slug: string; restaurant_count: number }>;
  topCities: Array<{ name: string; slug: string; state: string | null; restaurant_count: number }>;
  shows: Array<{ name: string; slug: string }>;
  topChefs: Array<{ name: string; slug: string }>;
}

// Internal types for footer data rows
interface StateRow {
  name: string;
  slug: string;
  restaurant_count: number;
}

interface CityRow {
  name: string;
  slug: string;
  state: string | null;
  restaurant_count: number;
}

interface ShowRow {
  name: string;
  slug: string;
}

interface ChefRow {
  name: string;
  slug: string;
}

/**
 * Fetches footer navigation data with React cache() for request deduplication.
 * Combined with Next.js ISR (revalidate = 604800), data is fetched:
 * - Once per page at build time
 * - Once per page when revalidating (every week)
 * - NEVER on user requests (served from CDN)
 */
export const getFooterData = cache(async (): Promise<FooterData> => {
  const supabase = createStaticClient();

  // Cast to any for states table (not in generated types)
  const [statesResult, citiesResult, showsResult, chefsResult] = await Promise.all([
    // Top 8 states by restaurant count
    (supabase as any)
      .from('states')
      .select('name, slug, restaurant_count')
      .gt('restaurant_count', 0)
      .order('restaurant_count', { ascending: false })
      .limit(8) as Promise<{ data: StateRow[] | null; error: any }>,

    // Top 8 cities by restaurant count
    supabase
      .from('cities')
      .select('name, slug, state, restaurant_count')
      .gt('restaurant_count', 0)
      .order('restaurant_count', { ascending: false })
      .limit(8),

    // All public parent shows
    supabase
      .from('shows')
      .select('name, slug')
      .eq('is_public', true)
      .is('parent_show_id', null)
      .order('name')
      .limit(8),

    // Featured chefs (same RPC as homepage - winners with most restaurants)
    (supabase as any).rpc('get_featured_chefs_with_counts') as Promise<{ data: ChefRow[] | null; error: any }>,
  ]);

  return {
    topStates: (statesResult.data || []) as StateRow[],
    topCities: ((citiesResult.data || []) as CityRow[]).map((c) => ({
      ...c,
      restaurant_count: c.restaurant_count ?? 0,
    })),
    shows: (showsResult.data || []) as ShowRow[],
    topChefs: ((chefsResult.data || []) as ChefRow[]).slice(0, 6),
  };
});
