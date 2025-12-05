import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { logDataChange, AuditLogEntry } from '../../queue/audit-log';
import { checkForDuplicate } from '../../../../src/lib/duplicates/detector';

const RestaurantSchema = z.object({
  name: z.string(),
  address: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  cuisine: z.array(z.string()).nullable().optional(),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).nullable().optional(),
  status: z.enum(['open', 'closed', 'unknown']).nullable().optional(),
  website: z.string().nullable().optional(),
  role: z.enum(['owner', 'executive_chef', 'partner', 'consultant']).nullable().optional(),
  opened: z.number().nullable().optional(),
  michelinStars: z.number().min(0).max(3).nullable().optional(),
  awards: z.array(z.string()).nullable().optional(),
  source: z.string().nullable().optional(),
});

export type RestaurantData = z.infer<typeof RestaurantSchema>;

export class RestaurantRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private sanitizeRestaurantName(name: string): string {
    return name.replace(/\s*\(\[.*?\]\(.*?\)\)/g, '').trim();
  }

  private generateSlug(name: string, city?: string): string {
    const cleanName = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (city) {
      const cleanCity = city.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return `${cleanName}-${cleanCity}`;
    }
    
    return cleanName;
  }

  async checkDuplicates(
    restaurantName: string,
    city: string,
    address?: string | null,
    state?: string | null
  ): Promise<{ isDuplicate: boolean; existingId?: string; confidence?: number }> {
    const cityMatches = await (this.supabase
      .from('restaurants') as ReturnType<typeof this.supabase.from>)
      .select('id, chef_id, name, address')
      .eq('city', city)
      .limit(50);

    if (cityMatches.data && cityMatches.data.length > 0) {
      for (const existing of cityMatches.data) {
        const dupeCheck = await checkForDuplicate({
          name1: restaurantName,
          name2: existing.name,
          city,
          address1: address,
          address2: existing.address,
          state,
        });

        if (dupeCheck.isDuplicate && dupeCheck.confidence >= 0.85) {
          console.log(`      🔍 DUPLICATE DETECTED: "${restaurantName}" matches existing "${existing.name}"`);
          console.log(`         Confidence: ${dupeCheck.confidence.toFixed(2)} | Reason: ${dupeCheck.reasoning}`);

          const auditEntry: AuditLogEntry = {
            table_name: 'restaurants',
            record_id: existing.id,
            change_type: 'update',
            new_data: {
              duplicate_prevented: true,
              attempted_name: restaurantName,
              matched_name: existing.name,
              confidence: dupeCheck.confidence,
              reasoning: dupeCheck.reasoning,
            },
            source: 'llm_enricher_duplicate_prevention',
            confidence: dupeCheck.confidence,
          };
          await logDataChange(this.supabase, auditEntry);

          return { 
            isDuplicate: true, 
            existingId: existing.id, 
            confidence: dupeCheck.confidence 
          };
        }
      }
    }

    return { isDuplicate: false };
  }

  async createRestaurant(
    chefId: string,
    restaurant: RestaurantData
  ): Promise<{ success: boolean; restaurantId?: string; isNew: boolean }> {
    const cleanName = this.sanitizeRestaurantName(restaurant.name);
    
    const exactMatch = await (this.supabase
      .from('restaurants') as ReturnType<typeof this.supabase.from>)
      .select('id, chef_id, name, address')
      .eq('name', cleanName)
      .eq('city', restaurant.city || '')
      .maybeSingle();

    if (exactMatch.data) {
      if (exactMatch.data.chef_id !== chefId) {
        console.log(`      ⚠️  Restaurant "${cleanName}" already linked to different chef`);
      }
      return { success: true, restaurantId: exactMatch.data.id, isNew: false };
    }

    const dupeCheck = await this.checkDuplicates(
      cleanName,
      restaurant.city || '',
      restaurant.address,
      restaurant.state
    );

    if (dupeCheck.isDuplicate && dupeCheck.existingId) {
      return { success: true, restaurantId: dupeCheck.existingId, isNew: false };
    }

    const slug = this.generateSlug(cleanName, restaurant.city || undefined);
    const insertData = {
      name: cleanName,
      slug,
      chef_id: chefId,
      chef_role: restaurant.role || 'owner',
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      country: restaurant.country || 'US',
      price_tier: restaurant.priceRange,
      status: restaurant.status || 'unknown',
      website_url: restaurant.website,
      year_opened: restaurant.opened,
      michelin_stars: restaurant.michelinStars || 0,
      awards: restaurant.awards || null,
      source_notes: `Discovered via LLM enrichment from ${restaurant.source || 'chef bio'}`,
      is_public: true,
    };

    const { data, error } = await (this.supabase
      .from('restaurants') as ReturnType<typeof this.supabase.from>)
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error(`      ❌ Failed to save restaurant "${restaurant.name}": ${error.message}`);
      return { success: false, isNew: false };
    }

    return { success: true, restaurantId: data.id, isNew: true };
  }

  async updateStatus(
    restaurantId: string,
    status: 'open' | 'closed' | 'unknown',
    confidence: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await (this.supabase
      .from('restaurants') as ReturnType<typeof this.supabase.from>)
      .update({
        status,
        last_verified_at: new Date().toISOString(),
        verification_source: `llm_confidence_${confidence.toFixed(2)}: ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async updateNarrative(
    restaurantId: string,
    narrative: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await (this.supabase
      .from('restaurants') as ReturnType<typeof this.supabase.from>)
      .update({
        narrative,
        narrative_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
