/**
 * Chef Database Statistics Script
 * 
 * Shows current state of chef enrichment in the database.
 * 
 * Usage:
 *   npx tsx scripts/check-chef-stats.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: allChefs, error } = await supabase
    .from('chefs')
    .select('id, name, last_enriched_at');

  if (error) {
    console.error('Error fetching chefs:', error);
    return;
  }

  if (!allChefs) {
    console.log('No chefs found');
    return;
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const staleChefs = allChefs.filter(chef => 
    !chef.last_enriched_at || new Date(chef.last_enriched_at) < ninetyDaysAgo
  );

  const upToDate = allChefs.length - staleChefs.length;

  console.log('\n📊 Chef Database Statistics');
  console.log('='.repeat(50));
  console.log(`Total chefs: ${allChefs.length}`);
  console.log(`Stale chefs (90+ days or never enriched): ${staleChefs.length}`);
  console.log(`Up-to-date chefs: ${upToDate}`);
  
  const estimatedCost = (allChefs.length * 0.03).toFixed(2);
  console.log(`\n💰 Estimated FULL re-enrichment cost: $${estimatedCost}`);
  console.log(`   (All ${allChefs.length} chefs at ~$0.03/chef with gpt-4o-mini hybrid search)`);
  console.log(`\n⏱️  Estimated time: ${Math.ceil(allChefs.length * 20 / 60)} minutes`);
  console.log(`   (Based on ~20 seconds/chef with hybrid search)`);
  
  console.log('\n📖 Next steps:');
  console.log('   - Preview: npx tsx scripts/re-enrich-all-chefs.ts --limit=5 --dry-run');
  console.log('   - Run full: npx tsx scripts/re-enrich-all-chefs.ts');
  console.log('   - See guide: RE-ENRICHMENT-GUIDE.md');
}

main().catch(console.error);
