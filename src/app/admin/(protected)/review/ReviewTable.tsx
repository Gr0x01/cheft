'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clsx } from 'clsx';
import type { Tables } from '@/lib/database.types';

type ReviewQueueRow = Tables<'review_queue'>;

interface ReviewTableProps {
  items: ReviewQueueRow[];
}

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'new_chef':
        return 'bg-purple-900/50 text-purple-300';
      case 'new_restaurant':
        return 'bg-blue-900/50 text-blue-300';
      case 'update':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'status_change':
        return 'bg-orange-900/50 text-orange-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return 'No data';
    const d = data as Record<string, unknown>;
    if (d.name) return String(d.name);
    if (d.chef_name) return String(d.chef_name);
    return Object.keys(d).slice(0, 2).join(', ');
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Summary</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Source</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Confidence</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-750">
              <td className="px-4 py-3">
                <span className={clsx('px-2 py-1 text-xs rounded', getTypeColor(item.type))}>
                  {item.type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/review/${item.id}`}
                  className="text-white hover:text-blue-400 font-medium"
                >
                  {getDataSummary(item.data)}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">{item.source || '-'}</td>
              <td className="px-4 py-3">
                <span className={clsx('text-sm font-mono', getConfidenceColor(item.confidence))}>
                  {item.confidence !== null ? `${(item.confidence * 100).toFixed(0)}%` : '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">{formatDate(item.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleAction(item.id, 'approve')}
                    disabled={processing.has(item.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                  >
                    {processing.has(item.id) ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'reject')}
                    disabled={processing.has(item.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                  >
                    {processing.has(item.id) ? '...' : 'Reject'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
