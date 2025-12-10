import React from 'react';
import { Section, SectionHeader, SectionTitle, Card, CardContent } from '@/components/ui';
import type { PopularCity, PopularShow } from '@/lib/types';

interface BrowseSectionProps {
  cities: PopularCity[];
  shows: PopularShow[];
  onCityClick?: (city: PopularCity) => void;
  onShowClick?: (show: PopularShow) => void;
}

export function BrowseSection({ cities, shows, onCityClick, onShowClick }: BrowseSectionProps) {
  // Mock data if not provided
  const mockCities: PopularCity[] = [
    {
      name: 'Chicago',
      state: 'IL',
      country: 'USA',
      restaurantCount: 89,
      slug: 'chicago-il'
    },
    {
      name: 'New York City',
      state: 'NY',
      country: 'USA',
      restaurantCount: 156,
      slug: 'new-york-city-ny'
    },
    {
      name: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      restaurantCount: 112,
      slug: 'los-angeles-ca'
    },
    {
      name: 'Austin',
      state: 'TX',
      country: 'USA',
      restaurantCount: 34,
      slug: 'austin-tx'
    }
  ];

  const mockShows: PopularShow[] = [
    {
      show: {
        id: '1',
        name: 'Top Chef',
        network: 'Bravo',
        created_at: '2023-01-01'
      },
      chefCount: 45,
      restaurantCount: 178,
      currentSeason: 'Season 21'
    },
    {
      show: {
        id: '2',
        name: 'Iron Chef',
        network: 'Netflix',
        created_at: '2023-01-01'
      },
      chefCount: 28,
      restaurantCount: 89,
      currentSeason: 'Quest'
    },
    {
      show: {
        id: '3',
        name: 'Tournament of Champions',
        network: 'Food Network',
        created_at: '2023-01-01'
      },
      chefCount: 32,
      restaurantCount: 67,
      currentSeason: 'Season 5'
    },
    {
      show: {
        id: '4',
        name: "Hell's Kitchen",
        network: 'FOX',
        created_at: '2023-01-01'
      },
      chefCount: 22,
      restaurantCount: 45,
      currentSeason: 'Season 23'
    }
  ];

  const displayCities = cities.length > 0 ? cities : mockCities;
  const displayShows = shows.length > 0 ? shows : mockShows;

  return (
    <Section spacing="lg" background="gray">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Browse Cities */}
        <div>
          <SectionHeader>
            <SectionTitle level={3}>
              Popular Cities
            </SectionTitle>
            <p className="text-body text-gray-600 mt-2">
              Explore TV chef restaurants by destination
            </p>
          </SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayCities.map((city) => (
              <Card
                key={city.slug}
                variant="elevated"
                padding="md"
                className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => onCityClick?.(city)}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-body font-semibold text-gray-900">
                        {city.name}
                      </h4>
                      <p className="text-small text-gray-500">
                        {city.state}, {city.country}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {city.restaurantCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        restaurants
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Browse Shows */}
        <div>
          <SectionHeader>
            <SectionTitle level={3}>
              TV Shows
            </SectionTitle>
            <p className="text-body text-gray-600 mt-2">
              Find restaurants by your favorite cooking shows
            </p>
          </SectionHeader>

          <div className="space-y-3">
            {displayShows.map((showData) => (
              <Card
                key={showData.show.id}
                variant="outline"
                padding="md"
                className="hover:shadow-sm transition-shadow duration-200 cursor-pointer"
                onClick={() => onShowClick?.(showData)}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-body font-semibold text-gray-900">
                        {showData.show.name}
                      </h4>
                      <p className="text-small text-gray-500">
                        {showData.show.network} • {showData.currentSeason}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-small text-gray-600">
                        {showData.chefCount} chefs • {showData.restaurantCount} restaurants
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}