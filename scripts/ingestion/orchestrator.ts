import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { Database } from '../../src/lib/database.types';
import { getEnabledShows } from './sources/registry';
import { scrapeWikipediaContestants, ScrapeResult } from './sources/wikipedia';
import { 
  loadExistingChefs, 
  detectChanges, 
  summarizeChanges,
  shouldAutoApply,
  ChangeDetectionResult,
  DetectedChange
} from './processors/change-detector';
import { getQueueStats, addToReviewQueue } from './queue/review-queue';
import { getRecentChanges, logDataChange } from './queue/audit-log';
import { getExcludedNamesSet, addExcludedName, getExcludedNamesStats } from './queue/excluded-names';
import { filterChefCandidate, ChefCandidate } from './processors/llm-filter';
import { createLLMEnricher } from './processors/llm-enricher';
import { createMediaEnricher } from './processors/media-enricher';
import { withRetry } from './utils/retry';

config({ path: '.env.local' });

interface OrchestratorOptions {
  discovery: boolean;
  statusCheck: boolean;
  enrich: boolean;
  enrichBios: boolean;
  enrichRestaurantsOnly: boolean;
  filter: boolean;
  dryRun: boolean;
  limit: number;
}

interface PipelineReport {
  startTime: Date;
  endTime?: Date;
  options: OrchestratorOptions;
  showsProcessed: string[];
  discoveryResults?: {
    newChefsFound: number;
    queuedForReview: number;
    autoApplied: number;
    filteredOut: number;
    skippedExcluded: number;
  };
  statusCheckResults?: {
    restaurantsChecked: number;
    statusChanges: number;
  };
  enrichmentResults?: {
    chefsProcessed: number;
    chefsWithPhotos: number;
    restaurantsProcessed: number;
    restaurantsWithPlaceId: number;
    googlePlacesCost: number;
  };
  bioEnrichmentResults?: {
    chefsProcessed: number;
    chefsWithBios: number;
    restaurantsDiscovered: number;
  };
  restaurantEnrichmentResults?: {
    chefsProcessed: number;
    newRestaurants: number;
    existingRestaurants: number;
  };
  llmStats?: {
    totalCalls: number;
    totalTokens: number;
    estimatedCost: number;
  };
  errors: string[];
}

function parseArgs(): OrchestratorOptions {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 && args[limitIndex + 1]
    ? parseInt(args[limitIndex + 1], 10)
    : 10;
  
  return {
    discovery: args.includes('--discovery'),
    statusCheck: args.includes('--status-check'),
    enrich: args.includes('--enrich'),
    enrichBios: args.includes('--enrich-bios'),
    enrichRestaurantsOnly: args.includes('--enrich-restaurants-only'),
    filter: args.includes('--filter'),
    dryRun: args.includes('--dry-run'),
    limit: isNaN(limit) ? 10 : limit,
  };
}

async function applyHighConfidenceUpdate(
  supabase: SupabaseClient<Database>,
  change: DetectedChange,
  dryRun: boolean
): Promise<boolean> {
  if (!change.existing || !change.scraped) return false;
  
  if (dryRun) {
    console.log(`     [DRY RUN] Would update: ${change.details}`);
    return true;
  }

  try {
    if (change.type === 'update_season' || change.type === 'update_result') {
      const showResult = await supabase
        .from('shows')
        .select('id')
        .eq('slug', change.showSlug)
        .single();
      
      if (showResult.error || !showResult.data) {
        console.error(`     ❌ Show not found: ${change.showSlug}`);
        return false;
      }

      const existingEntry = change.existing.shows.find(s => s.show?.slug === change.showSlug);
      
      if (existingEntry) {
        const updateData: Partial<{
          season: string | null;
          season_name: string | null;
          result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
        }> = {};
        if (change.scraped.season) updateData.season = change.scraped.season;
        if (change.scraped.seasonName) updateData.season_name = change.scraped.seasonName;
        if (change.scraped.result) updateData.result = change.scraped.result;

        const { error: updateError } = await (supabase
          .from('chef_shows') as ReturnType<typeof supabase.from>)
          .update(updateData)
          .eq('id', existingEntry.id);
        if (updateError) throw new Error(updateError.message);

        await logDataChange(supabase, {
          table_name: 'chef_shows',
          record_id: existingEntry.id,
          change_type: 'update',
          old_data: {
            season: existingEntry.season,
            season_name: existingEntry.season_name,
            result: existingEntry.result
          },
          new_data: updateData,
          source: 'auto_update',
          confidence: change.confidence
        });

        console.log(`     ✅ Auto-applied: ${change.details}`);
        return true;
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`     ❌ Failed to apply update: ${msg}`);
  }

  return false;
}

async function queueNewChef(
  supabase: SupabaseClient<Database>,
  change: DetectedChange,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) {
    console.log(`     [DRY RUN] Would queue for review: ${change.scraped.name} (confidence: ${(change.confidence * 100).toFixed(0)}%)`);
    return true;
  }

  const result = await addToReviewQueue(supabase, {
    type: 'new_chef',
    data: {
      name: change.scraped.name,
      slug: change.scraped.slug,
      season: change.scraped.season,
      seasonName: change.scraped.seasonName,
      result: change.scraped.result,
      hometown: change.scraped.hometown,
      sourceUrl: change.scraped.sourceUrl
    },
    source: 'wikipedia_discovery',
    confidence: change.confidence,
    notes: change.details
  });

  if (result.success) {
    console.log(`     📋 Queued for review: ${change.scraped.name}`);
  } else {
    console.error(`     ❌ Failed to queue: ${result.error}`);
  }

  return result.success;
}

