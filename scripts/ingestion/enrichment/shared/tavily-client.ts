import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  results: TavilyResult[];
  query: string;
  fromCache: boolean;
  cachedAt?: Date;
}

export interface CacheOptions {
  entityType: 'chef' | 'restaurant';
  entityId?: string;
  entityName?: string;
  ttlDays?: number;
}

const DEFAULT_TTL_DAYS = {
  chef: 90,
  restaurant: 30,
};

function hashQuery(query: string): string {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

async function getCachedResults(queryHash: string): Promise<TavilyResponse | null> {
  const { data, error } = await getSupabase()
    .from('search_cache')
    .select('*')
    .eq('query_hash', queryHash)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    results: data.results as TavilyResult[],
    query: data.query,
    fromCache: true,
    cachedAt: new Date(data.fetched_at),
  };
}

async function cacheResults(
  query: string,
  queryHash: string,
  results: TavilyResult[],
  options: CacheOptions
): Promise<void> {
  const ttlDays = options.ttlDays ?? DEFAULT_TTL_DAYS[options.entityType];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  await getSupabase().from('search_cache').insert({
    entity_type: options.entityType,
    entity_id: options.entityId || null,
    entity_name: options.entityName || null,
    query,
    query_hash: queryHash,
    results,
    result_count: results.length,
    source: 'tavily',
    fetched_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });
}

export async function searchTavily(
  query: string,
  options: CacheOptions & { skipCache?: boolean; maxResults?: number } = { entityType: 'chef' }
): Promise<TavilyResponse> {
  const queryHash = hashQuery(query);

  if (!options.skipCache) {
    const cached = await getCachedResults(queryHash);
    if (cached) {
      console.log(`      📦 Cache hit: "${query.substring(0, 40)}..."`);
      return cached;
    }
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not set');
  }

  console.log(`      🔍 Tavily search: "${query.substring(0, 40)}..."`);

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      include_raw_content: false,
      max_results: options.maxResults ?? 10,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const results: TavilyResult[] = data.results || [];

  await cacheResults(query, queryHash, results, options);

  return {
    results,
    query,
    fromCache: false,
  };
}

export async function searchChefShows(chefName: string, chefId?: string): Promise<TavilyResponse> {
  return searchTavily(`${chefName} chef TV shows appearances Top Chef Iron Chef competition`, {
    entityType: 'chef',
    entityId: chefId,
    entityName: chefName,
    ttlDays: 90,
  });
}

export async function searchChefRestaurants(chefName: string, chefId?: string): Promise<TavilyResponse> {
  return searchTavily(`${chefName} chef restaurants locations`, {
    entityType: 'chef',
    entityId: chefId,
    entityName: chefName,
    ttlDays: 30,
  });
}

export async function searchRestaurantStatus(
  restaurantName: string,
  city: string,
  restaurantId?: string
): Promise<TavilyResponse> {
  return searchTavily(`${restaurantName} ${city} restaurant open closed status 2024 2025`, {
    entityType: 'restaurant',
    entityId: restaurantId,
    entityName: restaurantName,
    ttlDays: 7,
  });
}

export async function getCacheStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  expired: number;
}> {
  const { data: all } = await getSupabase()
    .from('search_cache')
    .select('entity_type, source, expires_at');

  if (!all) return { total: 0, byType: {}, bySource: {}, expired: 0 };

  const now = new Date();
  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let expired = 0;

  for (const row of all) {
    byType[row.entity_type] = (byType[row.entity_type] || 0) + 1;
    bySource[row.source] = (bySource[row.source] || 0) + 1;
    if (row.expires_at && new Date(row.expires_at) < now) expired++;
  }

  return { total: all.length, byType, bySource, expired };
}

export async function invalidateCache(entityType: string, entityId: string): Promise<number> {
  const { data } = await getSupabase()
    .from('search_cache')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .select('id');

  return data?.length || 0;
}
