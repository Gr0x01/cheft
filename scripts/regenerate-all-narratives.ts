/**
 * Regenerate All Narratives (PARALLEL)
 *
 * This script regenerates career_narrative for all chefs and restaurant_narrative
 * for all restaurants using the updated prompt structures with SEO-optimized
 * 3-part narratives.
 *
 * Uses p-queue for parallel processing - Tier 5 OpenAI = high rate limits!
 *
 * Usage:
 *   npx tsx scripts/regenerate-all-narratives.ts [options]
 *
 * Options:
 *   --chefs-only      Only regenerate chef narratives
 *   --restaurants-only Only regenerate restaurant narratives
 *   --dry-run         Preview what would be regenerated without making changes
 *   --limit N         Limit to N items (for testing)
 *   --concurrency N   Number of parallel requests (default: 50)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import PQueue from 'p-queue';
import { NarrativeService } from './ingestion/enrichment/services/narrative-service';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
import { ChefNarrativeContext, RestaurantNarrativeContext } from '../src/lib/narratives/types';
import { NARRATIVE_CONFIG } from '../src/lib/narratives/config';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const tokenTracker = TokenTracker.getInstance();
const narrativeService = new NarrativeService(tokenTracker);

// Parse CLI arguments
const args = process.argv.slice(2);
const chefsOnly = args.includes('--chefs-only');
const restaurantsOnly = args.includes('--restaurants-only');
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined;
const concurrencyIndex = args.indexOf('--concurrency');
const concurrency = concurrencyIndex !== -1 ? parseInt(args[concurrencyIndex + 1]) : 50;

interface ChefRow {
  id: string;
  name: string;
  slug: string;
  mini_bio: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  current_position: string | null;
  chef_shows: Array<{
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary: boolean;
    show: { name: string } | null;
  }>;
  restaurants: Array<{
    name: string;
    city: string;
    state: string | null;
    cuisine_tags: string[] | null;
    status: 'open' | 'closed' | 'unknown';
  }>;
}

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
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

async function regenerateChefNarratives() {
  console.log('\n👨‍🍳 Regenerating Chef Narratives\n');
  console.log('='.repeat(60) + '\n');

  // Fetch all chefs with their shows and restaurants
  let query = supabase
    .from('chefs')
    .select(`
      id, name, slug, mini_bio, james_beard_status, current_position,
      chef_shows (
        season, result, is_primary,
        show:shows (name)
      ),
      restaurants (
        name, city, state, cuisine_tags, status
      )
    `)
    .order('name');

  if (limit) {
    query = query.limit(limit);
  }

  const { data: chefs, error } = await query;

  if (error) {
    console.error('❌ Error fetching chefs:', error);
    return { success: 0, failed: 0 };
  }

  console.log(`Found ${chefs?.length || 0} chefs to process (concurrency: ${concurrency})\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
    chefs?.forEach((chef, i) => {
      console.log(`  ${i + 1}. ${chef.name} (${chef.restaurants?.length || 0} restaurants)`);
    });
    return { success: chefs?.length || 0, failed: 0 };
  }

  let successCount = 0;
  let failCount = 0;
  let processed = 0;

  const queue = new PQueue({ concurrency });

  const tasks = (chefs || []).map((chef) => {
    return queue.add(async () => {
      const chefData = chef as ChefRow;
      processed++;
      const progress = `[${processed}/${chefs!.length}]`;

      // Build context
      const context: ChefNarrativeContext = {
        name: chefData.name,
        mini_bio: chefData.mini_bio,
        james_beard_status: chefData.james_beard_status,
        current_position: chefData.current_position,
        shows: (chefData.chef_shows || []).map(cs => ({
          show_name: cs.show?.name || 'Unknown Show',
          season: cs.season,
          result: cs.result,
          is_primary: cs.is_primary,
        })),
        restaurants: (chefData.restaurants || []).map(r => ({
          name: r.name,
          city: r.city,
          state: r.state,
          cuisine_tags: r.cuisine_tags,
          status: r.status,
        })),
        restaurant_count: chefData.restaurants?.length || 0,
        cities: [...new Set((chefData.restaurants || []).map(r => r.city))],
      };

      // Generate narrative
      const result = await narrativeService.generateChefNarrative(chefData.id, context);

      if (result.success && result.narrative) {
        // Update database
        const { error: updateError } = await supabase
          .from('chefs')
          .update({
            career_narrative: result.narrative,
            narrative_generated_at: new Date().toISOString(),
          })
          .eq('id', chefData.id);

        if (updateError) {
          console.log(`${progress} ❌ ${chefData.name}: DB error - ${updateError.message}`);
          failCount++;
        } else {
          console.log(`${progress} ✅ ${chefData.name} (${result.narrative.split('\n\n').length}p, ${result.narrative.length}c)`);
          successCount++;
        }
      } else {
        console.log(`${progress} ❌ ${chefData.name}: ${result.error}`);
        failCount++;
      }
    });
  });

  await Promise.all(tasks);

  return { success: successCount, failed: failCount };
}

async function regenerateRestaurantNarratives() {
  console.log('\n🍽️  Regenerating Restaurant Narratives\n');
  console.log('='.repeat(60) + '\n');

  // Fetch all restaurants with their chef data
  let query = supabase
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
    .eq('status', 'open')
    .order('name');

  if (limit) {
    query = query.limit(limit);
  }

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('❌ Error fetching restaurants:', error);
    return { success: 0, failed: 0 };
  }

  console.log(`Found ${restaurants?.length || 0} restaurants to process (concurrency: ${concurrency})\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
    restaurants?.forEach((rest, i) => {
      const chef = rest.chef as RestaurantRow['chef'];
      console.log(`  ${i + 1}. ${rest.name} (${chef?.name || 'Unknown chef'})`);
    });
    return { success: restaurants?.length || 0, failed: 0 };
  }

  let successCount = 0;
  let failCount = 0;
  let processed = 0;

  const queue = new PQueue({ concurrency });

  const tasks = (restaurants || []).map((rest) => {
    return queue.add(async () => {
      const restData = rest as RestaurantRow;
      const chef = restData.chef;
      processed++;
      const progress = `[${processed}/${restaurants!.length}]`;

      if (!chef) {
        console.log(`${progress} ⚠️  ${restData.name}: no chef data`);
        failCount++;
        return;
      }

      // Build context
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

      // Generate narrative
      const result = await narrativeService.generateRestaurantNarrative(restData.id, context);

      if (result.success && result.narrative) {
        // Update database
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({
            restaurant_narrative: result.narrative,
          })
          .eq('id', restData.id);

        if (updateError) {
          console.log(`${progress} ❌ ${restData.name}: DB error - ${updateError.message}`);
          failCount++;
        } else {
          console.log(`${progress} ✅ ${restData.name} (${result.narrative.split('\n\n').length}p, ${result.narrative.length}c)`);
          successCount++;
        }
      } else {
        console.log(`${progress} ❌ ${restData.name}: ${result.error}`);
        failCount++;
      }
    });
  });

  await Promise.all(tasks);

  return { success: successCount, failed: failCount };
}

async function confirmRun(chefCount: number, restaurantCount: number): Promise<boolean> {
  const { TOKENS_PER_CHEF, TOKENS_PER_RESTAURANT, COST_PER_MILLION_TOKENS, CONFIRMATION_DELAY_MS } = NARRATIVE_CONFIG.BACKFILL;

  const estimatedTokens = (chefCount * TOKENS_PER_CHEF) + (restaurantCount * TOKENS_PER_RESTAURANT);
  const estimatedCost = (estimatedTokens / 1_000_000) * COST_PER_MILLION_TOKENS;

  console.log('\n⚠️  COST ESTIMATE:');
  console.log(`   Chefs: ${chefCount} × ~${TOKENS_PER_CHEF} tokens`);
  console.log(`   Restaurants: ${restaurantCount} × ~${TOKENS_PER_RESTAURANT} tokens`);
  console.log(`   Total: ~${estimatedTokens.toLocaleString()} tokens`);
  console.log(`   Estimated cost: $${estimatedCost.toFixed(2)}`);
  console.log(`   Concurrency: ${concurrency} parallel requests\n`);

  if (process.env.CI) {
    console.log('CI environment detected, proceeding...');
    return true;
  }

  console.log(`Starting in ${CONFIRMATION_DELAY_MS / 1000} seconds... Press Ctrl+C to cancel.\n`);
  await new Promise(resolve => setTimeout(resolve, CONFIRMATION_DELAY_MS));
  return true;
}

async function main() {
  console.log('\n🔄 Narrative Regeneration Script (PARALLEL)\n');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  if (limit) {
    console.log(`📊 Limit: ${limit} items per category`);
  }

  console.log(`🚀 Concurrency: ${concurrency} parallel requests\n`);

  // Get counts for cost estimate
  const { count: chefCount } = await supabase
    .from('chefs')
    .select('*', { count: 'exact', head: true });

  const { count: restaurantCount } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)
    .eq('status', 'open');

  const actualChefCount = limit ? Math.min(limit, chefCount || 0) : (chefCount || 0);
  const actualRestaurantCount = limit ? Math.min(limit, restaurantCount || 0) : (restaurantCount || 0);

  if (!dryRun && (actualChefCount > 0 || actualRestaurantCount > 0)) {
    await confirmRun(
      restaurantsOnly ? 0 : actualChefCount,
      chefsOnly ? 0 : actualRestaurantCount
    );
  }

  const startTime = Date.now();
  let chefResults = { success: 0, failed: 0 };
  let restaurantResults = { success: 0, failed: 0 };

  if (!restaurantsOnly) {
    chefResults = await regenerateChefNarratives();
  }

  if (!chefsOnly) {
    restaurantResults = await regenerateRestaurantNarratives();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const usage = tokenTracker.getTotalUsage();
  const cost = tokenTracker.estimateCost();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary\n');

  if (!restaurantsOnly) {
    console.log(`👨‍🍳 Chefs: ${chefResults.success} updated, ${chefResults.failed} failed`);
  }

  if (!chefsOnly) {
    console.log(`🍽️  Restaurants: ${restaurantResults.success} updated, ${restaurantResults.failed} failed`);
  }

  console.log(`\n⏱️  Time: ${elapsed}s`);
  console.log(`🎟️  Tokens: ${usage.total.toLocaleString()} (${usage.prompt.toLocaleString()} prompt + ${usage.completion.toLocaleString()} completion)`);
  console.log(`💰 Estimated cost: $${cost.toFixed(2)}`);
  console.log('\n✅ Done!\n');
}

main().catch(console.error);
