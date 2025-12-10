import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { withRetry } from '../utils/retry';

export interface ExcludedName {
  id: string;
  name: string;
  show_id: string | null;
  reason: string | null;
  source: string | null;
  created_at: string;
}

export interface AddExcludedNameParams {
  name: string;
  showId?: string | null;
  reason: string;
  source: string;
}

export async function isNameExcluded(
  supabase: SupabaseClient<Database>,
  name: string
): Promise<boolean> {
  try {
    const result = await withRetry(async () => {
      const res = await supabase
        .from('excluded_names')
        .select('id')
        .eq('name', name)
        .limit(1);
      if (res.error) throw new Error(res.error.message);
      return res;
    });
    
    return (result.data?.length || 0) > 0;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error checking excluded name "${name}": ${msg}`);
    return false;
  }
}

export async function addExcludedName(
  supabase: SupabaseClient<Database>,
  params: AddExcludedNameParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await withRetry(async () => {
      const res = await (supabase
        .from('excluded_names') as ReturnType<typeof supabase.from>)
        .insert({
          name: params.name,
          show_id: params.showId || null,
          reason: params.reason,
          source: params.source,
        })
        .select('id')
        .single();
      
      if (res.error) {
        if (res.error.code === '23505') {
          return { data: null, error: null };
        }
        throw new Error(res.error.message);
      }
      return res;
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function getExcludedNames(
  supabase: SupabaseClient<Database>,
  options: { showId?: string; limit?: number } = {}
): Promise<ExcludedName[]> {
  try {
    let query = supabase
      .from('excluded_names')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.showId) {
      query = query.eq('show_id', options.showId);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const result = await withRetry(async () => {
      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return res;
    });

    return (result.data || []) as ExcludedName[];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error fetching excluded names: ${msg}`);
    return [];
  }
}

type ExcludedNameRow = Database['public']['Tables']['excluded_names']['Row'];

export async function getExcludedNamesSet(
  supabase: SupabaseClient<Database>
): Promise<Set<string>> {
  try {
    const result = await withRetry(async () => {
      const res = await supabase
        .from('excluded_names')
        .select('name');
      if (res.error) throw new Error(res.error.message);
      return res;
    });

    const data = result.data as Pick<ExcludedNameRow, 'name'>[] | null;
    const names = (data || []).map(row => row.name);
    return new Set(names);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error fetching excluded names set: ${msg}`);
    return new Set();
  }
}

export async function removeExcludedName(
  supabase: SupabaseClient<Database>,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await withRetry(async () => {
      const res = await supabase
        .from('excluded_names')
        .delete()
        .eq('name', name);
      if (res.error) throw new Error(res.error.message);
      return res;
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function getExcludedNamesStats(
  supabase: SupabaseClient<Database>
): Promise<{ total: number; byReason: Record<string, number> }> {
  try {
    const result = await withRetry(async () => {
      const res = await supabase
        .from('excluded_names')
        .select('reason');
      if (res.error) throw new Error(res.error.message);
      return res;
    });

    const data = result.data as Pick<ExcludedNameRow, 'reason'>[] | null;
    const rows = data || [];
    const byReason: Record<string, number> = {};
    
    for (const row of rows) {
      const reason = row.reason || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    }

    return {
      total: rows.length,
      byReason
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error fetching excluded names stats: ${msg}`);
    return { total: 0, byReason: {} };
  }
}
