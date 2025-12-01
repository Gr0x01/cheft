import { z } from 'zod';

export const ShowConfigSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  network: z.string().optional(),
  wikipedia_source: z.string().min(1),
  enabled: z.boolean(),
  priority: z.number().int().positive()
});

export const ShowsConfigSchema = z.object({
  shows: z.array(ShowConfigSchema)
});

export type ShowConfig = z.infer<typeof ShowConfigSchema>;
export type ShowsConfig = z.infer<typeof ShowsConfigSchema>;

export const ChefResultSchema = z.enum(['winner', 'finalist', 'contestant', 'judge']);
export const JamesBeardStatusSchema = z.enum(['semifinalist', 'nominated', 'winner']).nullable();
export const RestaurantStatusSchema = z.enum(['open', 'closed', 'unknown']);
export const PriceTierSchema = z.enum(['$', '$$', '$$$', '$$$$']);
export const ChefRoleSchema = z.enum(['owner', 'executive_chef', 'partner', 'consultant']);

export const DiscoveredChefSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  show_slug: z.string().min(1),
  season: z.string().optional(),
  season_name: z.string().optional(),
  result: ChefResultSchema.optional(),
  source_url: z.string().url().optional()
});

export type DiscoveredChef = z.infer<typeof DiscoveredChefSchema>;

export const DiscoveredRestaurantSchema = z.object({
  name: z.string().min(1),
  chef_slug: z.string().min(1),
  address: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().default('US'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  website_url: z.string().url().optional(),
  price_tier: PriceTierSchema.optional(),
  cuisine_tags: z.array(z.string()).optional()
});

export type DiscoveredRestaurant = z.infer<typeof DiscoveredRestaurantSchema>;

export const ReviewQueueItemSchema = z.object({
  type: z.enum(['new_chef', 'new_restaurant', 'update', 'status_change']),
  data: z.record(z.string(), z.unknown()),
  source: z.string(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional()
});

export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;

export const DataChangeSchema = z.object({
  table_name: z.string(),
  record_id: z.string().uuid().optional(),
  change_type: z.enum(['insert', 'update', 'delete']),
  old_data: z.record(z.string(), z.unknown()).optional(),
  new_data: z.record(z.string(), z.unknown()).optional(),
  source: z.enum(['auto_update', 'llm_enrichment', 'admin_review', 'manual', 'discovery']),
  confidence: z.number().min(0).max(1).optional()
});

export type DataChange = z.infer<typeof DataChangeSchema>;

export function validateShowsConfig(data: unknown): ShowsConfig {
  return ShowsConfigSchema.parse(data);
}

export function validateDiscoveredChef(data: unknown): DiscoveredChef {
  return DiscoveredChefSchema.parse(data);
}

export function validateDiscoveredRestaurant(data: unknown): DiscoveredRestaurant {
  return DiscoveredRestaurantSchema.parse(data);
}
