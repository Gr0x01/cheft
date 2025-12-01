import { createClient } from '@/lib/supabase/server';
import { ReviewTable } from './ReviewTable';

interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  byType: Record<string, number>;
}

async function getQueueStats(supabase: Awaited<ReturnType<typeof createClient>>): Promise<QueueStats> {
  const stats: QueueStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    byType: { new_chef: 0, new_restaurant: 0, update: 0, status_change: 0 },
  };

  const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
    supabase.from('review_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('review_queue').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('review_queue').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  stats.pending = pendingRes.count ?? 0;
  stats.approved = approvedRes.count ?? 0;
  stats.rejected = rejectedRes.count ?? 0;

  const types = ['new_chef', 'new_restaurant', 'update', 'status_change'];
  const typeCountPromises = types.map((type) =>
    supabase.from('review_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('type', type)
  );
  const typeCounts = await Promise.all(typeCountPromises);
  types.forEach((type, i) => {
    stats.byType[type] = typeCounts[i].count ?? 0;
  });

  return stats;
}

export default async function ReviewQueuePage() {
  const supabase = await createClient();
  
  const [stats, { data: pendingItems }] = await Promise.all([
    getQueueStats(supabase),
    supabase
      .from('review_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Review Queue</h1>
        <p className="text-gray-400">Approve or reject pending data changes</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending" value={stats.pending} color="yellow" />
        <StatCard label="Approved" value={stats.approved} color="green" />
        <StatCard label="Rejected" value={stats.rejected} color="red" />
        <StatCard label="Total" value={stats.pending + stats.approved + stats.rejected} color="blue" />
      </div>

      {stats.pending > 0 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {Object.entries(stats.byType).map(([type, count]) => (
            count > 0 && (
              <span key={type} className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                {type.replace('_', ' ')}: {count}
              </span>
            )
          ))}
        </div>
      )}

      {pendingItems && pendingItems.length > 0 ? (
        <ReviewTable items={pendingItems} />
      ) : (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No pending items to review</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
