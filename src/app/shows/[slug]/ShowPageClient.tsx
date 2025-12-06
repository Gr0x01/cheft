'use client';

import { useState, useCallback, Suspense } from 'react';
import { ChefCard } from '@/components/chef/ChefCard';
import { ChefFilters } from '@/components/chef/ChefFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ChefData } from '@/lib/hooks/useChefFilters';

interface ShowPageClientProps {
  chefs: ChefData[];
}

function ShowPageClientInner({ chefs }: ShowPageClientProps) {
  const [filteredChefs, setFilteredChefs] = useState<ChefData[]>(chefs);

  const handleFilteredChefsChange = useCallback((filtered: ChefData[]) => {
    setFilteredChefs(filtered);
  }, []);

  return (
    <>
      <ChefFilters
        chefs={chefs}
        totalChefs={chefs.length}
        onFilteredChefsChange={handleFilteredChefsChange}
        hideShowDropdown
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredChefs.length === 0 ? (
          <EmptyState
            message="No chefs found matching your criteria"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredChefs.map((chef, index) => (
              <ChefCard key={chef.id} chef={chef} index={index} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ShowPageClient(props: ShowPageClientProps) {
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
      <ShowPageClientInner {...props} />
    </Suspense>
  );
}
