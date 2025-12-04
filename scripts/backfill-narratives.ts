import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';
import { ChefNarrativeContext, RestaurantNarrativeContext, CityNarrativeContext } from '../src/lib/narratives/types';
import { MODEL_PRICING } from '../src/lib/enrichment/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

interface Stats {
  processed: number;
  succeeded: number;
  failed: number;
  totalTokens: { prompt: number; completion: number; total: number };
  estimatedCost: number;
}

async function fetchChefContext(chefId: string): Promise<ChefNarrativeContext | null> {
  const { data: chef } = await supabase
    .from('chefs')
    .select(`
      name,
      mini_bio,
      james_beard_status,
      current_position,
      chef_shows!inner (
        season,
        result,
        is_primary,
        show:shows (name)
      ),
      restaurants!restaurants_chef_id_fkey (
        name,
        city,
        state,
        cuisine_tags,
        status
      )
    `)
    .eq('id', chefId)
    .single();

  if (!chef) return null;

  const shows = (chef.chef_shows || []).map((cs: any) => ({
    show_name: cs.show?.name || '',
    season: cs.season,
    result: cs.result,
    is_primary: cs.is_primary,
  }));

  const restaurants = (chef.restaurants || []).map((r: any) => ({
    name: r.name,
    city: r.city,
    state: r.state,
    cuisine_tags: r.cuisine_tags,
    status: r.status,
  }));

  const cities = [...new Set(restaurants.map(r => `${r.city}${r.state ? `, ${r.state}` : ''}`))] as string[];

  return {
    name: chef.name,
    mini_bio: chef.mini_bio,
    james_beard_status: chef.james_beard_status,
    current_position: chef.current_position,
    shows,
    restaurants,
    restaurant_count: restaurants.length,
    cities,
  };
}

async function fetchRestaurantContext(restaurantId: string): Promise<RestaurantNarrativeContext | null> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(`
      name,
      city,
      state,
      cuisine_tags,
      price_tier,
      google_rating,
      google_review_count,
      status,
      chef:chefs!restaurants_chef_id_fkey (
        id,
        name,
        james_beard_status,
        chef_shows (
          show:shows (name),
          result
        ),
        restaurants!restaurants_chef_id_fkey (id)
      )
    `)
    .eq('id', restaurantId)
    .single();

  if (!restaurant || !restaurant.chef) return null;

  const chef = restaurant.chef as any;
  const chef_shows = (chef.chef_shows || []).map((cs: any) => ({
    show_name: cs.show?.name || '',
    result: cs.result,
  }));

  return {
    name: restaurant.name,
    chef_name: chef.name,
    city: restaurant.city,
    state: restaurant.state,
    cuisine_tags: restaurant.cuisine_tags,
    price_tier: restaurant.price_tier,
    google_rating: restaurant.google_rating,
    google_review_count: restaurant.google_review_count,
    status: restaurant.status,
    chef_shows,
    chef_james_beard: chef.james_beard_status,
    other_restaurant_count: (chef.restaurants?.length || 1) - 1,
  };
}

async function fetchCityContext(cityId: string): Promise<CityNarrativeContext | null> {
  const { data: city } = await supabase
    .from('cities')
    .select('name, state, restaurant_count, chef_count')
    .eq('id', cityId)
    .single();

  if (!city) return null;

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select(`
      name,
      cuisine_tags,
      price_tier,
      google_rating,
      michelin_stars,
      chef:chefs!restaurants_chef_id_fkey (name)
    `)
    .eq('city', city.name)
    .eq('state', city.state || '')
    .eq('is_public', true)
    .order('google_rating', { ascending: false, nullsFirst: false })
    .limit(10);

  const { data: chefs } = await supabase
    .from('restaurants')
    .select(`
      chef:chefs!restaurants_chef_id_fkey (
        james_beard_status,
        chef_shows!inner (result, show:shows(name))
      )
    `)
    .eq('city', city.name)
    .eq('state', city.state || '')
    .eq('is_public', true);

  const show_winner_count = chefs?.filter((r: any) => 
    r.chef?.chef_shows?.some((cs: any) => cs.result === 'winner')
  ).length || 0;

  const james_beard_winner_count = chefs?.filter((r: any) => 
    r.chef?.james_beard_status === 'winner'
  ).length || 0;

  const cuisine_distribution: Record<string, number> = {};
  const price_distribution: Record<string, number> = {};

  restaurants?.forEach((r: any) => {
    (r.cuisine_tags || []).forEach((c: string) => {
      cuisine_distribution[c] = (cuisine_distribution[c] || 0) + 1;
    });
    if (r.price_tier) {
      price_distribution[r.price_tier] = (price_distribution[r.price_tier] || 0) + 1;
    }
  });

  const top_restaurants = (restaurants || []).slice(0, 5).map((r: any) => ({
    name: r.name,
    chef_name: r.chef?.name || '',
    cuisine_tags: r.cuisine_tags,
    price_tier: r.price_tier,
    google_rating: r.google_rating,
    michelin_stars: r.michelin_stars,
  }));

  return {
    name: city.name,
    state: city.state,
    restaurant_count: city.restaurant_count,
    chef_count: city.chef_count,
    top_restaurants,
    show_winner_count,
    james_beard_winner_count,
    cuisine_distribution,
    price_distribution,
  };
}

