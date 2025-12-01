import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, InsertTables, Json } from '../../../src/lib/database.types';
import { withRetry } from '../utils/retry';

export const MAX_BATCH_SIZE = 500;

export type DataChangeRow = Tables<'data_changes'>;
export type DataChangeInsert = InsertTables<'data_changes'>;

export interface AuditLogEntry {
  table_name: string;
  record_id?: string;
  change_type: 'insert' | 'update' | 'delete';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  source: string;
  confidence?: number;
}

function validateEntry(entry: AuditLogEntry): void {
  if (!entry.table_name || entry.table_name.trim() === '') {
    throw new Error('table_name is required');
  }
  if (!['insert', 'update', 'delete'].includes(entry.change_type)) {
    throw new Error('change_type must be insert, update, or delete');
  }
  if (!entry.source || entry.source.trim() === '') {
    throw new Error('source is required');
  }
  if (entry.confidence !== undefined && (entry.confidence < 0 || entry.confidence > 1)) {
    throw new Error('confidence must be between 0 and 1');
  }
}

export async function logDataChange(
  supabase: SupabaseClient<Database>,
  entry: AuditLogEntry
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    validateEntry(entry);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Validation error: ${msg}` };
  }

  try {
    const insertData: DataChangeInsert = {
      table_name: entry.table_name,
      record_id: entry.record_id ?? null,
      change_type: entry.change_type,
      old_data: (entry.old_data ?? null) as Json,
      new_data: (entry.new_data ?? null) as Json,
      source: entry.source,
      confidence: entry.confidence ?? null
    };
    const result = await withRetry(async () => {
      const res = await supabase
        .from('data_changes')
        .insert(insertData as any)
        .select('id')
        .single();
      if (res.error) throw new Error(res.error.message);
      return res;
    });
    return { success: true, id: (result.data as any)?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[audit-log] Failed to log change:', msg, { entry });
    return { success: false, error: msg };
  }
}

export async function logBatchChanges(
  supabase: SupabaseClient<Database>,
  entries: AuditLogEntry[]
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

  const inserts: DataChangeInsert[] = entries.map(e => ({
    table_name: e.table_name,
    record_id: e.record_id ?? null,
    change_type: e.change_type,
    old_data: (e.old_data ?? null) as Json,
    new_data: (e.new_data ?? null) as Json,
    source: e.source,
    confidence: e.confidence ?? null
  }));

  try {
    const result = await withRetry(async () => {
      const res = await supabase
        .from('data_changes')
        .insert(inserts as any)
        .select('id');
      if (res.error) throw new Error(res.error.message);
      return res;
    });
    return { success: true, inserted: (result.data as any[])?.length || 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[audit-log] Failed to insert batch:', msg);
    return { success: false, inserted: 0, error: msg };
  }
}

export async function getRecentChanges(
  supabase: SupabaseClient<Database>,
  options: {
    table_name?: string;
    source?: string;
    limit?: number;
    since?: Date;
  } = {}
): Promise<DataChangeRow[]> {
  const limit = Math.min(options.limit ?? 100, MAX_BATCH_SIZE);

  let query = supabase
    .from('data_changes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.table_name) {
    query = query.eq('table_name', options.table_name);
  }
  if (options.source) {
    query = query.eq('source', options.source);
  }
  if (options.since) {
    query = query.gte('created_at', options.since.toISOString());
  }

  try {
    const result = await withRetry(async () => {
      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return res;
    });
    return (result.data || []) as DataChangeRow[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[audit-log] Failed to fetch recent changes:', msg);
    return [];
  }
}
