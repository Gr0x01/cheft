'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { RestaurantWithDetails } from '@/lib/types';

const RestaurantMap = dynamic(() => import('@/components/RestaurantMap'), { 
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="map-loading-spinner"></div>
      <span>Loading map...</span>
    </div>
  )
});

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDetails | null>(null);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<string | null>(null);

  const mockRestaurants: RestaurantWithDetails[] = [
    {
      id: '1',
      name: 'Girl & the Goat',
      slug: 'girl-goat-chicago',
      chef_id: '1',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      lat: 41.8840,
      lng: -87.6488,
      price_tier: '$$$',
      cuisine_tags: ['New American', 'Global'],
      status: 'open',
      website_url: 'https://girlandthegoat.com',
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
        mini_bio: 'First female winner of Top Chef',
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
      name: 'Juniper & Ivy',
      slug: 'juniper-ivy-san-diego',
      chef_id: '2',
      city: 'San Diego',
      state: 'CA', 
      country: 'USA',
      lat: 32.7338,
      lng: -117.1506,
      price_tier: '$$$',
      cuisine_tags: ['New American', 'Contemporary'],
      status: 'open',
      website_url: 'https://juniperandivy.com',
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
        mini_bio: 'Top Chef All Stars winner, molecular gastronomy expert',
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
      lat: 30.2609,
      lng: -97.7520,
      price_tier: '$$$',
      cuisine_tags: ['Italian', 'Lakeside'],
      status: 'open',
      website_url: 'https://arlogreyaustin.com',
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
        mini_bio: 'Top Chef Season 10 winner, now host of Top Chef',
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
      id: '4',
      name: 'Compère Lapin',
      slug: 'compere-lapin-new-orleans',
      chef_id: '4',
      city: 'New Orleans',
      state: 'LA',
      country: 'USA',
      lat: 29.9490,
      lng: -90.0715,
      price_tier: '$$$',
      cuisine_tags: ['Caribbean', 'Creole'],
      status: 'open',
      website_url: 'https://compabornelapin.com',
      maps_url: null,
      source_notes: null,
      is_public: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      chef: {
        id: '4',
        name: 'Nina Compton',
        slug: 'nina-compton',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: 'Season 11',
        top_chef_result: 'finalist',
        mini_bio: 'James Beard Award winner',
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
      id: '5',
      name: 'Parachute',
      slug: 'parachute-chicago',
      chef_id: '5',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      lat: 41.9486,
      lng: -87.6981,
      price_tier: '$$',
      cuisine_tags: ['Korean', 'American'],
      status: 'open',
      website_url: 'https://parachutechicago.com',
      maps_url: null,
      source_notes: null,
      is_public: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      chef: {
        id: '5',
        name: 'Beverly Kim',
        slug: 'beverly-kim',
        primary_show_id: '1',
        other_shows: null,
        top_chef_season: 'Season 9',
        top_chef_result: 'contestant',
        mini_bio: 'Michelin-starred chef',
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

  const [restaurants] = useState<RestaurantWithDetails[]>(mockRestaurants);

  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.chef?.name.toLowerCase().includes(query) ||
        restaurant.city.toLowerCase().includes(query) ||
        restaurant.cuisine_tags?.some(tag => tag.toLowerCase().includes(query))
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

    return filtered;
  }, [searchQuery, selectedShow, selectedPriceRange, restaurants]);

  const handleRestaurantClick = (restaurant: RestaurantWithDetails) => {
    setSelectedRestaurant(restaurant);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span className="logo-text">ChefMap</span>
          </div>
          
          <div className="header-actions">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search chefs, restaurants, cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <select
              value={selectedShow}
              onChange={(e) => setSelectedShow(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Shows</option>
              <option value="top chef">Top Chef</option>
              <option value="iron chef">Iron Chef</option>
              <option value="hell's kitchen">Hell&apos;s Kitchen</option>
            </select>
            
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Prices</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="$$$$">$$$$</option>
            </select>
          </div>
        </div>
      </header>

      <main className="main-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">{filteredRestaurants.length} Restaurants</h1>
            <p className="sidebar-subtitle">From TV cooking competitions</p>
          </div>
          
          <div className="restaurant-list">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className={`restaurant-card ${selectedRestaurant?.id === restaurant.id ? 'selected' : ''} ${hoveredRestaurant === restaurant.id ? 'hovered' : ''}`}
                onClick={() => handleRestaurantClick(restaurant)}
                onMouseEnter={() => setHoveredRestaurant(restaurant.id)}
                onMouseLeave={() => setHoveredRestaurant(null)}
              >
                <div className="card-accent"></div>
                <div className="card-content">
                  <div className="card-header">
                    <h3 className="restaurant-name">{restaurant.name}</h3>
                    <span className="price-badge">{restaurant.price_tier}</span>
                  </div>
                  
                  <p className="chef-name">{restaurant.chef?.name}</p>
                  
                  <div className="location-row">
                    <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="location-text">{restaurant.city}, {restaurant.state}</span>
                  </div>
                  
                  <div className="card-footer">
                    <div className="tags">
                      {restaurant.chef?.top_chef_result === 'winner' && (
                        <span className="tag tag-winner">Winner</span>
                      )}
                      {restaurant.chef?.top_chef_result === 'finalist' && (
                        <span className="tag tag-finalist">Finalist</span>
                      )}
                      {restaurant.chef?.top_chef_season && (
                        <span className="tag tag-season">{restaurant.chef.top_chef_season}</span>
                      )}
                    </div>
                    {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
                      <span className="cuisine-text">{restaurant.cuisine_tags[0]}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="map-section">
          <RestaurantMap 
            restaurants={filteredRestaurants}
            selectedRestaurant={selectedRestaurant}
            hoveredRestaurantId={hoveredRestaurant}
            onRestaurantSelect={handleRestaurantClick}
            isLoading={false}
          />
        </section>
      </main>
    </div>
  );
}
