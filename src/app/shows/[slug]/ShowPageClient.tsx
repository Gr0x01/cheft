'use client';

import { useState, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
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

function VariantTabs({ 
  childShows, 
  showSlug, 
  selectedVariant, 
  onSelectVariant 
}: { 
  childShows: ChildShow[]; 
  showSlug: string;
  selectedVariant: string | null;
  onSelectVariant: (slug: string | null) => void;
}) {
  if (childShows.length === 0) return null;

  const getShortName = (name: string) => {
    const parts = name.split(':');
    if (parts.length > 1) return parts[1].trim();
    const parentMatch = name.match(/^(.+?)\s+(All-Stars|Masters|Jr\.|Junior|Legends|World)/i);
    if (parentMatch) return parentMatch[2];
    return name;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] tracking-wider uppercase text-slate-400 mr-1">View:</span>
      <button
        onClick={() => onSelectVariant(null)}
        className={`font-mono text-[11px] font-semibold px-3 py-1.5 border transition-all duration-200 ${
          selectedVariant === null 
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' 
            : 'border-[var(--border-light)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
        }`}
        style={selectedVariant !== null ? { color: 'var(--text-secondary)' } : {}}
      >
        All
      </button>
      {childShows.map((child) => (
        <button
          key={child.id}
          onClick={() => onSelectVariant(child.slug)}
          className={`font-mono text-[11px] font-semibold px-3 py-1.5 border transition-all duration-200 ${
            selectedVariant === child.slug 
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' 
              : 'border-[var(--border-light)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
          }`}
          style={selectedVariant !== child.slug ? { color: 'var(--text-secondary)' } : {}}
        >
          {getShortName(child.name)}
          <span className="ml-1 opacity-60">({child.chef_count})</span>
        </button>
      ))}
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

function ShowPageClientInner({ chefs, showSlug, seasons = [], childShows = [], parentInfo }: ShowPageClientProps) {
  const [filteredChefs, setFilteredChefs] = useState<ChefData[]>(chefs);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const handleFilteredChefsChange = useCallback((filtered: ChefData[]) => {
    setFilteredChefs(filtered);
  }, []);

  const displayedChefs = useMemo(() => {
    if (!selectedVariant) return filteredChefs;
    return filteredChefs.filter((chef: any) => chef.source_show_slug === selectedVariant);
  }, [filteredChefs, selectedVariant]);

  const seasonLinks = seasons.length > 0 && showSlug ? (
    <SeasonLinks seasons={seasons} showSlug={showSlug} />
  ) : null;

  const variantChildShows = childShows.filter(c => c.show_type !== 'named_season');
  const variantTabs = variantChildShows.length > 0 && showSlug ? (
    <VariantTabs 
      childShows={variantChildShows} 
      showSlug={showSlug}
      selectedVariant={selectedVariant}
      onSelectVariant={setSelectedVariant}
    />
  ) : null;

  const extraContent = (
    <div className="space-y-3">
      {variantTabs}
      {seasonLinks}
    </div>
  );

  return (
    <>
      {parentInfo && <ParentShowBanner parentInfo={parentInfo} />}
      
      <ChefFilters
        chefs={chefs}
        totalChefs={displayedChefs.length}
        onFilteredChefsChange={handleFilteredChefsChange}
        hideShowDropdown
        extraContent={extraContent}
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

export function ShowPageClient({ chefs, showSlug, seasons, childShows, parentInfo }: ShowPageClientProps) {
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
        parentInfo={parentInfo}
      />
    </Suspense>
  );
}
