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

export interface Chef {
  id: string;
  name: string;
  slug: string;
  primary_show_id: string | null;
  other_shows: string[] | null;
  top_chef_season: string | null;
  top_chef_result: 'winner' | 'finalist' | 'contestant' | null;
  mini_bio: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
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

// Combined type for restaurant with chef info
export interface RestaurantWithChef extends Restaurant {
  chef: Chef;
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
        chef:chefs(*)
      `)
      .eq('is_public', true)
      .order('name');
    
    if (error) throw error;
    return data as RestaurantWithChef[];
  },

  // Get restaurants by city
  async getRestaurantsByCity(city: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(*)
      `)
      .eq('is_public', true)
      .eq('city', city)
      .order('name');
    
    if (error) throw error;
    return data as RestaurantWithChef[];
  },

  // Search restaurants by name or chef name
  async searchRestaurants(query: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(*)
      `)
      .eq('is_public', true)
      .ilike('name', `%${query}%`)
      .order('name');
    
    if (error) throw error;
    return data as RestaurantWithChef[];
  },

  // Get restaurant by slug
  async getRestaurant(slug: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`
        *,
        chef:chefs(*)
      `)
      .eq('slug', slug)
      .eq('is_public', true)
      .single();
    
    if (error) throw error;
    return data as RestaurantWithChef;
  },

  // Get chef by slug
  async getChef(slug: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('chefs')
      .select(`
        *,
        restaurants:restaurants!chef_id(*)
      `)
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data as Chef & { restaurants: Restaurant[] };
  }
};

export default getSupabaseClient;