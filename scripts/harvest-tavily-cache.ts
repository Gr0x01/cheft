import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { searchChefShows, searchChefRestaurants, getCacheStats } from './ingestion/enrichment/shared/tavily-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Chef {
  id: string;
  name: string;
}

async function getAllChefs(): Promise<Chef[]> {
  const { data, error } = await supabase
    .from('chefs')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data || [];
}

async function harvestChef(chef: Chef, index: number, total: number): Promise<{ shows: number; restaurants: number }> {
  console.log(`\n[${index + 1}/${total}] 🧑‍🍳 ${chef.name}`);

  let showResults = 0;
  let restaurantResults = 0;

  try {
    const showsResponse = await searchChefShows(chef.name, chef.id);
    showResults = showsResponse.results.length;
    const showSource = showsResponse.fromCache ? '(cached)' : '(fresh)';
    console.log(`   📺 Shows: ${showResults} results ${showSource}`);
  } catch (error) {
    console.error(`   ❌ Shows search failed: ${error}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const restaurantsResponse = await searchChefRestaurants(chef.name, chef.id);
    restaurantResults = restaurantsResponse.results.length;
    const restSource = restaurantsResponse.fromCache ? '(cached)' : '(fresh)';
    console.log(`   🍽️  Restaurants: ${restaurantResults} results ${restSource}`);
  } catch (error) {
    console.error(`   ❌ Restaurants search failed: ${error}`);
  }

  return { shows: showResults, restaurants: restaurantResults };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🌾 TAVILY SEARCH HARVEST');
  console.log('='.repeat(60));

  const startStats = await getCacheStats();
  console.log(`\n📊 Cache before: ${startStats.total} entries`);

  const chefs = await getAllChefs();
  console.log(`📋 Found ${chefs.length} chefs to process`);
  console.log(`🔍 Estimated searches: ${chefs.length * 2} (${chefs.length} × 2 queries)`);

  const limit = process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
    : chefs.length;

  const chefsToProcess = chefs.slice(0, limit);
  console.log(`\n🚀 Processing ${chefsToProcess.length} chefs...`);

  let totalShows = 0;
  let totalRestaurants = 0;
  let freshSearches = 0;
  const startTime = Date.now();

  for (let i = 0; i < chefsToProcess.length; i++) {
    const chef = chefsToProcess[i];
    const results = await harvestChef(chef, i, chefsToProcess.length);
    totalShows += results.shows;
    totalRestaurants += results.restaurants;

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const endStats = await getCacheStats();
  const newEntries = endStats.total - startStats.total;

  console.log('\n' + '='.repeat(60));
  console.log('📈 HARVEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Time: ${elapsed}s`);
  console.log(`👨‍🍳 Chefs processed: ${chefsToProcess.length}`);
  console.log(`📺 Total show results: ${totalShows}`);
  console.log(`🍽️  Total restaurant results: ${totalRestaurants}`);
  console.log(`\n📦 Cache after: ${endStats.total} entries (+${newEntries} new)`);
  console.log(`   By type: ${JSON.stringify(endStats.byType)}`);
}

main().catch(console.error);
