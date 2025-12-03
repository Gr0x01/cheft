import { createClient } from '@supabase/supabase-js';
import { checkForDuplicate, calculateNameSimilarity } from '../src/lib/duplicates/detector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  address: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  photo_urls: string[] | null;
  status: 'open' | 'closed' | 'unknown' | null;
  price_tier: string | null;
  website_url: string | null;
  chef_id: string;
}

interface DuplicateGroup {
  restaurants: Restaurant[];
  confidence: number;
  reasoning: string;
  similarity: number;
}

interface DuplicateReport {
  scannedAt: string;
  totalRestaurants: number;
  citiesScanned: number;
  duplicateGroupsFound: number;
  groups: DuplicateGroup[];
  estimatedCost: number;
}

async function getAllRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, city, state, address, google_place_id, google_rating, google_review_count, photo_urls, status, price_tier, website_url, chef_id')
    .eq('is_public', true)
    .order('city', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch restaurants: ${error.message}`);
  }

  return data as Restaurant[];
}

function groupByCity(restaurants: Restaurant[]): Map<string, Restaurant[]> {
  const grouped = new Map<string, Restaurant[]>();

  for (const restaurant of restaurants) {
    const cityKey = `${restaurant.city}, ${restaurant.state || 'unknown'}`;
    if (!grouped.has(cityKey)) {
      grouped.set(cityKey, []);
    }
    grouped.get(cityKey)!.push(restaurant);
  }

  return grouped;
}

async function findDuplicatesInCity(
  restaurants: Restaurant[],
  cityName: string
): Promise<DuplicateGroup[]> {
  const duplicates: DuplicateGroup[] = [];
  const checked = new Set<string>();
  const comparisons: Array<{r1: Restaurant, r2: Restaurant, similarity: number}> = [];

  console.log(`\n🔍 Scanning ${cityName} (${restaurants.length} restaurants)...`);

  for (let i = 0; i < restaurants.length; i++) {
    for (let j = i + 1; j < restaurants.length; j++) {
      const r1 = restaurants[i];
      const r2 = restaurants[j];
      const pairKey = [r1.id, r2.id].sort().join('-');

      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      const nameSimilarity = calculateNameSimilarity(r1.name, r2.name);

      if (nameSimilarity < 0.3) {
        continue;
      }

      comparisons.push({ r1, r2, similarity: nameSimilarity });
    }
  }

  if (comparisons.length === 0) {
    return duplicates;
  }

  console.log(`   Found ${comparisons.length} potential pairs to check with LLM...`);

  const BATCH_SIZE = 10;
  for (let i = 0; i < comparisons.length; i += BATCH_SIZE) {
    const batch = comparisons.slice(i, Math.min(i + BATCH_SIZE, comparisons.length));
    console.log(`   Checking batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(comparisons.length / BATCH_SIZE)}...`);

    const results = await Promise.all(
      batch.map(async ({ r1, r2, similarity }) => {
        const result = await checkForDuplicate({
          name1: r1.name,
          name2: r2.name,
          city: r1.city,
          address1: r1.address,
          address2: r2.address,
          state: r1.state,
          rating1: r1.google_rating,
          rating2: r2.google_rating,
          reviewCount1: r1.google_review_count,
          reviewCount2: r2.google_review_count,
        });

        return { r1, r2, similarity, result };
      })
    );

    for (const { r1, r2, similarity, result } of results) {
      if (result.isDuplicate && result.confidence >= 0.7) {
        console.log(`   ✅ DUPLICATE: "${r1.name}" vs "${r2.name}" (confidence: ${result.confidence.toFixed(2)})`);

        duplicates.push({
          restaurants: [r1, r2],
          confidence: result.confidence,
          reasoning: result.reasoning,
          similarity,
        });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return duplicates;
}

async function scanForDuplicates(): Promise<DuplicateReport> {
  console.log('🚀 Starting duplicate restaurant scan...\n');

  const restaurants = await getAllRestaurants();
  console.log(`📊 Total restaurants: ${restaurants.length}`);

  const citiesMap = groupByCity(restaurants);
  console.log(`📍 Cities to scan: ${citiesMap.size}`);

  const allDuplicates: DuplicateGroup[] = [];
  let apiCalls = 0;

  for (const [cityName, cityRestaurants] of citiesMap.entries()) {
    if (cityRestaurants.length < 2) {
      continue;
    }

    const cityDuplicates = await findDuplicatesInCity(cityRestaurants, cityName);
    allDuplicates.push(...cityDuplicates);
    apiCalls += cityDuplicates.length;
  }

  const estimatedCost = (apiCalls * 150 * 0.05 / 1_000_000) + (apiCalls * 50 * 0.40 / 1_000_000);

  const report: DuplicateReport = {
    scannedAt: new Date().toISOString(),
    totalRestaurants: restaurants.length,
    citiesScanned: citiesMap.size,
    duplicateGroupsFound: allDuplicates.length,
    groups: allDuplicates.sort((a, b) => b.confidence - a.confidence),
    estimatedCost,
  };

  return report;
}

async function saveDuplicatesToDatabase(groups: DuplicateGroup[]): Promise<number> {
  let savedCount = 0;

  for (const group of groups) {
    const [r1, r2] = group.restaurants;
    
    const { error } = await supabase
      .from('duplicate_candidates')
      .insert({
        restaurant_ids: [r1.id, r2.id],
        confidence: group.confidence,
        reasoning: group.reasoning,
        status: 'pending',
      });

    if (error) {
      console.error(`   ⚠️  Failed to save duplicate: ${error.message}`);
    } else {
      savedCount++;
    }
  }

  return savedCount;
}

async function main() {
  try {
    console.log('🗄️  Clearing previous pending duplicates...');
    const { error: deleteError } = await supabase
      .from('duplicate_candidates')
      .delete()
      .eq('status', 'pending');

    if (deleteError) {
      console.error(`   ⚠️  Warning: Could not clear old results: ${deleteError.message}`);
    }

    const report = await scanForDuplicates();

    console.log('\n💾 Saving duplicate candidates to database...');
    const savedCount = await saveDuplicatesToDatabase(report.groups);

    console.log('\n\n✅ Scan complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total restaurants scanned: ${report.totalRestaurants}`);
    console.log(`   - Cities scanned: ${report.citiesScanned}`);
    console.log(`   - Duplicate pairs found: ${report.duplicateGroupsFound}`);
    console.log(`   - Saved to database: ${savedCount}`);
    console.log(`   - Estimated cost: $${report.estimatedCost.toFixed(4)}`);

    if (report.duplicateGroupsFound > 0) {
      console.log(`\n🔍 All duplicates found:\n`);
      report.groups.forEach((group, i) => {
        const [r1, r2] = group.restaurants;
        console.log(`${i + 1}. "${r1.name}" vs "${r2.name}"`);
        console.log(`   City: ${r1.city}, ${r1.state || 'N/A'}`);
        console.log(`   Confidence: ${group.confidence.toFixed(2)}`);
        console.log(`   IDs: ${r1.id} | ${r2.id}`);
        console.log('');
      });
      console.log(`\n👉 Review duplicates at: http://localhost:3003/admin/review`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
