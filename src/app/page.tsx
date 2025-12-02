'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RestaurantWithDetails } from '@/lib/types';
import { db } from '@/lib/supabase';

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
  const [restaurants, setRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        setIsLoading(true);
        const data = await db.getRestaurants();
        setRestaurants(data as RestaurantWithDetails[]);
        setError(null);
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        setError('Failed to load restaurants. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRestaurants();
  }, []);

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

  if (isLoading) {
    return (
      <div className="app-container map-layout">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container map-layout">
        <div className="error-screen">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container map-layout">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span className="logo-text">Cheft</span>
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
            isLoading={isLoading}
          />
        </section>
      </main>
    </div>
  );
}
