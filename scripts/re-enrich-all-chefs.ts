/**
 * Re-enrich All Chefs Script
 * 
 * Re-runs LLM enrichment for all chefs in the database using the refreshStaleChef workflow.
 * Supports parallel batch processing for faster execution.
 * 
 * Usage:
 *   npx tsx scripts/re-enrich-all-chefs.ts [options]
 * 
 * Options:
 *   --limit=N          Process only N chefs (default: all)
 *   --offset=N         Skip first N chefs (default: 0)
 *   --scope=TYPE       What to enrich: full, bio, shows, restaurants, status (default: full)
 *   --batch=N          Process N chefs in parallel (default: 1, recommended: 5-10)
 *   --dry-run          Preview what would happen without making changes
 * 
 * Examples:
 *   npx tsx scripts/re-enrich-all-chefs.ts --limit=5 --dry-run
 *   npx tsx scripts/re-enrich-all-chefs.ts --batch=10
 *   npx tsx scripts/re-enrich-all-chefs.ts --scope=shows --batch=20
 *   npx tsx scripts/re-enrich-all-chefs.ts --limit=50 --batch=5 --scope=bio
 * 
 * Performance:
 *   Sequential (--batch=1):  ~80 minutes for 238 chefs
 *   Batch 5:                 ~16 minutes for 238 chefs
 *   Batch 10:                ~8 minutes for 238 chefs
 *   Batch 20:                ~4 minutes for 238 chefs
 * 
 * Cost: ~$0.03 per chef for full enrichment (same regardless of batch size)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '999999');
  const offset = parseInt(args.find(arg => arg.startsWith('--offset='))?.split('=')[1] || '0');
  const scope = args.find(arg => arg.startsWith('--scope='))?.split('=')[1] || 'full';
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '1');
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Re-enriching all chefs...\n');
  console.log(`   Scope: ${scope} (bio, shows, restaurants)`);
  console.log(`   Limit: ${limit === 999999 ? 'all' : limit}`);
  console.log(`   Offset: ${offset}`);
  console.log(`   Batch size: ${batchSize} (parallel processing)`);
  console.log(`   Dry run: ${dryRun ? 'YES (no DB changes)' : 'NO'}\n`);

  const { data: chefs, error } = await supabase
    .from('chefs')
    .select('id, name')
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch chefs: ${error.message}`);
  }

  if (!chefs || chefs.length === 0) {
    console.log('No chefs found.');
    return;
  }

  console.log(`📊 Found ${chefs.length} chefs to re-enrich\n`);

  const estimatedCost = (chefs.length * 0.03).toFixed(2);
  const sequentialTime = Math.ceil(chefs.length * 20 / 60);
  const parallelTime = Math.ceil(chefs.length * 20 / 60 / batchSize);
  
  console.log(`💰 Estimated cost: $${estimatedCost}`);
  console.log(`⏱️  Estimated time: ${batchSize > 1 ? `${parallelTime} minutes (with batch=${batchSize})` : `${sequentialTime} minutes`}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const enricher = createLLMEnricher(supabase, {
    model: 'gpt-4o-mini',
  });

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalShowsSaved = 0;
  let totalRestaurantsSaved = 0;

  async function processChef(chef: { id: string; name: string }, index: number) {
    console.log(`\n[${index + 1}/${chefs.length}] Re-enriching: ${chef.name}`);

    if (dryRun) {
      console.log(`   🔍 Would enrich ${scope} data for ${chef.name}`);
      return { success: true, showsSaved: 0, restaurantsSaved: 0 };
    }

    try {
      const scopeConfig = {
        bio: scope === 'full' || scope === 'bio',
        shows: scope === 'full' || scope === 'shows',
        restaurants: scope === 'full' || scope === 'restaurants',
        restaurantStatus: scope === 'status',
      };

      const result = await enricher.workflows.refreshStaleChef({
        chefId: chef.id,
        chefName: chef.name,
        scope: scopeConfig,
        dryRun: false,
      });

      if (result.success) {
        const showsSaved = result.output?.showsUpdated || 0;
        const restaurantsSaved = result.output?.restaurantsUpdated || 0;
        
        if (result.output) {
          console.log(`   ✅ Success:`);
          if (result.output.bioUpdated) console.log(`      - Bio updated`);
          if (result.output.showsUpdated) console.log(`      - Shows: ${result.output.showsUpdated} updated`);
          if (result.output.restaurantsUpdated) console.log(`      - Restaurants: ${result.output.restaurantsUpdated} updated`);
          if (result.output.statusesVerified) console.log(`      - Statuses: ${result.output.statusesVerified} verified`);
        }
        console.log(`   📊 Cost: $${result.totalCost.estimatedUsd.toFixed(4)} (${result.totalCost.tokens.total.toLocaleString()} tokens)`);
        console.log(`   ⏱️  Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
        
        return { success: true, showsSaved, restaurantsSaved };
      } else {
        console.log(`   ❌ Failed: ${result.errors?.[0] || 'Unknown error'}`);
        return { success: false, showsSaved: 0, restaurantsSaved: 0 };
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, showsSaved: 0, restaurantsSaved: 0 };
    }
  }

  for (let i = 0; i < chefs.length; i += batchSize) {
    const batch = chefs.slice(i, i + batchSize);
    
    if (batchSize > 1) {
      console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} chefs in parallel)...`);
    }

    const results = await Promise.all(
      batch.map((chef, idx) => processChef(chef, i + idx))
    );

    results.forEach(result => {
      if (result.success) {
        totalSuccess++;
        totalShowsSaved += result.showsSaved;
        totalRestaurantsSaved += result.restaurantsSaved;
      } else {
        totalFailed++;
      }
    });

    if (i + batchSize < chefs.length && !dryRun) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const tokens = enricher.getTotalTokensUsed();
  const cost = enricher.estimateCost();

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 Re-enrichment Summary');
  console.log('='.repeat(80));
  console.log(`Chefs processed: ${chefs.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total shows saved: ${totalShowsSaved}`);
  console.log(`Total restaurants saved: ${totalRestaurantsSaved}`);
  console.log(`\nTokens used: ${tokens.total.toLocaleString()}`);
  console.log(`Actual cost: $${cost.toFixed(2)}`);
  console.log(`Model: ${enricher.getModelName()}`);
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
