import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ReviewItemActions } from './ReviewItemActions';
import type { Tables } from '@/lib/database.types';
import { 
  ArrowLeft, 
  UserPlus, 
  Store, 
  RefreshCw, 
  ToggleRight, 
  Clock, 
  Calendar, 
  User, 
  Gauge,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

type ReviewQueueRow = Tables<'review_queue'>;

interface PageProps {
  params: Promise<{ id: string }>;
}

const typeIcons: Record<string, typeof UserPlus> = {
  new_chef: UserPlus,
  new_restaurant: Store,
  update: RefreshCw,
  status_change: ToggleRight,
};

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
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: Clock };
      case 'approved':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: AlertCircle };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', icon: Clock };
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

  const statusStyles = getStatusStyles(item.status);
  const typeStyles = getTypeStyles(item.type);
  const TypeIcon = typeIcons[item.type] || RefreshCw;
  const StatusIcon = statusStyles.icon;

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

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/review"
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all text-sm font-ui"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </Link>
        <div className="text-slate-400">/</div>
        <div className="font-ui text-sm text-slate-600">Review Item</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Article Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Editorial Header */}
          <article className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
            <div className="border-l-4 border-copper-500 pl-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 ${typeStyles.bg} rounded-lg border ${typeStyles.border}`}>
                      <TypeIcon className={`w-6 h-6 ${typeStyles.text}`} />
                    </div>
                    <div>
                      <h1 className="font-display text-3xl font-bold text-slate-900 leading-tight">
                        {getDataSummary(item.data)}
                      </h1>
                      <p className="font-ui text-slate-600 mt-1">
                        {item.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} • Review Required
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}>
                      <StatusIcon className="w-4 h-4" />
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                    
                    {item.confidence !== null && (
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-slate-500" />
                        <span className="font-ui text-sm text-slate-600">Confidence:</span>
                        <span className={`admin-data-metric ${getConfidenceColor(item.confidence)}`}>
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {item.status === 'pending' && (
                  <div className="shrink-0">
                    <ReviewItemActions id={item.id} />
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-slate-50 rounded-lg">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 font-ui text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <Database className="w-3.5 h-3.5" />
                    Source System
                  </div>
                  <p className="font-ui text-slate-900">{item.source || 'Unknown'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-ui text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Created
                  </div>
                  <p className="font-ui text-slate-900">{formatDate(item.created_at)}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {item.reviewed_at && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 font-ui text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        Reviewed
                      </div>
                      <p className="font-ui text-slate-900">{formatDate(item.reviewed_at)}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-ui text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        <User className="w-3.5 h-3.5" />
                        Reviewed By
                      </div>
                      <p className="font-ui text-slate-900">{item.reviewed_by || 'System'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Editorial Notes */}
            {item.notes && (
              <div className="border-t border-slate-200 pt-8">
                <div className="flex items-center gap-2 font-ui text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  <FileText className="w-4 h-4" />
                  Editorial Notes
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-ui text-slate-800 leading-relaxed">{item.notes}</p>
                </div>
              </div>
            )}
          </article>

          {/* Data Payload */}
          <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
            <h2 className="font-display text-2xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
              <Database className="w-6 h-6 text-copper-600" />
              Raw Data Payload
            </h2>
            <div className="bg-slate-900 rounded-lg p-6 overflow-x-auto">
              <pre className="admin-data-metric text-sm text-slate-300 leading-relaxed">
                {JSON.stringify(item.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">Editorial Actions</h3>
            {item.status === 'pending' ? (
              <div className="space-y-4">
                <p className="font-ui text-sm text-slate-600 leading-relaxed">
                  Review the data payload and metadata. Approve to accept the change or reject with editorial notes.
                </p>
                <ReviewItemActions id={item.id} variant="vertical" />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-ui text-sm text-slate-600">
                  This item has been <span className={`font-medium ${statusStyles.text}`}>{item.status}</span> and is no longer pending review.
                </p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-ui text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</div>
                  <div className={`font-medium ${statusStyles.text}`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Item Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">Item Details</h3>
            <dl className="space-y-4 font-ui text-sm">
              <div>
                <dt className="text-slate-500 font-medium">ID</dt>
                <dd className="admin-data-metric text-xs text-slate-900 mt-1 break-all">{item.id}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Type</dt>
                <dd className="text-slate-900 mt-1 capitalize">{item.type.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Status</dt>
                <dd className={`mt-1 font-medium ${statusStyles.text}`}>{item.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Source</dt>
                <dd className="text-slate-900 mt-1">{item.source || 'Unknown'}</dd>
              </div>
              {item.confidence !== null && (
                <div>
                  <dt className="text-slate-500 font-medium">AI Confidence</dt>
                  <dd className={`admin-data-metric mt-1 ${getConfidenceColor(item.confidence)}`}>
                    {(item.confidence * 100).toFixed(1)}%
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}