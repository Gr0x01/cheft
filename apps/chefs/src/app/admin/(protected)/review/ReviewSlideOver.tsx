'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Tables, UpdateTables } from '@/lib/database.types';
import { 
  X, 
  UserPlus, 
  Store, 
  RefreshCw, 
  ToggleRight, 
  Clock, 
  Calendar, 
  User, 
  Gauge,
  Database,
  Check,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';

type ReviewQueueRow = Tables<'review_queue'>;

interface ReviewSlideOverProps {
  item: ReviewQueueRow | null;
  onClose: () => void;
}

const typeIcons: Record<string, typeof UserPlus> = {
  new_chef: UserPlus,
  new_restaurant: Store,
  update: RefreshCw,
  status_change: ToggleRight,
};

export function ReviewSlideOver({ item, onClose }: ReviewSlideOverProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  if (!item) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
      case 'approved':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };
    }
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

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'text-slate-500';
    if (confidence >= 0.8) return 'text-emerald-700';
    if (confidence >= 0.5) return 'text-amber-700';
    return 'text-red-700';
  };

  const getDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return 'Unknown Data';
    const d = data as Record<string, unknown>;
    if (d.name) return String(d.name);
    if (d.chef_name) return String(d.chef_name);
    return 'Data Update';
  };

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
      .eq('id', item.id);

    if (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item: ' + error.message);
      setProcessing(false);
      return;
    }

    setShowRejectModal(false);
    setRejectNotes('');
    onClose();
    router.refresh();
  };

  const statusStyles = getStatusStyles(item.status || 'pending');
  const typeStyles = getTypeStyles(item.type);
  const TypeIcon = typeIcons[item.type] || RefreshCw;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${typeStyles.bg} rounded-lg border ${typeStyles.border}`}>
              <TypeIcon className={`w-5 h-5 ${typeStyles.text}`} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {getDataSummary(item.data)}
              </h2>
              <p className="font-ui text-sm text-slate-500">
                {item.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
              {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
            </span>
            
            {item.confidence !== null && (
              <div className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-slate-400" />
                <span className={`font-mono text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="flex items-center gap-1.5 font-ui text-xs text-slate-500 mb-1">
                <Database className="w-3 h-3" />
                Source
              </div>
              <p className="font-ui text-sm text-slate-900">{item.source || 'Unknown'}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-ui text-xs text-slate-500 mb-1">
                <Calendar className="w-3 h-3" />
                Created
              </div>
              <p className="font-ui text-sm text-slate-900">{formatDate(item.created_at)}</p>
            </div>
            {item.reviewed_at && (
              <>
                <div>
                  <div className="flex items-center gap-1.5 font-ui text-xs text-slate-500 mb-1">
                    <Clock className="w-3 h-3" />
                    Reviewed
                  </div>
                  <p className="font-ui text-sm text-slate-900">{formatDate(item.reviewed_at)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-ui text-xs text-slate-500 mb-1">
                    <User className="w-3 h-3" />
                    By
                  </div>
                  <p className="font-ui text-sm text-slate-900">{item.reviewed_by || 'System'}</p>
                </div>
              </>
            )}
          </div>

          {item.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-ui text-sm text-slate-700">{item.notes}</p>
            </div>
          )}

          <div>
            <h3 className="font-ui text-sm font-medium text-slate-700 mb-3">Data Payload</h3>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(item.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {item.status === 'pending' && (
          <div className="px-6 py-4 border-t border-slate-200 bg-white">
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('approve')}
                disabled={processing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">Reject Item</h3>
                <p className="font-ui text-sm text-slate-600 mt-1">
                  Please provide a reason for rejection.
                </p>
              </div>
            </div>
            
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper-500 resize-none mb-4"
              rows={3}
            />
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setRejectNotes(''); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject', rejectNotes || undefined)}
                disabled={processing}
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors'
                )}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
