'use client';

import { useState } from 'react';
import { ChefHat, Store, CheckCircle2, Zap, Loader2, AlertCircle } from 'lucide-react';
import { ChefSearchDropdown } from './ChefSearchDropdown';
import { RestaurantSearchDropdown } from './RestaurantSearchDropdown';
import { ENRICHMENT_CONFIG } from '@/lib/enrichment/constants';
import { getAuthHeaders } from '@/lib/supabase/client-auth';

interface Chef {
  id: string;
  name: string;
  slug: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
}

type EnrichmentType = 'full' | 'restaurants_only';

export function ManualTriggerSection() {
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [enrichmentType, setEnrichmentType] = useState<EnrichmentType>('full');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChefTrigger = async () => {
    if (!selectedChef) return;

    setIsLoading('chef');
    setMessage(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/enrichment/trigger-chef', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chefId: selectedChef.id,
          enrichmentType,
          priority: 100,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: `Enrichment job created for ${selectedChef.name}. Queue position: ${data.queuePosition}`,
        });
        setSelectedChef(null);
      } else if (response.status === 401) {
        setMessage({
          type: 'error',
          text: 'Authentication expired. Please log in again.',
        });
        setTimeout(() => window.location.href = '/admin/login', 2000);
      } else if (response.status === 400) {
        setMessage({
          type: 'error',
          text: data.error || data.message || 'Invalid request. Please check your input.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to create enrichment job',
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authenticated')) {
        setMessage({
          type: 'error',
          text: 'Authentication required. Redirecting to login...',
        });
        setTimeout(() => window.location.href = '/admin/login', 2000);
      } else {
        setMessage({
          type: 'error',
          text: 'Network error. Please check your connection and try again.',
        });
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleRestaurantTrigger = async () => {
    if (!selectedRestaurant) return;

    setIsLoading('restaurant');
    setMessage(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/enrichment/trigger-restaurant-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          restaurantId: selectedRestaurant.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: `Status verification started for ${selectedRestaurant.name}`,
        });
        setSelectedRestaurant(null);
      } else if (response.status === 401) {
        setMessage({
          type: 'error',
          text: 'Authentication expired. Please log in again.',
        });
        setTimeout(() => window.location.href = '/admin/login', 2000);
      } else if (response.status === 400) {
        setMessage({
          type: 'error',
          text: data.error || data.message || 'Invalid request. Please check your input.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to create verification job',
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authenticated')) {
        setMessage({
          type: 'error',
          text: 'Authentication required. Redirecting to login...',
        });
        setTimeout(() => window.location.href = '/admin/login', 2000);
      } else {
        setMessage({
          type: 'error',
          text: 'Network error. Please check your connection and try again.',
        });
      }
    } finally {
      setIsLoading(null);
    }
  };

  const estimatedCost = enrichmentType === 'full' 
    ? ENRICHMENT_CONFIG.COST_ESTIMATES.FULL_ENRICHMENT
    : ENRICHMENT_CONFIG.COST_ESTIMATES.RESTAURANTS_ONLY;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg backdrop-blur-sm">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Manual Triggers
            </h2>
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mt-0.5">
              On-demand enrichment operations
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mx-6 mt-6 p-4 rounded-lg border-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-3">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="font-ui text-sm">{message.text}</div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md hover:border-copper-300 transition-all group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-copper-400 to-copper-600 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-copper-100 rounded-lg group-hover:bg-copper-200 transition-colors">
                <ChefHat className="w-6 h-6 text-copper-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Re-enrich Chef
                </h3>
                <p className="font-ui text-xs text-slate-500">
                  Update chef data and discover restaurants
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-600 mb-2">
                  Select Chef
                </label>
                <ChefSearchDropdown 
                  selectedChef={selectedChef}
                  onSelect={setSelectedChef}
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-600 mb-2">
                  Enrichment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnrichmentType('full')}
                    className={`px-4 py-2.5 rounded-lg font-ui text-sm font-medium transition-all ${
                      enrichmentType === 'full'
                        ? 'bg-copper-600 text-white shadow-lg hover:bg-copper-700'
                        : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Full Re-enrich
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnrichmentType('restaurants_only')}
                    className={`px-4 py-2.5 rounded-lg font-ui text-sm font-medium transition-all ${
                      enrichmentType === 'restaurants_only'
                        ? 'bg-copper-600 text-white shadow-lg hover:bg-copper-700'
                        : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Restaurants Only
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-ui text-sm text-slate-600">
                    Estimated Cost
                  </span>
                  <span className="font-mono text-lg font-bold text-copper-600">
                    ${estimatedCost.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleChefTrigger}
                  disabled={!selectedChef || isLoading !== null}
                  className="w-full px-6 py-3 bg-gradient-to-r from-copper-500 to-copper-600 text-white font-ui font-semibold rounded-lg shadow-lg shadow-copper-500/30 hover:shadow-xl hover:shadow-copper-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isLoading === 'chef' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Job...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Trigger Enrichment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="relative bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Verify Restaurant Status
                </h3>
                <p className="font-ui text-xs text-slate-500">
                  Check if restaurant is still open
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-slate-600 mb-2">
                  Select Restaurant
                </label>
                <RestaurantSearchDropdown 
                  selectedRestaurant={selectedRestaurant}
                  onSelect={setSelectedRestaurant}
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-ui text-sm text-slate-600">
                    Estimated Cost
                  </span>
                  <span className="font-mono text-lg font-bold text-blue-600">
                    ${ENRICHMENT_CONFIG.COST_ESTIMATES.STATUS_CHECK.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRestaurantTrigger}
                  disabled={!selectedRestaurant || isLoading !== null}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-ui font-semibold rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isLoading === 'restaurant' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Job...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Verify Status</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
