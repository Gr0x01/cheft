import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { extractWithGPT, estimateCost } from './ingestion/enrichment/shared/local-llm-client';
import { RestaurantRepository } from './ingestion/enrichment/repositories/restaurant-repository';
import { Database } from '../src/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const restaurantRepo = new RestaurantRepository(supabase);

interface Chef {
  id: string;
  name: string;
}

interface CachedSearch {
  query: string;
  results: Array<{ title: string; url: string; content: string }>;
  result_count: number;
}

interface ExtractedRestaurant {
  name: string;
  city: string;
  state?: string;
  country?: string;
  address?: string;
  ownership: string;
  status: 'open' | 'closed' | 'unknown';
  cuisine?: string;
  price_range?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You extract restaurant ownership data from search results.

CRITICAL RULES:
1. ONLY include restaurants where the chef is an OWNER or PARTNER (has equity)
2. DO NOT include restaurants where they just worked as employee
3. DO NOT include training positions or early career jobs
4. Return ONLY valid JSON, no explanation

Output format:
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "city": "City",
      "state": "CA",
      "country": "US",
      "ownership": "owner" | "partner" | "executive_chef",
      "status": "open" | "closed" | "unknown",
      "cuisine": "Italian",
      "price_range": "$$"
    }
  ]
}`;

async function getChefs(): Promise<Chef[]> {
  const { data, error } = await supabase
    .from('chefs')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data || [];
}

async function getCachedSearches(chefName: string): Promise<CachedSearch[]> {
  const { data, error } = await supabase
    .from('search_cache')
    .select('query, results, result_count')
    .eq('entity_name', chefName)
    .eq('entity_type', 'chef');

  if (error) throw error;
  return (data || []) as CachedSearch[];
}

async function extractRestaurants(chefName: string, cachedSearches: CachedSearch[]): Promise<ExtractedRestaurant[]> {
  const restaurantSearch = cachedSearches.find(s => s.query.includes('restaurants locations'));
  if (!restaurantSearch || restaurantSearch.result_count === 0) {
    return [];
  }

  const searchText = restaurantSearch.results
    .map(r => `${r.title}\n${r.content}`)
    .join('\n\n')
    .substring(0, 8000);

  const prompt = `Extract restaurants owned by chef "${chefName}" from these search results:

${searchText}

Return JSON with "restaurants" array. Only include restaurants where ${chefName} is owner/partner.`;

  try {
    const response = await extractWithGPT(prompt, EXTRACTION_SYSTEM_PROMPT);
    const cleaned = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.restaurants || [];
  } catch (error) {
    console.error(`   ❌ Extraction failed: ${error}`);
    return [];
  }
}

async function processChef(
  chef: Chef,
  index: number,
  total: number
): Promise<{ restaurants: number; new: number; staged: number; cost: number }> {
  console.log(`\n[${index + 1}/${total}] 🧑‍🍳 ${chef.name}`);

  const cachedSearches = await getCachedSearches(chef.name);
  if (cachedSearches.length === 0) {
    console.log('   ⚠️  No cached searches found');
    return { restaurants: 0, new: 0, staged: 0, cost: 0 };
  }

  console.log(`   📦 Found ${cachedSearches.length} cached searches`);

  const extracted = await extractRestaurants(chef.name, cachedSearches);
  console.log(`   🍽️  Extracted ${extracted.length} restaurants`);

  if (extracted.length === 0) {
    return { restaurants: 0, new: 0, staged: 0, cost: 0.006 };
  }

  let newCount = 0;
  let stagedCount = 0;
  const foundIds: string[] = [];

  for (const restaurant of extracted) {
    if (!restaurant.name || !restaurant.city) continue;
    
    const invalidNames = ['unnamed', 'unknown', 'food truck', 'pop-up', 'popup', 'n/a', 'tbd'];
    const nameLower = restaurant.name.toLowerCase();
    if (invalidNames.some(inv => nameLower.includes(inv)) || restaurant.name.length < 3) {
      console.log(`      ⏭️  Skipped invalid: "${restaurant.name}"`);
      continue;
    }
    
    if (restaurant.city.toLowerCase() === 'unknown' || restaurant.city.length < 2) {
      console.log(`      ⏭️  Skipped (no city): "${restaurant.name}"`);
      continue;
    }

    const validPriceRanges = ['$', '$$', '$$$', '$$$$'];
    const priceRange = validPriceRanges.includes(restaurant.price_range || '')
      ? (restaurant.price_range as '$' | '$$' | '$$$' | '$$$$')
      : null;

    const validRoles = ['owner', 'executive_chef', 'partner', 'consultant'];
    const role = validRoles.includes(restaurant.ownership || '')
      ? (restaurant.ownership as 'owner' | 'executive_chef' | 'partner' | 'consultant')
      : 'owner';

    const result = await restaurantRepo.createRestaurant(
      chef.id,
      {
        name: restaurant.name,
        city: restaurant.city,
        state: restaurant.state || null,
        country: restaurant.country || 'US',
        address: restaurant.address || null,
        role,
        status: restaurant.status || 'unknown',
        cuisine: restaurant.cuisine ? [restaurant.cuisine] : null,
        priceRange,
      },
      chef.name
    );

    if (result.success && result.restaurantId) {
      foundIds.push(result.restaurantId);
      if (result.isNew) {
        newCount++;
        console.log(`      ✅ NEW: ${restaurant.name} (${restaurant.city})`);
      }
      if (result.stagedForReview) {
        stagedCount++;
      }
    }
  }

  const staleResult = await restaurantRepo.handleStaleRestaurants(chef.id, chef.name, foundIds);
  stagedCount += staleResult.stagedForReview;

  return {
    restaurants: extracted.length,
    new: newCount,
    staged: stagedCount,
    cost: 0.006,
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔄 EXTRACT FROM TAVILY CACHE');
  console.log('='.repeat(60));

  const chefs = await getChefs();
  console.log(`\n📋 Found ${chefs.length} chefs`);

  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : chefs.length;
  const chefsToProcess = chefs.slice(0, limit);

  console.log(`🚀 Processing ${chefsToProcess.length} chefs...\n`);

  let totalRestaurants = 0;
  let totalNew = 0;
  let totalStaged = 0;
  let totalCost = 0;
  const startTime = Date.now();

  const BATCH_SIZE = 50;
  for (let i = 0; i < chefsToProcess.length; i += BATCH_SIZE) {
    const batch = chefsToProcess.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((chef, j) => processChef(chef, i + j, chefsToProcess.length))
    );
    for (const result of batchResults) {
      totalRestaurants += result.restaurants;
      totalNew += result.new;
      totalStaged += result.staged;
      totalCost += result.cost;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📈 EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Time: ${elapsed}s`);
  console.log(`👨‍🍳 Chefs processed: ${chefsToProcess.length}`);
  console.log(`🍽️  Restaurants extracted: ${totalRestaurants}`);
  console.log(`✅ New restaurants: ${totalNew}`);
  console.log(`📋 Staged for review: ${totalStaged}`);
  console.log(`💰 Estimated cost: $${totalCost.toFixed(2)}`);
}

main().catch(console.error);
