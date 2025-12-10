import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';

export class ChefRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async updateBio(
    chefId: string,
    bio: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await (this.supabase
      .from('chefs') as ReturnType<typeof this.supabase.from>)
      .update({
        mini_bio: bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async updateAwards(
    chefId: string,
    jamesBeardStatus: string | null,
    notableAwards: string[] | null
  ): Promise<{ success: boolean; error?: string }> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (jamesBeardStatus) {
      updateData.james_beard_status = jamesBeardStatus;
    }

    if (notableAwards && notableAwards.length > 0) {
      updateData.notable_awards = notableAwards;
    }

    const { error } = await (this.supabase
      .from('chefs') as ReturnType<typeof this.supabase.from>)
      .update(updateData)
      .eq('id', chefId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async updateNarrative(
    chefId: string,
    narrative: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await (this.supabase
      .from('chefs') as ReturnType<typeof this.supabase.from>)
      .update({
        career_narrative: narrative,
        narrative_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async setEnrichmentTimestamp(
    chefId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await (this.supabase
      .from('chefs') as ReturnType<typeof this.supabase.from>)
      .update({
        last_enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async updateBioAndAwards(
    chefId: string,
    bio: string | null,
    jamesBeardStatus: string | null,
    notableAwards: string[] | null
  ): Promise<{ success: boolean; error?: string }> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_enriched_at: new Date().toISOString(),
    };

    if (bio) {
      updateData.mini_bio = bio;
    }

    if (jamesBeardStatus) {
      updateData.james_beard_status = jamesBeardStatus;
    }

    if (notableAwards && notableAwards.length > 0) {
      updateData.notable_awards = notableAwards;
    }

    const { error } = await (this.supabase
      .from('chefs') as ReturnType<typeof this.supabase.from>)
      .update(updateData)
      .eq('id', chefId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
