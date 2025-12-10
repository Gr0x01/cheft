import { createClient } from '@supabase/supabase-js';

// Supabase client configuration for frontend
// IMPORTANT: Only uses anonymous key - never expose service role key to client
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  return { supabaseUrl, supabaseAnonKey };
}

// Create Supabase client with anonymous key
// This client respects Row Level Security (RLS) policies
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!_supabase) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false, // No user auth needed for this read-only app
      },
      realtime: {
        params: {
          eventsPerSecond: 10 // Rate limit for realtime if needed later
        }
      }
    });
  }
  return _supabase;
}

// Export the getter function, not the result
export { getSupabaseClient as supabase };

// IMPORTANT: Do NOT export supabaseAdmin or service role key in frontend code
// Server-side operations should use separate admin client in API routes or scripts

// Type definitions for our database schema
export interface Show {
  id: string;
  name: string;
  slug: string;
  network: string | null;
  parent_show_id: string | null;
  show_type: 'core' | 'spinoff' | 'variant' | 'named_season' | null;
  is_public: boolean | null;
  created_at: string;
}

export interface ChefShow {
  id: string;
  chef_id: string;
  show_id: string;
  season: string | null;
  season_name: string | null;
  result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  is_primary: boolean;
  created_at: string;
  show?: Show | null;
}

export interface Chef {
  id: string;
  name: string;
  slug: string;
  mini_bio: string | null;
  country: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  created_at: string;
  updated_at: string;
  chef_shows?: ChefShow[];
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  chef_id: string;
  city: string;
  state: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  price_tier: '$' | '$$' | '$$$' | '$$$$' | null;
  cuisine_tags: string[] | null;
  status: 'open' | 'closed' | 'unknown';
  website_url: string | null;
  maps_url: string | null;
  source_notes: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Combined type for restaurant with chef info (including derived fields)
export interface RestaurantWithChef extends Restaurant {
  chef: Chef & {
    primary_show?: Show | null;
    top_chef_season?: string | null;
    top_chef_result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  };
}

// RPC response types
export interface FeaturedChefRpcRow {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  mini_bio: string | null;
  james_beard_status: string | null;
  chef_shows: Array<{
    id: string;
    season: string | null;
    result: string | null;
    is_primary: boolean;
    show: { id: string; name: string; slug: string };
  }>;
  restaurant_count: number;
}

export interface MapPinRpcRow {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  state: string | null;
  chef_name: string;
  chef_slug: string;
  price_tier: string | null;
  status: string;
}

// Database helper functions
export const db = {
  // Get all shows
  async getShows() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('shows')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Show[];
  },

