'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type ResultFilter = 'winner' | 'finalist' | 'judge' | 'contestant';
export type JBFilter = 'winner' | 'nominated' | 'any';
export type SortOption = 'name' | 'restaurants' | 'decorated' | 'recent';

export interface ChefFilters {
  q: string;
  shows: string[];
  results: ResultFilter[];
  jb: JBFilter | null;
  hasRestaurants: boolean;
  hasMichelin: boolean;
  hasCookbook: boolean;
  sort: SortOption;
}

export interface ChefData {
  id: string;
  name: string;
  slug: string;
  photo_url?: string | null;
  instagram_handle?: string | null;
  mini_bio?: string | null;
  james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
  cookbook_titles?: string[] | null;
  restaurant_count: number;
  has_michelin: boolean;
  created_at?: string;
  chef_shows?: Array<{
    show?: { name: string; slug: string } | null;
    season?: string | null;
    result?: ResultFilter | null;
    is_primary?: boolean;
  }>;
}

const DEFAULT_FILTERS: ChefFilters = {
  q: '',
  shows: [],
  results: [],
  jb: null,
  hasRestaurants: false,
  hasMichelin: false,
  hasCookbook: false,
  sort: 'name',
};

export function useChefFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<ChefFilters>(() => {
    const shows = searchParams.get('shows')?.split(',').filter(Boolean) || [];
    const results = (searchParams.get('results')?.split(',').filter(Boolean) || []) as ResultFilter[];
    const jbParam = searchParams.get('jb');
    
    return {
      q: searchParams.get('q') || '',
      shows,
      results,
      jb: jbParam as JBFilter | null,
      hasRestaurants: searchParams.get('hasRestaurants') === 'true',
      hasMichelin: searchParams.get('hasMichelin') === 'true',
      hasCookbook: searchParams.get('hasCookbook') === 'true',
      sort: (searchParams.get('sort') as SortOption) || 'name',
    };
  }, [searchParams]);

  const setFilters = useCallback((newFilters: Partial<ChefFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, ...newFilters };

    if (merged.q) params.set('q', merged.q);
    else params.delete('q');

    if (merged.shows.length > 0) params.set('shows', merged.shows.join(','));
    else params.delete('shows');

    if (merged.results.length > 0) params.set('results', merged.results.join(','));
    else params.delete('results');

    if (merged.jb) params.set('jb', merged.jb);
    else params.delete('jb');

    if (merged.hasRestaurants) params.set('hasRestaurants', 'true');
    else params.delete('hasRestaurants');

    if (merged.hasMichelin) params.set('hasMichelin', 'true');
    else params.delete('hasMichelin');

    if (merged.hasCookbook) params.set('hasCookbook', 'true');
    else params.delete('hasCookbook');

    if (merged.sort !== 'name') params.set('sort', merged.sort);
    else params.delete('sort');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, filters]);

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const toggleShow = useCallback((showSlug: string) => {
    const newShows = filters.shows.includes(showSlug)
      ? filters.shows.filter(s => s !== showSlug)
      : [...filters.shows, showSlug];
    setFilters({ shows: newShows });
  }, [filters.shows, setFilters]);

  const toggleResult = useCallback((result: ResultFilter) => {
    const newResults = filters.results.includes(result)
      ? filters.results.filter(r => r !== result)
      : [...filters.results, result];
    setFilters({ results: newResults });
  }, [filters.results, setFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.shows.length > 0) count++;
    if (filters.results.length > 0) count++;
    if (filters.jb) count++;
    if (filters.hasRestaurants) count++;
    if (filters.hasMichelin) count++;
    if (filters.hasCookbook) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0 || filters.q !== '';

  return {
    filters,
    setFilters,
    clearFilters,
    toggleShow,
    toggleResult,
    activeFilterCount,
    hasActiveFilters,
  };
}

export function filterChefs(chefs: ChefData[], filters: ChefFilters): ChefData[] {
  let result = [...chefs];

  if (filters.q) {
    const query = filters.q.toLowerCase();
    result = result.filter(chef => 
      chef.name.toLowerCase().includes(query) ||
      chef.chef_shows?.some(cs => cs.show?.name?.toLowerCase().includes(query))
    );
  }

  if (filters.shows.length > 0) {
    result = result.filter(chef =>
      chef.chef_shows?.some(cs => 
        filters.shows.includes(cs.show?.slug || '')
      )
    );
  }

  if (filters.results.length > 0) {
    result = result.filter(chef =>
      chef.chef_shows?.some(cs => 
        cs.result && filters.results.includes(cs.result)
      )
    );
  }

  if (filters.jb === 'winner') {
    result = result.filter(chef => chef.james_beard_status === 'winner');
  } else if (filters.jb === 'nominated') {
    result = result.filter(chef => 
      chef.james_beard_status === 'nominated' || chef.james_beard_status === 'winner'
    );
  } else if (filters.jb === 'any') {
    result = result.filter(chef => chef.james_beard_status !== null);
  }

  if (filters.hasRestaurants) {
    result = result.filter(chef => chef.restaurant_count > 0);
  }

  if (filters.hasMichelin) {
    result = result.filter(chef => chef.has_michelin);
  }

  if (filters.hasCookbook) {
    result = result.filter(chef => 
      chef.cookbook_titles && chef.cookbook_titles.length > 0
    );
  }

  return sortChefs(result, filters.sort);
}

export function sortChefs(chefs: ChefData[], sort: SortOption): ChefData[] {
  const sorted = [...chefs];
  
  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    
    case 'restaurants':
      return sorted.sort((a, b) => b.restaurant_count - a.restaurant_count);
    
    case 'decorated':
      return sorted.sort((a, b) => {
        const aScore = getDecoratedScore(a);
        const bScore = getDecoratedScore(b);
        return bScore - aScore;
      });
    
    case 'recent':
      return sorted.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      });
    
    default:
      return sorted;
  }
}

function getDecoratedScore(chef: ChefData): number {
  let score = 0;
  
  const hasWin = chef.chef_shows?.some(cs => cs.result === 'winner');
  const hasFinalist = chef.chef_shows?.some(cs => cs.result === 'finalist');
  
  if (hasWin) score += 100;
  if (hasFinalist) score += 50;
  
  if (chef.james_beard_status === 'winner') score += 200;
  else if (chef.james_beard_status === 'nominated') score += 100;
  else if (chef.james_beard_status === 'semifinalist') score += 50;
  
  if (chef.has_michelin) score += 150;
  
  score += chef.restaurant_count * 10;
  
  return score;
}
