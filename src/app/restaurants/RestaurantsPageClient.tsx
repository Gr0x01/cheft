'use client';

import { useState, useCallback, Suspense } from 'react';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { RestaurantFilters } from '@/components/restaurant/RestaurantFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBarSkeleton } from '@/components/ui/FilterBarSkeleton';
import type { RestaurantData } from '@/lib/hooks/useRestaurantFilters';

interface City {
  name: string;
  state: string | null;
  count: number;
}

interface StateOption {
  name: string;
  abbreviation: string;
  count: number;
}

interface RestaurantsPageClientProps {
  initialRestaurants: RestaurantData[];
  cities: City[];
  states: StateOption[];
  totalRestaurants: number;
}

export function RestaurantsPageClient({ initialRestaurants, cities, states, totalRestaurants }: RestaurantsPageClientProps) {
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantData[]>(initialRestaurants);

  const handleFilteredRestaurantsChange = useCallback((restaurants: RestaurantData[]) => {
    setFilteredRestaurants(restaurants);
  }, []);

  return (
    <>
      {/* Suspense must wrap the filter bar only. RestaurantFilters reads useSearchParams,
          which client-renders everything inside the boundary — with the grid in here too,
          the restaurant links never reach the prerendered HTML. */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <RestaurantFilters
          cities={cities}
          states={states}
          restaurants={initialRestaurants}
          totalRestaurants={totalRestaurants}
          onFilteredRestaurantsChange={handleFilteredRestaurantsChange}
        />
      </Suspense>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {filteredRestaurants.length === 0 ? (
          <EmptyState
            message="No restaurants found matching your criteria"
            actionHref="/restaurants"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRestaurants.map((restaurant, index) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={{
                  ...restaurant,
                  chef: restaurant.chef ? {
                    name: restaurant.chef.name,
                    slug: restaurant.chef.slug,
                    james_beard_status: restaurant.chef.james_beard_status,
                    chef_shows: restaurant.chef.chef_shows?.map(cs => ({
                      result: cs.result,
                      is_primary: cs.is_primary ?? undefined,
                    })),
                  } : null,
                }} 
                index={index} 
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
