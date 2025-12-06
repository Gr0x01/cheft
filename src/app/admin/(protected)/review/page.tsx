import { createClient } from '@/lib/supabase/server';
import { ReviewTable } from './ReviewTable';
import { ReviewTabs } from './ReviewTabs';
import { DuplicatesSection } from './components/DuplicatesSection';
import { FeedbackSection } from './components/FeedbackSection';
import { Clock, UserPlus, Store, RefreshCw, ToggleRight, Inbox } from 'lucide-react';

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
  
  const [stats, { data: pendingItems }, { count: duplicateCount }, { count: feedbackCount }] = await Promise.all([
    getQueueStats(supabase),
    supabase
      .from('review_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50),
    supabase
      .from('duplicate_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  const total = stats.pending + stats.approved + stats.rejected;

  const queueContent = (
    <>
      <div className="flex items-end justify-between border-b-2 border-stone-200 pb-6 mb-8">
        <div className="flex items-end gap-12">
          <div>
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.2em] block mb-1">Pending</span>
            <span className={`font-mono text-5xl font-black tracking-tight ${stats.pending > 0 ? 'text-amber-600' : 'text-stone-300'}`}>
              {stats.pending}
            </span>
          </div>
          <div className="h-12 w-px bg-stone-200" />
          <div>
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.2em] block mb-1">Approved</span>
            <span className="font-mono text-3xl font-bold text-emerald-600 tracking-tight">{stats.approved}</span>
          </div>
          <div>
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.2em] block mb-1">Rejected</span>
            <span className="font-mono text-3xl font-bold text-stone-400 tracking-tight">{stats.rejected}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.2em] block mb-1">Total Processed</span>
          <span className="font-mono text-2xl font-bold text-stone-900 tracking-tight">{total}</span>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="mb-8">
          <h3 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.2em] mb-4">By Type</h3>
          <div className="flex gap-6">
            {Object.entries(stats.byType).map(([type, count]) => {
              if (count === 0) return null;
              const Icon = typeIcons[type] || Clock;
              return (
                <div key={type} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-stone-400" />
                  <span className="font-ui text-sm text-stone-600">{typeLabels[type]}</span>
                  <span className="font-mono text-sm font-bold text-stone-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingItems && pendingItems.length > 0 ? (
        <ReviewTable items={pendingItems} />
      ) : (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 mb-6">
            <Inbox className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="font-display text-2xl font-bold text-stone-900 mb-2">Editorial Desk Clear</h3>
          <p className="font-ui text-stone-500 max-w-sm mx-auto">
            No pending items requiring editorial review.
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="pt-4">
        <h1 className="font-display text-4xl font-bold text-stone-900 tracking-tight">Editorial Review</h1>
        <p className="font-mono text-xs text-stone-400 uppercase tracking-[0.2em] mt-1">Approve submissions and manage data quality</p>
      </header>

      <ReviewTabs
        queueContent={queueContent}
        duplicatesContent={<DuplicatesSection />}
        feedbackContent={<FeedbackSection />}
        duplicateCount={duplicateCount || 0}
        feedbackCount={feedbackCount || 0}
      />
    </div>
  );
}

