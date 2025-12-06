import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function normalizeSeasons() {
  console.log('🔄 Starting season normalization backfill...\n');

  const { data: chefShows, error } = await supabase
    .from('chef_shows')
    .select('id, season, season_name, chefs(name), shows(name)')
    .not('season', 'is', null);

  if (error) {
    console.error('❌ Error fetching chef_shows:', error);
    process.exit(1);
  }

  if (!chefShows || chefShows.length === 0) {
    console.log('✅ No chef_shows records to process');
    return;
  }

  console.log(`📊 Found ${chefShows.length} chef_show records with seasons\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const cs of chefShows) {
    const original = cs.season;
    const normalized = normalizeSeason(original);

    if (original === normalized) {
      skipped++;
      continue;
    }

    const updates: any = { season: normalized };

    if (!cs.season_name || cs.season_name.trim() === '' || cs.season_name === original) {
      updates.season_name = original;
      console.log(`   📝 ${(cs as any).chefs?.name || 'Unknown'} - ${(cs as any).shows?.name || 'Unknown'}`);
      console.log(`      "${original}" → "${normalized}" (preserved in season_name)`);
    } else {
      console.log(`   📝 ${(cs as any).chefs?.name || 'Unknown'} - ${(cs as any).shows?.name || 'Unknown'}`);
      console.log(`      "${original}" → "${normalized}" (keeping existing season_name: "${cs.season_name}")`);
    }

    const { error: updateError } = await supabase
      .from('chef_shows')
      .update(updates)
      .eq('id', cs.id);

    if (updateError) {
      console.error(`   ❌ Error updating record ${cs.id}:`, updateError.message);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\n✅ Backfill complete:`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Skipped (already normalized): ${skipped}`);
  console.log(`   - Errors: ${errors}`);

  console.log(`\n📊 Checking distinct season values after normalization...`);
  const { data: distinctSeasons } = await supabase
    .from('chef_shows')
    .select('season, season_name')
    .not('season', 'is', null);

  if (distinctSeasons) {
    const uniqueSeasons = new Map<string, Set<string>>();
    distinctSeasons.forEach(cs => {
      if (!uniqueSeasons.has(cs.season)) {
        uniqueSeasons.set(cs.season, new Set());
      }
      if (cs.season_name) {
        uniqueSeasons.get(cs.season)!.add(cs.season_name);
      }
    });

    console.log(`\nTotal unique season values: ${uniqueSeasons.size}`);
    const problemSeasons = Array.from(uniqueSeasons.entries())
      .filter(([season]) => 
        season.toLowerCase().includes('season') || 
        season.toLowerCase().includes('episode') ||
        season.toLowerCase().includes('various') ||
        season.includes(',') ||
        season.includes('(')
      );

    if (problemSeasons.length > 0) {
      console.log(`\n⚠️  Found ${problemSeasons.length} seasons that may need manual review:`);
      problemSeasons.slice(0, 10).forEach(([season, names]) => {
        console.log(`   - "${season}" (from: ${Array.from(names).join(', ')})`);
      });
    } else {
      console.log(`\n✅ All seasons appear normalized!`);
    }
  }
}

function normalizeSeason(season: string | null): string | null {
  if (!season) return null;

  let normalized = season.trim();

  if (/^Season\s+\d+,/i.test(normalized)) {
    normalized = normalized.replace(/^Season\s+(\d+),.*/i, '$1');
    return normalized.trim();
  }

  normalized = normalized.replace(/^Season\s+/i, '');
  normalized = normalized.replace(/^Episode\s+/i, '');

  if (/^\d+\s*\(\d{4}\)/.test(normalized)) {
    normalized = normalized.replace(/^(\d+)\s*\(.*\)/, '$1');
  }

  if (/^\d+,.*/.test(normalized)) {
    normalized = normalized.replace(/^(\d+),.*/, '$1');
  }

  if (/^[A-Za-z]+\s+\d+,\s*\d{4}/.test(normalized)) {
    normalized = normalized.replace(/^.*,\s*(\d{4}).*/, '$1');
  }

  if (/^various\s*\(.*\)/i.test(normalized)) {
    normalized = normalized.replace(/^various\s*\((\d{4}).*\).*/i, '$1');
  }

  if (/^\d{4},\s*\d{4}/.test(normalized)) {
    normalized = normalized.replace(/^(\d{4}),.*/, '$1');
  }

  if (/".*"\s*\(\d{4}\)/.test(normalized)) {
    normalized = normalized.replace(/.*\((\d{4})\).*/, '$1');
  }

  if (/\(\d{4}\)/.test(normalized)) {
    normalized = normalized.replace(/.*\((\d{4})\).*/, '$1');
  }

  return normalized.trim();
}

normalizeSeasons().catch(console.error);
