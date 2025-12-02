'use client';

import { useState } from 'react';
import { Database } from '@/lib/database.types';
import { Search, MapPin, Star, RefreshCw } from 'lucide-react';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export function RestaurantTable({ restaurants }: { restaurants: Restaurant[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleReEnrichPlace(restaurantId: string) {
    const res = await fetch('/api/admin/enrich-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    });

    if (res.ok) {
      window.location.reload();
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Restaurant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Google Places
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Photos
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredRestaurants.map((restaurant) => (
              <tr key={restaurant.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{restaurant.name}</div>
                  <div className="text-sm text-slate-500">{restaurant.slug}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">
                    {restaurant.city}, {restaurant.state}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {restaurant.google_place_id ? (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-slate-900">
                        {restaurant.google_rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({restaurant.google_review_count || 0})
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Not linked</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {restaurant.photo_urls && restaurant.photo_urls.length > 0 && restaurant.photo_urls[0].startsWith('https://') ? (
                    <div className="flex items-center gap-1">
                      <img
                        src={restaurant.photo_urls[0]}
                        alt={restaurant.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      {restaurant.photo_urls.length > 1 && (
                        <span className="text-xs text-slate-500">
                          +{restaurant.photo_urls.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">No photos</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleReEnrichPlace(restaurant.id)}
                    className="text-amber-600 hover:text-amber-900 p-2 rounded hover:bg-amber-50"
                    title="Re-enrich Google Places data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
