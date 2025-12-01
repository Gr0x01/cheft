import { createClient } from '@/lib/supabase/server';
import { clsx } from 'clsx';
import type { Tables } from '@/lib/database.types';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Database, 
  Bot, 
  UserCheck, 
  Hand,
  Clock,
  FileQuestion,
  Timeline
} from 'lucide-react';

type DataChangeRow = Tables<'data_changes'>;

const changeTypeConfig: Record<string, { icon: typeof Plus; label: string; styles: { bg: string; text: string; border: string } }> = {
  insert: { 
    icon: Plus, 
    label: 'Created',
    styles: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' }
  },
  update: { 
    icon: Pencil, 
    label: 'Updated',
    styles: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' }
  },
  delete: { 
    icon: Trash2, 
    label: 'Deleted',
    styles: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
  },
};

const sourceConfig: Record<string, { icon: typeof Database; label: string; color: string }> = {
  auto_update: { icon: Database, label: 'Auto Update', color: 'text-blue-600' },
  llm_enrichment: { icon: Bot, label: 'LLM Enrichment', color: 'text-purple-600' },
  admin_review: { icon: UserCheck, label: 'Admin Review', color: 'text-emerald-600' },
  manual: { icon: Hand, label: 'Manual', color: 'text-orange-600' },
};

export default async function ActivityLogPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('data_changes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const changes = (data || []) as DataChangeRow[];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  const getDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return 'Unknown';
    const d = data as Record<string, unknown>;
    if (d.name) return String(d.name);
    if (d.chef_name) return String(d.chef_name);
    const keys = Object.keys(d);
    if (keys.length === 0) return 'Data';
    return keys.slice(0, 3).join(', ');
  };

  const groupedChanges = changes.reduce((acc, change) => {
    const date = new Date(change.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(change);
    return acc;
  }, {} as Record<string, DataChangeRow[]>);

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="border-l-4 border-copper-500 pl-6 bg-white p-6 rounded-r-lg shadow-sm">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">Activity Timeline</h1>
        <p className="font-ui text-slate-600 text-lg">Complete audit trail of all data pipeline operations</p>
      </div>

      {changes && changes.length > 0 ? (
        <div className="space-y-12">
          {Object.entries(groupedChanges).map(([dateStr, dayChanges]) => (
            <div key={dateStr}>
              {/* Date Header */}
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
                  <Timeline className="w-5 h-5 text-copper-600" />
                  <span className="font-display text-lg font-semibold text-slate-900">{formatGroupDate(dateStr)}</span>
                </div>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="font-ui text-sm text-slate-500">{dayChanges.length} changes</span>
              </div>

              {/* Timeline Items */}
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />
                
                <div className="space-y-8">
                  {dayChanges.map((change, index) => {
                    const typeConfig = changeTypeConfig[change.change_type] || { 
                      icon: FileQuestion, 
                      label: change.change_type,
                      styles: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' }
                    };
                    const srcConfig = sourceConfig[change.source] || { 
                      icon: Database, 
                      label: change.source.replace('_', ' '), 
                      color: 'text-slate-600' 
                    };
                    const TypeIcon = typeConfig.icon;
                    const SourceIcon = srcConfig.icon;
                    const dataSummary = getDataSummary(change.new_data || change.old_data);

                    return (
                      <div key={change.id} className="relative flex gap-6">
                        {/* Timeline Dot */}
                        <div className="relative flex-shrink-0">
                          <div className={clsx(
                            'w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center',
                            typeConfig.styles.bg
                          )}>
                            <TypeIcon className={clsx('w-6 h-6', typeConfig.styles.text)} />
                          </div>
                          {/* Connection Line to Next Item */}
                          {index < dayChanges.length - 1 && (
                            <div className="absolute top-16 left-1/2 transform -translate-x-px w-0.5 h-8 bg-slate-200" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-display text-xl font-semibold text-slate-900 mb-1">
                                {typeConfig.label} in <span className="text-copper-600 font-mono">{change.table_name}</span>
                              </h3>
                              <p className={clsx(
                                'font-medium text-lg mb-3',
                                dataSummary.toLowerCase().includes('chef') ? 'admin-chef-name' : 'font-ui text-slate-700'
                              )}>
                                {dataSummary}
                              </p>
                            </div>
                            <span className="font-ui text-sm text-slate-500 whitespace-nowrap">
                              {formatRelativeTime(change.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            {/* Source */}
                            <div className="flex items-center gap-2">
                              <SourceIcon className={clsx('w-4 h-4', srcConfig.color)} />
                              <span className={clsx('font-ui text-sm font-medium', srcConfig.color)}>
                                {srcConfig.label}
                              </span>
                            </div>
                            
                            {/* Confidence */}
                            {change.confidence !== null && (
                              <div className="flex items-center gap-3">
                                <span className="font-ui text-sm text-slate-500">Confidence:</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={clsx('h-full rounded-full',
                                        change.confidence >= 0.8 ? 'bg-emerald-500' :
                                        change.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                                      )}
                                      style={{ width: `${change.confidence * 100}%` }}
                                    />
                                  </div>
                                  <span className={clsx(
                                    'admin-data-metric text-sm',
                                    change.confidence >= 0.8 ? 'text-emerald-700' :
                                    change.confidence >= 0.5 ? 'text-amber-700' : 'text-red-700'
                                  )}>
                                    {(change.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span className="font-ui text-sm text-slate-500">
                                {formatDate(change.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-lg shadow-sm border border-slate-200 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-8 bg-slate-100 rounded-full">
              <Clock className="w-12 h-12 text-slate-400" />
            </div>
          </div>
          <h3 className="font-display text-2xl font-semibold text-slate-900 mb-3">No Activity Yet</h3>
          <p className="font-ui text-slate-600 max-w-md mx-auto">
            Data changes and pipeline operations will appear here as they occur. The editorial team can track all system activity through this timeline.
          </p>
        </div>
      )}
    </div>
  );
}