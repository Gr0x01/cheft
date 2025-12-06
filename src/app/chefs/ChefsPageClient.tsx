'use client';

import { useState, useCallback, Suspense } from 'react';
import { ChefCard } from '@/components/chef/ChefCard';
import { ChefFilters } from '@/components/chef/ChefFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ChefData } from '@/lib/hooks/useChefFilters';

interface Show {
  id: string;
  name: string;
  slug: string;
  chef_count: number;
}

interface ChefsPageClientProps {
  initialChefs: ChefData[];
  shows: Show[];
  totalChefs: number;
}

function ChefsPageClientInner({ initialChefs, shows, totalChefs }: ChefsPageClientProps) {
  const [filteredChefs, setFilteredChefs] = useState<ChefData[]>(initialChefs);

  const handleFilteredChefsChange = useCallback((chefs: ChefData[]) => {
    setFilteredChefs(chefs);
  }, []);

  return (
    <>
      <ChefFilters
        shows={shows}
        chefs={initialChefs}
        totalChefs={totalChefs}
        onFilteredChefsChange={handleFilteredChefsChange}
      />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {filteredChefs.length === 0 ? (
          <EmptyState
            message="No chefs found matching your criteria"
            actionHref="/chefs"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredChefs.map((chef, index) => (
              <ChefCard key={chef.id} chef={chef} index={index} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export function ChefsPageClient(props: ChefsPageClientProps) {
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
      <ChefsPageClientInner {...props} />
    </Suspense>
  );
}
