'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UpdateTables } from '@/lib/database.types';
import { clsx } from 'clsx';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';

interface ReviewItemActionsProps {
  id: string;
  variant?: 'horizontal' | 'vertical';
}

export function ReviewItemActions({ id, variant = 'horizontal' }: ReviewItemActionsProps) {
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

  const isVertical = variant === 'vertical';

  return (
    <>
      <div className={clsx('flex', isVertical ? 'flex-col gap-3' : 'gap-3')}>
        <button
          onClick={() => handleAction('approve')}
          disabled={processing}
          className={clsx(
            'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all font-ui',
            isVertical ? 'px-6 py-3 text-sm w-full' : 'px-6 py-3 text-sm',
            'bg-emerald-100 text-emerald-800 border border-emerald-200',
            'hover:bg-emerald-200 hover:border-emerald-300 hover:shadow-md',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {processing ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={processing}
          className={clsx(
            'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all font-ui',
            isVertical ? 'px-6 py-3 text-sm w-full' : 'px-6 py-3 text-sm',
            'bg-red-100 text-red-800 border border-red-200',
            'hover:bg-red-200 hover:border-red-300 hover:shadow-md',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <X className="w-4 h-4" />
          Reject
        </button>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl p-8 max-w-lg w-full mx-4">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-semibold text-slate-900">Reject Item</h3>
                <p className="font-ui text-slate-600 mt-1">
                  This action will mark the item as rejected. Please provide editorial notes explaining the reason.
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="reject-notes" className="block font-ui text-sm font-medium text-slate-700 mb-2">
                Editorial Notes
              </label>
              <textarea
                id="reject-notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Explain why this item is being rejected..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-copper-500 focus:border-copper-500 resize-none transition-all font-ui"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
                className="px-6 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all text-sm font-medium font-ui"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject', rejectNotes || undefined)}
                disabled={processing}
                className={clsx(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all font-ui',
                  'bg-red-600 text-white',
                  'hover:bg-red-700 hover:shadow-md',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}