import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { TokenTracker, TokenUsage } from '../enrichment/shared/token-tracker';
import { ChefRepository } from '../enrichment/repositories/chef-repository';
import { RestaurantRepository } from '../enrichment/repositories/restaurant-repository';
import { ShowRepository } from '../enrichment/repositories/show-repository';
import { CityRepository } from '../enrichment/repositories/city-repository';
import { ChefBioService, ChefBioResult } from '../enrichment/services/chef-bio-service';
import { RestaurantDiscoveryService, RestaurantOnlyResult } from '../enrichment/services/restaurant-discovery-service';
import { ShowDiscoveryService, TVShowBasic } from '../enrichment/services/show-discovery-service';
import { BlurbEnrichmentService } from '../enrichment/services/blurb-enrichment-service';
import { StatusVerificationService, RestaurantStatusResult } from '../enrichment/services/status-verification-service';
import { ShowDescriptionService, ShowDescriptionResult } from '../enrichment/services/show-description-service';
import { NarrativeService } from '../enrichment/services/narrative-service';
import { RefreshStaleChefWorkflow } from '../enrichment/workflows/refresh-stale-chef.workflow';
import { RestaurantStatusSweepWorkflow } from '../enrichment/workflows/restaurant-status-sweep.workflow';
import { PartialUpdateWorkflow } from '../enrichment/workflows/partial-update.workflow';
import { ManualChefAdditionWorkflow } from '../enrichment/workflows/manual-chef-addition.workflow';
import type { WorkflowResult } from '../enrichment/types/workflow-types';
import { configure as configureSynthesis, getTierInfo } from '../enrichment/shared/synthesis-client';

export type { ChefBioResult, RestaurantStatusResult, RestaurantOnlyResult, ShowDescriptionResult };
export type { WorkflowResult };

export interface LLMEnricherConfig {
  model?: string;
  maxRestaurantsPerChef?: number;
}

