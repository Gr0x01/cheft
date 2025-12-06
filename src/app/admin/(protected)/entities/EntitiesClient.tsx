'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Database } from '@/lib/database.types';
import { EntityList } from './EntityList';
import { ChefEditorPanel } from './ChefEditorPanel';
import { RestaurantEditorPanel, RestaurantEditorHandle } from './RestaurantEditorPanel';
import { Search, X, Loader2 } from 'lucide-react';

type Chef = Database['public']['Tables']['chefs']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

type EntityTab = 'chefs' | 'restaurants';
type FilterType = 'all' | 'missing-bio' | 'missing-places' | 'complete';

interface EntitiesClientProps {
  chefs: Chef[];
  restaurants: Restaurant[];
}

function getChefCompleteness(chef: Chef): { score: number; missing: string[] } {
  const missing: string[] = [];
  if (!chef.mini_bio) missing.push('bio');
  if (!chef.instagram_handle) missing.push('instagram');
  if (!chef.country) missing.push('country');
  const total = 3;
  return { score: (total - missing.length) / total, missing };
}

function getRestaurantCompleteness(restaurant: Restaurant): { score: number; missing: string[] } {
  const missing: string[] = [];
  if (!restaurant.google_place_id) missing.push('places');
  if (!restaurant.google_rating) missing.push('rating');
  if (!restaurant.address) missing.push('address');
  if (!restaurant.cuisine_tags?.length) missing.push('cuisine');
  const total = 4;
  return { score: (total - missing.length) / total, missing };
}

