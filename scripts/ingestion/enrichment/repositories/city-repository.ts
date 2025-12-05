import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';

export class CityRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async updateNarrative(
    cityId: string,
    narrative: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await (this.supabase
      .from('cities') as ReturnType<typeof this.supabase.from>)
      .update({
        city_narrative: narrative,
        narrative_generated_at: new Date().toISOString(),
      })
      .eq('id', cityId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
