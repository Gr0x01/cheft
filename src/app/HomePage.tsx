'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RestaurantWithDetails } from '@/lib/types';
import { RestaurantCardCompact } from '@/components/restaurant/RestaurantCardCompact';
import { ChefCard } from '@/components/chef/ChefCard';
import { Header } from '@/components/ui/Header';
import { FeaturedChefHero } from '@/components/chef/FeaturedChefHero';

interface HomePageProps {
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

export default function Home({ initialFeaturedChefs, stats, featuredChef }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDetails | null>(null);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<string | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [restaurants, setRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const featuredChefs = initialFeaturedChefs;

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const response = await fetch('/api/restaurants');
        if (!response.ok) throw new Error('Failed to fetch restaurants');
        const data = await response.json();
        setRestaurants(data);
      } catch (error) {
        console.error('Error loading restaurants:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRestaurants();
  }, []);

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
            <dl className="hero-stats-row">
              <div className="hero-stat-item">
                <dt className="sr-only">Number of restaurants</dt>
                <dd className="hero-stat-number" aria-label={`${stats.restaurants} restaurants`}>{stats.restaurants}</dd>
                <dd className="hero-stat-label" aria-hidden="true">Restaurants</dd>
              </div>
              <div className="hero-stat-item">
                <dt className="sr-only">Number of chefs</dt>
                <dd className="hero-stat-number" aria-label={`${stats.chefs} chefs`}>{stats.chefs}</dd>
                <dd className="hero-stat-label" aria-hidden="true">Chefs</dd>
              </div>
              <div className="hero-stat-item">
                <dt className="sr-only">Number of cities</dt>
                <dd className="hero-stat-number" aria-label={`${stats.cities} cities`}>{stats.cities}</dd>
                <dd className="hero-stat-label" aria-hidden="true">Cities</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Featured Chef Hero */}
      {featuredChef && <FeaturedChefHero chef={featuredChef} />}

      <main className="main-content" id="main-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">{filteredRestaurants.length} Restaurants</h1>
            <p className="sidebar-subtitle">From TV cooking competitions</p>
          </div>
          
          <div className="sidebar-search">
            <label htmlFor="restaurant-search" className="sr-only">
              Search restaurants, chefs, and cities
            </label>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              id="restaurant-search"
              type="text"
              placeholder="Search restaurants, chefs, cities..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="sidebar-search-input"
              aria-label="Search restaurants, chefs, and cities"
            />
          </div>
          
          <div className="restaurant-list">
            {filteredRestaurants.slice(0, visibleCount).map((restaurant, index) => (
              <div
                key={restaurant.id}
                className={`homepage-card-wrapper ${selectedRestaurant?.id === restaurant.id ? 'selected' : ''} ${hoveredRestaurant === restaurant.id ? 'hovered' : ''}`}
                onClick={() => handleRestaurantClick(restaurant)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRestaurantClick(restaurant);
                  }
                }}
                onMouseEnter={() => setHoveredRestaurant(restaurant.id)}
                onMouseLeave={() => setHoveredRestaurant(null)}
                role="button"
                tabIndex={0}
                aria-label={`View ${restaurant.name} in ${restaurant.city}`}
              >
                <RestaurantCardCompact restaurant={restaurant} index={index} />
              </div>
            ))}
            {visibleCount < filteredRestaurants.length && (
              <div className="px-4 pb-4 flex flex-col items-center gap-2">
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + 20, filteredRestaurants.length))}
                  className="load-more-button"
                  aria-label={`Load ${Math.min(20, filteredRestaurants.length - visibleCount)} more restaurants`}
                >
                  LOAD MORE
                </button>
                <span className="text-xs italic" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                  {filteredRestaurants.length - visibleCount} remaining
                </span>
              </div>
            )}
          </div>
        </aside>

        <section className="map-section">
          <div className="map-filters-overlay">
            <label htmlFor="show-filter" className="sr-only">
              Filter by TV show
            </label>
            <select
              id="show-filter"
              value={selectedShow}
              onChange={(e) => setSelectedShow(e.target.value)}
              className="map-filter-select"
              aria-label="Filter restaurants by TV show"
            >
              <option value="all">All Shows</option>
              <option value="top chef">Top Chef</option>
              <option value="tournament of champions">Tournament of Champions</option>
            </select>
            
            <label htmlFor="price-filter" className="sr-only">
              Filter by price range
            </label>
            <select
              id="price-filter"
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="map-filter-select"
              aria-label="Filter restaurants by price range"
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
