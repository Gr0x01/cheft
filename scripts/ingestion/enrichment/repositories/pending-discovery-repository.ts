import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { normalizeShowName, resolveShowAlias } from '../shared/season-parser';

export type DiscoveryType = 'show' | 'chef' | 'restaurant';
export type DiscoveryStatus = 'pending' | 'approved' | 'rejected' | 'needs_review' | 'merged';

export interface PendingDiscovery {
  id: string;
  discovery_type: DiscoveryType;
  source_chef_id: string | null;
  source_chef_name: string | null;
  data: Record<string, unknown>;
  status: DiscoveryStatus;
  notes: string | null;
  error_message: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface DiscoveryInput {
  discovery_type: DiscoveryType;
  source_chef_id?: string;
  source_chef_name?: string;
  data: Record<string, unknown>;
  status?: DiscoveryStatus;
  notes?: string;
}

export class PendingDiscoveryRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async insert(input: DiscoveryInput): Promise<{ success: boolean; id?: string; error?: string; isDuplicate?: boolean }> {
    const duplicate = await this.checkDuplicate(input.discovery_type, input.data);
    if (duplicate) {
      return { success: false, isDuplicate: true, error: `Duplicate of existing ${input.discovery_type}: ${duplicate.id}` };
    }

    const { data, error } = await this.supabase
      .from('pending_discoveries')
      .insert({
        discovery_type: input.discovery_type,
        source_chef_id: input.source_chef_id || null,
        source_chef_name: input.source_chef_name || null,
        data: input.data,
        status: input.status || 'pending',
        notes: input.notes || null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  }

  async insertBatch(inputs: DiscoveryInput[]): Promise<{ inserted: number; duplicates: number; errors: string[] }> {
    let inserted = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const input of inputs) {
      const result = await this.insert(input);
      if (result.success) {
        inserted++;
      } else if (result.isDuplicate) {
        duplicates++;
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }

    return { inserted, duplicates, errors };
  }

  async findByStatus(status: DiscoveryStatus): Promise<PendingDiscovery[]> {
    const { data, error } = await this.supabase
      .from('pending_discoveries')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as PendingDiscovery[];
  }

  async findByType(type: DiscoveryType): Promise<PendingDiscovery[]> {
    const { data, error } = await this.supabase
      .from('pending_discoveries')
      .select('*')
      .eq('discovery_type', type)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as PendingDiscovery[];
  }

  async findPending(): Promise<PendingDiscovery[]> {
    return this.findByStatus('pending');
  }

  async findById(id: string): Promise<PendingDiscovery | null> {
    const { data, error } = await this.supabase
      .from('pending_discoveries')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as PendingDiscovery;
  }

  async updateStatus(
    id: string,
    status: DiscoveryStatus,
    reviewedBy?: string,
    errorMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    const updateData: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewedBy) updateData.reviewed_by = reviewedBy;
    if (errorMessage) updateData.error_message = errorMessage;

    const { error } = await this.supabase
      .from('pending_discoveries')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async approve(id: string, reviewedBy?: string): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(id, 'approved', reviewedBy);
  }

  async reject(id: string, reviewedBy?: string): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(id, 'rejected', reviewedBy);
  }

  async markNeedsReview(id: string, errorMessage?: string): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(id, 'needs_review', undefined, errorMessage);
  }

  async getStats(): Promise<Record<DiscoveryStatus, number>> {
    const { data, error } = await this.supabase
      .from('pending_discoveries')
      .select('status');

    if (error || !data) {
      return { pending: 0, approved: 0, rejected: 0, needs_review: 0, merged: 0 };
    }

    const counts: Record<DiscoveryStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      needs_review: 0,
      merged: 0,
    };

    for (const row of data) {
      const status = row.status as DiscoveryStatus;
      counts[status] = (counts[status] || 0) + 1;
    }

    return counts;
  }

  async checkDuplicate(type: DiscoveryType, data: Record<string, unknown>): Promise<PendingDiscovery | null> {
    if (type === 'show') {
      return this.checkShowDuplicate(data);
    } else if (type === 'chef') {
      return this.checkChefDuplicate(data);
    } else if (type === 'restaurant') {
      return this.checkRestaurantDuplicate(data);
    }
    return null;
  }

  private async checkShowDuplicate(data: Record<string, unknown>): Promise<PendingDiscovery | null> {
    const name = data.name as string | undefined;
    if (!name) return null;

    const normalized = resolveShowAlias(name);

    const { data: existing } = await this.supabase
      .from('shows')
      .select('id, name')
      .limit(100);

    if (existing) {
      for (const show of existing) {
        if (resolveShowAlias(show.name) === normalized) {
          return { id: show.id, discovery_type: 'show', data: { existing: true } } as PendingDiscovery;
        }
      }
    }

    const { data: pending } = await this.supabase
      .from('pending_discoveries')
      .select('*')
      .eq('discovery_type', 'show')
      .in('status', ['pending', 'approved']);

    if (pending) {
      for (const disc of pending) {
        const discData = disc.data as Record<string, unknown>;
        const discName = discData.name as string | undefined;
        if (discName && resolveShowAlias(discName) === normalized) {
          return disc as PendingDiscovery;
        }
      }
    }

    return null;
  }

  private async checkChefDuplicate(data: Record<string, unknown>): Promise<PendingDiscovery | null> {
    const name = data.name as string | undefined;
    if (!name) return null;

    const normalized = normalizeShowName(name);

    const { data: existing } = await this.supabase
      .from('chefs')
      .select('id, name')
      .limit(500);

    if (existing) {
      for (const chef of existing) {
        if (normalizeShowName(chef.name) === normalized) {
          return { id: chef.id, discovery_type: 'chef', data: { existing: true } } as PendingDiscovery;
        }
      }
    }

    return null;
  }

  private async checkRestaurantDuplicate(data: Record<string, unknown>): Promise<PendingDiscovery | null> {
    const name = data.name as string | undefined;
    const city = data.city as string | undefined;
    if (!name || !city) return null;

    const normalizedKey = `${normalizeShowName(name)}|${city.toLowerCase().trim()}`;

    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('id, name, city')
      .eq('city', city)
      .limit(100);

    if (existing) {
      for (const r of existing) {
        const key = `${normalizeShowName(r.name)}|${r.city.toLowerCase().trim()}`;
        if (key === normalizedKey) {
          return { id: r.id, discovery_type: 'restaurant', data: { existing: true } } as PendingDiscovery;
        }
      }
    }

    return null;
  }

  async deleteOldRejected(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const { data } = await this.supabase
      .from('pending_discoveries')
      .delete()
      .eq('status', 'rejected')
      .lt('reviewed_at', cutoff.toISOString())
      .select('id');

    return data?.length || 0;
  }
}
