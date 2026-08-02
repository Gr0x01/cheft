'use client';

import { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { RestaurantWithDetails, MapPin } from '@/lib/types';
import { RestaurantCardCompact } from '@/components/restaurant/RestaurantCardCompact';
import { ChefCard } from '@/components/chef/ChefCard';
import { Header } from '@/components/ui/Header';
import { SuperFooterClient } from '@/components/ui/Footer';
import type { FooterData } from '@/lib/footer-data';
import { FeaturedChefHero } from '@/components/chef/FeaturedChefHero';
import { DiscoveryRow } from '@/components/home/DiscoveryRow';
import { ShowsShowcase } from '@/components/home/ShowsShowcase';
import { Search } from 'lucide-react';

interface Show {
  id: string;
  name: string;
  slug: string;
  network: string | null;
  chef_count: number;
  restaurant_count: number;
}

interface HomePageProps {
  initialFeaturedChefs: any[];
  stats: { restaurants: number; chefs: number; cities: number };
  featuredChef: any | null;
  shows: Show[];
  footerData: FooterData;
  popularRestaurants: RestaurantWithDetails[];
  winnerRestaurants: RestaurantWithDetails[];
}

// Must match the .desktop-map-layout breakpoint in globals.css
const DESKTOP_MEDIA_QUERY = '(min-width: 769px)';

const RestaurantMapPins = dynamic(() => import('@/components/RestaurantMapPins'), { 
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="map-loading-spinner"></div>
      <span>Loading map...</span>
    </div>
  )
});

export default function Home({ initialFeaturedChefs, stats, featuredChef, shows, footerData, popularRestaurants, winnerRestaurants }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDetails | null>(null);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [restaurants, setRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedRestaurants = useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const featuredChefs = initialFeaturedChefs;

  // Adopt anything typed before hydration finished — the controlled inputs would
  // otherwise wipe it on the first post-hydration render.
  useEffect(() => {
    const typed = [searchInputRef.current, mobileSearchInputRef.current]
      .find(el => el && el.value)?.value;
    if (typed) setSearchQuery(typed);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    setIsDesktop(mediaQuery.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  // The map and its pins only exist on desktop; phones hide the map layout via
  // CSS, so mobile skips the map bundle and both fetches entirely.
  useEffect(() => {
    if (!isDesktop || mapPins.length > 0) return;
    async function fetchMapPins() {
      try {
        const response = await fetch('/api/restaurants/map-pins');
        if (!response.ok) throw new Error('Failed to fetch map pins');
        const data = await response.json();
        setMapPins(data);
      } catch (error) {
        console.error('Error loading map pins:', error);
      } finally {
        setIsMapLoading(false);
      }
    }
    fetchMapPins();
  }, [isDesktop, mapPins.length]);

  // The full list feeds the desktop sidebar and search. Mobile browsing content
  // is server-rendered, so only fetch it once someone can actually use it.
  const needsRestaurants = isDesktop || searchQuery.length > 0;

  useEffect(() => {
    if (!needsRestaurants || hasFetchedRestaurants.current) return;
    hasFetchedRestaurants.current = true;
    async function fetchRestaurants() {
      setIsLoading(true);
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
  }, [needsRestaurants]);

  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants;

    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
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
  }, [deferredSearchQuery, selectedShow, selectedPriceRange, restaurants]);

  const filteredPins = useMemo(() => {
    let filtered = mapPins;

    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(pin =>
        pin.name.toLowerCase().includes(query) ||
        pin.chef_name.toLowerCase().includes(query) ||
        pin.city.toLowerCase().includes(query)
      );
    }

    if (selectedPriceRange !== 'all') {
      filtered = filtered.filter(pin => pin.price_tier === selectedPriceRange);
    }

    return filtered;
  }, [deferredSearchQuery, selectedPriceRange, mapPins]);

  // Slugs must carry the state suffix to match the cities table. Without it these
  // linked to redirects at best — /cities/san-francisco was a hard 404 straight off
  // the homepage — and they are the highest-authority internal links on the site.
  const popularCities = [
    { name: 'New York', slug: 'new-york-ny' },
    { name: 'Los Angeles', slug: 'los-angeles-ca' },
    { name: 'Chicago', slug: 'chicago-il' },
    { name: 'San Francisco', slug: 'san-francisco-ca' },
    { name: 'Miami', slug: 'miami-fl' },
    { name: 'Las Vegas', slug: 'las-vegas-nv' },
    { name: 'Seattle', slug: 'seattle-wa' },
    { name: 'Houston', slug: 'houston-tx' },
  ];

  const handleRestaurantClick = (restaurant: RestaurantWithDetails) => {
    setSelectedRestaurant(restaurant);
  };

  const isSearching = deferredSearchQuery.length > 0;

  return (
    <div className="app-container">
      <Header currentPage="home" />

      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Restaurants by TV's Top&nbsp;Chefs
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

      {featuredChef && <FeaturedChefHero chef={featuredChef} />}

      {/* Mobile Discovery Layout */}
      <div className="mobile-discovery">
        <div className="mobile-search-section">
          <div className="mobile-search-wrapper">
            <Search className="mobile-search-icon" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search restaurants, chefs, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input"
              aria-label="Search restaurants, chefs, and cities"
            />
          </div>
        </div>

        <div className="mobile-content-wrapper">
          <div className={`mobile-search-results ${isSearching ? 'visible' : ''}`}>
            <div className="mobile-results-header">
              <span className="mobile-results-accent" />
              <h2 className="mobile-results-title">
                {isLoading ? 'Searching…' : `${filteredRestaurants.length} result${filteredRestaurants.length !== 1 ? 's' : ''}`}
              </h2>
            </div>
            <div className="mobile-results-grid">
              {filteredRestaurants.slice(0, 10).map((restaurant, index) => (
                <RestaurantCardCompact key={restaurant.id} restaurant={restaurant} index={index} />
              ))}
            </div>
            {filteredRestaurants.length > 10 && (
              <Link href={`/restaurants?q=${encodeURIComponent(searchQuery)}`} className="mobile-view-all-results">
                View all {filteredRestaurants.length} results →
              </Link>
            )}
          </div>

          <div className={`mobile-browse-content ${isSearching ? '' : 'visible'}`}>
            <div className="mobile-city-pills">
              <h2 className="mobile-section-label">Popular Cities</h2>
              <div className="city-pills-scroll">
                {popularCities.map((city) => (
                  <Link key={city.slug} href={`/cities/${city.slug}`} className="city-pill">
                    {city.name}
                  </Link>
                ))}
              </div>
            </div>

            <DiscoveryRow
              title="Competition Winners"
              restaurants={winnerRestaurants}
              viewAllHref="/restaurants"
            />
          </div>
        </div>
      </div>

      {/* Desktop Map Layout */}
      <main className="desktop-map-layout" id="main-content">
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
              ref={searchInputRef}
              id="restaurant-search"
              type="text"
              placeholder="Search restaurants, chefs, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <RestaurantCardCompact restaurant={restaurant} index={index} asButton={true} />
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
          
          {isDesktop && (
            <RestaurantMapPins
              pins={filteredPins}
              selectedPinId={selectedRestaurant?.id}
              isLoading={isMapLoading}
            />
          )}
        </section>
      </main>

      <div className="homepage-popular-restaurants">
        <DiscoveryRow
          title="Popular Restaurants"
          restaurants={popularRestaurants}
          viewAllHref="/restaurants"
        />
      </div>

      <ShowsShowcase shows={shows} />

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

      <SuperFooterClient data={footerData} />
    </div>
  );
}
