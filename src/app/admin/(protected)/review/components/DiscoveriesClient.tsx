'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clsx } from 'clsx';
import { Tv, User, Store, Eye, Check, X, Loader2, AlertCircle } from 'lucide-react';
import type { PendingDiscovery, DiscoveryType } from './types';
import { DiscoveryDetail } from './DiscoveryDetail';

interface DiscoveriesClientProps {
  items: PendingDiscovery[];
}

const typeConfig: Record<DiscoveryType, { icon: typeof Tv; bg: string; text: string; label: string }> = {
  show: { icon: Tv, bg: 'bg-purple-100', text: 'text-purple-800', label: 'Show' },
  chef: { icon: User, bg: 'bg-blue-100', text: 'text-blue-800', label: 'Chef' },
  restaurant: { icon: Store, bg: 'bg-amber-100', text: 'text-amber-800', label: 'Restaurant' },
};

export function DiscoveriesClient({ items }: DiscoveriesClientProps) {
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<PendingDiscovery | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      setProcessing(new Set());
      setSelectedIds(new Set());
    };
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing((prev) => new Set(prev).add(id));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('pending_discoveries')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update discovery:', error);
      setError(`Failed to update: ${error.message}`);
    }

    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    router.refresh();
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    ids.forEach(id => setProcessing((prev) => new Set(prev).add(id)));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('pending_discoveries')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      })
      .in('id', ids);

    if (error) {
      console.error('Bulk action failed:', error);
      setError(`Bulk action failed: ${error.message}`);
    }

    setSelectedIds(new Set());
    setProcessing(new Set());
    router.refresh();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDataSummary = (item: PendingDiscovery): string => {
    const d = item.data;
    if (d.name) return String(d.name);
    if (d.chef_name) return String(d.chef_name);
    return item.discovery_type;
  };

  const getDataPreview = (item: PendingDiscovery): string => {
    const d = item.data;
    if (item.discovery_type === 'show') {
      const seasons = d.seasons || d.season;
      return seasons ? `Season ${seasons}` : '';
    }
    if (item.discovery_type === 'chef') {
      const shows = d.shows as string[] | undefined;
      return shows?.length ? `${shows.length} shows` : '';
    }
    if (item.discovery_type === 'restaurant') {
      return d.city ? String(d.city) : '';
    }
    return '';
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-stone-100 border border-stone-200">
          <span className="font-mono text-sm text-stone-600">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleBulkAction('approve')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reject All
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-copper-600"
                />
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">Details</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-stone-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] text-stone-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item) => {
              const config = typeConfig[item.discovery_type];
              const Icon = config.icon;
              const isProcessing = processing.has(item.id);
              const isSelected = selectedIds.has(item.id);

              return (
                <tr
                  key={item.id}
                  className={clsx(
                    'transition-colors hover:bg-stone-50',
                    isProcessing && 'opacity-50',
                    isSelected && 'bg-copper-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 accent-copper-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium',
                      config.bg, config.text
                    )}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="group inline-flex items-center gap-2 hover:text-copper-600 transition-colors text-left"
                    >
                      <span className="font-medium text-stone-900">{getDataSummary(item)}</span>
                      <Eye className="w-4 h-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {item.error_message && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                        <AlertCircle className="w-3 h-3" />
                        {item.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">
                    {getDataPreview(item)}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">
                    {item.source_chef_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleAction(item.id, 'approve')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'reject')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-300 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DiscoveryDetail
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onApprove={(id) => handleAction(id, 'approve')}
        onReject={(id) => handleAction(id, 'reject')}
      />
    </div>
  );
}
