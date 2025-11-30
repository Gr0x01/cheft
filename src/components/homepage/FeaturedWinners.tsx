import React from 'react';
import { Section, SectionHeader, SectionTitle, SectionDescription, Card, CardHeader, CardContent, CardFooter, Badge } from '@/components/ui';
import type { FeaturedWinner } from '@/lib/types';

interface FeaturedWinnersProps {
  winners: FeaturedWinner[];
  onWinnerClick?: (winner: FeaturedWinner) => void;
}

export function FeaturedWinners({ winners, onWinnerClick }: FeaturedWinnersProps) {
  // Mock data if no winners provided
  const mockWinners: FeaturedWinner[] = [
    {
      id: '1',
      chef: {
        id: '1',
        name: 'Kristen Kish',
        slug: 'kristen-kish',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: '10',
        top_chef_result: 'winner',
        mini_bio: null,
        country: 'USA',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      restaurant: {
        id: '1',
        name: 'Arlo Grey',
        slug: 'arlo-grey',
        chef_id: '1',
        city: 'Austin',
        state: 'TX',
        country: 'USA',
        lat: null,
        lng: null,
        price_tier: '$$$',
        cuisine_tags: ['American', 'Contemporary'],
        status: 'open',
        website_url: null,
        maps_url: null,
        source_notes: null,
        is_public: true,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      show: {
        id: '1',
        name: 'Top Chef',
        network: 'Bravo',
        created_at: '2023-01-01'
      },
      season: 'Season 10',
      achievement: 'Winner'
    },
    {
      id: '2',
      chef: {
        id: '2',
        name: 'Stephanie Izard',
        slug: 'stephanie-izard',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: '4',
        top_chef_result: 'winner',
        mini_bio: null,
        country: 'USA',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      restaurant: {
        id: '2',
        name: 'Girl & Goat',
        slug: 'girl-and-goat',
        chef_id: '2',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        lat: null,
        lng: null,
        price_tier: '$$$',
        cuisine_tags: ['Global', 'Contemporary'],
        status: 'open',
        website_url: null,
        maps_url: null,
        source_notes: null,
        is_public: true,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      show: {
        id: '1',
        name: 'Top Chef',
        network: 'Bravo',
        created_at: '2023-01-01'
      },
      season: 'Season 4',
      achievement: 'Winner'
    },
    {
      id: '3',
      chef: {
        id: '3',
        name: 'Richard Blais',
        slug: 'richard-blais',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: '8',
        top_chef_result: 'winner',
        mini_bio: null,
        country: 'USA',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      restaurant: {
        id: '3',
        name: 'The Crack Shack',
        slug: 'the-crack-shack',
        chef_id: '3',
        city: 'San Diego',
        state: 'CA',
        country: 'USA',
        lat: null,
        lng: null,
        price_tier: '$$',
        cuisine_tags: ['Casual', 'Chicken'],
        status: 'open',
        website_url: null,
        maps_url: null,
        source_notes: null,
        is_public: true,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      },
      show: {
        id: '1',
        name: 'Top Chef',
        network: 'Bravo',
        created_at: '2023-01-01'
      },
      season: 'Season 8',
      achievement: 'Winner'
    }
  ];

  const displayWinners = winners.length > 0 ? winners : mockWinners;

  const handleWinnerClick = (winner: FeaturedWinner) => {
    onWinnerClick?.(winner);
  };

  return (
    <Section spacing="lg" background="white">
      <SectionHeader centered>
        <SectionTitle level={2}>
          Featured TV Chef Winners
        </SectionTitle>
        <SectionDescription>
          Discover restaurants from recent competition winners and acclaimed chefs
        </SectionDescription>
      </SectionHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {displayWinners.map((winner) => (
          <Card
            key={winner.id}
            variant="elevated"
            padding="lg"
            className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            onClick={() => handleWinnerClick(winner)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-subheading text-gray-900 font-semibold">
                  {winner.chef.name}
                </h3>
                <Badge variant="secondary" size="sm">
                  {winner.achievement}
                </Badge>
              </div>
              <p className="text-small text-gray-500">
                {winner.show.name} {winner.season}
              </p>
            </CardHeader>

            <CardContent>
              <div className="mb-3">
                <h4 className="text-body font-medium text-gray-900 mb-1">
                  {winner.restaurant.name}
                </h4>
                <p className="text-small text-gray-600">
                  {winner.restaurant.city}, {winner.restaurant.state}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-small text-gray-600">
                  {winner.restaurant.cuisine_tags?.join(', ')}
                </span>
                <span className="font-medium text-gray-700">
                  {winner.restaurant.price_tier}
                </span>
              </div>
            </CardContent>

            <CardFooter>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {winner.restaurant.status === 'open' ? 'Currently Open' : 'Status Unknown'}
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Section>
  );
}