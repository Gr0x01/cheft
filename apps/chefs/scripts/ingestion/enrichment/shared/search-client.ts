import { searchTavily, TavilyResult, TavilyResponse, getCacheStats, invalidateCache } from './tavily-client';

export interface SearchResult {
  query: string;
  results: TavilyResult[];
  fromCache: boolean;
  cachedAt?: Date;
  searchType: SearchType;
}

export type SearchType = 'bio' | 'shows' | 'restaurants' | 'blurb' | 'status';

export interface HarvestResult {
  chefId: string;
  chefName: string;
  searches: {
    bio: SearchResult | null;
    shows: SearchResult[];
    restaurants: SearchResult[];
  };
  totalResults: number;
  cacheHits: number;
  freshSearches: number;
}

export interface CacheStats {
  total: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  expired: number;
}

const SEARCH_QUERIES = {
  bio: (name: string) => `${name} chef biography Wikipedia James Beard Michelin star awards`,
  shows: (name: string) => [
    `${name} Top Chef`,
    `${name} Tournament of Champions`,
    `${name} TV cooking shows competition`,
    `${name} Food Network appearances`,
  ],
  restaurants: (name: string) => [
    `${name} restaurant`,
    `${name} owns restaurant`,
    `${name} opened restaurant`,
    `${name} chef owner`,
  ],
  blurb: (name: string, showName: string, season?: string) =>
    season
      ? `${name} ${showName} Season ${season} performance competition`
      : `${name} ${showName} performance competition`,
  status: (restaurantName: string, city: string) =>
    `${restaurantName} ${city} restaurant open closed status 2024 2025`,
};

const TTL_DAYS = {
  bio: 90,
  shows: 90,
  restaurants: 30,
  blurb: 90,
  status: 7,
};

async function executeSearch(
  query: string,
  searchType: SearchType,
  entityId?: string,
  entityName?: string
): Promise<SearchResult> {
  const response = await searchTavily(query, {
    entityType: searchType === 'status' ? 'restaurant' : 'chef',
    entityId,
    entityName,
    ttlDays: TTL_DAYS[searchType],
  });

  return {
    query: response.query,
    results: response.results,
    fromCache: response.fromCache,
    cachedAt: response.cachedAt,
    searchType,
  };
}

export async function searchBio(chefName: string, chefId?: string): Promise<SearchResult> {
  const query = SEARCH_QUERIES.bio(chefName);
  return executeSearch(query, 'bio', chefId, chefName);
}

export async function searchShows(chefName: string, chefId?: string): Promise<SearchResult[]> {
  const queries = SEARCH_QUERIES.shows(chefName);
  const results: SearchResult[] = [];

  for (const query of queries) {
    const result = await executeSearch(query, 'shows', chefId, chefName);
    results.push(result);
    if (!result.fromCache) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

export async function searchRestaurants(chefName: string, chefId?: string): Promise<SearchResult[]> {
  const queries = SEARCH_QUERIES.restaurants(chefName);
  const results: SearchResult[] = [];

  for (const query of queries) {
    const result = await executeSearch(query, 'restaurants', chefId, chefName);
    results.push(result);
    if (!result.fromCache) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

export async function searchBlurbDetails(
  chefName: string,
  showName: string,
  season?: string
): Promise<SearchResult> {
  const query = SEARCH_QUERIES.blurb(chefName, showName, season);
  return executeSearch(query, 'blurb', undefined, chefName);
}

export async function searchStatus(
  restaurantName: string,
  city: string,
  restaurantId?: string
): Promise<SearchResult> {
  const query = SEARCH_QUERIES.status(restaurantName, city);
  return executeSearch(query, 'status', restaurantId, restaurantName);
}

export async function harvestChef(chefName: string, chefId: string): Promise<HarvestResult> {
  console.log(`   🌾 Harvesting search data for ${chefName}`);

  let totalResults = 0;
  let cacheHits = 0;
  let freshSearches = 0;

  const bioResult = await searchBio(chefName, chefId);
  totalResults += bioResult.results.length;
  if (bioResult.fromCache) cacheHits++;
  else freshSearches++;

  const showsResults = await searchShows(chefName, chefId);
  for (const r of showsResults) {
    totalResults += r.results.length;
    if (r.fromCache) cacheHits++;
    else freshSearches++;
  }

  const restaurantsResults = await searchRestaurants(chefName, chefId);
  for (const r of restaurantsResults) {
    totalResults += r.results.length;
    if (r.fromCache) cacheHits++;
    else freshSearches++;
  }

  console.log(
    `      📊 ${totalResults} results (${cacheHits} cached, ${freshSearches} fresh)`
  );

  return {
    chefId,
    chefName,
    searches: {
      bio: bioResult,
      shows: showsResults,
      restaurants: restaurantsResults,
    },
    totalResults,
    cacheHits,
    freshSearches,
  };
}

export function combineSearchResults(results: SearchResult[]): string {
  const allContent: string[] = [];

  for (const result of results) {
    for (const item of result.results) {
      allContent.push(`Source: ${item.title}\nURL: ${item.url}\n${item.content}`);
    }
  }

  return allContent.join('\n\n---\n\n');
}

export function combineSearchResultsCompact(results: SearchResult[], maxLength: number = 12000): string {
  const allContent: string[] = [];
  let currentLength = 0;

  outer: for (const result of results) {
    for (const item of result.results) {
      const entry = `[${item.title}]\n${item.content}`;
      if (currentLength + entry.length > maxLength) {
        break outer;
      }
      allContent.push(entry);
      currentLength += entry.length;
    }
  }

  return allContent.join('\n\n');
}

export { getCacheStats, invalidateCache };
export type { TavilyResult };