interface LLMStats {
  totalCalls: number;
  totalTokens: number;
  estimatedCost: number;
}

async function runDiscoveryPipeline(
  supabase: SupabaseClient<Database>,
  options: { dryRun: boolean; filter: boolean },
  llmStats: LLMStats
): Promise<PipelineReport['discoveryResults']> {
  const { dryRun, filter } = options;
  const enabledShows = getEnabledShows();
  
  console.log(`\n📡 Discovery Pipeline`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Enabled shows: ${enabledShows.map(s => s.name).join(', ')}`);
  
  if (enabledShows.length === 0) {
    console.log('   ⚠️  No shows enabled in config');
    return { newChefsFound: 0, queuedForReview: 0, autoApplied: 0, filteredOut: 0, skippedExcluded: 0 };
  }

  console.log(`\n📥 Loading existing chef data...`);
  const existingChefs = await loadExistingChefs(supabase);

  const scrapeResults: ScrapeResult[] = [];
  const changeResults: ChangeDetectionResult[] = [];

  for (const show of enabledShows) {
    console.log(`\n📺 Processing: ${show.name}`);
    
    const scrapeResult = await scrapeWikipediaContestants(show);
    scrapeResults.push(scrapeResult);
    
    if (scrapeResult.contestants.length > 0) {
      const changes = await detectChanges(supabase, scrapeResult, existingChefs);
      changeResults.push(changes);
    }
  }

  summarizeChanges(changeResults);

  let totalNewChefs = 0;
  let totalQueued = 0;
  let totalAutoApplied = 0;
  let totalFilteredOut = 0;
  let totalSkippedExcluded = 0;

  const excludedNames = filter ? await getExcludedNamesSet(supabase) : new Set<string>();
  if (filter && excludedNames.size > 0) {
    console.log(`   Loaded ${excludedNames.size} excluded names`);
  }

  console.log(`\n⚡ Processing Changes...`);
  
  for (const result of changeResults) {
    totalNewChefs += result.newChefs.length;

    for (const change of result.newChefs) {
      if (excludedNames.has(change.scraped.name)) {
        console.log(`     ⏭️  Skipped (excluded): ${change.scraped.name}`);
        totalSkippedExcluded++;
        continue;
      }

      if (filter) {
        const show = enabledShows.find(s => s.slug === change.showSlug);
        const candidate: ChefCandidate = {
          name: change.scraped.name,
          showName: show?.name || change.showSlug,
          season: change.scraped.season,
          result: change.scraped.result,
          hometown: change.scraped.hometown,
        };

        if (dryRun) {
          console.log(`     [DRY RUN] Would filter: ${change.scraped.name}`);
        } else {
          const filterResult = await filterChefCandidate(candidate);
          llmStats.totalCalls++;
          llmStats.totalTokens += filterResult.tokensUsed.total;
          llmStats.estimatedCost += (filterResult.tokensUsed.prompt * 0.15 / 1_000_000) + 
                                    (filterResult.tokensUsed.completion * 0.60 / 1_000_000);

          if (!filterResult.isChef) {
            console.log(`     🚫 Filtered out: ${change.scraped.name} (${filterResult.reason})`);
            await addExcludedName(supabase, {
              name: change.scraped.name,
              showId: show?.slug,
              reason: filterResult.reason,
              source: 'llm_filter',
            });
            totalFilteredOut++;
            continue;
          } else {
            console.log(`     ✅ Passed filter: ${change.scraped.name} (${(filterResult.confidence * 100).toFixed(0)}% confident)`);
          }
        }
      }

      const queued = await queueNewChef(supabase, change, dryRun);
      if (queued) totalQueued++;
    }

    for (const change of result.updates) {
      if (shouldAutoApply(change)) {
        const applied = await applyHighConfidenceUpdate(supabase, change, dryRun);
        if (applied) totalAutoApplied++;
      } else {
        await addToReviewQueue(supabase, {
          type: 'update',
          data: {
            chefSlug: change.scraped.slug,
            chefName: change.scraped.name,
            ...change.scraped
          },
          source: 'wikipedia_discovery',
          confidence: change.confidence,
          notes: change.details
        });
        totalQueued++;
      }
    }
  }

  return {
    newChefsFound: totalNewChefs,
    queuedForReview: totalQueued,
    autoApplied: totalAutoApplied,
    filteredOut: totalFilteredOut,
    skippedExcluded: totalSkippedExcluded,
  };
}

async function runStatusCheckPipeline(
  supabase: SupabaseClient<Database>,
  dryRun: boolean,
  llmStats: LLMStats
): Promise<PipelineReport['statusCheckResults']> {
  console.log(`\n🔍 Status Check Pipeline`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  
  const llmEnricher = createLLMEnricher(supabase);
  let restaurantsChecked = 0;
  let statusChanges = 0;

  try {
    type RestaurantWithChef = {
      id: string;
      name: string;
      city: string;
      state: string | null;
      status: string;
      last_verified_at: string | null;
      chefs: { name: string };
    };

    const result = await supabase
      .from('restaurants')
      .select(`
        id, name, city, state, status, last_verified_at,
        chefs!inner(name)
      `)
      .eq('status', 'open')
      .or('last_verified_at.is.null,last_verified_at.lt.' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    const restaurants = result.data as RestaurantWithChef[] | null;
    const error = result.error;

    if (error) throw new Error(error.message);
    
    console.log(`   Found ${restaurants?.length || 0} restaurants needing verification`);

    if (restaurants && restaurants.length > 0) {
      for (const restaurant of restaurants) {
        const chefName = restaurant.chefs?.name || 'Unknown';
        
        if (dryRun) {
          console.log(`     [DRY RUN] Would verify: ${restaurant.name}`);
          restaurantsChecked++;
          continue;
        }

        const verifyResult = await llmEnricher.verifyAndUpdateStatus(
          restaurant.id,
          restaurant.name,
          chefName,
          restaurant.city,
          restaurant.state ?? undefined,
          { dryRun: false, minConfidence: 0.7 }
        );

        restaurantsChecked++;
        
        if (verifyResult.success && verifyResult.status !== restaurant.status) {
          statusChanges++;
          console.log(`     📝 ${restaurant.name}: ${restaurant.status} → ${verifyResult.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const tokens = llmEnricher.getTotalTokensUsed();
      llmStats.totalCalls += restaurantsChecked;
      llmStats.totalTokens += tokens.total;
      llmStats.estimatedCost += llmEnricher.estimateCost();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`   ❌ Status check error: ${msg}`);
  }
  
  return {
    restaurantsChecked,
    statusChanges
  };
}

