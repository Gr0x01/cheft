/**
 * Repairs restaurants whose photo_urls hold expired Google "place-photos"
 * links (these resolve to 403 after a while). For each affected restaurant
 * we re-fetch fresh photos from Google Places using the stored
 * google_place_id, download the bytes, and persist them in Supabase storage
 * so the URLs never expire again.
 *
 * Usage:
 *   npx tsx scripts/fix-broken-restaurant-photos.ts             # repair any broken photo
 *   npx tsx scripts/fix-broken-restaurant-photos.ts --first-only # only broken FIRST photo (card images)
 *   npx tsx scripts/fix-broken-restaurant-photos.ts --relookup   # re-resolve place_id via text search
 *   npx tsx scripts/fix-broken-restaurant-photos.ts --limit 50   # cap count
 *   npx tsx scripts/fix-broken-restaurant-photos.ts --dry-run    # report only
 *
 * --relookup handles the tail whose stored google_place_id is stale or missing
 * (getPlaceDetails returns null): it text-searches "name city state" for a fresh
 * place_id, then re-fetches and stores photos as usual. Also includes rows that
 * have no place_id at all.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createGooglePlacesService } from './ingestion/services/google-places';
import { createImageStorageService } from './ingestion/services/image-storage';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const placesService = createGooglePlacesService({ apiKey: googleApiKey });
const imageStorage = createImageStorageService(supabase);

const BROKEN_MARKER = '/place-photos/';

function isBroken(photoUrls: string[] | null, firstOnly: boolean): boolean {
  if (!photoUrls?.length) return false;
  return firstOnly
    ? photoUrls[0].includes(BROKEN_MARKER)
    : photoUrls.some(url => url.includes(BROKEN_MARKER));
}

async function fixBrokenPhotos(limit: number, dryRun: boolean, firstOnly: boolean, relookup: boolean) {
  console.log('\n🖼️  Repairing expired Google restaurant photos\n');
  console.log('='.repeat(60) + '\n');

  // Pull candidates with some photos and filter for broken links. In relookup
  // mode we also accept rows with no place_id (resolved via text search below).
  let query = supabase
    .from('restaurants')
    .select('id, name, city, state, google_place_id, photo_urls')
    .not('photo_urls', 'is', null);

  if (!relookup) {
    query = query.not('google_place_id', 'is', null);
  }

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('❌ Error fetching restaurants:', error.message);
    return;
  }

  const affected = (restaurants || [])
    .filter(r => isBroken(r.photo_urls as string[] | null, firstOnly))
    .slice(0, limit);

  console.log(`Found ${affected.length} restaurants with expired photos to repair\n`);

  if (dryRun) {
    affected.forEach((r, i) => console.log(`  [${i + 1}] ${r.name}`));
    console.log('\n(dry run — no changes made)\n');
    return;
  }

  let fixedCount = 0;
  let noPhotosCount = 0;
  let failCount = 0;

  for (let i = 0; i < affected.length; i++) {
    const rest = affected[i];
    const progress = `[${i + 1}/${affected.length}]`;

    try {
      console.log(`${progress} ${rest.name}`);

      // Resolve the place_id: use the stored one, or re-discover via text search
      // in relookup mode (handles stale/missing ids).
      let placeId = rest.google_place_id;
      if (relookup) {
        const queryStr = [rest.name, rest.city, rest.state].filter(Boolean).join(' ');
        const results = await placesService.textSearch(queryStr, { maxResults: 1 });
        placeId = results?.[0]?.placeId ?? null;
        if (!placeId) {
          console.log(`  ⚠️  No Google match found — left unchanged\n`);
          noPhotosCount++;
          continue;
        }
      }

      const details = await placesService.getPlaceDetails(placeId!, {
        includePhotos: true,
      });

      if (!details) {
        console.log(`  ⚠️  Place details unavailable — left unchanged\n`);
        noPhotosCount++;
        continue;
      }

      // Resolve fresh Google photo URLs (valid now), then persist the bytes.
      const resolved = await Promise.all(
        (details.photos || []).slice(0, 5).map(photo =>
          placesService.getPhotoUrl(photo.name, 1200)
        )
      );
      const validResolved = resolved.filter((url): url is string => url !== null);

      const storedUrls: string[] = [];
      for (let p = 0; p < validResolved.length; p++) {
        const upload = await imageStorage.downloadAndUploadRestaurantPhoto(
          rest.id,
          rest.name,
          validResolved[p],
          p
        );
        if (upload.success) {
          storedUrls.push(upload.publicUrl);
        }
      }

      if (storedUrls.length === 0) {
        console.log(`  ⚠️  No photos available — left unchanged\n`);
        noPhotosCount++;
        continue;
      }

      const updatePayload: Record<string, unknown> = {
        photo_urls: storedUrls,
        updated_at: new Date().toISOString(),
      };
      // Persist a freshly-discovered place_id so future refreshes use the valid one.
      if (relookup && placeId && placeId !== rest.google_place_id) {
        updatePayload.google_place_id = placeId;
      }

      const { error: updateError } = await supabase
        .from('restaurants')
        .update(updatePayload)
        .eq('id', rest.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}\n`);
        failCount++;
      } else {
        console.log(`  ✅ Stored ${storedUrls.length} photos to Supabase\n`);
        fixedCount++;
      }

      // Gentle rate limiting.
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Error: ${msg}\n`);
      failCount++;
    }
  }

  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   No photos available: ${noPhotosCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total processed: ${affected.length}\n`);

  const cost = placesService.getCostTracker();
  console.log('💰 Google Places cost:');
  console.log(`   Details calls: ${cost.detailsCalls}`);
  console.log(`   Photo calls: ${cost.photoCalls}`);
  console.log(`   Estimated: $${cost.estimatedCostUsd.toFixed(2)}\n`);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const firstOnly = args.includes('--first-only');
const relookup = args.includes('--relookup');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Number.MAX_SAFE_INTEGER;

fixBrokenPhotos(limit, dryRun, firstOnly, relookup);
