'use client';

import { useState } from 'react';
import { Database } from '@/lib/database.types';
import { Search, MapPin, Star, RefreshCw, EyeOff, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/admin/ConfirmationModal';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export function RestaurantTable({ restaurants }: { restaurants: Restaurant[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'public' | 'hidden'>('public');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'hide' | 'delete' | null;
    restaurant: Restaurant | null;
    loading: boolean;
  }>({ isOpen: false, type: null, restaurant: null, loading: false });

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'public' ? restaurant.is_public !== false :
      restaurant.is_public === false;
    
    return matchesSearch && matchesStatus;
  });

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

  function openConfirmModal(type: 'hide' | 'delete', restaurant: Restaurant) {
    setConfirmModal({ isOpen: true, type, restaurant, loading: false });
  }

  function closeConfirmModal() {
    setConfirmModal({ isOpen: false, type: null, restaurant: null, loading: false });
  }

  async function handleConfirmAction() {
    if (!confirmModal.restaurant || !confirmModal.type) return;

    setConfirmModal(prev => ({ ...prev, loading: true }));

    try {
      if (confirmModal.type === 'hide') {
        const res = await fetch('/api/admin/duplicates/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: crypto.randomUUID(),
            keeperIds: [],
            loserIds: [confirmModal.restaurant.id],
          }),
        });

        if (!res.ok) throw new Error('Failed to hide restaurant');
      } else if (confirmModal.type === 'delete') {
        const res = await fetch('/api/admin/restaurants/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId: confirmModal.restaurant.id }),
        });

        if (!res.ok) throw new Error('Failed to delete restaurant');
      }

      window.location.reload();
    } catch (error) {
      console.error('Action failed:', error);
      alert('Operation failed. Please try again.');
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <div>
      <div className="mb-6 space-y-4">
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

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('public')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'public'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Public Only ({restaurants.filter(r => r.is_public !== false).length})
          </button>
          <button
            onClick={() => setFilterStatus('hidden')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'hidden'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hidden ({restaurants.filter(r => r.is_public === false).length})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({restaurants.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-64">
                Restaurant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-48">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-48">
                Google Places
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                Photos
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-40">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredRestaurants.map((restaurant) => (
              <tr key={restaurant.id} className={`hover:bg-slate-50 ${
                restaurant.is_public === false ? 'opacity-50 bg-slate-50' : ''
              }`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className={`text-sm font-medium ${
                        restaurant.is_public === false
                          ? 'text-slate-500 line-through'
                          : 'text-slate-900'
                      }`}>{restaurant.name}</div>
                      <div className="text-sm text-slate-500">{restaurant.slug}</div>
                    </div>
                    {restaurant.is_public === false && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                        HIDDEN
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleReEnrichPlace(restaurant.id)}
                      className="text-amber-600 hover:text-amber-900 p-2 rounded hover:bg-amber-50"
                      title="Re-enrich Google Places data"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openConfirmModal('hide', restaurant)}
                      className="text-orange-600 hover:text-orange-900 p-2 rounded hover:bg-orange-50"
                      title="Hide as duplicate"
                      disabled={restaurant.is_public === false}
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openConfirmModal('delete', restaurant)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Permanently delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.type === 'delete'
            ? 'Permanently Delete Restaurant?'
            : 'Hide Restaurant as Duplicate?'
        }
        message={
          confirmModal.type === 'delete' ? (
            <div>
              <p className="mb-2">
                Are you sure you want to permanently delete <strong>{confirmModal.restaurant?.name}</strong>?
              </p>
              <p className="text-xs text-red-600 font-semibold">
                This action cannot be undone. All data including embeddings will be removed.
              </p>
            </div>
          ) : (
            <p>
              Hide <strong>{confirmModal.restaurant?.name}</strong> as a duplicate? It will be marked as closed and hidden from public view.
            </p>
          )
        }
        confirmText={confirmModal.type === 'delete' ? 'Delete Permanently' : 'Hide Restaurant'}
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
        loading={confirmModal.loading}
      />
    </div>
  );
}
