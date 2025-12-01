import { createClient } from '@/lib/supabase/server';
import { clsx } from 'clsx';
import type { Tables } from '@/lib/database.types';

type DataChangeRow = Tables<'data_changes'>;

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

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'insert':
        return 'bg-green-900/50 text-green-300';
      case 'update':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'delete':
        return 'bg-red-900/50 text-red-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'auto_update':
        return 'text-blue-400';
      case 'llm_enrichment':
        return 'text-purple-400';
      case 'admin_review':
        return 'text-green-400';
      case 'manual':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return '-';
    const d = data as Record<string, unknown>;
    if (d.name) return String(d.name);
    if (d.chef_name) return String(d.chef_name);
    const keys = Object.keys(d);
    if (keys.length === 0) return '-';
    return keys.slice(0, 3).join(', ');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Activity Log</h1>
        <p className="text-gray-400">All data changes (automatic and manual)</p>
      </div>

      {changes && changes.length > 0 ? (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Table</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Change</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {changes.map((change) => (
                <tr key={change.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDate(change.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-mono">
                    {change.table_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-1 text-xs rounded', getChangeTypeColor(change.change_type))}>
                      {change.change_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-sm', getSourceColor(change.source))}>
                      {change.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                    {change.confidence !== null ? `${(change.confidence * 100).toFixed(0)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                    {getDataSummary(change.new_data || change.old_data)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No activity recorded yet</p>
        </div>
      )}
    </div>
  );
}
