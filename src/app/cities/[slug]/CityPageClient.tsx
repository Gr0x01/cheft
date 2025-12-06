'use client';

import { useState, useCallback, Suspense } from 'react';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { RestaurantFilters } from '@/components/restaurant/RestaurantFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RestaurantData } from '@/lib/hooks/useRestaurantFilters';

interface CityPageClientProps {
  restaurants: RestaurantData[];
}

function CityPageClientInner({ restaurants }: CityPageClientProps) {
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantData[]>(restaurants);

  const handleFilteredRestaurantsChange = useCallback((filtered: RestaurantData[]) => {
    setFilteredRestaurants(filtered);
  }, []);

  return (
    <>
      <RestaurantFilters
        restaurants={restaurants}
        totalRestaurants={restaurants.length}
        onFilteredRestaurantsChange={handleFilteredRestaurantsChange}
        hideCityDropdown
      />

      <section className="max-w-7xl mx-auto px-4 py-12">
        {filteredRestaurants.length === 0 ? (
          <EmptyState
            message="No restaurants found matching your criteria"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </section>
    </>
  );
}

export function CityPageClient(props: CityPageClientProps) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    }>
      <CityPageClientInner {...props} />
    </Suspense>
  );
}
