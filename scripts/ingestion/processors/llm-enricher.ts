import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { LLMClient } from '../enrichment/shared/llm-client';
import { TokenTracker, TokenUsage } from '../enrichment/shared/token-tracker';
import { ChefRepository } from '../enrichment/repositories/chef-repository';
import { RestaurantRepository } from '../enrichment/repositories/restaurant-repository';
import { ShowRepository } from '../enrichment/repositories/show-repository';
import { CityRepository } from '../enrichment/repositories/city-repository';
import { ChefEnrichmentService, ChefEnrichmentResult } from '../enrichment/services/chef-enrichment-service';
import { RestaurantDiscoveryService, RestaurantOnlyResult } from '../enrichment/services/restaurant-discovery-service';
import { ShowDiscoveryService } from '../enrichment/services/show-discovery-service';
import { StatusVerificationService, RestaurantStatusResult } from '../enrichment/services/status-verification-service';
import { NarrativeService } from '../enrichment/services/narrative-service';
import { RefreshStaleChefWorkflow } from '../enrichment/workflows/refresh-stale-chef.workflow';
import { RestaurantStatusSweepWorkflow } from '../enrichment/workflows/restaurant-status-sweep.workflow';
import { PartialUpdateWorkflow } from '../enrichment/workflows/partial-update.workflow';
import { ManualChefAdditionWorkflow } from '../enrichment/workflows/manual-chef-addition.workflow';
import type { WorkflowResult } from '../enrichment/types/workflow-types';

export type { ChefEnrichmentResult, RestaurantStatusResult, RestaurantOnlyResult };
export type { WorkflowResult };



export interface LLMEnricherConfig {
  model?: string;
  maxRestaurantsPerChef?: number;
}

export function createLLMEnricher(
  supabase: SupabaseClient<Database>,
  config: LLMEnricherConfig = {}
) {
  const modelName = config.model ?? 'gpt-5-mini';
  const maxRestaurants = config.maxRestaurantsPerChef ?? 10;
  
  const llmClient = new LLMClient({ model: modelName });
  const tokenTracker = TokenTracker.getInstance();
  const chefRepo = new ChefRepository(supabase);
  const restaurantRepo = new RestaurantRepository(supabase);
  const showRepo = new ShowRepository(supabase);
  const cityRepo = new CityRepository(supabase);
  
  const chefEnrichmentService = new ChefEnrichmentService(llmClient, tokenTracker, maxRestaurants);
  const restaurantDiscoveryService = new RestaurantDiscoveryService(llmClient, tokenTracker, maxRestaurants);
  const showDiscoveryService = new ShowDiscoveryService(llmClient, tokenTracker);
  const statusVerificationService = new StatusVerificationService(llmClient, tokenTracker);
  const narrativeService = new NarrativeService(tokenTracker);
  
  let totalTokensUsed: TokenUsage = { prompt: 0, completion: 0, total: 0 };

  async function enrichChef(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string } = {}
  ): Promise<ChefEnrichmentResult> {
    const result = await chefEnrichmentService.enrichChef(chefId, chefName, showName, options);
    
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
    state?: string
  ): Promise<RestaurantStatusResult> {
    const result = await statusVerificationService.verifyStatus(restaurantId, restaurantName, chefName, city, state);
    
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

  async function enrichAndSaveChef(
    chefId: string,
    chefName: string,
    showName: string,
    options: { season?: string; result?: string; dryRun?: boolean } = {}
  ): Promise<ChefEnrichmentResult> {
    const result = await enrichChef(chefId, chefName, showName, options);

    if (!result.success || options.dryRun) {
      return result;
    }

    if (result.miniBio || result.notableAwards) {
      const updateResult = await chefRepo.updateBioAndAwards(
        chefId,
        result.miniBio,
        result.jamesBeardStatus,
        result.notableAwards
      );

      if (!updateResult.success) {
        console.error(`   ❌ Failed to save chef data: ${updateResult.error}`);
      }
    }

    if (result.tvShows && result.tvShows.length > 0) {
      const { saved, skipped } = await saveChefShows(chefId, result.tvShows);
      if (saved > 0) {
        console.log(`      📺 Saved ${saved} TV show appearances (${skipped} already existed or skipped)`);
      }
    }

    if (result.restaurants && result.restaurants.length > 0) {
      let newRestaurants = 0;
      let existingRestaurants = 0;

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

    return result;
  }

  async function verifyAndUpdateStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string,
    options: { dryRun?: boolean; minConfidence?: number } = {}
  ): Promise<RestaurantStatusResult> {
    const minConfidence = options.minConfidence ?? 0.7;
    const result = await verifyRestaurantStatus(restaurantId, restaurantName, chefName, city, state);

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
    const inputCostPer1M = 0.25;
    const outputCostPer1M = 2.00;
    
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

  async function enrichShowsOnly(
    chefId: string,
    chefName: string
  ): Promise<{ success: boolean; showsSaved: number; showsSkipped: number; tokensUsed: TokenUsage; error?: string }> {
    const result = await showDiscoveryService.findAllShows(chefId, chefName);
    
    totalTokensUsed.prompt += result.tokensUsed.prompt;
    totalTokensUsed.completion += result.tokensUsed.completion;
    totalTokensUsed.total += result.tokensUsed.total;

    if (result.success && result.tvShows) {
      const { saved, skipped } = await saveChefShows(chefId, result.tvShows);

      const timestampResult = await chefRepo.setEnrichmentTimestamp(chefId);
      if (!timestampResult.success) {
        console.error(`      ⚠️  Failed to update last_enriched_at: ${timestampResult.error}`);
      }

      return {
        success: true,
        showsSaved: saved,
        showsSkipped: skipped,
        tokensUsed: result.tokensUsed,
      };
    }
    
    return {
      success: result.success,
      showsSaved: 0,
      showsSkipped: 0,
      tokensUsed: result.tokensUsed,
      error: result.error,
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

  return {
    enrichChef,
    enrichAndSaveChef,
    findAndSaveRestaurants,
    verifyRestaurantStatus,
    verifyAndUpdateStatus,
    enrichShowsOnly,
    enrichChefNarrative,
    enrichRestaurantNarrative,
    enrichCityNarrative,
    getTotalTokensUsed,
    estimateCost,
    resetTokenCounter,
    getModelName,
    workflows: {
      refreshStaleChef: runRefreshStaleChefWorkflow,
      restaurantStatusSweep: runRestaurantStatusSweepWorkflow,
      partialUpdate: runPartialUpdateWorkflow,
      manualChefAddition: runManualChefAdditionWorkflow,
    },
  };
}

export type LLMEnricher = ReturnType<typeof createLLMEnricher>;