async function runEnrichmentPipeline(
  supabase: SupabaseClient<Database>,
  dryRun: boolean,
  llmStats: LLMStats,
  limit: number
): Promise<PipelineReport['enrichmentResults']> {
  console.log(`\n🎨 Enrichment Pipeline`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit} items per type`);
  
  const mediaEnricher = createMediaEnricher(supabase, {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    maxPhotosPerRestaurant: 3,
    photoMaxWidth: 800,
  });

  const llmEnricher = createLLMEnricher(supabase);

  let chefsProcessed = 0;
  let chefsWithPhotos = 0;
  let restaurantsProcessed = 0;
  let restaurantsWithPlaceId = 0;

  try {
    console.log(`\n   📸 Enriching chef photos...`);
    if (!dryRun) {
      const chefResults = await mediaEnricher.enrichAllChefsWithoutPhotos({ limit, delayMs: 500 });
      chefsProcessed = chefResults.length;
      chefsWithPhotos = chefResults.filter(r => r.photoUrl).length;
      console.log(`     Processed ${chefsProcessed} chefs, found photos for ${chefsWithPhotos}`);
    } else {
      const { count } = await supabase
        .from('chefs')
        .select('*', { count: 'exact', head: true })
        .is('photo_url', null);
      console.log(`     [DRY RUN] Would process up to ${limit} of ${count || 0} chefs without photos`);
    }

    if (process.env.GOOGLE_PLACES_API_KEY) {
      console.log(`\n   🗺️  Enriching restaurant Google Places data...`);
      if (!dryRun) {
        const restaurantResults = await mediaEnricher.enrichAllRestaurantsWithoutPlaceId({ 
          limit, 
          delayMs: 200,
          minConfidence: 0.7 
        });
        restaurantsProcessed = restaurantResults.length;
        restaurantsWithPlaceId = restaurantResults.filter(r => r.googlePlaceId).length;
        console.log(`     Processed ${restaurantsProcessed} restaurants, matched ${restaurantsWithPlaceId}`);
      } else {
        const { count } = await supabase
          .from('restaurants')
          .select('*', { count: 'exact', head: true })
          .is('google_place_id', null)
          .in('status', ['open', 'unknown']);
        console.log(`     [DRY RUN] Would process up to ${limit} of ${count || 0} restaurants without Place ID`);
      }
    } else {
      console.log(`\n   ⚠️  GOOGLE_PLACES_API_KEY not set, skipping restaurant enrichment`);
    }

    const stats = mediaEnricher.getStats();
    const tokens = llmEnricher.getTotalTokensUsed();
    llmStats.totalTokens += tokens.total;
    llmStats.estimatedCost += llmEnricher.estimateCost();

    return {
      chefsProcessed,
      chefsWithPhotos,
      restaurantsProcessed,
      restaurantsWithPlaceId,
      googlePlacesCost: stats.googlePlacesCost.estimatedCostUsd,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`   ❌ Enrichment error: ${msg}`);
    return {
      chefsProcessed,
      chefsWithPhotos,
      restaurantsProcessed,
      restaurantsWithPlaceId,
      googlePlacesCost: 0,
    };
  }
}

async function runBioEnrichmentPipeline(
  supabase: SupabaseClient<Database>,
  dryRun: boolean,
  llmStats: LLMStats,
  limit: number
): Promise<PipelineReport['bioEnrichmentResults']> {
  console.log(`\n📝 Bio Enrichment Pipeline`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit} chefs`);

  const llmEnricher = createLLMEnricher(supabase);

  let chefsProcessed = 0;
  let chefsWithBios = 0;
  let restaurantsDiscovered = 0;

  try {
    type ChefWithShow = {
      id: string;
      name: string;
      chef_shows: Array<{
        season: string | null;
        result: string | null;
        shows: { name: string } | null;
      }>;
    };

    const result = await supabase
      .from('chefs')
      .select(`
        id, name,
        chef_shows(season, result, shows(name))
      `)
      .is('mini_bio', null)
      .limit(limit);

    const chefs = result.data as ChefWithShow[] | null;
    const error = result.error;

    if (error) throw new Error(error.message);

    console.log(`   Found ${chefs?.length || 0} chefs without bios`);

    if (dryRun) {
      const { count } = await supabase
        .from('chefs')
        .select('*', { count: 'exact', head: true })
        .is('mini_bio', null);
      console.log(`     [DRY RUN] Would process up to ${limit} of ${count || 0} chefs without bios`);
      return { chefsProcessed: 0, chefsWithBios: 0, restaurantsDiscovered: 0 };
    }

    if (chefs && chefs.length > 0) {
      console.log(`     Processing ${chefs.length} chefs in parallel...`);
      
      const enrichPromises = chefs.map(async (chef) => {
        const showInfo = chef.chef_shows?.[0];
        const showName = showInfo?.shows?.name || 'Top Chef';
        const season = showInfo?.season || undefined;
        const chefResult = showInfo?.result || undefined;

        console.log(`     Processing: ${chef.name}...`);

        const enrichResult = await llmEnricher.enrichAndSaveChef(
          chef.id,
          chef.name,
          showName,
          { season, result: chefResult, dryRun: false }
        );

        if (enrichResult.success && enrichResult.miniBio) {
          console.log(`       ✅ ${chef.name}: Bio generated (${enrichResult.miniBio.length} chars)`);
          
          if (enrichResult.restaurants.length > 0) {
            console.log(`       🍽️  ${chef.name}: Found ${enrichResult.restaurants.length} restaurants`);
          }
        } else if (enrichResult.error) {
          console.log(`       ❌ ${chef.name}: ${enrichResult.error}`);
        }

        return enrichResult;
      });

      const results = await Promise.all(enrichPromises);
      
      chefsProcessed = results.length;
      chefsWithBios = results.filter(r => r.success && r.miniBio).length;
      restaurantsDiscovered = results.reduce((sum, r) => sum + r.restaurants.length, 0);

      const tokens = llmEnricher.getTotalTokensUsed();
      llmStats.totalCalls += chefsProcessed;
      llmStats.totalTokens += tokens.total;
      llmStats.estimatedCost += llmEnricher.estimateCost();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`   ❌ Bio enrichment error: ${msg}`);
  }

  return {
    chefsProcessed,
    chefsWithBios,
    restaurantsDiscovered,
  };
}

