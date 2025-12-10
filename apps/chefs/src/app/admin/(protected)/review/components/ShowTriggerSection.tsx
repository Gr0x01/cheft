'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Tv, Search, Plus, AlertTriangle, Loader2, ChevronDown, Check, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Show {
  id: string;
  name: string;
  slug: string;
}

interface HarvestResult {
  chefsFound: number;
  restaurantsFound: number;
  discoveriesCreated: number;
  estimatedCost: number;
  errors: string[];
}

const COST_PER_CHEF = 0.05;
const COST_RANGE_MIN = 0.50;
const COST_RANGE_MAX = 2.00;

export function ShowTriggerSection() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [newShowName, setNewShowName] = useState('');
  const [isNewShow, setIsNewShow] = useState(false);
  const [query, setQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [result, setResult] = useState<HarvestResult | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shows')
      .select('id, name, slug')
      .order('name');
    
    if (!error && data) {
      setShows(data);
    }
    setLoading(false);
  };

  const filteredShows = query === ''
    ? shows
    : shows.filter((show) =>
        show.name.toLowerCase().includes(query.toLowerCase())
      );

  const showNameToUse = isNewShow ? newShowName : selectedShow?.name || '';

  const handleTrigger = () => {
    if (!showNameToUse.trim()) return;
    setConfirmOpen(true);
  };

  const handleConfirmHarvest = async () => {
    setHarvesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/harvest-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showName: showNameToUse,
          isNew: isNewShow,
          showId: selectedShow?.id,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Harvest failed');
      }

      const data: HarvestResult = await response.json();
      setResult(data);
      router.refresh();
    } catch (err) {
      setResult({
        chefsFound: 0,
        restaurantsFound: 0,
        discoveriesCreated: 0,
        estimatedCost: 0,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setHarvesting(false);
    }
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setResult(null);
  };

  return (
    <div className="bg-white border border-stone-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Tv className="w-5 h-5 text-purple-600" />
        <h3 className="font-display text-lg font-bold text-stone-900">Show Trigger</h3>
      </div>
      <p className="text-sm text-stone-500 mb-6">
        Select an existing show or enter a new one to harvest chef and restaurant data.
      </p>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setIsNewShow(false)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            !isNewShow
              ? 'bg-copper-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Existing Show
        </button>
        <button
          onClick={() => setIsNewShow(true)}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            isNewShow
              ? 'bg-copper-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          New Show
        </button>
      </div>

      {!isNewShow ? (
        <div className="mb-6">
          <label className="block font-mono text-xs text-stone-500 uppercase tracking-wider mb-2">
            Select Show ({shows.length} available)
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading shows...
            </div>
          ) : (
            <Combobox value={selectedShow} onChange={setSelectedShow}>
              <div className="relative">
                <div className="relative">
                  <Combobox.Input
                    className="w-full border border-stone-300 py-2.5 pl-10 pr-10 text-sm focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                    displayValue={(show: Show | null) => show?.name || ''}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search shows..."
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Combobox.Button className="absolute right-2 top-1/2 -translate-y-1/2">
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-stone-200 shadow-lg">
                  {filteredShows.length === 0 && query !== '' ? (
                    <div className="px-4 py-2 text-sm text-stone-500">No shows found</div>
                  ) : (
                    filteredShows.map((show) => (
                      <Combobox.Option
                        key={show.id}
                        value={show}
                        className={({ active }) =>
                          `px-4 py-2 cursor-pointer flex items-center gap-2 ${
                            active ? 'bg-copper-50 text-copper-900' : 'text-stone-900'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={selected ? 'font-medium' : ''}>{show.name}</span>
                            {selected && <Check className="w-4 h-4 text-copper-600 ml-auto" />}
                          </>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <label className="block font-mono text-xs text-stone-500 uppercase tracking-wider mb-2">
            New Show Name
          </label>
          <input
            type="text"
            value={newShowName}
            onChange={(e) => setNewShowName(e.target.value)}
            placeholder="e.g., MasterChef Junior, The Bear"
            className="w-full border border-stone-300 py-2.5 px-3 text-sm focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
          <p className="mt-1 text-xs text-stone-400">
            Enter the full name of the TV cooking show
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <DollarSign className="w-4 h-4" />
          <span>Estimated cost: ~${COST_PER_CHEF.toFixed(2)}/chef discovered</span>
        </div>
        <button
          onClick={handleTrigger}
          disabled={!showNameToUse.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Search className="w-4 h-4" />
          Harvest Chefs
        </button>
      </div>

      <Transition appear show={confirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeConfirm}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md bg-white shadow-xl p-6">
                  {!harvesting && !result ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-full">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <Dialog.Title className="font-display text-xl font-bold text-stone-900">
                          Confirm Harvest
                        </Dialog.Title>
                      </div>

                      <div className="mb-6 space-y-3">
                        <p className="text-stone-600">
                          This will search for chefs from <strong className="text-stone-900">{showNameToUse}</strong> and their restaurants.
                        </p>
                        <div className="p-3 bg-stone-50 border border-stone-200">
                          <div className="text-sm text-stone-600 space-y-1">
                            <p>• Search Tavily for chef contestants/winners</p>
                            <p>• Extract chef names and show appearances</p>
                            <p>• Search each chef&apos;s restaurants</p>
                            <p>• Stage all discoveries for review</p>
                          </div>
                        </div>
                        <p className="text-sm text-amber-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Estimated cost: ${COST_RANGE_MIN.toFixed(2)} - ${COST_RANGE_MAX.toFixed(2)} depending on results
                        </p>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={closeConfirm}
                          className="px-4 py-2 bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmHarvest}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                          Start Harvest
                        </button>
                      </div>
                    </>
                  ) : harvesting ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                      <p className="font-display text-lg font-bold text-stone-900 mb-1">Harvesting...</p>
                      <p className="text-sm text-stone-500">Searching for chefs and restaurants</p>
                    </div>
                  ) : result ? (
                    <>
                      <Dialog.Title className="font-display text-xl font-bold text-stone-900 mb-4">
                        {result.errors.length > 0 ? 'Harvest Complete (with errors)' : 'Harvest Complete'}
                      </Dialog.Title>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between py-2 border-b border-stone-100">
                          <span className="text-stone-600">Chefs Found</span>
                          <span className="font-mono font-bold text-stone-900">{result.chefsFound}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-stone-100">
                          <span className="text-stone-600">Restaurants Found</span>
                          <span className="font-mono font-bold text-stone-900">{result.restaurantsFound}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-stone-100">
                          <span className="text-stone-600">Discoveries Staged</span>
                          <span className="font-mono font-bold text-emerald-600">{result.discoveriesCreated}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-stone-600">Estimated Cost</span>
                          <span className="font-mono font-bold text-stone-900">${result.estimatedCost.toFixed(2)}</span>
                        </div>
                      </div>

                      {result.errors.length > 0 && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
                          <strong>Errors:</strong>
                          <ul className="mt-1 list-disc list-inside">
                            {result.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={closeConfirm}
                        className="w-full px-4 py-2 bg-copper-600 text-white text-sm font-medium hover:bg-copper-700 transition-colors"
                      >
                        Done
                      </button>
                    </>
                  ) : null}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
