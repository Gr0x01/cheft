import { createClient } from '@/lib/supabase/server';
import { DiscoveriesClient } from './DiscoveriesClient';
import { CheckCircle } from 'lucide-react';
import type { DiscoveryType, DiscoveryStats, PendingDiscovery } from './types';

async function getDiscoveryStats(supabase: Awaited<ReturnType<typeof createClient>>): Promise<DiscoveryStats> {
  const stats: DiscoveryStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    needs_review: 0,
    byType: { show: 0, chef: 0, restaurant: 0 },
  };

  const [pendingRes, approvedRes, rejectedRes, needsReviewRes] = await Promise.all([
    supabase.from('pending_discoveries').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('pending_discoveries').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('pending_discoveries').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('pending_discoveries').select('*', { count: 'exact', head: true }).eq('status', 'needs_review'),
  ]);

  stats.pending = pendingRes.count ?? 0;
  stats.approved = approvedRes.count ?? 0;
  stats.rejected = rejectedRes.count ?? 0;
  stats.needs_review = needsReviewRes.count ?? 0;

  const types: DiscoveryType[] = ['show', 'chef', 'restaurant'];
  const typeCountPromises = types.map((type) =>
    supabase.from('pending_discoveries').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('discovery_type', type)
  );
  const typeCounts = await Promise.all(typeCountPromises);
  types.forEach((type, i) => {
    stats.byType[type] = typeCounts[i].count ?? 0;
  });

  return stats;
}

export async function DiscoveriesSection() {
  const supabase = await createClient();

  const [stats, { data: pendingItems, error }] = await Promise.all([
    getDiscoveryStats(supabase),
    supabase
      .from('pending_discoveries')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (error) {
    console.error('Error fetching discoveries:', error);
    return (
      <div className="bg-red-50 border border-red-200 p-4">
        <p className="text-red-900">Failed to load discoveries</p>
      </div>
    );
  }

  const total = stats.pending + stats.approved + stats.rejected + stats.needs_review;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between border-b-2 border-stone-200 pb-6">
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
          {stats.needs_review > 0 && (
            <div>
              <span className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.2em] block mb-1">Needs Review</span>
              <span className="font-mono text-3xl font-bold text-orange-500 tracking-tight">{stats.needs_review}</span>
            </div>
          )}
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
            {stats.byType.show > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="font-ui text-sm text-stone-600">Shows</span>
                <span className="font-mono text-sm font-bold text-stone-900">{stats.byType.show}</span>
              </div>
            )}
            {stats.byType.chef > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="font-ui text-sm text-stone-600">Chefs</span>
                <span className="font-mono text-sm font-bold text-stone-900">{stats.byType.chef}</span>
              </div>
            )}
            {stats.byType.restaurant > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="font-ui text-sm text-stone-600">Restaurants</span>
                <span className="font-mono text-sm font-bold text-stone-900">{stats.byType.restaurant}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingItems && pendingItems.length > 0 ? (
        <DiscoveriesClient items={pendingItems as PendingDiscovery[]} />
      ) : (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="font-display text-2xl font-bold text-stone-900 mb-2">Discovery Queue Clear</h3>
          <p className="font-ui text-stone-500 max-w-sm mx-auto">
            No pending discoveries awaiting review. Use the Show Trigger to harvest new data.
          </p>
        </div>
      )}
    </div>
  );
}
