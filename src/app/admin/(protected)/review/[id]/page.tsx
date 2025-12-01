import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ReviewItemActions } from './ReviewItemActions';
import type { Tables } from '@/lib/database.types';

type ReviewQueueRow = Tables<'review_queue'>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewItemPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('review_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as ReviewQueueRow;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'approved':
        return 'bg-green-900/50 text-green-300';
      case 'rejected':
        return 'bg-red-900/50 text-red-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/review"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          &larr; Back to Review Queue
        </Link>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {item.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </h1>
            <div className="flex gap-3 items-center">
              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
              {item.confidence !== null && (
                <span className="text-sm text-gray-400">
                  Confidence: {(item.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          {item.status === 'pending' && <ReviewItemActions id={item.id} />}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Source</h3>
            <p className="text-white">{item.source || '-'}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Created</h3>
            <p className="text-white">{formatDate(item.created_at)}</p>
          </div>
          {item.reviewed_at && (
            <>
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Reviewed At</h3>
                <p className="text-white">{formatDate(item.reviewed_at)}</p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Reviewed By</h3>
                <p className="text-white">{item.reviewed_by || '-'}</p>
              </div>
            </>
          )}
        </div>

        {item.notes && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-400 uppercase mb-1">Notes</h3>
            <p className="text-white">{item.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Data</h2>
        <pre className="bg-gray-900 rounded p-4 overflow-x-auto text-sm text-gray-300">
          {JSON.stringify(item.data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
