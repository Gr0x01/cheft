'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { 
  Tv, Search, Plus, AlertTriangle, Loader2, ChevronDown, ChevronRight,
  DollarSign, Users, Sparkles, ArrowUpDown, Eye, EyeOff, Link2, Users2
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface ShowWithStats {
  id: string;
  name: string;
  slug: string;
  network: string | null;
  created_at: string;
  chef_count: number;
  is_public: boolean;
  show_type: string | null;
  parent_show_id: string | null;
  parent_show_name: string | null;
}

interface PotentialShow {
  show_name: string;
  pending_count: number;
}

interface ShowsClientProps {
  shows: ShowWithStats[];
  potentialShows: PotentialShow[];
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

type SortField = 'name' | 'chef_count' | 'network' | 'is_public' | 'show_type';
type SortDir = 'asc' | 'desc';
type FilterVisibility = 'all' | 'public' | 'non-public';
type FilterType = 'all' | 'core' | 'spinoff' | 'variant' | 'named_season' | 'unset';

const SHOW_TYPE_LABELS: Record<string, string> = {
  core: 'Core',
  spinoff: 'Spinoff',
  variant: 'Variant',
  named_season: 'Named Season',
};

const SHOW_TYPE_COLORS: Record<string, string> = {
  core: 'bg-blue-100 text-blue-700',
  spinoff: 'bg-purple-100 text-purple-700',
  variant: 'bg-amber-100 text-amber-700',
  named_season: 'bg-teal-100 text-teal-700',
};

export function ShowsClient({ shows, potentialShows }: ShowsClientProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterVisibility, setFilterVisibility] = useState<FilterVisibility>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedShow, setExpandedShow] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<ShowWithStats | null>(null);
  const [newShowName, setNewShowName] = useState('');
  const [isNewShow, setIsNewShow] = useState(false);
  const [query, setQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [result, setResult] = useState<HarvestResult | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  const filteredShows = shows.filter(show => {
    if (filterVisibility === 'public' && !show.is_public) return false;
    if (filterVisibility === 'non-public' && show.is_public) return false;
    if (filterType === 'unset' && show.show_type !== null) return false;
    if (filterType !== 'all' && filterType !== 'unset' && show.show_type !== filterType) return false;
    if (query && !show.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const sortedShows = [...filteredShows].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'chef_count') cmp = a.chef_count - b.chef_count;
    else if (sortField === 'network') cmp = (a.network || '').localeCompare(b.network || '');
    else if (sortField === 'is_public') cmp = (a.is_public ? 1 : 0) - (b.is_public ? 1 : 0);
    else if (sortField === 'show_type') cmp = (a.show_type || '').localeCompare(b.show_type || '');
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const comboFilteredShows = query === ''
    ? shows
    : shows.filter((show) =>
        show.name.toLowerCase().includes(query.toLowerCase())
      );

  const showNameToUse = isNewShow ? newShowName : selectedShow?.name || '';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleTrigger = (showName?: string) => {
    if (showName) {
      setNewShowName(showName);
      setIsNewShow(true);
      setSelectedShow(null);
    }
    if (!showName && !showNameToUse.trim()) return;
    setConfirmOpen(true);
  };

  const handleConfirmHarvest = async () => {
    setHarvesting(true);
    setResult(null);

    const nameToHarvest = newShowName || showNameToUse;

    try {
      const response = await fetch('/api/admin/harvest-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showName: nameToHarvest,
          isNew: isNewShow || !selectedShow,
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

  const updateShow = async (showId: string, updates: Record<string, unknown>) => {
    if (updating) return;
    setUpdating(showId);
    
    try {
      const response = await fetch('/api/admin/shows/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update show');
        return;
      }
      toast.success('Show updated');
    } catch {
      toast.error('Failed to update show');
    } finally {
      setUpdating(null);
      router.refresh();
    }
  };

  const handleTogglePublic = (show: ShowWithStats) => {
    updateShow(show.id, { is_public: !show.is_public });
  };

  const handleToggleFamilyPublic = (show: ShowWithStats) => {
    const childCount = shows.filter(s => s.parent_show_id === show.id).length;
    const newState = !show.is_public;
    const action = newState ? 'enable' : 'disable';
    if (childCount > 0 && !confirm(`This will ${action} "${show.name}" and ${childCount} child show(s). Continue?`)) {
      return;
    }
    updateShow(show.id, { is_public: newState, cascade_visibility: true });
  };

  const handleUpdateShowType = (show: ShowWithStats, newType: string | null) => {
    updateShow(show.id, { show_type: newType || null });
  };

  const handleUpdateParent = (show: ShowWithStats, parentId: string | null) => {
    updateShow(show.id, { parent_show_id: parentId || null });
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setResult(null);
    setNewShowName('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const publicCount = shows.filter(s => s.is_public).length;
  const nonPublicCount = shows.filter(s => !s.is_public).length;
  const coreShows = shows.filter(s => s.show_type === 'core' || (!s.show_type && !s.parent_show_id));

  return (
    <div className="space-y-8">
      <div className="bg-white border border-stone-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Tv className="w-5 h-5 text-purple-600" />
          <h3 className="font-display text-lg font-bold text-stone-900">Harvest New Show</h3>
        </div>
        <p className="text-sm text-stone-500 mb-6">
          Select an existing show to re-harvest or enter a new one to discover chefs.
        </p>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setIsNewShow(false)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={!isNewShow ? { backgroundColor: 'var(--copper-600)', color: 'white' } : { backgroundColor: '#f5f5f4', color: '#57534e' }}
          >
            Existing Show
          </button>
          <button
            onClick={() => setIsNewShow(true)}
            className="px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
            style={isNewShow ? { backgroundColor: 'var(--copper-600)', color: 'white' } : { backgroundColor: '#f5f5f4', color: '#57534e' }}
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
            <div className="flex gap-3">
              <Combobox value={selectedShow} onChange={setSelectedShow} immediate>
                <div className="relative flex-1">
                  <div className="relative">
                    <Combobox.Input
                      className="w-full border border-stone-300 py-2.5 pl-10 pr-10 text-sm focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                      displayValue={(show: ShowWithStats | null) => show?.name || ''}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search shows..."
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Combobox.Button className="absolute right-2 top-1/2 -translate-y-1/2">
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    </Combobox.Button>
                  </div>
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-stone-200 shadow-lg">
                    {comboFilteredShows.length === 0 && query !== '' ? (
                      <div className="px-4 py-2 text-sm text-stone-500">No shows found</div>
                    ) : (
                      comboFilteredShows.map((show) => (
                        <Combobox.Option
                          key={show.id}
                          value={show}
                          className={({ active }) =>
                            clsx(
                              'px-4 py-2 cursor-pointer flex items-center justify-between',
                              active ? 'bg-copper-50 text-copper-900' : 'text-stone-900'
                            )
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className={selected ? 'font-medium' : ''}>{show.name}</span>
                              <span className="text-xs text-stone-400">{show.chef_count} chefs</span>
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
              <button
                onClick={() => handleTrigger()}
                disabled={!showNameToUse.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                Harvest Chefs
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block font-mono text-xs text-stone-500 uppercase tracking-wider mb-2">
              New Show Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newShowName}
                onChange={(e) => setNewShowName(e.target.value)}
                placeholder="e.g., MasterChef Junior, The Bear"
                className="flex-1 border border-stone-300 py-2.5 px-3 text-sm focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
              <button
                onClick={() => handleTrigger()}
                disabled={!showNameToUse.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                Harvest Chefs
              </button>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Enter the full name of the TV cooking show
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-stone-500">
          <DollarSign className="w-4 h-4" />
          <span>Estimated cost: ~${COST_PER_CHEF.toFixed(2)}/chef discovered</span>
        </div>
      </div>

      <div className="bg-white border border-stone-200">
        <div className="px-6 py-4 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-stone-600" />
              <h3 className="font-display text-lg font-bold text-stone-900">All Shows</h3>
              <span className="font-mono text-xs text-stone-400">
                ({shows.length} total • {publicCount} public • {nonPublicCount} hidden)
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-stone-400 uppercase">Visibility:</span>
              <div className="flex">
                {(['all', 'public', 'non-public'] as FilterVisibility[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setFilterVisibility(v)}
                    className={clsx(
                      'px-2 py-1 text-xs font-medium border-y border-l last:border-r first:rounded-l last:rounded-r',
                      filterVisibility === v
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    )}
                  >
                    {v === 'all' ? 'All' : v === 'public' ? 'Public' : 'Hidden'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-stone-400 uppercase">Type:</span>
              <div className="flex">
                {(['all', 'core', 'spinoff', 'variant', 'named_season', 'unset'] as FilterType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={clsx(
                      'px-2 py-1 text-xs font-medium border-y border-l last:border-r first:rounded-l last:rounded-r',
                      filterType === t
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    )}
                  >
                    {t === 'all' ? 'All' : t === 'unset' ? 'Unset' : SHOW_TYPE_LABELS[t] || t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-200 rounded focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                />
              </div>
            </div>
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="w-8 px-3"></th>
              <th 
                className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => handleSort('name')}
              >
                <span className="inline-flex items-center gap-1">
                  Name
                  {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th 
                className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => handleSort('show_type')}
              >
                <span className="inline-flex items-center gap-1">
                  Type
                  {sortField === 'show_type' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                Parent
              </th>
              <th 
                className="px-4 py-3 text-right font-mono text-[10px] text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => handleSort('chef_count')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Chefs
                  {sortField === 'chef_count' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th 
                className="px-4 py-3 text-center font-mono text-[10px] text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => handleSort('is_public')}
              >
                <span className="inline-flex items-center gap-1">
                  Public
                  {sortField === 'is_public' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sortedShows.map((show) => (
              <Fragment key={show.id}>
                <tr 
                  className={clsx(
                    'hover:bg-stone-50 transition-colors cursor-pointer',
                    expandedShow === show.id && 'bg-stone-50'
                  )}
                  onClick={() => setExpandedShow(expandedShow === show.id ? null : show.id)}
                >
                  <td className="px-3 py-3">
                    {expandedShow === show.id ? (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'font-medium',
                        show.is_public ? 'text-stone-900' : 'text-stone-400'
                      )}>
                        {show.name}
                      </span>
                      {show.network && (
                        <span className="text-xs text-stone-400">({show.network})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {show.show_type ? (
                      <span className={clsx(
                        'px-2 py-0.5 text-xs font-medium rounded',
                        SHOW_TYPE_COLORS[show.show_type] || 'bg-stone-100 text-stone-600'
                      )}>
                        {SHOW_TYPE_LABELS[show.show_type] || show.show_type}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {show.parent_show_name ? (
                      <span className="text-sm text-stone-600 flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        {show.parent_show_name}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={clsx(
                      'font-mono text-sm font-bold',
                      show.chef_count > 0 ? 'text-emerald-600' : 'text-stone-300'
                    )}>
                      {show.chef_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublic(show);
                        }}
                        disabled={updating === show.id}
                        className={clsx(
                          'p-1.5 rounded transition-colors',
                          show.is_public 
                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                        )}
                        title={show.is_public ? 'Hide show' : 'Make public'}
                      >
                        {updating === show.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : show.is_public ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      {!show.parent_show_id && shows.some(s => s.parent_show_id === show.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFamilyPublic(show);
                          }}
                          disabled={updating === show.id}
                          className={clsx(
                            'p-1.5 rounded transition-colors',
                            show.is_public 
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                              : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                          )}
                          title={`Toggle ${show.name} + all variants`}
                        >
                          <Users2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                
                {expandedShow === show.id && (
                  <tr className="bg-stone-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block font-mono text-[10px] text-stone-500 uppercase tracking-wider mb-2">
                            Show Type
                          </label>
                          <select
                            value={show.show_type || ''}
                            onChange={(e) => handleUpdateShowType(show, e.target.value || null)}
                            disabled={updating === show.id}
                            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                          >
                            <option value="">Not set</option>
                            <option value="core">Core</option>
                            <option value="spinoff">Spinoff</option>
                            <option value="variant">Variant</option>
                            <option value="named_season">Named Season</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block font-mono text-[10px] text-stone-500 uppercase tracking-wider mb-2">
                            Parent Show
                          </label>
                          <select
                            value={show.parent_show_id || ''}
                            onChange={(e) => handleUpdateParent(show, e.target.value || null)}
                            disabled={updating === show.id}
                            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                          >
                            <option value="">None (top-level)</option>
                            {coreShows
                              .filter(s => s.id !== show.id)
                              .map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))
                            }
                          </select>
                        </div>
                        
                        <div className="col-span-2 flex items-center gap-4 pt-2 border-t border-stone-200">
                          <div className="text-xs text-stone-500">
                            <strong>Slug:</strong> {show.slug}
                          </div>
                          <div className="text-xs text-stone-500">
                            <strong>Created:</strong> {formatDate(show.created_at)}
                          </div>
                          <a
                            href={`/shows/${show.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-copper-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View public page →
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        
        {sortedShows.length === 0 && (
          <div className="px-6 py-12 text-center text-stone-500">
            No shows match your filters
          </div>
        )}
      </div>

      {potentialShows.length > 0 && (
        <div className="bg-white border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-200 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-display text-lg font-bold text-stone-900">Potential Shows</h3>
            <span className="font-mono text-xs text-stone-400">
              (from pending discoveries)
            </span>
          </div>
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                  Show Name
                </th>
                <th className="px-6 py-3 text-right font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                  Pending Chefs
                </th>
                <th className="px-6 py-3 text-right font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {potentialShows.map((show) => (
                <tr key={show.show_name} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-medium text-stone-900">{show.show_name}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-mono text-sm font-bold text-amber-600">
                      {show.pending_count}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleTrigger(show.show_name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition-colors"
                    >
                      <Search className="w-3 h-3" />
                      Harvest
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                          This will search for chefs from <strong className="text-stone-900">{newShowName || showNameToUse}</strong> and their restaurants.
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
