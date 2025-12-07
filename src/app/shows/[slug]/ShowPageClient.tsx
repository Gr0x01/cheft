'use client';

import { useState, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { ChefCard } from '@/components/chef/ChefCard';
import { ChefFilters } from '@/components/chef/ChefFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ChefData } from '@/lib/hooks/useChefFilters';

interface Season {
  season: string;
  season_name: string | null;
}

interface ShowPageClientProps {
  chefs: ChefData[];
  showSlug?: string;
  seasons?: Season[];
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
          {seasonNum}
        </span>
      </div>
    </Link>
  );
}

function SeasonLinks({ seasons, showSlug }: { seasons: Season[]; showSlug: string }) {
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

function ShowPageClientInner({ chefs, showSlug, seasons = [] }: ShowPageClientProps) {
  const [filteredChefs, setFilteredChefs] = useState<ChefData[]>(chefs);

  const handleFilteredChefsChange = useCallback((filtered: ChefData[]) => {
    setFilteredChefs(filtered);
  }, []);

  const seasonLinks = seasons.length > 0 && showSlug ? (
    <SeasonLinks seasons={seasons} showSlug={showSlug} />
  ) : null;

  return (
    <>
      <ChefFilters
        chefs={chefs}
        totalChefs={chefs.length}
        onFilteredChefsChange={handleFilteredChefsChange}
        hideShowDropdown
        extraContent={seasonLinks}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredChefs.length === 0 ? (
          <EmptyState
            message="No chefs found matching your criteria"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredChefs.map((chef, index) => (
              <ChefCard key={chef.id} chef={chef} index={index} hideShowName />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ShowPageClient({ chefs, showSlug, seasons }: ShowPageClientProps) {
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
      <ShowPageClientInner chefs={chefs} showSlug={showSlug} seasons={seasons} />
    </Suspense>
  );
}