export function createLLMEnricher(
  supabase: SupabaseClient<Database>,
  config: LLMEnricherConfig = {}
) {
  const modelName = config.model ?? 'gpt-4o-mini';
  const maxRestaurants = config.maxRestaurantsPerChef ?? 10;

  configureSynthesis({ accuracyModel: modelName });

  const tokenTracker = TokenTracker.getInstance();
  const chefRepo = new ChefRepository(supabase);
  const restaurantRepo = new RestaurantRepository(supabase);
  const showRepo = new ShowRepository(supabase);
  const cityRepo = new CityRepository(supabase);

  const chefBioService = new ChefBioService(tokenTracker);
  const restaurantDiscoveryService = new RestaurantDiscoveryService(tokenTracker, maxRestaurants);
  const showDiscoveryService = new ShowDiscoveryService(tokenTracker);
  const blurbEnrichmentService = new BlurbEnrichmentService(tokenTracker);
  const statusVerificationService = new StatusVerificationService(tokenTracker);
  const showDescriptionService = new ShowDescriptionService(tokenTracker, showRepo);
  const narrativeService = new NarrativeService(tokenTracker);

  let totalTokensUsed: TokenUsage = { prompt: 0, completion: 0, total: 0 };

  async function enrichChefBioOnly(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefBioResult> {
    const result = await chefBioService.enrichBio(chefId, chefName, showName, options);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return result;
  }

  async function verifyRestaurantStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string,
    googlePlaceId?: string | null
  ): Promise<RestaurantStatusResult> {
    const result = await statusVerificationService.verifyStatus(
      restaurantId,
      restaurantName,
      chefName,
      city,
      state,
      googlePlaceId
    );

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return result;
  }

  async function enrichRestaurantsOnly(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<RestaurantOnlyResult> {
    const result = await restaurantDiscoveryService.findRestaurants(chefId, chefName, showName, options);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return result;
  }

  async function saveDiscoveredRestaurant(
    chefId: string,
    restaurant: any
  ): Promise<{ success: boolean; restaurantId?: string; isNew: boolean }> {
    return restaurantRepo.createRestaurant(chefId, restaurant);
  }

  async function findShowByName(showName: string): Promise<string | null> {
    return showRepo.findShowByName(showName);
  }

  async function saveChefShows(
    chefId: string,
    tvShows: any[]
  ): Promise<{ saved: number; skipped: number }> {
    return showRepo.saveChefShows(chefId, tvShows);
  }

  async function verifyAndUpdateStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string,
    options: { dryRun?: boolean; minConfidence?: number; googlePlaceId?: string | null } = {}
  ): Promise<RestaurantStatusResult> {
    const minConfidence = options.minConfidence ?? 0.7;
    const result = await verifyRestaurantStatus(
      restaurantId,
      restaurantName,
      chefName,
      city,
      state,
      options.googlePlaceId
    );

    if (!result.success || options.dryRun) {
      return result;
    }

    if (result.confidence >= minConfidence && result.status !== 'unknown') {
      const updateResult = await restaurantRepo.updateStatus(
        restaurantId,
        result.status,
        result.confidence,
        result.reason
      );

      if (!updateResult.success) {
        console.error(`   ❌ Failed to update restaurant status: ${updateResult.error}`);
      }
    }

    return result;
  }

  async function findAndSaveRestaurants(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string; dryRun?: boolean } = {}
  ): Promise<RestaurantOnlyResult> {
    const result = await enrichRestaurantsOnly(chefId, chefName, showName, options);

    if (!result.success || options.dryRun) {
      return result;
    }

    let newRestaurants = 0;
    let existingRestaurants = 0;

    if (result.restaurants && result.restaurants.length > 0) {
      for (const restaurant of result.restaurants) {
        if (!restaurant.name || !restaurant.city) {
          console.log(`      ⚠️  Skipping restaurant with missing name or city`);
          continue;
        }

        const saveResult = await saveDiscoveredRestaurant(chefId, restaurant);

        if (saveResult.success) {
          if (saveResult.isNew) {
            newRestaurants++;
            console.log(`      ➕ Added: ${restaurant.name} (${restaurant.city})`);
          } else {
            existingRestaurants++;
          }
        }
      }

      if (newRestaurants > 0) {
        console.log(`      📍 Saved ${newRestaurants} new restaurants (${existingRestaurants} already existed)`);
      }
    }

    const timestampResult = await chefRepo.setEnrichmentTimestamp(chefId);
    if (!timestampResult.success) {
      console.error(`      ⚠️  Failed to update last_enriched_at: ${timestampResult.error}`);
    }

    return {
      ...result,
      newRestaurants,
      existingRestaurants,
    };
  }

  function getTotalTokensUsed(): TokenUsage {
    return { ...totalTokensUsed };
  }

  function estimateCost(): number {
    const inputCostPer1M = 0.15;
    const outputCostPer1M = 0.6;

    return (totalTokensUsed.prompt / 1_000_000) * inputCostPer1M +
           (totalTokensUsed.completion / 1_000_000) * outputCostPer1M;
  }

  function getModelName(): string {
    return modelName;
  }

  function resetTokenCounter(): void {
    totalTokensUsed = { prompt: 0, completion: 0, total: 0 };
  }

  async function enrichChefNarrative(
    chefId: string,
    chefContext: any
  ): Promise<{ success: boolean; narrative: string | null; tokensUsed: TokenUsage; error?: string }> {
    const result = await narrativeService.generateChefNarrative(chefId, chefContext);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    if (result.success && result.narrative) {
      const updateResult = await chefRepo.updateNarrative(chefId, result.narrative);
      if (!updateResult.success) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.tokensUsed,
          error: `Database update failed: ${updateResult.error}`,
        };
      }
    }

    return result;
  }

  async function enrichRestaurantNarrative(
    restaurantId: string,
    restaurantContext: any
  ): Promise<{ success: boolean; narrative: string | null; tokensUsed: TokenUsage; error?: string }> {
    const result = await narrativeService.generateRestaurantNarrative(restaurantId, restaurantContext);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    if (result.success && result.narrative) {
      const updateResult = await restaurantRepo.updateNarrative(restaurantId, result.narrative);
      if (!updateResult.success) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.tokensUsed,
          error: `Database update failed: ${updateResult.error}`,
        };
      }
    }

    return result;
  }

  async function discoverShowsBasic(
    chefId: string,
    chefName: string
  ): Promise<{ success: boolean; shows: TVShowBasic[]; tokensUsed: TokenUsage; error?: string }> {
    const result = await showDiscoveryService.findShowsBasic(chefId, chefName);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return {
      success: result.success,
      shows: result.tvShows || [],
      tokensUsed: result.tokensUsed,
      error: result.error,
    };
  }

  async function enrichBlurbsOnly(
    chefName: string,
    shows: TVShowBasic[]
  ): Promise<{ success: boolean; blurbs: any[]; tokensUsed: TokenUsage; error?: string }> {
    const result = await blurbEnrichmentService.generateBlurbs(chefName, shows);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return {
      success: result.success,
      blurbs: result.blurbs,
      tokensUsed: result.tokensUsed,
      error: result.error,
    };
  }

  async function enrichShowsOnly(
    chefId: string,
    chefName: string,
    options: { includeBlurbs?: boolean } = {}
  ): Promise<{ success: boolean; showsSaved: number; showsSkipped: number; tokensUsed: TokenUsage; error?: string }> {
    const includeBlurbs = options.includeBlurbs ?? true;

    const discoveryResult = await showDiscoveryService.findShowsBasic(chefId, chefName);

    totalTokensUsed.prompt += discoveryResult.tokensUsed.prompt;
    totalTokensUsed.completion += discoveryResult.tokensUsed.completion;
    totalTokensUsed.total += discoveryResult.tokensUsed.total;

    if (!discoveryResult.success || !discoveryResult.tvShows) {
      return {
        success: discoveryResult.success,
        showsSaved: 0,
        showsSkipped: 0,
        tokensUsed: discoveryResult.tokensUsed,
        error: discoveryResult.error,
      };
    }

    let showsToSave = discoveryResult.tvShows;
    let totalTokens = { ...discoveryResult.tokensUsed };

    if (includeBlurbs && showsToSave.length > 0) {
      const blurbResult = await blurbEnrichmentService.generateBlurbs(chefName, showsToSave);

      totalTokensUsed.prompt += blurbResult.tokensUsed.prompt;
      totalTokensUsed.completion += blurbResult.tokensUsed.completion;
      totalTokensUsed.total += blurbResult.tokensUsed.total;

      totalTokens.prompt += blurbResult.tokensUsed.prompt;
      totalTokens.completion += blurbResult.tokensUsed.completion;
      totalTokens.total += blurbResult.tokensUsed.total;

      if (blurbResult.success && blurbResult.blurbs.length > 0) {
        showsToSave = showsToSave.map(show => {
          const blurb = blurbResult.blurbs.find(
            b => b.showName === show.showName &&
                 (b.season === show.season || (!b.season && !show.season))
          );
          return blurb ? { ...show, performanceBlurb: blurb.performanceBlurb } : show;
        });
      }
    }

    const { saved, skipped } = await saveChefShows(chefId, showsToSave);

    const timestampResult = await chefRepo.setEnrichmentTimestamp(chefId);
    if (!timestampResult.success) {
      console.error(`      ⚠️  Failed to update last_enriched_at: ${timestampResult.error}`);
    }

    return {
      success: true,
      showsSaved: saved,
      showsSkipped: skipped,
      tokensUsed: totalTokens,
    };
  }

  async function enrichCityNarrative(
    cityId: string,
    cityContext: any
  ): Promise<{ success: boolean; narrative: string | null; tokensUsed: TokenUsage; error?: string }> {
    const result = await narrativeService.generateCityNarrative(cityId, cityContext);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    if (result.success && result.narrative) {
      const updateResult = await cityRepo.updateNarrative(cityId, result.narrative);
      if (!updateResult.success) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.tokensUsed,
          error: `Database update failed: ${updateResult.error}`,
        };
      }
    }

    return result;
  }

  async function runRefreshStaleChefWorkflow(input: {
    chefId: string;
    chefName: string;
    scope: { bio?: boolean; shows?: boolean; restaurants?: boolean; restaurantStatus?: boolean };
    dryRun?: boolean;
  }): Promise<WorkflowResult> {
    const workflow = new RefreshStaleChefWorkflow(supabase, { model: modelName, maxRestaurants });
    const result = await workflow.execute(input);

    totalTokensUsed.prompt += result.totalCost.tokens.prompt;
    totalTokensUsed.completion += result.totalCost.tokens.completion;
    totalTokensUsed.total += result.totalCost.tokens.total;

    return result;
  }

  async function runRestaurantStatusSweepWorkflow(input: {
    restaurantIds?: string[];
    criteria?: { notVerifiedInDays?: number; status?: 'open' | 'closed' | 'unknown'; chefId?: string };
    limit?: number;
    minConfidence?: number;
    batchSize?: number;
    dryRun?: boolean;
  }): Promise<WorkflowResult> {
    const workflow = new RestaurantStatusSweepWorkflow(supabase, { model: modelName });
    const result = await workflow.execute(input);

    totalTokensUsed.prompt += result.totalCost.tokens.prompt;
    totalTokensUsed.completion += result.totalCost.tokens.completion;
    totalTokensUsed.total += result.totalCost.tokens.total;

    return result;
  }

  async function runPartialUpdateWorkflow(input: {
    mode: 'shows' | 'restaurants' | 'chef-narrative' | 'restaurant-narrative' | 'city-narrative';
    targetId: string;
    targetName: string;
    context?: any;
    dryRun?: boolean;
  }): Promise<WorkflowResult> {
    const workflow = new PartialUpdateWorkflow(supabase, { model: modelName, maxRestaurants });
    const result = await workflow.execute(input);

    totalTokensUsed.prompt += result.totalCost.tokens.prompt;
    totalTokensUsed.completion += result.totalCost.tokens.completion;
    totalTokensUsed.total += result.totalCost.tokens.total;

    return result;
  }

  async function runManualChefAdditionWorkflow(input: {
    chefId: string;
    chefName: string;
    initialShowName: string;
    initialShowSeason?: string;
    initialShowResult?: string;
    skipNarrative?: boolean;
    dryRun?: boolean;
  }): Promise<WorkflowResult> {
    const workflow = new ManualChefAdditionWorkflow(supabase, { model: modelName, maxRestaurants });
    const result = await workflow.execute(input);

    totalTokensUsed.prompt += result.totalCost.tokens.prompt;
    totalTokensUsed.completion += result.totalCost.tokens.completion;
    totalTokensUsed.total += result.totalCost.tokens.total;

    return result;
  }

  async function generateShowDescription(
    showId: string,
    showName: string,
    network: string | null
  ): Promise<ShowDescriptionResult> {
    const result = await showDescriptionService.generateShowDescription(showId, showName, network);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return result;
  }

  async function generateSeasonDescription(
    showId: string,
    season: string,
    context: {
      showName: string;
      season: string;
      network: string | null;
      winner: { name: string; chefId: string } | null;
      chefCount: number;
      restaurantCount: number;
    }
  ): Promise<ShowDescriptionResult> {
    const result = await showDescriptionService.generateSeasonDescription(showId, season, context);

    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    return result;
  }

  function getSynthesisTierInfo() {
    return getTierInfo();
  }

  return {
    enrichChefBioOnly,
    findAndSaveRestaurants,
    verifyRestaurantStatus,
    verifyAndUpdateStatus,
    discoverShowsBasic,
    enrichBlurbsOnly,
    enrichShowsOnly,
    enrichChefNarrative,
    enrichRestaurantNarrative,
    enrichCityNarrative,
    generateShowDescription,
    generateSeasonDescription,
    getTotalTokensUsed,
    estimateCost,
    resetTokenCounter,
    getModelName,
    getSynthesisTierInfo,
    workflows: {
      refreshStaleChef: runRefreshStaleChefWorkflow,
      restaurantStatusSweep: runRestaurantStatusSweepWorkflow,
      partialUpdate: runPartialUpdateWorkflow,
      manualChefAddition: runManualChefAdditionWorkflow,
    },
  };
}

export type LLMEnricher = ReturnType<typeof createLLMEnricher>;
