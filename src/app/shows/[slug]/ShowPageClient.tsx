'use client';

import { useState, useCallback, Suspense, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Check, Search } from 'lucide-react';
import { ChefCard } from '@/components/chef/ChefCard';
import { ChefFilters } from '@/components/chef/ChefFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ChefData } from '@/lib/hooks/useChefFilters';

const TOP_CHEF_SEASON_NAMES: Record<string, string> = {
  '3': 'Miami',
  '6': 'Las Vegas',
  '9': 'Texas',
  '10': 'Seattle',
  '11': 'New Orleans',
  '13': 'California',
  '14': 'Charleston',
  '15': 'Colorado',
  '16': 'Kentucky',
  '18': 'Portland',
  '19': 'Houston',
  '21': 'Wisconsin',
  '22': 'Destination Canada',
};

interface Season {
  season: string;
  season_name: string | null;
}

interface ChildShow {
  id: string;
  name: string;
  slug: string;
  show_type: string | null;
  chef_count: number;
}

interface ShowPageClientProps {
  chefs: (ChefData & { source_show_slug?: string; source_show_name?: string })[];
  showSlug?: string;
  seasons?: Season[];
  childShows?: ChildShow[];
  cities?: string[];
  parentInfo?: {
    slug: string;
    name: string;
  };
}

function sortSeasons(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => {
    const aNum = parseInt(a.season.replace(/\D/g, ''), 10);
    const bNum = parseInt(b.season.replace(/\D/g, ''), 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.season.localeCompare(b.season);
  });
}

const MAX_VISIBLE_SEASONS = 12;

function SeasonPill({ season, showSlug }: { season: Season; showSlug: string }) {
  const seasonNum = season.season.replace(/\D/g, '') || season.season;
  const seasonName = showSlug === 'top-chef' ? TOP_CHEF_SEASON_NAMES[seasonNum] : null;
  return (
    <Link
      href={`/shows/${showSlug}/${season.season}`}
      className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 bg-white border hover:border-[var(--accent-primary)]"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <div 
        className="absolute left-0 top-0 w-0.5 h-full group-hover:w-1 transition-all duration-200"
        style={{ background: 'var(--accent-primary)' }}
      />
      <div className="flex items-center gap-1.5 pl-2.5 pr-2.5 py-1">
        <span 
          className="font-mono text-sm font-bold"
          style={{ color: 'var(--accent-primary)' }}
        >
          {seasonNum}{seasonName && <span className="font-normal text-xs ml-1 opacity-70">· {seasonName}</span>}
        </span>
      </div>
    </Link>
  );
}