export function EntitiesClient({ chefs, restaurants }: EntitiesClientProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>('chefs');
  const [selectedChefId, setSelectedChefId] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingSelectionRef = useRef<{ type: 'chef' | 'restaurant'; id: string } | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const restaurantEditorRef = useRef<RestaurantEditorHandle>(null);

  const handleSave = async () => {
    console.log('[EntitiesClient] handleSave called');
    console.log('[EntitiesClient] restaurantEditorRef.current:', restaurantEditorRef.current);
    if (!restaurantEditorRef.current) {
      console.error('[EntitiesClient] No ref to editor!');
      return;
    }
    setIsSaving(true);
    try {
      console.log('[EntitiesClient] Calling save...');
      await restaurantEditorRef.current.save();
      console.log('[EntitiesClient] Save completed');
    } catch (error) {
      console.error('[EntitiesClient] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    restaurantEditorRef.current?.discard();
  };

  const selectedChef = useMemo(() => 
    chefs.find(c => c.id === selectedChefId) || null,
    [chefs, selectedChefId]
  );

  const selectedRestaurant = useMemo(() =>
    restaurants.find(r => r.id === selectedRestaurantId) || null,
    [restaurants, selectedRestaurantId]
  );

  const filteredChefs = useMemo(() => {
    let result = chefs;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    if (filter !== 'all') {
      result = result.filter(chef => {
        const { missing, score } = getChefCompleteness(chef);
        switch (filter) {
          case 'missing-bio': return missing.includes('bio');
          case 'complete': return score === 1;
          default: return true;
        }
      });
    }

    return result;
  }, [chefs, searchQuery, filter]);

  const filteredRestaurants = useMemo(() => {
    let result = restaurants;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.city.toLowerCase().includes(q)
      );
    }

    if (filter !== 'all') {
      result = result.filter(restaurant => {
        const { missing, score } = getRestaurantCompleteness(restaurant);
        switch (filter) {
          case 'missing-places': return missing.includes('places');
          case 'complete': return score === 1;
          default: return true;
        }
      });
    }

    return result;
  }, [restaurants, searchQuery, filter]);

  const doSelection = useCallback((type: 'chef' | 'restaurant', id: string) => {
    if (type === 'chef') {
      setSelectedChefId(id);
      setSelectedRestaurantId(null);
    } else {
      setSelectedRestaurantId(id);
      setSelectedChefId(null);
    }
    setHasUnsavedChanges(false);
  }, []);

  const handleSelectChef = useCallback((id: string) => {
    if (id === selectedChefId) return;
    if (hasUnsavedChanges) {
      pendingSelectionRef.current = { type: 'chef', id };
      setShowDiscardDialog(true);
    } else {
      doSelection('chef', id);
    }
  }, [selectedChefId, hasUnsavedChanges, doSelection]);

  const handleSelectRestaurant = useCallback((id: string) => {
    if (id === selectedRestaurantId) return;
    if (hasUnsavedChanges) {
      pendingSelectionRef.current = { type: 'restaurant', id };
      setShowDiscardDialog(true);
    } else {
      doSelection('restaurant', id);
    }
  }, [selectedRestaurantId, hasUnsavedChanges, doSelection]);

  const handleCloseEditor = useCallback(() => {
    if (hasUnsavedChanges) {
      pendingSelectionRef.current = null;
      setShowDiscardDialog(true);
    } else {
      setSelectedChefId(null);
      setSelectedRestaurantId(null);
    }
  }, [hasUnsavedChanges]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    const pending = pendingSelectionRef.current;
    if (pending) {
      doSelection(pending.type, pending.id);
    } else {
      setSelectedChefId(null);
      setSelectedRestaurantId(null);
      setHasUnsavedChanges(false);
    }
    pendingSelectionRef.current = null;
  }, [doSelection]);

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    pendingSelectionRef.current = null;
  }, []);

  const chefFilterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Chefs' },
    { value: 'missing-bio', label: 'Missing Bio' },
    { value: 'complete', label: 'Complete Only' },
  ];

  const restaurantFilterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Restaurants' },
    { value: 'missing-places', label: 'Missing Google Places' },
    { value: 'complete', label: 'Complete Only' },
  ];

  const filterOptions = activeTab === 'chefs' ? chefFilterOptions : restaurantFilterOptions;
  const showingEditor = selectedChef || selectedRestaurant;

  return (
    <div className="h-[calc(100vh-7rem)] max-w-7xl mx-auto">
      <div className="flex h-full gap-0">
        <div className={`flex flex-col bg-white border-2 border-stone-900 overflow-hidden transition-all ${showingEditor ? 'w-[420px] flex-shrink-0' : 'flex-1 max-w-2xl'}`}>
          <div className="p-5 border-b-2 border-stone-900 space-y-5">
            <div className="flex">
              <button
                onClick={() => { setActiveTab('chefs'); setFilter('all'); }}
                className={`flex-1 py-3 font-mono text-xs uppercase tracking-[0.15em] transition-all border-b-2 -mb-[2px] ${
                  activeTab === 'chefs'
                    ? 'text-stone-900 border-copper-600 bg-stone-50'
                    : 'text-stone-400 border-transparent hover:text-stone-600'
                }`}
              >
                Chefs
                <span className="ml-2 font-mono font-bold">{filteredChefs.length}</span>
              </button>
              <button
                onClick={() => { setActiveTab('restaurants'); setFilter('all'); }}
                className={`flex-1 py-3 font-mono text-xs uppercase tracking-[0.15em] transition-all border-b-2 -mb-[2px] ${
                  activeTab === 'restaurants'
                    ? 'text-stone-900 border-copper-600 bg-stone-50'
                    : 'text-stone-400 border-transparent hover:text-stone-600'
                }`}
              >
                Restaurants
                <span className="ml-2 font-mono font-bold">{filteredRestaurants.length}</span>
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-2 border-stone-200 font-ui text-sm focus:outline-none focus:border-copper-600 transition-colors"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 font-mono text-xs uppercase tracking-wider text-stone-600 focus:outline-none focus:border-copper-600 transition-colors"
            >
              {filterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chefs' ? (
              <EntityList
                type="chef"
                items={filteredChefs.map(chef => {
                  const { score, missing } = getChefCompleteness(chef);
                  return {
                    id: chef.id,
                    name: chef.name,
                    subtitle: chef.current_role || chef.country || undefined,
                    imageUrl: chef.photo_url || undefined,
                    completeness: score,
                    missingFields: missing,
                  };
                })}
                selectedId={selectedChefId}
                onSelect={handleSelectChef}
                compact={!!showingEditor}
              />
            ) : (
              <EntityList
                type="restaurant"
                items={filteredRestaurants.map(restaurant => {
                  const { score, missing } = getRestaurantCompleteness(restaurant);
                  return {
                    id: restaurant.id,
                    name: restaurant.name,
                    subtitle: `${restaurant.city}${restaurant.state ? `, ${restaurant.state}` : ''}`,
                    completeness: score,
                    missingFields: missing,
                  };
                })}
                selectedId={selectedRestaurantId}
                onSelect={handleSelectRestaurant}
                compact={!!showingEditor}
              />
            )}
          </div>
        </div>

        {showingEditor && (
          <div className="flex-1 bg-white border-2 border-l-0 border-stone-900 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-stone-900 bg-stone-50">
              <h2 className="font-display text-xl font-bold text-stone-900">
                {selectedChef ? 'Edit Chef' : 'Edit Restaurant'}
              </h2>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-600">Unsaved</span>
                )}
                {selectedRestaurant && (
                  <>
                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={!hasUnsavedChanges || isSaving}
                      className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || isSaving}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-4 py-1.5 border-2 border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white transition-colors disabled:border-stone-300 disabled:text-stone-400 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseEditor}
                  className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedChef && (
                <ChefEditorPanel 
                  key={selectedChef.id}
                  chef={selectedChef} 
                  onDirtyChange={setHasUnsavedChanges}
                />
              )}
              {selectedRestaurant && (
                <RestaurantEditorPanel 
                  ref={restaurantEditorRef}
                  key={selectedRestaurant.id}
                  restaurant={selectedRestaurant} 
                  chefs={chefs.map(c => ({ id: c.id, name: c.name, slug: c.slug }))}
                  onDirtyChange={setHasUnsavedChanges}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showDiscardDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white border-2 border-stone-900 p-6 max-w-sm mx-4">
            <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
              Unsaved Changes
            </h3>
            <p className="font-ui text-sm text-stone-600 mb-6">
              You have unsaved changes. Discard them?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDiscard}
                className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="px-4 py-2 font-mono text-xs uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
