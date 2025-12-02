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
  network: string | null;
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
      .order('name');
    
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
      .ilike('name', `%${query}%`)
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

  // Get featured chefs (winners with photos, sorted by restaurant count)
  async getFeaturedChefs(limit: number = 12) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('chefs')
      .select(`
        id,
        name,
        slug,
        photo_url,
        mini_bio,
        james_beard_status,
        chef_shows(
          *,
          show:shows(*)
        )
      `)
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    
    const chefsWithRestaurantCount = await Promise.all(
      (data || []).map(async (chef: any) => {
        const { count } = await client
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chef.id)
          .eq('is_public', true);
        
        return {
          ...chef,
          restaurant_count: count || 0
        };
      })
    );
    
    return chefsWithRestaurantCount
      .filter(chef => chef.restaurant_count > 0)
      .sort((a, b) => {
        const aIsWinner = a.chef_shows?.some((cs: any) => cs.result === 'winner') || a.james_beard_status === 'winner';
        const bIsWinner = b.chef_shows?.some((cs: any) => cs.result === 'winner') || b.james_beard_status === 'winner';
        
        if (aIsWinner && !bIsWinner) return -1;
        if (!aIsWinner && bIsWinner) return 1;
        
        return b.restaurant_count - a.restaurant_count;
      })
      .slice(0, limit);
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