function SeasonLinks({ seasons, showSlug }: { seasons: Season[]; showSlug: string }) {
  if (seasons.length === 0) return null;
  const [expanded, setExpanded] = useState(false);
  const sortedSeasons = useMemo(() => sortSeasons(seasons), [seasons]);
  
  const visibleSeasons = expanded ? sortedSeasons : sortedSeasons.slice(0, MAX_VISIBLE_SEASONS);
  const hiddenCount = sortedSeasons.length - MAX_VISIBLE_SEASONS;
  const showExpandButton = sortedSeasons.length > MAX_VISIBLE_SEASONS;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] tracking-wider uppercase text-slate-400 mr-1">Seasons:</span>
      {visibleSeasons.map((season) => (
        <SeasonPill key={season.season} season={season} showSlug={showSlug} />
      ))}
      {showExpandButton && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="font-mono text-[11px] font-semibold px-2 py-1 border transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
          style={{ borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }}
        >
          +{hiddenCount} more
          <ChevronDown className="w-3 h-3" />
        </button>
      )}
      {showExpandButton && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="font-mono text-[11px] font-semibold px-2 py-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

const CHIP = "font-mono text-[11px] tracking-wider font-medium px-3 py-1.5 transition-all border flex items-center gap-1.5";

function VariantDropdown({ 
  childShows, 
  selectedVariant, 
  onSelectVariant 
}: { 
  childShows: ChildShow[]; 
  selectedVariant: string | null;
  onSelectVariant: (slug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (childShows.length === 0) return null;

  const getShortName = (name: string) => {
    const parts = name.split(':');
    if (parts.length > 1) return parts[1].trim();
    const parentMatch = name.match(/^(.+?)\s+(All-Stars|Masters|Jr\.|Junior|Legends|World)/i);
    if (parentMatch) return parentMatch[2];
    return name;
  };

  const selectedName = selectedVariant 
    ? getShortName(childShows.find(c => c.slug === selectedVariant)?.name || '')
    : 'All Shows';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={CHIP}
        style={{
          background: selectedVariant ? 'var(--accent-primary)' : 'transparent',
          color: selectedVariant ? 'white' : 'var(--text-secondary)',
          borderColor: selectedVariant ? 'var(--accent-primary)' : 'var(--border-light)',
        }}
      >
        {selectedName}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div 
          className="absolute top-full left-0 mt-1 w-56 border shadow-lg z-50 max-h-72 overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
        >
          <button
            onClick={() => { onSelectVariant(null); setOpen(false); }}
            className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
            style={{ color: selectedVariant === null ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          >
            All Shows
            {selectedVariant === null && <Check className="w-3.5 h-3.5" />}
          </button>
          <div className="border-t" style={{ borderColor: 'var(--border-light)' }} />
          {childShows.map(child => (
            <button
              key={child.id}
              onClick={() => { onSelectVariant(child.slug); setOpen(false); }}
              className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
              style={{ 
                color: selectedVariant === child.slug ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: selectedVariant === child.slug ? 600 : 400,
              }}
            >
              <span>{getShortName(child.name)}</span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">{child.chef_count}</span>
                {selectedVariant === child.slug && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CityDropdown({ 
  cities, 
  selectedCity, 
  onSelectCity 
}: { 
  cities: string[]; 
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (cities.length === 0) return null;

  const filteredCities = search
    ? cities.filter(city => city.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : cities.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={CHIP}
        style={{
          background: selectedCity ? 'var(--accent-primary)' : 'transparent',
          color: selectedCity ? 'white' : 'var(--text-secondary)',
          borderColor: selectedCity ? 'var(--accent-primary)' : 'var(--border-light)',
        }}
      >
        {selectedCity || 'All Cities'}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div 
          className="absolute top-full left-0 mt-1 w-56 border shadow-lg z-50"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search cities..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2 font-mono text-[11px] border rounded-sm focus:outline-none focus:border-[var(--accent-primary)]"
                style={{ 
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => { onSelectCity(null); setOpen(false); setSearch(''); }}
              className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
              style={{ color: selectedCity === null ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
            >
              All Cities
              {selectedCity === null && <Check className="w-3.5 h-3.5" />}
            </button>
            <div className="border-t" style={{ borderColor: 'var(--border-light)' }} />
            {filteredCities.length === 0 ? (
              <div className="px-3 py-2 font-mono text-[11px] text-slate-400">
                No cities found
              </div>
            ) : (
              filteredCities.map(city => (
                <button
                  key={city}
                  onClick={() => { onSelectCity(city); setOpen(false); setSearch(''); }}
                  className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
                  style={{ 
                    color: selectedCity === city ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: selectedCity === city ? 600 : 400,
                  }}
                >
                  <span>{city}</span>
                  {selectedCity === city && <Check className="w-3.5 h-3.5" />}
                </button>
              ))
            )}
            {!search && cities.length > 10 && (
              <div className="px-3 py-1.5 font-mono text-[10px] text-slate-400 border-t" style={{ borderColor: 'var(--border-light)' }}>
                Type to search {cities.length} cities
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ParentShowBanner({ parentInfo }: { parentInfo: { slug: string; name: string } }) {
  return (
    <div 
      className="mb-4 px-4 py-2 border-l-4"
      style={{ 
        borderLeftColor: 'var(--accent-primary)',
        background: 'var(--bg-secondary)',
      }}
    >
      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
        Part of the{' '}
        <Link 
          href={`/shows/${parentInfo.slug}`}
          className="font-semibold hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          {parentInfo.name}
        </Link>
        {' '}family
      </span>
    </div>
  );
}

function ShowPageClientInner({ chefs, showSlug, seasons = [], childShows = [], cities = [], parentInfo }: ShowPageClientProps) {
  const [filteredChefs, setFilteredChefs] = useState<ChefData[]>(chefs);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleFilteredChefsChange = useCallback((filtered: ChefData[]) => {
    setFilteredChefs(filtered);
  }, []);

  const displayedChefs = useMemo(() => {
    let result = filteredChefs;
    if (selectedVariant) {
      result = result.filter((chef: any) => chef.source_show_slug === selectedVariant);
    }
    if (selectedCity) {
      result = result.filter((chef: any) => chef.cities?.includes(selectedCity));
    }
    return result;
  }, [filteredChefs, selectedVariant, selectedCity]);

  const variantChildShows = childShows.filter(c => c.show_type !== 'named_season');
  
  const filterDropdowns = (variantChildShows.length > 0 || cities.length > 0) ? (
    <div className="flex items-center gap-2">
      {variantChildShows.length > 0 && (
        <VariantDropdown 
          childShows={variantChildShows}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
        />
      )}
      {cities.length > 0 && (
        <CityDropdown
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
        />
      )}
    </div>
  ) : null;

  const seasonLinks = seasons.length > 0 && showSlug ? (
    <SeasonLinks seasons={seasons} showSlug={showSlug} />
  ) : null;

  return (
    <>
      {parentInfo && <ParentShowBanner parentInfo={parentInfo} />}
      
      <ChefFilters
        chefs={chefs}
        totalChefs={displayedChefs.length}
        onFilteredChefsChange={handleFilteredChefsChange}
        hideShowDropdown
        extraContent={filterDropdowns}
        belowFilterContent={seasonLinks}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {displayedChefs.length === 0 ? (
          <EmptyState
            message="No chefs found matching your criteria"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedChefs.map((chef, index) => (
              <ChefCard key={chef.id} chef={chef} index={index} hideShowName />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ShowPageClient({ chefs, showSlug, seasons, childShows, cities, parentInfo }: ShowPageClientProps) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    }>
      <ShowPageClientInner 
        chefs={chefs} 
        showSlug={showSlug} 
        seasons={seasons} 
        childShows={childShows}
        cities={cities}
        parentInfo={parentInfo}
      />
    </Suspense>
  );
}