async function backfillChefNarratives(options: { limit?: number; batchSize?: number; dryRun?: boolean }) {
  const { limit, batchSize = 5, dryRun = false } = options;
  
  console.log('\n🔄 Backfilling chef narratives...');
  console.log(`   Batch size: ${batchSize}, Limit: ${limit || 'all'}, Dry run: ${dryRun}`);

  const query = supabase
    .from('chefs')
    .select('id, name')
    .is('career_narrative', null)
    .order('name');

  if (limit) {
    query.limit(limit);
  }

  const { data: chefs, error } = await query;

  if (error || !chefs) {
    console.error('❌ Failed to fetch chefs:', error);
    return;
  }

  console.log(`   Found ${chefs.length} chefs without narratives\n`);

  const stats: Stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalTokens: { prompt: 0, completion: 0, total: 0 },
    estimatedCost: 0,
  };

  const enricher = createLLMEnricher(supabase, { model: 'gpt-4.1-mini' });
  let consecutiveErrors = 0;

  for (let i = 0; i < chefs.length; i += batchSize) {
    const batch = chefs.slice(i, i + batchSize);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chefs.length / batchSize)}`);
    
    for (const chef of batch) {
      console.log(`\n   🧑‍🍳 ${chef.name}`);
      
      try {
        const context = await fetchChefContext(chef.id);
        
        if (!context) {
          console.log('      ⚠️  Failed to fetch context, skipping');
          stats.failed++;
          consecutiveErrors++;
          continue;
        }

        if (dryRun) {
          console.log('      ℹ️  DRY RUN - would generate narrative');
          stats.processed++;
          consecutiveErrors = 0;
          continue;
        }

        const result = await enricher.enrichChefNarrative(chef.id, context);
        
        stats.processed++;
        
        if (result.success) {
          stats.succeeded++;
          stats.totalTokens.prompt += result.tokensUsed.prompt;
          stats.totalTokens.completion += result.tokensUsed.completion;
          stats.totalTokens.total += result.tokensUsed.total;
          
          const cost = (result.tokensUsed.prompt / 1_000_000 * MODEL_PRICING['gpt-4.1-mini'].input) +
                       (result.tokensUsed.completion / 1_000_000 * MODEL_PRICING['gpt-4.1-mini'].output);
          stats.estimatedCost += cost;
          
          console.log(`      ✅ Generated (${result.tokensUsed.total} tokens, $${cost.toFixed(4)})`);
          console.log(`      📝 ${result.narrative?.substring(0, 100)}...`);
          consecutiveErrors = 0;
        } else {
          stats.failed++;
          consecutiveErrors++;
          console.log(`      ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        stats.failed++;
        consecutiveErrors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`      💥 Unexpected error: ${errorMsg}`);
      }

      if (consecutiveErrors >= 5) {
        console.error('\n⛔ Too many consecutive errors (5+). Stopping to prevent waste.');
        console.error('   Check your API keys, network connection, and rate limits.');
        break;
      }
    }
    
    if (consecutiveErrors >= 5) break;
    
    if (i + batchSize < chefs.length) {
      const delay = Math.min(2000 * Math.pow(1.2, Math.floor(consecutiveErrors / 2)), 10000);
      console.log(`\n   ⏸️  Waiting ${(delay / 1000).toFixed(1)} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('\n\n📊 Chef Narratives Summary');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Succeeded: ${stats.succeeded}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total tokens: ${stats.totalTokens.total.toLocaleString()}`);
  console.log(`   Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
}

async function backfillRestaurantNarratives(options: { limit?: number; batchSize?: number; dryRun?: boolean }) {
  const { limit, batchSize = 5, dryRun = false } = options;
  
  console.log('\n🔄 Backfilling restaurant narratives...');
  console.log(`   Batch size: ${batchSize}, Limit: ${limit || 'all'}, Dry run: ${dryRun}`);

  const query = supabase
    .from('restaurants')
    .select('id, name')
    .is('restaurant_narrative', null)
    .eq('is_public', true)
    .order('name');

  if (limit) {
    query.limit(limit);
  }

  const { data: restaurants, error } = await query;

  if (error || !restaurants) {
    console.error('❌ Failed to fetch restaurants:', error);
    return;
  }

  console.log(`   Found ${restaurants.length} restaurants without narratives\n`);

  const stats: Stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalTokens: { prompt: 0, completion: 0, total: 0 },
    estimatedCost: 0,
  };

  const enricher = createLLMEnricher(supabase, { model: 'gpt-4.1-mini' });
  let consecutiveErrors = 0;

  for (let i = 0; i < restaurants.length; i += batchSize) {
    const batch = restaurants.slice(i, i + batchSize);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(restaurants.length / batchSize)}`);
    
    for (const restaurant of batch) {
      console.log(`\n   🍽️  ${restaurant.name}`);
      
      try {
        const context = await fetchRestaurantContext(restaurant.id);
        
        if (!context) {
          console.log('      ⚠️  Failed to fetch context, skipping');
          stats.failed++;
          consecutiveErrors++;
          continue;
        }

        if (dryRun) {
          console.log('      ℹ️  DRY RUN - would generate narrative');
          stats.processed++;
          consecutiveErrors = 0;
          continue;
        }

        const result = await enricher.enrichRestaurantNarrative(restaurant.id, context);
        
        stats.processed++;
        
        if (result.success) {
          stats.succeeded++;
          stats.totalTokens.prompt += result.tokensUsed.prompt;
          stats.totalTokens.completion += result.tokensUsed.completion;
          stats.totalTokens.total += result.tokensUsed.total;
          
          const cost = (result.tokensUsed.prompt / 1_000_000 * MODEL_PRICING['gpt-4.1-mini'].input) +
                       (result.tokensUsed.completion / 1_000_000 * MODEL_PRICING['gpt-4.1-mini'].output);
          stats.estimatedCost += cost;
          
          console.log(`      ✅ Generated (${result.tokensUsed.total} tokens, $${cost.toFixed(4)})`);
          consecutiveErrors = 0;
        } else {
          stats.failed++;
          consecutiveErrors++;
          console.log(`      ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        stats.failed++;
        consecutiveErrors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`      💥 Unexpected error: ${errorMsg}`);
      }

      if (consecutiveErrors >= 5) {
        console.error('\n⛔ Too many consecutive errors (5+). Stopping to prevent waste.');
        console.error('   Check your API keys, network connection, and rate limits.');
        break;
      }
    }
    
    if (consecutiveErrors >= 5) break;
    
    if (i + batchSize < restaurants.length) {
      const delay = Math.min(2000 * Math.pow(1.2, Math.floor(consecutiveErrors / 2)), 10000);
      console.log(`\n   ⏸️  Waiting ${(delay / 1000).toFixed(1)} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('\n\n📊 Restaurant Narratives Summary');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Succeeded: ${stats.succeeded}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total tokens: ${stats.totalTokens.total.toLocaleString()}`);
  console.log(`   Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
}

async function backfillCityNarratives(options: { limit?: number; batchSize?: number; dryRun?: boolean }) {
  const { limit, batchSize = 3, dryRun = false } = options;
  
  console.log('\n🔄 Backfilling city narratives...');
  console.log(`   Batch size: ${batchSize}, Limit: ${limit || 'all'}, Dry run: ${dryRun}`);

  const query = supabase
    .from('cities')
    .select('id, name, state')
    .is('city_narrative', null)
    .gte('restaurant_count', 3)
    .order('restaurant_count', { ascending: false });

  if (limit) {
    query.limit(limit);
  }

  const { data: cities, error } = await query;

  if (error || !cities) {
    console.error('❌ Failed to fetch cities:', error);
    return;
  }

  console.log(`   Found ${cities.length} cities without narratives\n`);

  const stats: Stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalTokens: { prompt: 0, completion: 0, total: 0 },
    estimatedCost: 0,
  };

  const enricher = createLLMEnricher(supabase, { model: 'gpt-4.1-mini' });
  let consecutiveErrors = 0;

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cities.length / batchSize)}`);
    
    for (const city of batch) {
      const displayName = `${city.name}${city.state ? `, ${city.state}` : ''}`;
      console.log(`\n   🏙️  ${displayName}`);
      
      try {
        const context = await fetchCityContext(city.id);
        
        if (!context) {
          console.log('      ⚠️  Failed to fetch context, skipping');
          stats.failed++;
          consecutiveErrors++;
          continue;
        }

        if (dryRun) {
          console.log('      ℹ️  DRY RUN - would generate narrative');
          stats.processed++;
          consecutiveErrors = 0;
          continue;
        }

        const result = await enricher.enrichCityNarrative(city.id, context);
        
        stats.processed++;
        
        if (result.success) {
          stats.succeeded++;
          stats.totalTokens.prompt += result.tokensUsed.prompt;
          stats.totalTokens.completion += result.tokensUsed.completion;
          stats.totalTokens.total += result.tokensUsed.total;
          
          const cost = (result.tokensUsed.prompt / 1_000_000 * MODEL_PRICING['gpt-4.1-mini'].input) +
                       (result.tokensUsed.completion / 1_000_000 * MODEL_PRICING['gpt-4.1-mini'].output);
          stats.estimatedCost += cost;
          
          console.log(`      ✅ Generated (${result.tokensUsed.total} tokens, $${cost.toFixed(4)})`);
          consecutiveErrors = 0;
        } else {
          stats.failed++;
          consecutiveErrors++;
          console.log(`      ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        stats.failed++;
        consecutiveErrors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`      💥 Unexpected error: ${errorMsg}`);
      }

      if (consecutiveErrors >= 5) {
        console.error('\n⛔ Too many consecutive errors (5+). Stopping to prevent waste.');
        console.error('   Check your API keys, network connection, and rate limits.');
        break;
      }
    }
    
    if (consecutiveErrors >= 5) break;
    
    if (i + batchSize < cities.length) {
      const delay = Math.min(2000 * Math.pow(1.2, Math.floor(consecutiveErrors / 2)), 10000);
      console.log(`\n   ⏸️  Waiting ${(delay / 1000).toFixed(1)} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('\n\n📊 City Narratives Summary');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Succeeded: ${stats.succeeded}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total tokens: ${stats.totalTokens.total.toLocaleString()}`);
  console.log(`   Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const entity = args.find(a => a.startsWith('--entity='))?.split('=')[1] || 'chefs';
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const batchSizeArg = args.find(a => a.startsWith('--batch-size='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  const limit = limitArg ? parseInt(limitArg, 10) : undefined;
  const batchSize = batchSizeArg ? parseInt(batchSizeArg, 10) : undefined;

  console.log('🎯 Narrative Backfill Script');
  console.log(`   Entity: ${entity}`);
  console.log(`   Limit: ${limit || 'all'}`);
  console.log(`   Batch size: ${batchSize || 'default'}`);
  console.log(`   Dry run: ${dryRun}`);

  if (entity === 'chefs') {
    await backfillChefNarratives({ limit, batchSize, dryRun });
  } else if (entity === 'restaurants') {
    await backfillRestaurantNarratives({ limit, batchSize, dryRun });
  } else if (entity === 'cities') {
    await backfillCityNarratives({ limit, batchSize, dryRun });
  } else if (entity === 'all') {
    await backfillChefNarratives({ limit, batchSize, dryRun });
    await backfillRestaurantNarratives({ limit, batchSize, dryRun });
    await backfillCityNarratives({ limit, batchSize, dryRun });
  } else {
    console.error(`❌ Unknown entity: ${entity}`);
    console.log('\nUsage: npx tsx scripts/backfill-narratives.ts --entity=[chefs|restaurants|cities|all] [--limit=N] [--batch-size=N] [--dry-run]');
    process.exit(1);
  }

  console.log('\n✅ Backfill complete!');
}

main().catch(console.error);
