'use client';

import { useState } from 'react';
import { Database } from '@/lib/database.types';
import { ChefTable } from './ChefTable';
import { RestaurantTable } from './RestaurantTable';

type Chef = Database['public']['Tables']['chefs']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export function ManageTabs({
  chefs,
  restaurants,
}: {
  chefs: Chef[];
  restaurants: Restaurant[];
}) {
  const [activeTab, setActiveTab] = useState<'chefs' | 'restaurants'>('chefs');

  return (
    <div>
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('chefs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'chefs'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Chefs ({chefs.length})
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'restaurants'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Restaurants ({restaurants.length})
          </button>
        </nav>
      </div>

      {activeTab === 'chefs' ? (
        <ChefTable chefs={chefs} />
      ) : (
        <RestaurantTable restaurants={restaurants} />
      )}
    </div>
  );
}
