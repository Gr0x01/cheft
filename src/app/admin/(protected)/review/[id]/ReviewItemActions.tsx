'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UpdateTables } from '@/lib/database.types';

interface ReviewItemActionsProps {
  id: string;
}

export function ReviewItemActions({ id }: ReviewItemActionsProps) {
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const router = useRouter();

  const handleAction = async (action: 'approve' | 'reject', notes?: string) => {
    setProcessing(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const updateData: UpdateTables<'review_queue'> = {
      status: (action === 'approve' ? 'approved' : 'rejected') as 'approved' | 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.email || 'unknown',
      notes: notes || undefined,
    };

    const { error } = await (supabase
      .from('review_queue') as ReturnType<typeof supabase.from>)
      .update(updateData as Record<string, unknown>)
      .eq('id', id);

    if (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item: ' + error.message);
      setProcessing(false);
      return;
    }

    router.push('/admin/review');
    router.refresh();
  };

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => handleAction('approve')}
          disabled={processing}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          {processing ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={processing}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          Reject
        </button>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Reject Item</h3>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Optional: Add a reason for rejection..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject', rejectNotes || undefined)}
                disabled={processing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {processing ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
