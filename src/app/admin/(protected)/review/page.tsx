import { createClient } from '@/lib/supabase/server';
import { ReviewTable } from './ReviewTable';
import { Clock, CheckCircle2, XCircle, BarChart3, UserPlus, Store, RefreshCw, ToggleRight, Inbox } from 'lucide-react';

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

const typeIcons: Record<string, typeof UserPlus> = {
  new_chef: UserPlus,
  new_restaurant: Store,
  update: RefreshCw,
  status_change: ToggleRight,
};

const typeLabels: Record<string, string> = {
  new_chef: 'New Chefs',
  new_restaurant: 'New Restaurants',
  update: 'Updates',
  status_change: 'Status Changes',
};

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

  const total = stats.pending + stats.approved + stats.rejected;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">Review Queue</h1>
        <p className="font-ui text-slate-500">Editorial oversight for the culinary data pipeline</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Pending Review" 
          value={stats.pending} 
          icon={Clock}
          type="pending"
          accent={stats.pending > 0}
        />
        <StatCard 
          label="Approved" 
          value={stats.approved} 
          icon={CheckCircle2}
          type="approved"
        />
        <StatCard 
          label="Rejected" 
          value={stats.rejected} 
          icon={XCircle}
          type="rejected"
        />
        <StatCard 
          label="Total Processed" 
          value={total} 
          icon={BarChart3}
          type="total"
        />
      </div>

      {stats.pending > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-6">
          <h3 className="font-ui text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Pending by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.byType).map(([type, count]) => {
              if (count === 0) return null;
              const Icon = typeIcons[type] || Clock;
              return (
                <div 
                  key={type} 
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <Icon className="w-5 h-5 text-slate-600" />
                  <div>
                    <div className="font-ui text-sm text-slate-600">{typeLabels[type] || type}</div>
                    <div className="font-mono text-xl font-bold text-slate-900">{count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingItems && pendingItems.length > 0 ? (
        <ReviewTable items={pendingItems} />
      ) : (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-emerald-50 rounded-full">
              <Inbox className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">Editorial Desk Clear</h3>
          <p className="font-ui text-slate-500 max-w-md mx-auto">
            No pending items requiring editorial review. The data pipeline is running smoothly.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon,
  type,
  accent = false,
}: { 
  label: string; 
  value: number; 
  icon: typeof Clock;
  type: string;
  accent?: boolean;
}) {
  const getStyles = (type: string) => {
    switch (type) {
      case 'pending':
        return { bg: 'bg-amber-50', icon: 'text-amber-600', border: accent ? 'border-amber-200' : 'border-slate-200/80' };
      case 'approved':
        return { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-slate-200/80' };
      case 'rejected':
        return { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-slate-200/80' };
      default:
        return { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200/80' };
    }
  };

  const styles = getStyles(type);

  return (
    <div className={`bg-white rounded-2xl shadow-lg shadow-slate-200/50 border ${styles.border} p-6 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-ui text-sm text-slate-500 mb-1">{label}</p>
          <p className="font-mono text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 ${styles.bg} rounded-xl`}>
          <Icon className={`w-5 h-5 ${styles.icon}`} />
        </div>
      </div>
    </div>
  );
}