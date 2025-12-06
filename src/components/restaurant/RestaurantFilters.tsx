'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Star, MapPin } from 'lucide-react';
import { 
  useRestaurantFilters, 
  filterRestaurants, 
  type RestaurantData, 
  type PriceTier,
  type SortOption 
} from '@/lib/hooks/useRestaurantFilters';

interface City {
  name: string;
  state: string | null;
  count: number;
}

interface RestaurantFiltersProps {
  cities: City[];
  restaurants: RestaurantData[];
  totalRestaurants: number;
  onFilteredRestaurantsChange: (restaurants: RestaurantData[]) => void;
}

const CHIP = "font-mono text-[11px] tracking-wider font-medium px-3 py-1.5 transition-all border flex items-center gap-1.5";

export function RestaurantFilters({ cities, restaurants, totalRestaurants, onFilteredRestaurantsChange }: RestaurantFiltersProps) {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useRestaurantFilters();
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantData[]>(restaurants);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = filterRestaurants(restaurants, filters);
    setFilteredRestaurants(filtered);
    onFilteredRestaurantsChange(filtered);
  }, [restaurants, filters, onFilteredRestaurantsChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const priceOptions: PriceTier[] = ['$', '$$', '$$$', '$$$$'];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'reviews', label: 'Most Reviews' },
  ];

  const selectedCity = filters.city 
    ? cities.find(c => c.name === filters.city)
    : null;

  const openCount = filteredRestaurants.filter(r => r.status === 'open').length;
  const michelinCount = filteredRestaurants.filter(r => r.michelin_stars && r.michelin_stars > 0).length;

  return (
    <>
      {/* Filter row */}
      <section className="border-b sticky top-16 z-40" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <form className="relative" onSubmit={e => e.preventDefault()}>
              <input
                type="search"
                placeholder="Search..."
                value={filters.q}
                onChange={e => setFilters({ q: e.target.value })}
                className="w-44 h-8 pl-8 pr-3 font-mono text-[11px] border transition-colors focus:outline-none focus:border-[#B87333]"
                style={{ 
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </form>

            {/* City dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className={CHIP}
                style={{
                  background: filters.city ? 'var(--accent-primary)' : 'transparent',
                  color: filters.city ? 'white' : 'var(--text-secondary)',
                  borderColor: filters.city ? 'var(--accent-primary)' : 'var(--border-light)',
                }}
              >
                <MapPin className="w-3 h-3" />
                {selectedCity ? `${selectedCity.name}${selectedCity.state ? `, ${selectedCity.state}` : ''}` : 'All Cities'}
                <ChevronDown className="w-3 h-3" />
              </button>

              {cityDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-1 w-64 border shadow-lg z-50 max-h-72 overflow-y-auto"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                >
                  <button
                    onClick={() => { setFilters({ city: null }); setCityDropdownOpen(false); }}
                    className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
                    style={{ color: !filters.city ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                  >
                    All Cities
                    {!filters.city && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="border-t" style={{ borderColor: 'var(--border-light)' }} />
                  {cities.map(city => (
                    <button
                      key={`${city.name}-${city.state}`}
                      onClick={() => { setFilters({ city: city.name }); setCityDropdownOpen(false); }}
                      className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
                      style={{ 
                        color: filters.city === city.name ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: filters.city === city.name ? 600 : 400,
                      }}
                    >
                      <span>{city.name}{city.state ? `, ${city.state}` : ''}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">{city.count}</span>
                        {filters.city === city.name && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Open only toggle */}
            <button
              onClick={() => setFilters({ openOnly: !filters.openOnly })}
              className={CHIP}
              style={{
                background: filters.openOnly ? 'var(--accent-success)' : 'transparent',
                color: filters.openOnly ? 'white' : 'var(--text-secondary)',
                borderColor: filters.openOnly ? 'var(--accent-success)' : 'var(--border-light)',
              }}
            >
              OPEN
            </button>

            {/* Michelin toggle */}
            <button
              onClick={() => setFilters({ michelinOnly: !filters.michelinOnly })}
              className={CHIP}
              style={{
                background: filters.michelinOnly ? '#D3072B' : 'transparent',
                color: filters.michelinOnly ? 'white' : 'var(--text-secondary)',
                borderColor: filters.michelinOnly ? '#D3072B' : 'var(--border-light)',
              }}
            >
              <Star className="w-3 h-3" fill={filters.michelinOnly ? 'currentColor' : 'none'} />
              MICHELIN
            </button>

            <div className="h-4 w-px bg-slate-200" />

            {/* Price tier chips */}
            {priceOptions.map(price => (
              <button
                key={price}
                onClick={() => setFilters({ price: filters.price === price ? null : price })}
                className={CHIP}
                style={{
                  background: filters.price === price ? 'var(--accent-primary)' : 'transparent',
                  color: filters.price === price ? 'white' : 'var(--text-secondary)',
                  borderColor: filters.price === price ? 'var(--accent-primary)' : 'var(--border-light)',
                  minWidth: '36px',
                  justifyContent: 'center',
                }}
              >
                {price}
              </button>
            ))}

            {hasActiveFilters && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  onClick={clearFilters}
                  className="font-mono text-[11px] tracking-wider font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Results count + Sort row */}
      <div 
        className="border-b py-2.5"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p className="font-mono text-[11px] tracking-wider text-slate-500">
            {filteredRestaurants.length === totalRestaurants ? (
              <span>Showing all <strong className="text-slate-700">{totalRestaurants}</strong> restaurants</span>
            ) : (
              <span>
                <strong className="text-slate-700">{filteredRestaurants.length}</strong> of {totalRestaurants} restaurants
              </span>
            )}
            {openCount > 0 && openCount < filteredRestaurants.length && (
              <span className="ml-2 text-green-600">
                · {openCount} open
              </span>
            )}
            {michelinCount > 0 && (
              <span className="ml-2 text-red-600">
                · {michelinCount} Michelin
              </span>
            )}
          </p>

          <select
            value={filters.sort}
            onChange={e => setFilters({ sort: e.target.value as SortOption })}
            className="font-mono text-[11px] tracking-wider text-slate-500 bg-transparent cursor-pointer focus:outline-none border-none"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
