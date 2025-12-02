'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RestaurantWithDetails } from '@/lib/types';
import { db } from '@/lib/supabase';
import { RestaurantCardCompact } from '@/components/restaurant/RestaurantCardCompact';
import { ChefCard } from '@/components/chef/ChefCard';

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
  const [featuredChefs, setFeaturedChefs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [restaurantsData, chefsData] = await Promise.all([
          db.getRestaurants(),
          db.getFeaturedChefs(12)
        ]);
        setRestaurants(restaurantsData as RestaurantWithDetails[]);
        setFeaturedChefs(chefsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
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
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span className="logo-text">Cheft</span>
            </a>
          </div>
          
          <nav className="header-nav">
            <a href="/chefs" className="nav-link">Chefs</a>
            <a href="/restaurants" className="nav-link">Restaurants</a>
            <a href="/cities" className="nav-link">Cities</a>
          </nav>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Find Chef-Driven Restaurants
            </h1>
            <p className="hero-subtitle">
              Top Chef, Iron Chef, James Beard winners, and more
            </p>
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <div className="hero-stat-number">560</div>
                <div className="hero-stat-label">Restaurants</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-number">182</div>
                <div className="hero-stat-label">Chefs</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-number">162</div>
                <div className="hero-stat-label">Cities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="main-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">{filteredRestaurants.length} Restaurants</h1>
            <p className="sidebar-subtitle">From TV cooking competitions</p>
          </div>
          
          <div className="sidebar-search">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search restaurants, chefs, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
          </div>
          
          <div className="restaurant-list">
            {filteredRestaurants.map((restaurant, index) => (
              <div
                key={restaurant.id}
                className={`homepage-card-wrapper ${selectedRestaurant?.id === restaurant.id ? 'selected' : ''} ${hoveredRestaurant === restaurant.id ? 'hovered' : ''}`}
                onClick={() => handleRestaurantClick(restaurant)}
                onMouseEnter={() => setHoveredRestaurant(restaurant.id)}
                onMouseLeave={() => setHoveredRestaurant(null)}
              >
                <RestaurantCardCompact restaurant={restaurant} index={index} />
              </div>
            ))}
          </div>
        </aside>

        <section className="map-section">
          <div className="map-filters-overlay">
            <select
              value={selectedShow}
              onChange={(e) => setSelectedShow(e.target.value)}
              className="map-filter-select"
            >
              <option value="all">All Shows</option>
              <option value="top chef">Top Chef</option>
              <option value="iron chef">Iron Chef</option>
              <option value="hell's kitchen">Hell&apos;s Kitchen</option>
            </select>
            
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="map-filter-select"
            >
              <option value="all">All Prices</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="$$$$">$$$$</option>
            </select>
          </div>
          
          <RestaurantMap 
            restaurants={filteredRestaurants}
            selectedRestaurant={selectedRestaurant}
            hoveredRestaurantId={hoveredRestaurant}
            onRestaurantSelect={handleRestaurantClick}
            isLoading={isLoading}
          />
        </section>
      </main>

      {/* Mobile Map Toggle Button */}
      <button 
        className="mobile-map-fab"
        onClick={() => setShowMobileMap(true)}
        aria-label="Show map"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>Map</span>
      </button>

      {/* Mobile Map Overlay */}
      {showMobileMap && (
        <div className="mobile-map-overlay">
          <div className="mobile-map-header">
            <button 
              className="mobile-map-close"
              onClick={() => setShowMobileMap(false)}
              aria-label="Close map"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <span className="mobile-map-title">{filteredRestaurants.length} Restaurants</span>
          </div>
          <div className="mobile-map-content">
            <RestaurantMap 
              restaurants={filteredRestaurants}
              selectedRestaurant={selectedRestaurant}
              hoveredRestaurantId={hoveredRestaurant}
              onRestaurantSelect={handleRestaurantClick}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Featured Chefs Section */}
      <section className="featured-chefs-section">
        <div className="featured-chefs-container">
          <div className="featured-chefs-header">
            <h2 className="featured-chefs-title">Featured Chefs</h2>
            <a href="/chefs" className="featured-chefs-view-all">
              View All Chefs →
            </a>
          </div>
          <div className="featured-chefs-grid">
            {featuredChefs.map((chef, index) => (
              <ChefCard key={chef.id} chef={chef} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
