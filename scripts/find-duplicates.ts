import { createClient } from '@supabase/supabase-js';
import { checkForDuplicate, calculateNameSimilarity } from '../src/lib/duplicates/detector';
import * as fs from 'fs';
import * as path from 'path';

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
    .select('id, name, slug, city, state, address, google_place_id, google_rating, photo_urls, status, price_tier, website_url, chef_id')
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

      console.log(`   Comparing: "${r1.name}" vs "${r2.name}" (similarity: ${nameSimilarity.toFixed(2)})`);

      const result = await checkForDuplicate({
        name1: r1.name,
        name2: r2.name,
        city: r1.city,
        address1: r1.address,
        address2: r2.address,
        state: r1.state,
      });

      if (result.isDuplicate && result.confidence >= 0.7) {
        console.log(`   ✅ DUPLICATE FOUND (confidence: ${result.confidence.toFixed(2)})`);
        console.log(`      Reasoning: ${result.reasoning}`);

        duplicates.push({
          restaurants: [r1, r2],
          confidence: result.confidence,
          reasoning: result.reasoning,
          similarity: nameSimilarity,
        });
      } else if (result.confidence >= 0.5) {
        console.log(`   ⚠️  Possible duplicate (confidence: ${result.confidence.toFixed(2)})`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
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

async function main() {
  try {
    const report = await scanForDuplicates();

    const outputPath = path.join(process.cwd(), 'duplicate-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\n\n✅ Scan complete!');
    console.log(`📝 Report saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total restaurants scanned: ${report.totalRestaurants}`);
    console.log(`   - Cities scanned: ${report.citiesScanned}`);
    console.log(`   - Duplicate groups found: ${report.duplicateGroupsFound}`);
    console.log(`   - Estimated cost: $${report.estimatedCost.toFixed(4)}`);

    if (report.duplicateGroupsFound > 0) {
      console.log(`\n🔍 Top duplicates:`);
      report.groups.slice(0, 5).forEach((group, i) => {
        console.log(`   ${i + 1}. "${group.restaurants[0].name}" vs "${group.restaurants[1].name}"`);
        console.log(`      Confidence: ${group.confidence.toFixed(2)} | City: ${group.restaurants[0].city}`);
      });
    }

    console.log(`\n👉 Review duplicates at: http://localhost:3003/admin/duplicates`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
