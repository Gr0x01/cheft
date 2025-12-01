import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { Database } from '../../src/lib/database.types';
import { getEnabledShows, getWikipediaUrl } from './sources/registry';
import { getQueueStats } from './queue/review-queue';
import { getRecentChanges } from './queue/audit-log';
import { withRetry } from './utils/retry';

config({ path: '.env.local' });

interface OrchestratorOptions {
  discovery: boolean;
  statusCheck: boolean;
  dryRun: boolean;
}

interface PipelineReport {
  startTime: Date;
  endTime?: Date;
  options: OrchestratorOptions;
  showsProcessed: string[];
  discoveryResults?: {
    newChefsFound: number;
    queuedForReview: number;
    excluded: number;
  };
  statusCheckResults?: {
    restaurantsChecked: number;
    statusChanges: number;
  };
  errors: string[];
}

function parseArgs(): OrchestratorOptions {
  const args = process.argv.slice(2);
  return {
    discovery: args.includes('--discovery'),
    statusCheck: args.includes('--status-check'),
    dryRun: args.includes('--dry-run')
  };
}

async function runDiscoveryPipeline(
  supabase: SupabaseClient<Database>,
  dryRun: boolean
): Promise<PipelineReport['discoveryResults']> {
  const enabledShows = getEnabledShows();
  
  console.log(`\n📡 Discovery Pipeline`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Enabled shows: ${enabledShows.map(s => s.name).join(', ')}`);
  
  for (const show of enabledShows) {
    console.log(`\n   Processing: ${show.name}`);
    console.log(`   Wikipedia: ${getWikipediaUrl(show)}`);
    console.log(`   ⏳ Wikipedia scraper not yet implemented (Phase 2)`);
  }
  
  return {
    newChefsFound: 0,
    queuedForReview: 0,
    excluded: 0
  };
}

async function runStatusCheckPipeline(
  supabase: SupabaseClient<Database>,
  dryRun: boolean
): Promise<PipelineReport['statusCheckResults']> {
  console.log(`\n🔍 Status Check Pipeline`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  
  try {
    const { count } = await withRetry(() =>
      supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .then(res => {
          if (res.error) throw new Error(res.error.message);
          return res;
        })
    );
    console.log(`   Total restaurants in DB: ${count}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`   ❌ Failed to count restaurants: ${msg}`);
    return { restaurantsChecked: 0, statusChanges: 0 };
  }
  console.log(`   ⏳ LLM status verification not yet implemented (Phase 5)`);
  
  return {
    restaurantsChecked: 0,
    statusChanges: 0
  };
}

async function printSystemStatus(supabase: SupabaseClient<Database>) {
  console.log(`\n📊 System Status`);
  
  const queueStats = await getQueueStats(supabase);
  console.log(`   Review Queue:`);
  console.log(`     Pending: ${queueStats.pending}`);
  console.log(`     Approved: ${queueStats.approved}`);
  console.log(`     Rejected: ${queueStats.rejected}`);
  
  if (queueStats.pending > 0) {
    console.log(`     By type:`);
    if (queueStats.byType.new_chef > 0) console.log(`       - New chefs: ${queueStats.byType.new_chef}`);
    if (queueStats.byType.new_restaurant > 0) console.log(`       - New restaurants: ${queueStats.byType.new_restaurant}`);
    if (queueStats.byType.update > 0) console.log(`       - Updates: ${queueStats.byType.update}`);
    if (queueStats.byType.status_change > 0) console.log(`       - Status changes: ${queueStats.byType.status_change}`);
  }
  
  const recentChanges = await getRecentChanges(supabase, { limit: 5 });
  if (recentChanges.length > 0) {
    console.log(`\n   Recent Changes (last 5):`);
    for (const change of recentChanges) {
      console.log(`     - ${change.change_type} on ${change.table_name} (${change.source})`);
    }
  }
}

async function main() {
  const options = parseArgs();
  
  console.log('═'.repeat(60));
  console.log('🍳 TV Chef Map - Data Ingestion Orchestrator');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  
  if (!options.discovery && !options.statusCheck) {
    console.log('\n⚠️  No pipeline selected. Use --discovery or --status-check');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --discovery');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --status-check');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --discovery --dry-run');
    process.exit(1);
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Missing environment variables:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  
  const report: PipelineReport = {
    startTime: new Date(),
    options,
    showsProcessed: [],
    errors: []
  };
  
  try {
    if (options.discovery) {
      report.discoveryResults = await runDiscoveryPipeline(supabase, options.dryRun);
      report.showsProcessed = getEnabledShows().map(s => s.slug);
    }
    
    if (options.statusCheck) {
      report.statusCheckResults = await runStatusCheckPipeline(supabase, options.dryRun);
    }
    
    await printSystemStatus(supabase);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    report.errors.push(errorMessage);
    console.error(`\n❌ Pipeline error: ${errorMessage}`);
  }
  
  report.endTime = new Date();
  const duration = (report.endTime.getTime() - report.startTime.getTime()) / 1000;
  
  console.log('\n' + '═'.repeat(60));
  console.log('📋 Pipeline Report');
  console.log('═'.repeat(60));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  
  if (report.discoveryResults) {
    console.log(`Discovery: ${report.discoveryResults.newChefsFound} new chefs found`);
  }
  if (report.statusCheckResults) {
    console.log(`Status Check: ${report.statusCheckResults.restaurantsChecked} restaurants checked`);
  }
  if (report.errors.length > 0) {
    console.log(`Errors: ${report.errors.length}`);
    report.errors.forEach(e => console.log(`  - ${e}`));
  }
  
  console.log('\n✅ Orchestrator complete');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
