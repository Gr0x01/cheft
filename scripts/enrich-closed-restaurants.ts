/**
 * One-off script to enrich closed restaurants with narratives
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import PQueue from 'p-queue';
import { NarrativeService } from './ingestion/enrichment/services/narrative-service';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
import { RestaurantNarrativeContext } from '../src/lib/narratives/types';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tokenTracker = TokenTracker.getInstance();
const narrativeService = new NarrativeService(tokenTracker);

interface RestaurantRow {
  id: string;
  name: string;
  city: string;
  state: string | null;
  cuisine_tags: string[] | null;
  price_tier: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  status: 'open' | 'closed' | 'unknown';
  chef: {
    id: string;
    name: string;
    james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows: Array<{
      result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      show: { name: string } | null;
    }>;
    restaurants: Array<{ id: string }>;
  } | null;
}

async function run() {
  console.log('🍽️  Enriching CLOSED restaurants...\n');

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select(`
      id, name, slug, city, state, cuisine_tags, price_tier,
      google_rating, google_review_count, status,
      chef:chefs (
        id, name, james_beard_status,
        chef_shows (
          result,
          show:shows (name)
        ),
        restaurants (id)
      )
    `)
    .eq('is_public', true)
    .eq('status', 'closed')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${restaurants?.length || 0} closed restaurants (concurrency: 50)\n`);

  let success = 0;
  let failed = 0;
  let processed = 0;
  const queue = new PQueue({ concurrency: 50 });

  const tasks = (restaurants || []).map((rest) => {
    return queue.add(async () => {
      const restData = rest as RestaurantRow;
      const chef = restData.chef;
      processed++;
      const progress = `[${processed}/${restaurants!.length}]`;

      if (!chef) {
        console.log(`${progress} ⚠️  ${restData.name}: no chef`);
        failed++;
        return;
      }

      const context: RestaurantNarrativeContext = {
        name: restData.name,
        chef_name: chef.name,
        city: restData.city,
        state: restData.state,
        cuisine_tags: restData.cuisine_tags,
        price_tier: restData.price_tier,
        google_rating: restData.google_rating,
        google_review_count: restData.google_review_count,
        status: restData.status,
        chef_shows: (chef.chef_shows || []).map(cs => ({
          show_name: cs.show?.name || 'Unknown Show',
          result: cs.result,
        })),
        chef_james_beard: chef.james_beard_status,
        other_restaurant_count: (chef.restaurants?.length || 1) - 1,
      };

      const result = await narrativeService.generateRestaurantNarrative(restData.id, context);

      if (result.success && result.narrative) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ restaurant_narrative: result.narrative })
          .eq('id', restData.id);

        if (updateError) {
          console.log(`${progress} ❌ ${restData.name}: DB error`);
          failed++;
        } else {
          console.log(`${progress} ✅ ${restData.name} (${result.narrative.split('\n\n').length}p)`);
          success++;
        }
      } else {
        console.log(`${progress} ❌ ${restData.name}: ${result.error}`);
        failed++;
      }
    });
  });

  await Promise.all(tasks);

  const usage = tokenTracker.getTotalUsage();
  const cost = tokenTracker.estimateCost();

  console.log('\n' + '='.repeat(50));
  console.log(`✅ ${success} updated, ❌ ${failed} failed`);
  console.log(`🎟️  Tokens: ${usage.total.toLocaleString()}`);
  console.log(`💰 Cost: $${cost.toFixed(2)}`);
}

run().catch(console.error);
