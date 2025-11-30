'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RestaurantWithDetails } from '@/lib/types';

// Dynamically import the map component to avoid SSR issues
const RestaurantMap = dynamic(() => import('@/components/RestaurantMap'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading map...</div>
});

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDetails | null>(null);

  // Mock data for development - in real app this would come from Supabase
  const mockRestaurants: RestaurantWithDetails[] = [
    {
      id: '1',
      name: 'Girl & Goat',
      slug: 'girl-goat-chicago',
      chef_id: '1',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      lat: 41.8781,
      lng: -87.6298,
      price_tier: '$$$',
      cuisine_tags: ['Global', 'Bold'],
      status: 'open',
      website_url: 'https://girlandgoat.com',
      maps_url: null,
      source_notes: null,
      is_public: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      chef: {
        id: '1',
        name: 'Stephanie Izard',
        slug: 'stephanie-izard',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: 'Season 4',
        top_chef_result: 'winner',
        mini_bio: 'Top Chef Season 4 winner',
        country: 'USA',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        primary_show: {
          id: '1',
          name: 'Top Chef',
          network: 'Bravo',
          created_at: '2023-01-01'
        }
      }
    },
    {
      id: '2', 
      name: 'The Crack Shack',
      slug: 'crack-shack-san-diego',
      chef_id: '2',
      city: 'San Diego',
      state: 'CA', 
      country: 'USA',
      lat: 32.7157,
      lng: -117.1611,
      price_tier: '$$',
      cuisine_tags: ['Casual', 'Chicken'],
      status: 'open',
      website_url: 'https://crackshack.com',
      maps_url: null,
      source_notes: null,
      is_public: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      chef: {
        id: '2',
        name: 'Richard Blais',
        slug: 'richard-blais',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: 'All Stars',
        top_chef_result: 'winner',
        mini_bio: 'Top Chef All Stars winner',
        country: 'USA',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        primary_show: {
          id: '1',
          name: 'Top Chef',
          network: 'Bravo',
          created_at: '2023-01-01'
        }
      }
    },
    {
      id: '3',
      name: 'Arlo Grey',
      slug: 'arlo-grey-austin',
      chef_id: '3',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      lat: 30.2672,
      lng: -97.7431,
      price_tier: '$$$',
      cuisine_tags: ['American', 'Contemporary'],
      status: 'open',
      website_url: 'https://arlogrey.com',
      maps_url: null,
      source_notes: null,
      is_public: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      chef: {
        id: '3',
        name: 'Kristen Kish',
        slug: 'kristen-kish',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: 'Season 10',
        top_chef_result: 'winner',
        mini_bio: 'Top Chef Season 10 winner',
        country: 'USA',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        primary_show: {
          id: '1',
          name: 'Top Chef',
          network: 'Bravo',
          created_at: '2023-01-01'
        }
      }
    }
  ];

  useEffect(() => {
    setRestaurants(mockRestaurants);
    setFilteredRestaurants(mockRestaurants);
  }, []);

  // Filter restaurants based on search and filters
  useEffect(() => {
    let filtered = restaurants;

    if (searchQuery) {
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.chef?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedShow !== 'all') {
      filtered = filtered.filter(restaurant => 
        restaurant.chef?.primary_show?.name.toLowerCase() === selectedShow.toLowerCase()
      );
    }

    if (selectedPriceRange !== 'all') {
      filtered = filtered.filter(restaurant => restaurant.price_tier === selectedPriceRange);
    }

    setFilteredRestaurants(filtered);
  }, [searchQuery, selectedShow, selectedPriceRange, restaurants]);

  const handleRestaurantClick = (restaurant: RestaurantWithDetails) => {
    setSelectedRestaurant(restaurant);
    // In real app, this would center the map on the restaurant
  };

  const getShowBadgeClass = (showName: string | undefined) => {
    if (!showName) return 'show-badge default';
    const name = showName.toLowerCase();
    if (name.includes('top chef')) return 'show-badge top-chef';
    if (name.includes('iron chef')) return 'show-badge iron-chef';
    if (name.includes('hell')) return 'show-badge hells-kitchen';
    return 'show-badge default';
  };

  const majorCities = [
    { 
      name: 'Chicago', 
      count: mockRestaurants.filter(r => r.city === 'Chicago').length,
      restaurants: mockRestaurants.filter(r => r.city === 'Chicago')
    },
    { 
      name: 'New York', 
      count: 0,
      restaurants: []
    },
    { 
      name: 'Los Angeles', 
      count: 0,
      restaurants: []
    },
    { 
      name: 'Austin', 
      count: mockRestaurants.filter(r => r.city === 'Austin').length,
      restaurants: mockRestaurants.filter(r => r.city === 'Austin')
    }
  ].filter(city => city.count > 0);

  return (
    <div className="min-h-screen">
      {/* Glassmorphic Navigation */}
      <nav className="nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center">
              <h1 className="nav-logo">
                <span className="text-2xl">🍴</span>
                TV Chef Map
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Premium Search */}
              <input
                type="text"
                placeholder="Search restaurants, chefs, or cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input w-72"
              />
              
              {/* Glass Filter Pills */}
              <select
                value={selectedShow}
                onChange={(e) => setSelectedShow(e.target.value)}
                className="filter-pill"
              >
                <option value="all">All Shows</option>
                <option value="top chef">Top Chef</option>
                <option value="iron chef">Iron Chef</option>
                <option value="hell's kitchen">Hell's Kitchen</option>
              </select>
              
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="filter-pill"
              >
                <option value="all">All Prices</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Map Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="map-container">
          {/* Glass Sidebar */}
          <div className="sidebar">
            <div className="p-6 border-b border-glass-border">
              <h3 className="restaurant-card-title">
                {filteredRestaurants.length} Celebrity Chef Restaurants
              </h3>
              <p className="restaurant-card-location">
                Curated from TV cooking shows
              </p>
            </div>
            
            <div className="fade-in">
              {filteredRestaurants.map((restaurant, index) => (
                <div
                  key={restaurant.id}
                  className="restaurant-card"
                  onClick={() => handleRestaurantClick(restaurant)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <h4 className="restaurant-card-title">{restaurant.name}</h4>
                    <span className="price-indicator">{restaurant.price_tier}</span>
                  </div>
                  
                  <p className="restaurant-card-chef mb-2">
                    Chef {restaurant.chef?.name}
                  </p>
                  
                  <p className="restaurant-card-location mb-3">
                    {restaurant.city}, {restaurant.state}
                  </p>
                  
                  <div className="flex items-center justify-between relative z-10">
                    {restaurant.chef?.primary_show && (
                      <span className={getShowBadgeClass(restaurant.chef.primary_show.name)}>
                        {restaurant.chef.primary_show.name}
                        {restaurant.chef.top_chef_result === 'winner' && ' Winner'}
                      </span>
                    )}
                    
                    {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
                      <div className="flex gap-2">
                        {restaurant.cuisine_tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-text-subtle text-xs font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map Component with Dark Theme */}
          <div className="absolute inset-0" style={{ paddingLeft: '380px' }}>
            <RestaurantMap 
              restaurants={filteredRestaurants}
              selectedRestaurant={selectedRestaurant}
              isLoading={false}
            />
          </div>
        </div>
      </div>

      {/* Premium City Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {majorCities.map((city, cityIndex) => (
          <div key={city.name} className="city-section fade-in" 
               style={{ animationDelay: `${cityIndex * 0.2}s` }}>
            <h2 className="relative">
              {city.name}
              <span className="text-text-muted font-mono text-lg ml-4">
                {city.count} {city.count === 1 ? 'restaurant' : 'restaurants'}
              </span>
            </h2>
            <div className="city-grid">
              {city.restaurants.map((restaurant, index) => (
                <div key={restaurant.id} className="city-card" 
                     style={{ animationDelay: `${(cityIndex * 0.2) + (index * 0.1)}s` }}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="restaurant-card-title">{restaurant.name}</h3>
                    <span className="price-indicator text-xl">{restaurant.price_tier}</span>
                  </div>
                  
                  <p className="restaurant-card-chef mb-3">Chef {restaurant.chef?.name}</p>
                  
                  {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
                    <p className="restaurant-card-location mb-4">
                      {restaurant.cuisine_tags.join(' • ')}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {restaurant.chef?.primary_show && (
                      <span className={getShowBadgeClass(restaurant.chef.primary_show.name)}>
                        {restaurant.chef.primary_show.name}
                        {restaurant.chef.top_chef_result === 'winner' && ' Winner'}
                      </span>
                    )}
                    
                    {restaurant.chef?.top_chef_season && (
                      <span className="text-text-subtle font-mono text-xs">
                        {restaurant.chef.top_chef_season}
                      </span>
                    )}
                  </div>
                  
                  {restaurant.website_url && (
                    <div className="mt-4 pt-4 border-t border-glass-border">
                      <a 
                        href={restaurant.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-accent-gold hover:text-accent-amber text-sm font-mono transition-colors"
                      >
                        Visit Website →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}