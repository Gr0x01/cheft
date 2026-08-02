/**
 * Backfills chef portraits from Wikipedia / Wikimedia Commons.
 *
 * Chef photos were wiped in Dec 2025 because scraped Google Images carried
 * copyright liability (see memory archive: photo-legal-compliance.md). Wikimedia
 * is the only approved source: CC-BY-SA or public domain, commercial use allowed
 * with attribution. Chef pages render that attribution when photo_source =
 * 'wikipedia'. Do not add another source here without checking that plan first.
 *
 * The matching logic already lives in media-enricher / wikipedia-images; this is
 * just the runner. The orchestrator deliberately skips chef photos, so nothing
 * else drives it.
 *
 * Usage:
 *   npx tsx scripts/backfill-chef-photos.ts --dry-run          # report only, no writes
 *   npx tsx scripts/backfill-chef-photos.ts --limit 25         # cap count
 *   npx tsx scripts/backfill-chef-photos.ts                    # live, all missing
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createMediaEnricher } from './ingestion/processors/media-enricher';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : 1000;

  const { count: missing } = await supabase
    .from('chefs')
    .select('*', { count: 'exact', head: true })
    .is('photo_url', null);

  console.log('\n📸 Chef photo backfill — Wikipedia / Wikimedia Commons only\n');
  console.log(`   Mode:    ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`   Missing: ${missing ?? 0} chefs without a photo`);
  console.log(`   Limit:   ${limit}\n`);

  const enricher = createMediaEnricher(supabase, {});
  const found: string[] = [];
  let processed = 0;

  const results = await enricher.enrichAllChefsWithoutPhotos({
    limit,
    delayMs: 300,
    dryRun,
    onResult: (r) => {
      processed++;
      if (r.photoUrl) {
        found.push(r.chefName);
        console.log(`   ✅ ${r.chefName}\n      ${r.photoUrl}`);
      } else if (!r.success) {
        console.log(`   ⚠️  ${r.chefName} — ${r.error}`);
      }
      if (processed % 25 === 0) {
        console.log(`   … ${processed} processed, ${found.length} matched`);
      }
    },
  });

  const matched = results.filter(r => r.photoUrl).length;
  const failed = results.filter(r => !r.success).length;
  const rate = results.length ? Math.round((matched / results.length) * 100) : 0;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`   Processed: ${results.length}`);
  console.log(`   Matched:   ${matched} (${rate}%)`);
  console.log(`   No photo:  ${results.length - matched - failed}`);
  console.log(`   Errors:    ${failed}`);
  console.log(dryRun ? '\n   DRY RUN — nothing was written.\n' : '\n   Photos saved with photo_source=wikipedia.\n');
}

main().catch((err) => {
  console.error('\n❌ Backfill failed:', err);
  process.exit(1);
});
