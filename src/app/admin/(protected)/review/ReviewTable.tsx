'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clsx } from 'clsx';
import type { Tables } from '@/lib/database.types';
import { UserPlus, Store, RefreshCw, ToggleRight, ExternalLink, Check, X, Loader2 } from 'lucide-react';

type ReviewQueueRow = Tables<'review_queue'>;

interface ReviewTableProps {
  items: ReviewQueueRow[];
}

const typeIcons: Record<string, typeof UserPlus> = {
  new_chef: UserPlus,
  new_restaurant: Store,
  update: RefreshCw,
  status_change: ToggleRight,
};

export function ReviewTable({ items }: ReviewTableProps) {
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing((prev) => new Set(prev).add(id));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const updateData = {
      status: (action === 'approve' ? 'approved' : 'rejected') as 'approved' | 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.email || 'unknown',
    };

    const { error } = await (supabase
      .from('review_queue') as ReturnType<typeof supabase.from>)
      .update(updateData as Record<string, unknown>)
      .eq('id', id);

    if (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item: ' + error.message);
    }

    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    router.refresh();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'new_chef':
        return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' };
      case 'new_restaurant':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'update':
        return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
      case 'status_change':
        return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };
    }
  };

  const getConfidenceStyles = (confidence: number | null) => {
    if (confidence === null) return { color: 'text-slate-500', width: '0%' };
    if (confidence >= 0.8) return { color: 'text-emerald-700', width: `${confidence * 100}%` };
    if (confidence >= 0.5) return { color: 'text-amber-700', width: `${confidence * 100}%` };
    return { color: 'text-red-700', width: `${confidence * 100}%` };
  };

  const getDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return 'No data';
    const d = data as Record<string, unknown>;
    if (d.name) return String(d.name);
    if (d.chef_name) return String(d.chef_name);
    return Object.keys(d).slice(0, 2).join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="admin-table-header">
            <tr>
              <th className="px-6 py-4 text-left font-ui text-xs font-semibold uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left font-ui text-xs font-semibold uppercase tracking-wider">Data Summary</th>
              <th className="px-6 py-4 text-left font-ui text-xs font-semibold uppercase tracking-wider">Source</th>
              <th className="px-6 py-4 text-left font-ui text-xs font-semibold uppercase tracking-wider">Confidence</th>
              <th className="px-6 py-4 text-left font-ui text-xs font-semibold uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-right font-ui text-xs font-semibold uppercase tracking-wider">Editorial Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const typeStyles = getTypeStyles(item.type);
              const Icon = typeIcons[item.type] || RefreshCw;
              const confidenceStyles = getConfidenceStyles(item.confidence);
              const isProcessing = processing.has(item.id);
              const dataSummary = getDataSummary(item.data);

              return (
                <tr 
                  key={item.id} 
                  className={clsx(
                    'transition-colors hover:bg-slate-50',
                    isProcessing && 'opacity-50'
                  )}
                >
                  <td className="px-6 py-4">
                    <span className={clsx(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border',
                      typeStyles.bg,
                      typeStyles.text,
                      typeStyles.border
                    )}>
                      <Icon className="w-4 h-4" />
                      {item.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/review/${item.id}`}
                      className="group inline-flex items-center gap-2 hover:text-copper-600 transition-colors"
                    >
                      <span className={clsx(
                        'font-medium',
                        dataSummary.includes('chef_name') || dataSummary.includes('Chef') ? 'admin-chef-name text-slate-900' : 'font-ui text-slate-900'
                      )}>
                        {dataSummary}
                      </span>
                      <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-ui text-sm text-slate-600">{item.source || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={clsx('h-full rounded-full transition-all', 
                            item.confidence && item.confidence >= 0.8 ? 'bg-emerald-500' :
                            item.confidence && item.confidence >= 0.5 ? 'bg-amber-500' :
                            item.confidence ? 'bg-red-500' : 'bg-slate-400'
                          )}
                          style={{ width: confidenceStyles.width }}
                        />
                      </div>
                      <span className={clsx('admin-data-metric text-sm', confidenceStyles.color)}>
                        {item.confidence !== null ? `${(item.confidence * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-ui text-sm text-slate-600">{formatDate(item.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleAction(item.id, 'approve')}
                        disabled={isProcessing}
                        className={clsx(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all font-ui',
                          'bg-emerald-100 text-emerald-700 border border-emerald-200',
                          'hover:bg-emerald-200 hover:border-emerald-300',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'reject')}
                        disabled={isProcessing}
                        className={clsx(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all font-ui',
                          'bg-red-100 text-red-700 border border-red-200',
                          'hover:bg-red-200 hover:border-red-300',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
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
    </div>
  );
}