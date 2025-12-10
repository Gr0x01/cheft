'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';
export type SortOption = 'name' | 'rating' | 'reviews';

export interface RestaurantFilters {
  q: string;
  city: string | null;
  state: string | null;
  price: PriceTier | null;
  openOnly: boolean;
  michelinOnly: boolean;
  sort: SortOption;
}

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  price_tier: PriceTier | null;
  cuisine_tags: string[] | null;
  status: 'open' | 'closed' | 'unknown';
  google_rating: number | null;
  google_review_count: number | null;
  photo_urls: string[] | null;
  michelin_stars: number | null;
  chef: {
    id: string;
    name: string;
    slug: string;
    james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows: Array<{
      result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary: boolean | null;
    }>;
  } | null;
}

export function useRestaurantFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<RestaurantFilters>(() => {
    const priceParam = searchParams.get('price');
    return {
      q: searchParams.get('q') || '',
      city: searchParams.get('city'),
      state: searchParams.get('state'),
      price: priceParam as PriceTier | null,
      openOnly: searchParams.get('status') === 'open',
      michelinOnly: searchParams.get('michelin') === 'true',
      sort: (searchParams.get('sort') as SortOption) || 'name',
    };
  }, [searchParams]);

  const setFilters = useCallback((newFilters: Partial<RestaurantFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, ...newFilters };

    if (merged.q) params.set('q', merged.q);
    else params.delete('q');

    if (merged.city) params.set('city', merged.city);
    else params.delete('city');

    if (merged.state) params.set('state', merged.state);
    else params.delete('state');

    if (merged.price) params.set('price', merged.price);
    else params.delete('price');

    if (merged.openOnly) params.set('status', 'open');
    else params.delete('status');

    if (merged.michelinOnly) params.set('michelin', 'true');
    else params.delete('michelin');

    if (merged.sort !== 'name') params.set('sort', merged.sort);
    else params.delete('sort');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, filters]);

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters = useMemo(() => {
    return filters.q !== '' || 
           filters.city !== null || 
           filters.state !== null ||
           filters.price !== null || 
           filters.openOnly || 
           filters.michelinOnly;
  }, [filters]);

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  };
}

export interface StateOption {
  name: string;
  abbreviation: string;
}

export function filterRestaurants(
  restaurants: RestaurantData[], 
  filters: RestaurantFilters,
  states?: StateOption[]
): RestaurantData[] {
  let result = [...restaurants];

  if (filters.q) {
    const query = filters.q.toLowerCase();
    result = result.filter(r => 
      r.name.toLowerCase().includes(query) ||
      r.city.toLowerCase().includes(query) ||
      r.chef?.name.toLowerCase().includes(query)
    );
  }

  if (filters.city) {
    result = result.filter(r => r.city === filters.city);
  }

  if (filters.state) {
    const stateMatch = states?.find(s => s.name === filters.state);
    result = result.filter(r => 
      r.state === filters.state || 
      (stateMatch && r.state === stateMatch.abbreviation)
    );
  }

  if (filters.price) {
    result = result.filter(r => r.price_tier === filters.price);
  }

  if (filters.openOnly) {
    result = result.filter(r => r.status === 'open');
  }

  if (filters.michelinOnly) {
    result = result.filter(r => r.michelin_stars && r.michelin_stars > 0);
  }

  return sortRestaurants(result, filters.sort);
}

export function sortRestaurants(restaurants: RestaurantData[], sort: SortOption): RestaurantData[] {
  const sorted = [...restaurants];
  
  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    
    case 'rating':
      return sorted.sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0));
    
    case 'reviews':
      return sorted.sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0));
    
    default:
      return sorted;
  }
}
