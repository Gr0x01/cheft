import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';

const TVShowAppearanceSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  result: z.enum(['winner', 'finalist', 'contestant', 'judge']).nullable().optional(),
});

export type TVShowAppearance = z.infer<typeof TVShowAppearanceSchema>;

export class ShowRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private readonly showNameMap: Record<string, string> = {
    'top chef': 'top-chef',
    'top chef masters': 'top-chef-masters',
    'top chef: just desserts': 'top-chef-just-desserts',
    'top chef just desserts': 'top-chef-just-desserts',
    'top chef junior': 'top-chef-junior',
    'top chef duels': 'top-chef-duels',
    'top chef amateurs': 'top-chef-amateurs',
    'top chef family style': 'top-chef-family-style',
    'top chef estrellas': 'top-chef-estrellas',
    'top chef vip': 'top-chef-vip',
    'top chef canada': 'top-chef-canada',
    'iron chef': 'iron-chef',
    'iron chef america': 'iron-chef-america',
    'tournament of champions': 'tournament-of-champions',
    'guy\'s tournament of champions': 'tournament-of-champions',
    'chopped': 'chopped',
    'chopped champions': 'chopped-champions',
    'chopped sweets': 'chopped-sweets',
    'beat bobby flay': 'beat-bobby-flay',
    'hell\'s kitchen': 'hells-kitchen',
    'hells kitchen': 'hells-kitchen',
    'masterchef': 'masterchef',
    'masterchef us': 'masterchef',
    'next level chef': 'next-level-chef',
    'guy\'s grocery games': 'guys-grocery-games',
    'guys grocery games': 'guys-grocery-games',
    'cutthroat kitchen': 'cutthroat-kitchen',
    'worst cooks in america': 'worst-cooks-in-america',
  };

  async findShowByName(showName: string): Promise<string | null> {
    const normalized = showName.toLowerCase().trim();
    
    const slug = this.showNameMap[normalized];
    if (!slug) {
      console.log(`      ⚠️  Unknown show "${showName}", attempting database lookup`);
      const sanitized = showName.replace(/[^\w\s\-\'&:.]/g, '').trim();

      const { data: show } = await (this.supabase
        .from('shows') as ReturnType<typeof this.supabase.from>)
        .select('id')
        .ilike('name', sanitized)
        .maybeSingle();
      
      return show?.id || null;
    }

    const { data: show } = await (this.supabase
      .from('shows') as ReturnType<typeof this.supabase.from>)
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    return show?.id || null;
  }

  async saveChefShows(
    chefId: string,
    tvShows: TVShowAppearance[]
  ): Promise<{ saved: number; skipped: number }> {
    if (!tvShows || tvShows.length === 0) {
      return { saved: 0, skipped: 0 };
    }

    let saved = 0;
    let skipped = 0;

    for (const show of tvShows) {
      const showId = await this.findShowByName(show.showName);
      if (!showId) {
        console.log(`      ⚠️  Could not find show "${show.showName}" in database, skipping`);
        skipped++;
        continue;
      }

      const { data: existing } = await (this.supabase
        .from('chef_shows') as ReturnType<typeof this.supabase.from>)
        .select('id')
        .eq('chef_id', chefId)
        .eq('show_id', showId)
        .eq('season', show.season || null)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await (this.supabase
        .from('chef_shows') as ReturnType<typeof this.supabase.from>)
        .insert({
          chef_id: chefId,
          show_id: showId,
          season: show.season || null,
          season_name: show.season ? `${show.showName} ${show.season}` : show.showName,
          result: show.result || 'contestant',
          is_primary: false,
        });

      if (error) {
        console.error(`      ⚠️  Failed to save show "${show.showName}": ${error.message}`);
        skipped++;
      } else {
        saved++;
        console.log(`      ✅ Added show: ${show.showName}${show.season ? ' ' + show.season : ''}`);
      }
    }

    return { saved, skipped };
  }

  async checkExistingShow(
    chefId: string,
    showId: string,
    season: string | null
  ): Promise<boolean> {
    const { data } = await (this.supabase
      .from('chef_shows') as ReturnType<typeof this.supabase.from>)
      .select('id')
      .eq('chef_id', chefId)
      .eq('show_id', showId)
      .eq('season', season || null)
      .maybeSingle();

    return !!data;
  }
}
