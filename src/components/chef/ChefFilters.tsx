'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Trophy, Medal, Search, ChevronDown, Check, X } from 'lucide-react';
import { 
  useChefFilters, 
  filterChefs, 
  type ChefData, 
  type ResultFilter,
  type JBFilter,
  type SortOption 
} from '@/lib/hooks/useChefFilters';

interface Show {
  id: string;
  name: string;
  slug: string;
  chef_count: number;
}

interface ChefFiltersProps {
  shows?: Show[];
  chefs: ChefData[];
  totalChefs: number;
  onFilteredChefsChange: (chefs: ChefData[]) => void;
  hideShowDropdown?: boolean;
}

const CHIP = "font-mono text-[11px] tracking-wider font-medium px-3 py-1.5 transition-all border flex items-center gap-1.5";

export function ChefFilters({ shows = [], chefs, totalChefs, onFilteredChefsChange, hideShowDropdown = false }: ChefFiltersProps) {
  const { filters, setFilters, clearFilters, toggleShow, toggleResult, hasActiveFilters } = useChefFilters();
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [filteredChefs, setFilteredChefs] = useState<ChefData[]>(chefs);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = filterChefs(chefs, filters);
    setFilteredChefs(filtered);
    onFilteredChefsChange(filtered);
  }, [chefs, filters, onFilteredChefsChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions: { 
    type: 'result' | 'jb'; 
    value: string; 
    label: string; 
    icon?: ReactNode;
    activeColor?: string;
  }[] = [
    { type: 'result', value: 'winner', label: 'WINNERS', icon: <Trophy className="w-3 h-3" />, activeColor: 'var(--accent-success)' },
    { type: 'result', value: 'finalist', label: 'FINALISTS', icon: <Medal className="w-3 h-3" /> },
    { type: 'jb', value: 'winner', label: 'JB WINNER', activeColor: '#f59e0b' },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'decorated', label: 'Most Decorated' },
    { value: 'restaurants', label: 'Most Restaurants' },
  ];

  const isActive = (opt: typeof filterOptions[0]) => {
    if (opt.type === 'result') return filters.results.includes(opt.value as ResultFilter);
    if (opt.type === 'jb') return filters.jb === opt.value;
    return false;
  };

  const handleClick = (opt: typeof filterOptions[0]) => {
    if (opt.type === 'result') toggleResult(opt.value as ResultFilter);
    else if (opt.type === 'jb') setFilters({ jb: filters.jb === opt.value ? null : opt.value as JBFilter });
  };

  const selectedShowNames = filters.shows
    .map(slug => shows.find(s => s.slug === slug)?.name)
    .filter(Boolean);

  const winnersInView = filteredChefs.filter(c => 
    c.chef_shows?.some(cs => cs.result === 'winner')
  ).length;

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

            {/* Show dropdown */}
            {!hideShowDropdown && shows.length > 0 && (
              <>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdownOpen(!showDropdownOpen)}
                    className={CHIP}
                    style={{
                      background: filters.shows.length > 0 ? 'var(--accent-primary)' : 'transparent',
                      color: filters.shows.length > 0 ? 'white' : 'var(--text-secondary)',
                      borderColor: filters.shows.length > 0 ? 'var(--accent-primary)' : 'var(--border-light)',
                    }}
                  >
                    {filters.shows.length > 0 
                      ? (selectedShowNames.length === 1 ? selectedShowNames[0] : `${filters.shows.length} Shows`)
                      : 'All Shows'
                    }
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-56 border shadow-lg z-50 max-h-72 overflow-y-auto"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                    >
                      <button
                        onClick={() => { setFilters({ shows: [] }); setShowDropdownOpen(false); }}
                        className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
                        style={{ color: filters.shows.length === 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                      >
                        All Shows
                        {filters.shows.length === 0 && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="border-t" style={{ borderColor: 'var(--border-light)' }} />
                      {shows.map(show => (
                        <button
                          key={show.id}
                          onClick={() => toggleShow(show.slug)}
                          className="w-full px-3 py-2 text-left font-mono text-[11px] tracking-wider hover:bg-slate-50 transition-colors flex items-center justify-between"
                          style={{ 
                            color: filters.shows.includes(show.slug) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: filters.shows.includes(show.slug) ? 600 : 400,
                          }}
                        >
                          <span>{show.name}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px]">{show.chef_count}</span>
                            {filters.shows.includes(show.slug) && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-200" />
              </>
            )}

            {/* Filter chips */}
            {filterOptions.map(opt => (
              <button
                key={`${opt.type}-${opt.value}`}
                onClick={() => handleClick(opt)}
                className={CHIP}
                style={{
                  background: isActive(opt) ? (opt.activeColor || 'var(--accent-primary)') : 'transparent',
                  color: isActive(opt) ? 'white' : 'var(--text-secondary)',
                  borderColor: isActive(opt) ? (opt.activeColor || 'var(--accent-primary)') : 'var(--border-light)',
                }}
              >
                {opt.icon}
                {opt.label}
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
            {filteredChefs.length === totalChefs ? (
              <span>Showing all <strong className="text-slate-700">{totalChefs}</strong> chefs</span>
            ) : (
              <span>
                <strong className="text-slate-700">{filteredChefs.length}</strong> of {totalChefs} chefs
              </span>
            )}
            {winnersInView > 0 && (
              <span className="ml-2 text-green-600">
                · {winnersInView} winner{winnersInView !== 1 ? 's' : ''}
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