  // Get all restaurants with chef info
  async getRestaurants() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(
          *,
          chef_shows(
            *,
            show:shows(*)
          )
        )
      `)
      .eq('is_public', true)
      .order('name')
      .limit(5000);
    
    if (error) throw error;
    return transformRestaurants(data);
  },

  // Get restaurants by city
  async getRestaurantsByCity(city: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(
          *,
          chef_shows(
            *,
            show:shows(*)
          )
        )
      `)
      .eq('is_public', true)
      .eq('city', city)
      .order('name');
    
    if (error) throw error;
    return transformRestaurants(data);
  },

  // Search restaurants by name or chef name
  async searchRestaurants(query: string) {
    const client = getSupabaseClient();
    const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(
          *,
          chef_shows(
            *,
            show:shows(*)
          )
        )
      `)
      .eq('is_public', true)
      .ilike('name', `%${sanitizedQuery}%`)
      .order('name');
    
    if (error) throw error;
    return transformRestaurants(data);
  },

  // Get restaurant by slug
  async getRestaurant(slug: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(
          *,
          chef_shows(
            *,
            show:shows(*)
          )
        )
      `)
      .eq('slug', slug)
      .eq('is_public', true)
      .single();
    
    if (error) throw error;
    const transformed = transformRestaurants([data]);
    return transformed[0];
  },

  // Get chef by slug
  async getChef(slug: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('chefs')
      .select(`
        *,
        chef_shows(
          *,
          show:shows(*)
        ),
        restaurants:restaurants!chef_id(*)
      `)
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data as Chef & { restaurants: Restaurant[] };
  },

  // Get featured chef for homepage hero (one spotlight chef)
  async getFeaturedChef() {
    const client = getSupabaseClient();
    
    const { data: chefs, error } = await client
      .from('chefs')
      .select(`
        id,
        name,
        slug,
        photo_url,
        mini_bio,
        james_beard_status,
        instagram_handle,
        chef_shows(
          id,
          result,
          season,
          is_primary,
          show:shows(name)
        ),
        restaurants!chef_id(
          id,
          name,
          slug,
          city,
          state,
          photo_urls,
          google_rating,
          google_review_count,
          price_tier,
          status
        )
      `)
      .not('mini_bio', 'is', null)
      .eq('restaurants.is_public', true)
      .limit(100);
    
    if (error) {
      console.error('Error fetching featured chef:', error);
      return null;
    }
    if (!chefs || chefs.length === 0) return null;
    
    const chefsWithData = (chefs as any[]).map((chef: any) => {
      const openRestaurants = (chef.restaurants || [])
        .filter((r: any) => r.status === 'open');
      
      const topRestaurants = openRestaurants
        .filter((r: any) => r.google_rating !== null)
        .sort((a: any, b: any) => (b.google_rating || 0) - (a.google_rating || 0))
        .slice(0, 4);
      
      return {
        ...chef,
        restaurants: topRestaurants,
        open_restaurant_count: openRestaurants.length
      };
    });
    
    const eligibleChefs = chefsWithData.filter(chef => chef.open_restaurant_count >= 3);
    
    if (eligibleChefs.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * eligibleChefs.length);
    return eligibleChefs[randomIndex];
  },

  // Get featured chefs (chefs with photos and restaurants, randomized)
  // Uses RPC to avoid N+1 query problem (was causing connection exhaustion)
  async getFeaturedChefs(limit: number = 12, excludeChefId?: string): Promise<FeaturedChefRpcRow[]> {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_featured_chefs_with_counts');
    
    if (error) throw error;
    
    let eligible: FeaturedChefRpcRow[] = ((data as FeaturedChefRpcRow[] | null) || []).map((chef) => ({
      ...chef,
      chef_shows: chef.chef_shows || []
    }));
    
    if (excludeChefId) {
      eligible = eligible.filter((chef) => chef.id !== excludeChefId);
    }
    
    // Shuffle for randomization
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    
    return eligible.slice(0, limit);
  },

  async getStats() {
    const client = getSupabaseClient();
    const [restaurantsResult, chefsResult, citiesResult] = await Promise.all([
      client.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_public', true),
      client.from('chefs').select('id', { count: 'exact', head: true }),
      client.from('cities').select('id', { count: 'exact', head: true })
    ]);
    
    return {
      restaurants: restaurantsResult.count || 0,
      chefs: chefsResult.count || 0,
      cities: citiesResult.count || 0
    };
  },

  async getShowsWithCounts(): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    network: string | null;
    created_at: string;
    show_type: string | null;
    chef_count: number;
    restaurant_count: number;
    child_count: number;
  }>> {
    const client = getSupabaseClient();
    const { data, error } = await (client as any).rpc('get_shows_with_counts');
    
    if (error) throw error;
    return (data as any) || [];
  },

  async getShow(slug: string) {
    const client = getSupabaseClient();
    const { data: show, error: showError } = await client
      .from('shows')
      .select('id, name, slug, network, created_at, parent_show_id, show_type, is_public')
      .eq('slug', slug)
      .single();
    
    if (showError) throw showError;
    
    const { data: chefData, error: chefError } = await (client as any).rpc('get_show_with_chef_counts', { p_show_slug: slug });
    
    if (chefError) throw chefError;
    
    const firstRow = chefData?.[0];
    const parentInfo = (firstRow?.parent_show_slug && firstRow?.parent_show_name) ? {
      parent_show_slug: firstRow.parent_show_slug,
      parent_show_name: firstRow.parent_show_name,
    } : null;
    
    const chefShowsMap = new Map();
    (chefData || []).forEach((row: any) => {
      const chefId = row.chef_id;
      if (!chefShowsMap.has(chefId)) {
        chefShowsMap.set(chefId, {
          id: row.chef_show_id,
          chef_id: row.chef_id,
          show_id: row.show_id,
          season: row.season,
          season_name: row.season_name,
          result: row.result,
          is_primary: row.is_primary,
          source_show_slug: row.source_show_slug,
          source_show_name: row.source_show_name,
          chef: {
            id: row.chef_id,
            name: row.chef_name,
            slug: row.chef_slug,
            photo_url: row.chef_photo_url,
            mini_bio: row.chef_mini_bio,
            restaurant_count: row.restaurant_count
          }
        });
      }
    });
    
    return {
      ...(show as any),
      ...parentInfo,
      chef_shows: Array.from(chefShowsMap.values())
    };
  },

  async getShowChildren(parentSlug: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    show_type: string | null;
    chef_count: number;
  }>> {
    const client = getSupabaseClient();
    try {
      const { data, error } = await (client as any).rpc('get_show_children', { p_parent_slug: parentSlug });
      
      if (error) {
        console.error('RPC get_show_children failed:', error);
        return [];
      }
      
      if (!Array.isArray(data)) {
        return [];
      }
      
      return data.map((row: any) => ({
        id: row.child_show_id,
        name: row.child_show_name,
        slug: row.child_show_slug,
        show_type: row.child_show_type,
        chef_count: row.child_chef_count,
      }));
    } catch (error) {
      console.error('Failed to fetch show children:', error);
      return [];
    }
  },

  // Get all unique seasons for a show
  async getShowSeasons(showSlug: string) {
    const client = getSupabaseClient();
    const { data, error } = await (client as any).rpc('get_show_seasons', { p_show_slug: showSlug });
    
    if (error) throw error;
    return data || [];
  },

  // Get chefs for a specific show season
  async getShowSeason(showSlug: string, season: string) {
    const client = getSupabaseClient();
    const { data, error } = await (client as any).rpc('get_show_season_data', { 
      p_show_slug: showSlug, 
      p_season_number: season 
    });
    
    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    const firstRow = data[0];
    const chefsMap = new Map();
    
    data.forEach((row: any) => {
      if (!chefsMap.has(row.chef_id)) {
        chefsMap.set(row.chef_id, {
          id: row.chef_show_id,
          chef_id: row.chef_id,
          show_id: row.show_id,
          season: row.season,
          season_name: row.season_name,
          result: row.result,
          is_primary: row.is_primary,
          chef: {
            id: row.chef_id,
            name: row.chef_name,
            slug: row.chef_slug,
            photo_url: row.chef_photo_url,
            mini_bio: row.chef_mini_bio,
            james_beard_status: row.chef_james_beard_status,
            restaurant_count: Number(row.chef_restaurant_count) || 0,
            chef_shows: row.chef_shows_json || [],
            restaurants: []
          }
        });
      }
      
      if (row.restaurant_id) {
        const chef = chefsMap.get(row.chef_id);
        chef.chef.restaurants.push({
          id: row.restaurant_id,
          name: row.restaurant_name,
          slug: row.restaurant_slug,
          city: row.restaurant_city,
          state: row.restaurant_state,
          status: row.restaurant_status,
          photo_urls: row.restaurant_photo_urls,
          price_tier: row.restaurant_price_tier,
          cuisine_tags: row.restaurant_cuisine_tags,
          google_rating: row.restaurant_google_rating,
          google_review_count: row.restaurant_google_review_count
        });
      }
    });
    
    return {
      id: firstRow.show_id,
      name: firstRow.show_name,
      slug: firstRow.show_slug,
      network: firstRow.show_network,
      created_at: firstRow.show_created_at,
      season: firstRow.season,
      season_name: firstRow.season_name,
      chef_shows: Array.from(chefsMap.values())
    };
  },

  async getShowWinnersWithRestaurants(showSlug: string): Promise<Array<{
    chef: {
      id: string;
      name: string;
      slug: string;
      photo_url: string | null;
    };
    season: string;
    flagship: {
      id: string;
      name: string;
      slug: string;
      city: string;
      state: string | null;
      photo_url: string | null;
      michelin_stars: number | null;
      price_tier: string | null;
    } | null;
  }>> {
    try {
      const client = getSupabaseClient();
      const { data: showData, error: showError } = await client
        .from('shows')
        .select('id')
        .eq('slug', showSlug)
        .single();
      
      if (showError || !showData) {
        if (showError) console.error('Error fetching show for winners:', showError);
        return [];
      }

      const showId = (showData as { id: string }).id;

    const { data: winners, error } = await client
      .from('chef_shows')
      .select(`
        season,
        chef:chefs(
          id,
          name,
          slug,
          photo_url,
          restaurants(
            id,
            name,
            slug,
            city,
            state,
            photo_urls,
            michelin_stars,
            price_tier,
            status
          )
        )
      `)
      .eq('show_id', showId)
      .eq('result', 'winner')
      .order('season', { ascending: false });

    if (error || !winners) return [];

    return (winners as any[])
      .filter(w => w.chef && w.season)
      .map(w => {
        const openRestaurants = (w.chef.restaurants || [])
          .filter((r: any) => r.status === 'open')
          .sort((a: any, b: any) => (b.michelin_stars || 0) - (a.michelin_stars || 0));
        
        const flagship = openRestaurants[0];
        
        return {
          chef: {
            id: w.chef.id,
            name: w.chef.name,
            slug: w.chef.slug,
            photo_url: w.chef.photo_url,
          },
          season: w.season,
          flagship: flagship ? {
            id: flagship.id,
            name: flagship.name,
            slug: flagship.slug,
            city: flagship.city,
            state: flagship.state,
            photo_url: flagship.photo_urls?.[0] || null,
            michelin_stars: flagship.michelin_stars,
            price_tier: flagship.price_tier,
          } : null,
        };
      })
      .sort((a, b) => {
        const aNum = parseInt(a.season, 10);
        const bNum = parseInt(b.season, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
        return 0;
      });
    } catch (error) {
      console.error('Error in getShowWinnersWithRestaurants:', error);
      return [];
    }
  },

  async getShowRestaurantLocations(showSlug: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    lat: number;
    lng: number;
    city: string;
    chef_name: string;
  }>> {
    try {
      const client = getSupabaseClient();
      const { data: showData, error: showError } = await client
        .from('shows')
        .select('id')
        .eq('slug', showSlug)
        .single();
      
      if (showError || !showData) {
        if (showError) console.error('Error fetching show for locations:', showError);
        return [];
      }

      const showId = (showData as { id: string }).id;

    const { data: chefIds } = await client
      .from('chef_shows')
      .select('chef_id')
      .eq('show_id', showId);
    
    if (!chefIds || chefIds.length === 0) return [];

    const chefIdList = (chefIds as Array<{ chef_id: string }>).map(c => c.chef_id);

    const { data: restaurants, error } = await client
      .from('restaurants')
      .select(`
        id,
        name,
        slug,
        lat,
        lng,
        city,
        chef:chefs(name)
      `)
      .in('chef_id', chefIdList)
      .eq('status', 'open')
      .eq('is_public', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (error || !restaurants) return [];

    return (restaurants as Array<{ id: string; name: string; slug: string; lat: number; lng: number; city: string; chef: { name: string } | null }>).map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      lat: r.lat,
      lng: r.lng,
      city: r.city,
      chef_name: r.chef?.name || '',
    }));
    } catch (error) {
      console.error('Error in getShowRestaurantLocations:', error);
      return [];
    }
  },

  async getShowStats(showSlug: string): Promise<{
    totalRestaurants: number;
    totalCities: number;
    michelinStars: number;
  }> {
    try {
      const client = getSupabaseClient();
      const { data: showData, error: showError } = await client
        .from('shows')
        .select('id')
        .eq('slug', showSlug)
        .single();
      
      if (showError || !showData) {
        if (showError) console.error('Error fetching show for stats:', showError);
        return { totalRestaurants: 0, totalCities: 0, michelinStars: 0 };
      }

      const showId = (showData as { id: string }).id;

    const { data: chefIds } = await client
      .from('chef_shows')
      .select('chef_id')
      .eq('show_id', showId);
    
    if (!chefIds || chefIds.length === 0) return { totalRestaurants: 0, totalCities: 0, michelinStars: 0 };

    const chefIdList = (chefIds as Array<{ chef_id: string }>).map(c => c.chef_id);

    const { data: restaurants } = await client
      .from('restaurants')
      .select('city, michelin_stars')
      .in('chef_id', chefIdList)
      .eq('status', 'open')
      .eq('is_public', true);

    if (!restaurants) return { totalRestaurants: 0, totalCities: 0, michelinStars: 0 };

    const typedRestaurants = restaurants as Array<{ city: string; michelin_stars: number | null }>;
    const cities = new Set(typedRestaurants.map(r => r.city));
    const michelinStars = typedRestaurants.reduce((sum, r) => sum + (r.michelin_stars || 0), 0);

    return {
      totalRestaurants: typedRestaurants.length,
      totalCities: cities.size,
      michelinStars,
    };
    } catch (error) {
      console.error('Error in getShowStats:', error);
      return { totalRestaurants: 0, totalCities: 0, michelinStars: 0 };
    }
  }
};

interface RawChefShow {
  id: string;
  chef_id: string;
  show_id: string;
  season: string | null;
  season_name: string | null;
  result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  is_primary: boolean;
  created_at: string;
  show: Show | null;
}

interface RawChef {
  id: string;
  name: string;
  slug: string;
  mini_bio: string | null;
  country: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  created_at: string;
  updated_at: string;
  chef_shows: RawChefShow[];
}

interface RawRestaurant extends Omit<Restaurant, 'chef'> {
  chef: RawChef;
}

function transformRestaurants(data: RawRestaurant[]): RestaurantWithChef[] {
  return data.map(r => {
    const primaryChefShow = r.chef?.chef_shows?.find(cs => cs.is_primary) || r.chef?.chef_shows?.[0];
    const { chef_shows, ...chefRest } = r.chef || {};
    return {
      ...r,
      chef: {
        ...chefRest,
        chef_shows: chef_shows?.map(cs => ({ ...cs, show: cs.show ?? undefined })),
        primary_show: primaryChefShow?.show ?? undefined,
        top_chef_season: primaryChefShow?.season || primaryChefShow?.season_name || null,
        top_chef_result: primaryChefShow?.result || null,
      }
    } as RestaurantWithChef;
  });
}

export default getSupabaseClient;