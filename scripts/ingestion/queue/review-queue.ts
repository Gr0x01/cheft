import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, InsertTables, Json } from '../../../src/lib/database.types';
import { withRetry } from '../utils/retry';

export const MAX_BATCH_SIZE = 500;

export type ReviewItemType = 'new_chef' | 'new_restaurant' | 'update' | 'status_change';
export type ReviewItemStatus = 'pending' | 'approved' | 'rejected';

export type ReviewQueueRow = Tables<'review_queue'>;
export type ReviewQueueInsert = InsertTables<'review_queue'>;

export interface ReviewQueueEntry {
  type: ReviewItemType;
  data: Record<string, unknown>;
  source: string;
  confidence: number;
  notes?: string;
}

function validateEntry(entry: ReviewQueueEntry): void {
  if (!['new_chef', 'new_restaurant', 'update', 'status_change'].includes(entry.type)) {
    throw new Error('Invalid type');
  }
  if (!entry.data || typeof entry.data !== 'object') {
    throw new Error('data must be an object');
  }
  if (!entry.source || entry.source.trim() === '') {
    throw new Error('source is required');
  }
  if (entry.confidence < 0 || entry.confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }
}

export async function addToReviewQueue(
  supabase: SupabaseClient<Database>,
  entry: ReviewQueueEntry
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    validateEntry(entry);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Validation error: ${msg}` };
  }

  try {
    const { data, error } = await withRetry(() =>
      supabase
        .from('review_queue')
        .insert({
          type: entry.type,
          data: entry.data as Json,
          source: entry.source,
          confidence: entry.confidence,
          notes: entry.notes ?? null,
          status: 'pending'
        })
        .select('id')
        .single()
        .then(res => {
          if (res.error) throw new Error(res.error.message);
          return res;
        })
    );
    return { success: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[review-queue] Failed to add item:', msg);
    return { success: false, error: msg };
  }
}

export async function addBatchToReviewQueue(
  supabase: SupabaseClient<Database>,
  entries: ReviewQueueEntry[]
): Promise<{ success: boolean; inserted: number; error?: string }> {
  if (entries.length === 0) {
    return { success: true, inserted: 0 };
  }

  if (entries.length > MAX_BATCH_SIZE) {
    return {
      success: false,
      inserted: 0,
      error: `Batch size ${entries.length} exceeds maximum ${MAX_BATCH_SIZE}. Split into smaller batches.`
    };
  }

  for (const entry of entries) {
    try {
      validateEntry(entry);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, inserted: 0, error: `Validation error: ${msg}` };
    }
  }

  const inserts = entries.map(e => ({
    type: e.type,
    data: e.data as Json,
    source: e.source,
    confidence: e.confidence,
    notes: e.notes ?? null,
    status: 'pending' as const
  }));

  try {
    const { data, error } = await withRetry(() =>
      supabase
        .from('review_queue')
        .insert(inserts)
        .select('id')
        .then(res => {
          if (res.error) throw new Error(res.error.message);
          return res;
        })
    );
    return { success: true, inserted: data?.length || 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[review-queue] Failed to insert batch:', msg);
    return { success: false, inserted: 0, error: msg };
  }
}

export async function getPendingItems(
  supabase: SupabaseClient<Database>,
  options: {
    type?: ReviewItemType;
    limit?: number;
  } = {}
): Promise<ReviewQueueRow[]> {
  const limit = Math.min(options.limit ?? 100, MAX_BATCH_SIZE);

  let query = supabase
    .from('review_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (options.type) {
    query = query.eq('type', options.type);
  }

  try {
    const { data, error } = await withRetry(() =>
      query.then(res => {
        if (res.error) throw new Error(res.error.message);
        return res;
      })
    );
    return data || [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[review-queue] Failed to fetch pending items:', msg);
    return [];
  }
}

export async function approveItem(
  supabase: SupabaseClient<Database>,
  id: string,
  reviewedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!id || !reviewedBy) {
    return { success: false, error: 'id and reviewedBy are required' };
  }

  try {
    await withRetry(() =>
      supabase
        .from('review_queue')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy
        })
        .eq('id', id)
        .then(res => {
          if (res.error) throw new Error(res.error.message);
          return res;
        })
    );
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[review-queue] Failed to approve item:', msg);
    return { success: false, error: msg };
  }
}

export async function rejectItem(
  supabase: SupabaseClient<Database>,
  id: string,
  reviewedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!id || !reviewedBy) {
    return { success: false, error: 'id and reviewedBy are required' };
  }

  try {
    await withRetry(() =>
      supabase
        .from('review_queue')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          notes: notes ?? null
        })
        .eq('id', id)
        .then(res => {
          if (res.error) throw new Error(res.error.message);
          return res;
        })
    );
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[review-queue] Failed to reject item:', msg);
    return { success: false, error: msg };
  }
}

interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  byType: Record<ReviewItemType, number>;
}

export async function getQueueStats(
  supabase: SupabaseClient<Database>
): Promise<QueueStats> {
  const defaultStats: QueueStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    byType: { new_chef: 0, new_restaurant: 0, update: 0, status_change: 0 }
  };

  const { count: pendingCount, error: pendingError } = await supabase
    .from('review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: approvedCount, error: approvedError } = await supabase
    .from('review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { count: rejectedCount, error: rejectedError } = await supabase
    .from('review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');

  if (pendingError || approvedError || rejectedError) {
    console.error('[review-queue] Failed to get stats:', 
      pendingError?.message || approvedError?.message || rejectedError?.message);
    return defaultStats;
  }

  const stats: QueueStats = {
    pending: pendingCount ?? 0,
    approved: approvedCount ?? 0,
    rejected: rejectedCount ?? 0,
    byType: { new_chef: 0, new_restaurant: 0, update: 0, status_change: 0 }
  };

  if (stats.pending > 0) {
    const types: ReviewItemType[] = ['new_chef', 'new_restaurant', 'update', 'status_change'];
    
    await Promise.all(types.map(async (type) => {
      const { count, error } = await supabase
        .from('review_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('type', type);
      
      if (!error && count !== null) {
        stats.byType[type] = count;
      }
    }));
  }

  return stats;
}
