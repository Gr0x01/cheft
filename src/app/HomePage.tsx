'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { RestaurantWithDetails } from '@/lib/types';
import { RestaurantCardCompact } from '@/components/restaurant/RestaurantCardCompact';
import { ChefCard } from '@/components/chef/ChefCard';
import { Header } from '@/components/ui/Header';
import { FeaturedChefHero } from '@/components/chef/FeaturedChefHero';

interface HomePageProps {
  initialRestaurants: RestaurantWithDetails[];
  initialFeaturedChefs: any[];
  stats: { restaurants: number; chefs: number; cities: number };
  featuredChef: any | null;
}

const RestaurantMap = dynamic(() => import('@/components/RestaurantMap'), { 
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="map-loading-spinner"></div>
      <span>Loading map...</span>
    </div>
  )
});

export default function Home({ initialRestaurants, initialFeaturedChefs, stats, featuredChef }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDetails | null>(null);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<string | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  
  const restaurants = initialRestaurants;
  const featuredChefs = initialFeaturedChefs;
  const isLoading = false;

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants;

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
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
  }, [debouncedSearchQuery, selectedShow, selectedPriceRange, restaurants]);

  const handleRestaurantClick = (restaurant: RestaurantWithDetails) => {
    setSelectedRestaurant(restaurant);
  };


  return (
    <div className="app-container map-layout">
      <Header currentPage="home" />

      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Find Chef-Driven Restaurants
            </h1>
            <p className="hero-subtitle">
              Top Chef, Tournament of Champions, James Beard winners, and more
            </p>
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <div className="hero-stat-number">{stats.restaurants}</div>
                <div className="hero-stat-label">Restaurants</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-number">{stats.chefs}</div>
                <div className="hero-stat-label">Chefs</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-number">{stats.cities}</div>
                <div className="hero-stat-label">Cities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Chef Hero */}
      {featuredChef && <FeaturedChefHero chef={featuredChef} />}

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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="sidebar-search-input"
            />
          </div>
          
          <div className="restaurant-list">
            {filteredRestaurants.slice(0, visibleCount).map((restaurant, index) => (
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
            {visibleCount < filteredRestaurants.length && (
              <div className="px-4 pb-4 flex flex-col items-center gap-2">
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + 20, filteredRestaurants.length))}
                  className="py-3 px-6 font-mono text-sm font-semibold tracking-wide transition-all duration-200"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }}
                >
                  LOAD MORE
                </button>
                <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                  {filteredRestaurants.length - visibleCount} remaining
                </span>
              </div>
            )}
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
              <option value="tournament of champions">Tournament of Champions</option>
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
            {featuredChefs.slice(0, 8).map((chef, index) => (
              <ChefCard key={chef.id} chef={chef} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
