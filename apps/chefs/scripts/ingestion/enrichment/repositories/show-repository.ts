import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

const TVShowAppearanceSchema = z.object({
  showName: z.string(),
  season: z.string().nullable().optional(),
  result: z.enum(['winner', 'finalist', 'contestant', 'judge']).nullable().optional(),
  performanceBlurb: z.string().nullable().optional(),
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
    'top chef: all-stars l.a.': 'top-chef',
    'top chef all-stars l.a.': 'top-chef',
    'iron chef': 'iron-chef',
    'iron chef america': 'iron-chef-america',
    'tournament of champions': 'tournament-of-champions',
    'guy\'s tournament of champions': 'tournament-of-champions',
    'guy fieri\'s tournament of champions': 'tournament-of-champions',
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
    'the great food truck race': 'the-great-food-truck-race',
    'great food truck race': 'the-great-food-truck-race',
    'outchef\'d': 'outchef-d',
    'outchefed': 'outchef-d',
  };

  async findShowByName(showName: string): Promise<string | null> {
    const normalized = showName.toLowerCase().trim();
    
    const slug = this.showNameMap[normalized];
    if (!slug) {
      console.log(`      ⚠️  Unknown show "${showName}", attempting database lookup`);
      const sanitized = showName.replace(/[^\w\s\-\'&:.]/g, '').trim();

      const { data: show } = await this.supabase
        .from('shows')
        .select('id')
        .ilike('name', sanitized)
        .maybeSingle();
      
      return show?.id || null;
    }

    const { data: show } = await this.supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    return show?.id || null;
  }

  async saveChefShows(
    chefId: string,
    tvShows: TVShowAppearance[]
  ): Promise<{ saved: number; skipped: number; newCombinations: Array<{ showId: string; season: string | null }> }> {
    if (!tvShows || tvShows.length === 0) {
      return { saved: 0, skipped: 0, newCombinations: [] };
    }

    let saved = 0;
    let skipped = 0;
    const newCombinations: Array<{ showId: string; season: string | null }> = [];

    for (const show of tvShows) {
      let showId = await this.findShowByName(show.showName);
      if (!showId) {
        showId = await this.createShow(show.showName);
        if (!showId) {
          console.log(`      ⚠️  Could not create show "${show.showName}" in database, skipping`);
          skipped++;
          continue;
        }
      }

      const seasonValue = show.season ?? null;
      
      let isFirstTimeCombo = false;
      
      if (seasonValue === null) {
        const { data: showData } = await this.supabase
          .from('shows')
          .select('description')
          .eq('id', showId)
          .maybeSingle();
        
        isFirstTimeCombo = !showData?.description;
      } else {
        const { data: showData } = await this.supabase
          .from('shows')
          .select('season_descriptions')
          .eq('id', showId)
          .maybeSingle();
        
        const seasonDescriptions = (showData?.season_descriptions as Record<string, string>) || {};
        isFirstTimeCombo = !seasonDescriptions[seasonValue];
      }
      
      let query = this.supabase
        .from('chef_shows')
        .select('id')
        .eq('chef_id', chefId)
        .eq('show_id', showId);
      
      if (seasonValue === null) {
        query = query.is('season', null);
      } else {
        query = query.eq('season', seasonValue);
      }
      
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        if (show.performanceBlurb) {
          const { error: updateError } = await this.supabase
            .from('chef_shows')
            .update({ performance_blurb: show.performanceBlurb })
            .eq('id', existing.id);

          if (!updateError) {
            console.log(`      ✅ Updated performance blurb for: ${show.showName}${show.season ? ' ' + show.season : ''}`);
            saved++;
          }
        }
        skipped++;
        continue;
      }

      const { error } = await this.supabase
        .from('chef_shows')
        .insert({
          chef_id: chefId,
          show_id: showId,
          season: show.season || null,
          season_name: show.season ? `${show.showName} ${show.season}` : show.showName,
          result: show.result || 'contestant',
          is_primary: false,
          performance_blurb: show.performanceBlurb || null,
        });

      if (error) {
        console.error(`      ⚠️  Failed to save show "${show.showName}": ${error.message}`);
        skipped++;
      } else {
        saved++;
        console.log(`      ✅ Added show: ${show.showName}${show.season ? ' ' + show.season : ''}`);
        
        if (isFirstTimeCombo) {
          newCombinations.push({ showId, season: seasonValue });
        }
      }
    }

    return { saved, skipped, newCombinations };
  }

  async checkExistingShow(
    chefId: string,
    showId: string,
    season: string | null
  ): Promise<boolean> {
    const seasonValue = season ?? null;
    let query = this.supabase
      .from('chef_shows')
      .select('id')
      .eq('chef_id', chefId)
      .eq('show_id', showId);
    
    if (seasonValue === null) {
      query = query.is('season', null);
    } else {
      query = query.eq('season', seasonValue);
    }
    
    const { data } = await query.maybeSingle();

    return !!data;
  }

  async getShowDescription(showId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('shows')
      .select('description')
      .eq('id', showId)
      .maybeSingle();

    return data?.description || null;
  }

  async saveShowDescription(showId: string, description: string): Promise<void> {
    const { data: existingShow, error: showError } = await this.supabase
      .from('shows')
      .select('id')
      .eq('id', showId)
      .maybeSingle();

    if (showError || !existingShow) {
      throw new Error(`Show with ID ${showId} not found`);
    }

    const { error } = await this.supabase
      .from('shows')
      .update({
        description,
        seo_generated_at: new Date().toISOString(),
      })
      .eq('id', showId);

    if (error) {
      throw new Error(`Failed to save show description: ${error.message}`);
    }
  }

  async getSeasonDescription(showId: string, season: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('shows')
      .select('season_descriptions')
      .eq('id', showId)
      .maybeSingle();

    if (!data?.season_descriptions) {
      return null;
    }

    const descriptions = data.season_descriptions as Record<string, string>;
    return descriptions[season] || null;
  }

  async saveSeasonDescription(showId: string, season: string, description: string): Promise<void> {
    const { data: existingData, error: showError } = await this.supabase
      .from('shows')
      .select('season_descriptions')
      .eq('id', showId)
      .maybeSingle();

    if (showError || !existingData) {
      throw new Error(`Show with ID ${showId} not found`);
    }

    const existingDescriptions = (existingData.season_descriptions as Record<string, string>) || {};
    const updatedDescriptions = {
      ...existingDescriptions,
      [season]: description,
    };

    const { error } = await this.supabase
      .from('shows')
      .update({
        season_descriptions: updatedDescriptions,
        seo_generated_at: new Date().toISOString(),
      })
      .eq('id', showId);

    if (error) {
      throw new Error(`Failed to save season description: ${error.message}`);
    }
  }

  async createShow(showName: string): Promise<string | null> {
    if (!showName?.trim()) {
      console.error('      ❌ Invalid show name provided');
      return null;
    }

    const trimmedName = showName.trim();
    const slug = slugify(trimmedName);
    
    if (!slug) {
      console.error(`      ❌ Could not generate valid slug for "${trimmedName}"`);
      return null;
    }

    const { data, error } = await this.supabase
      .from('shows')
      .upsert(
        {
          name: trimmedName,
          slug,
          is_public: false,
        },
        {
          onConflict: 'slug',
          ignoreDuplicates: true,
        }
      )
      .select('id')
      .single();

    if (error) {
      const { data: existing } = await this.supabase
        .from('shows')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      if (existing) {
        return existing.id;
      }
      console.error(`      ❌ Failed to create show "${trimmedName}": ${error.message}`);
      return null;
    }

    console.log(`      📺 Created new show (non-public): ${trimmedName}`);
    return data.id;
  }
}