async function enrichRestaurantsOnly(
  supabase: SupabaseClient<Database>,
  llmEnricher: ReturnType<typeof createLLMEnricher>,
  llmStats: { totalCalls: number; totalTokens: number; estimatedCost: number },
  options: { dryRun: boolean; limit: number }
): Promise<{ chefsProcessed: number; newRestaurants: number; existingRestaurants: number }> {
  console.log(`\n🍽️  Restaurant-only Enrichment`);
  
  let chefsProcessed = 0;
  let totalNewRestaurants = 0;
  let totalExistingRestaurants = 0;

  try {
    const { data: chefs } = await supabase
      .from('chefs')
      .select('id, name, slug, mini_bio, chef_shows(shows(name), season, result)')
      .not('mini_bio', 'is', null)
      .limit(options.limit);

    const { count } = await supabase
      .from('chefs')
      .select('*', { count: 'exact', head: true })
      .not('mini_bio', 'is', null);

    console.log(`     Found ${count || 0} chefs with bios`);

    if (options.dryRun) {
      console.log(`     [DRY RUN] Would process up to ${options.limit} of ${count || 0} chefs`);
      return { chefsProcessed: 0, newRestaurants: 0, existingRestaurants: 0 };
    }

    if (chefs && chefs.length > 0) {
      console.log(`     Processing ${chefs.length} chefs in parallel...`);
      
      const enrichPromises = chefs.map(async (chef) => {
        const showInfo = chef.chef_shows?.[0];
        const showName = showInfo?.shows?.name || 'Top Chef';
        const season = showInfo?.season || undefined;
        const chefResult = showInfo?.result || undefined;

        console.log(`     Processing: ${chef.name}...`);

        const enrichResult = await llmEnricher.findAndSaveRestaurants(
          chef.id,
          chef.name,
          showName,
          { season, result: chefResult, dryRun: false }
        );

        if (enrichResult.success) {
          console.log(`       ✅ ${chef.name}: Found ${enrichResult.restaurants.length} restaurants`);
          
          if (enrichResult.newRestaurants > 0) {
            console.log(`       🍽️  ${chef.name}: Saved ${enrichResult.newRestaurants} new (${enrichResult.existingRestaurants} already existed)`);
          }
        } else if (enrichResult.error) {
          console.log(`       ❌ ${chef.name}: ${enrichResult.error}`);
        }

        return enrichResult;
      });

      const results = await Promise.all(enrichPromises);
      
      chefsProcessed = results.length;
      totalNewRestaurants = results.reduce((sum, r) => sum + r.newRestaurants, 0);
      totalExistingRestaurants = results.reduce((sum, r) => sum + r.existingRestaurants, 0);

      const tokens = llmEnricher.getTotalTokensUsed();
      llmStats.totalCalls += chefsProcessed;
      llmStats.totalTokens += tokens.total;
      llmStats.estimatedCost += llmEnricher.estimateCost();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`   ❌ Restaurant enrichment error: ${msg}`);
  }

  return {
    chefsProcessed,
    newRestaurants: totalNewRestaurants,
    existingRestaurants: totalExistingRestaurants,
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
  
  if (!options.discovery && !options.statusCheck && !options.enrich && !options.enrichBios && !options.enrichRestaurantsOnly) {
    console.log('\n⚠️  No pipeline selected. Use --discovery, --status-check, --enrich, --enrich-bios, or --enrich-restaurants-only');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --discovery');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --discovery --filter');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --status-check');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --enrich');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --enrich --limit 10');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --enrich-bios --limit 5');
    console.log('  npx tsx scripts/ingestion/orchestrator.ts --enrich-restaurants-only --limit 10');
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
  
  const llmStats: LLMStats = {
    totalCalls: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };

  const report: PipelineReport = {
    startTime: new Date(),
    options,
    showsProcessed: [],
    errors: []
  };
  
  try {
    if (options.discovery) {
      report.discoveryResults = await runDiscoveryPipeline(
        supabase, 
        { dryRun: options.dryRun, filter: options.filter },
        llmStats
      );
      report.showsProcessed = getEnabledShows().map(s => s.slug);
      if (llmStats.totalCalls > 0) {
        report.llmStats = llmStats;
      }
    }
    
    if (options.statusCheck) {
      report.statusCheckResults = await runStatusCheckPipeline(supabase, options.dryRun, llmStats);
    }

    if (options.enrich) {
      report.enrichmentResults = await runEnrichmentPipeline(supabase, options.dryRun, llmStats, options.limit);
      if (llmStats.totalCalls > 0 || llmStats.totalTokens > 0) {
        report.llmStats = llmStats;
      }
    }

    if (options.enrichBios) {
      report.bioEnrichmentResults = await runBioEnrichmentPipeline(supabase, options.dryRun, llmStats, options.limit);
      if (llmStats.totalCalls > 0 || llmStats.totalTokens > 0) {
        report.llmStats = llmStats;
      }
    }

    if (options.enrichRestaurantsOnly) {
      const llmEnricher = createLLMEnricher(supabase);
      report.restaurantEnrichmentResults = await enrichRestaurantsOnly(supabase, llmEnricher, llmStats, options);
      if (llmStats.totalCalls > 0 || llmStats.totalTokens > 0) {
        report.llmStats = llmStats;
      }
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
    console.log(`Discovery:`);
    console.log(`  - New chefs found: ${report.discoveryResults.newChefsFound}`);
    console.log(`  - Queued for review: ${report.discoveryResults.queuedForReview}`);
    console.log(`  - Auto-applied updates: ${report.discoveryResults.autoApplied}`);
    if (report.discoveryResults.filteredOut > 0 || report.discoveryResults.skippedExcluded > 0) {
      console.log(`  - Filtered out (non-chef): ${report.discoveryResults.filteredOut}`);
      console.log(`  - Skipped (already excluded): ${report.discoveryResults.skippedExcluded}`);
    }
  }
  if (report.llmStats) {
    console.log(`LLM Usage:`);
    console.log(`  - API calls: ${report.llmStats.totalCalls}`);
    console.log(`  - Total tokens: ${report.llmStats.totalTokens}`);
    console.log(`  - Estimated cost: $${report.llmStats.estimatedCost.toFixed(4)}`);
  }
  if (report.statusCheckResults) {
    console.log(`Status Check:`);
    console.log(`  - Restaurants checked: ${report.statusCheckResults.restaurantsChecked}`);
    console.log(`  - Status changes: ${report.statusCheckResults.statusChanges}`);
  }
  if (report.enrichmentResults) {
    console.log(`Enrichment:`);
    console.log(`  - Chefs processed: ${report.enrichmentResults.chefsProcessed}`);
    console.log(`  - Chefs with photos: ${report.enrichmentResults.chefsWithPhotos}`);
    console.log(`  - Restaurants processed: ${report.enrichmentResults.restaurantsProcessed}`);
    console.log(`  - Restaurants with Place ID: ${report.enrichmentResults.restaurantsWithPlaceId}`);
    if (report.enrichmentResults.googlePlacesCost > 0) {
      console.log(`  - Google Places cost: $${report.enrichmentResults.googlePlacesCost.toFixed(4)}`);
    }
  }
  if (report.bioEnrichmentResults) {
    console.log(`Bio Enrichment:`);
    console.log(`  - Chefs processed: ${report.bioEnrichmentResults.chefsProcessed}`);
    console.log(`  - Chefs with bios: ${report.bioEnrichmentResults.chefsWithBios}`);
    console.log(`  - Restaurants discovered: ${report.bioEnrichmentResults.restaurantsDiscovered}`);
  }
  if (report.restaurantEnrichmentResults) {
    console.log(`Restaurant Enrichment:`);
    console.log(`  - Chefs processed: ${report.restaurantEnrichmentResults.chefsProcessed}`);
    console.log(`  - New restaurants saved: ${report.restaurantEnrichmentResults.newRestaurants}`);
    console.log(`  - Existing restaurants: ${report.restaurantEnrichmentResults.existingRestaurants}`);
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
