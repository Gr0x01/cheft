import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { BaseWorkflow } from './base-workflow';
import { CostEstimate, ValidationResult } from '../types/workflow-types';
import { ShowDiscoveryService } from '../services/show-discovery-service';
import { RestaurantDiscoveryService } from '../services/restaurant-discovery-service';
import { NarrativeService } from '../services/narrative-service';
import { ChefRepository } from '../repositories/chef-repository';
import { RestaurantRepository } from '../repositories/restaurant-repository';
import { ShowRepository } from '../repositories/show-repository';
import { CityRepository } from '../repositories/city-repository';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker } from '../shared/token-tracker';

export type PartialUpdateMode = 'shows' | 'restaurants' | 'chef-narrative' | 'restaurant-narrative' | 'city-narrative';

export interface PartialUpdateInput {
  mode: PartialUpdateMode;
  targetId: string;
  targetName: string;
  context?: any;
  dryRun?: boolean;
}

export interface PartialUpdateOutput {
  mode: PartialUpdateMode;
  targetId: string;
  success: boolean;
  itemsUpdated: number;
  narrative?: string | null;
}

export class PartialUpdateWorkflow extends BaseWorkflow<PartialUpdateInput, PartialUpdateOutput> {
  private supabase: SupabaseClient<Database>;
  private showDiscoveryService: ShowDiscoveryService;
  private restaurantDiscoveryService: RestaurantDiscoveryService;
  private narrativeService: NarrativeService;
  private chefRepo: ChefRepository;
  private restaurantRepo: RestaurantRepository;
  private showRepo: ShowRepository;
  private cityRepo: CityRepository;

  constructor(
    supabase: SupabaseClient<Database>,
    options: { model?: string; maxRestaurants?: number } = {}
  ) {
    super({
      workflowName: 'partial-update',
      maxCostUsd: 2,
      timeoutMs: 300000,
      allowRollback: false,
    });

    this.supabase = supabase;
    const llmClient = new LLMClient({ model: options.model || 'gpt-5-mini' });
    const tokenTracker = TokenTracker.getInstance();
    const maxRestaurants = options.maxRestaurants || 10;

    this.showDiscoveryService = new ShowDiscoveryService(llmClient, tokenTracker);
    this.restaurantDiscoveryService = new RestaurantDiscoveryService(llmClient, tokenTracker, maxRestaurants);
    this.narrativeService = new NarrativeService(tokenTracker);
    this.chefRepo = new ChefRepository(supabase);
    this.restaurantRepo = new RestaurantRepository(supabase);
    this.showRepo = new ShowRepository(supabase);
    this.cityRepo = new CityRepository(supabase);
  }

  validate(input: PartialUpdateInput): ValidationResult {
    const errors: string[] = [];

    const validModes: PartialUpdateMode[] = ['shows', 'restaurants', 'chef-narrative', 'restaurant-narrative', 'city-narrative'];
    if (!validModes.includes(input.mode)) {
      errors.push(`Invalid mode: ${input.mode}. Must be one of: ${validModes.join(', ')}`);
    }

    if (!input.targetId || input.targetId.length !== 36) {
      errors.push('Invalid target ID (must be UUID)');
    }

    if (!input.targetName || input.targetName.trim().length === 0) {
      errors.push('Target name is required');
    }

    if (input.mode.includes('narrative') && !input.context) {
      errors.push('Context is required for narrative generation');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async estimateCost(input: PartialUpdateInput): Promise<CostEstimate> {
    let estimatedTokens = 0;
    let maxTokens = 0;

    switch (input.mode) {
      case 'shows':
        estimatedTokens = 1500;
        maxTokens = 3000;
        break;
      case 'restaurants':
        estimatedTokens = 2500;
        maxTokens = 5000;
        break;
      case 'chef-narrative':
      case 'restaurant-narrative':
      case 'city-narrative':
        estimatedTokens = 2000;
        maxTokens = 4000;
        break;
    }

    const inputCostPer1M = 0.25;
    const outputCostPer1M = 2.00;
    const avgCostPer1M = (inputCostPer1M + outputCostPer1M) / 2;

    return {
      estimatedTokens,
      estimatedUsd: (estimatedTokens / 1_000_000) * avgCostPer1M,
      maxTokens,
      maxUsd: (maxTokens / 1_000_000) * avgCostPer1M,
    };
  }

  async executeSteps(input: PartialUpdateInput): Promise<PartialUpdateOutput> {
    const output: PartialUpdateOutput = {
      mode: input.mode,
      targetId: input.targetId,
      success: false,
      itemsUpdated: 0,
    };

    switch (input.mode) {
      case 'shows':
        await this.executeShowsOnlyUpdate(input, output);
        break;
      case 'restaurants':
        await this.executeRestaurantsOnlyUpdate(input, output);
        break;
      case 'chef-narrative':
        await this.executeChefNarrativeUpdate(input, output);
        break;
      case 'restaurant-narrative':
        await this.executeRestaurantNarrativeUpdate(input, output);
        break;
      case 'city-narrative':
        await this.executeCityNarrativeUpdate(input, output);
        break;
    }

    return output;
  }

  private async executeShowsOnlyUpdate(
    input: PartialUpdateInput,
    output: PartialUpdateOutput
  ): Promise<void> {
    const stepNum = this.startStep('Discover TV shows');
    try {
      const result = await this.showDiscoveryService.findAllShows(input.targetId, input.targetName);

      if (result.success && result.tvShows && !input.dryRun) {
        const { saved, skipped } = await this.showRepo.saveChefShows(input.targetId, result.tvShows);
        output.itemsUpdated = saved;
        
        await this.chefRepo.setEnrichmentTimestamp(input.targetId);
      }

      output.success = result.success;
      this.completeStep(stepNum, result.tokensUsed, { showsSaved: output.itemsUpdated });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(stepNum, errorMessage);
      this.addError('show_discovery_failed', errorMessage, true);
      throw error;
    }
  }

  private async executeRestaurantsOnlyUpdate(
    input: PartialUpdateInput,
    output: PartialUpdateOutput
  ): Promise<void> {
    const stepNum = this.startStep('Discover restaurants');
    try {
      const result = await this.restaurantDiscoveryService.findRestaurants(
        input.targetId,
        input.targetName,
        'unknown',
        {}
      );

      if (result.success && result.restaurants && !input.dryRun) {
        let newRestaurants = 0;
        for (const restaurant of result.restaurants) {
          if (!restaurant.name || !restaurant.city) continue;
          
          const saveResult = await this.restaurantRepo.createRestaurant(input.targetId, restaurant);
          if (saveResult.success && saveResult.isNew) {
            newRestaurants++;
          }
        }
        output.itemsUpdated = newRestaurants;
        
        await this.chefRepo.setEnrichmentTimestamp(input.targetId);
      }

      output.success = result.success;
      this.completeStep(stepNum, result.tokensUsed, { restaurantsAdded: output.itemsUpdated });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(stepNum, errorMessage);
      this.addError('restaurant_discovery_failed', errorMessage, true);
      throw error;
    }
  }

  private async executeChefNarrativeUpdate(
    input: PartialUpdateInput,
    output: PartialUpdateOutput
  ): Promise<void> {
    const stepNum = this.startStep('Generate chef narrative');
    try {
      const result = await this.narrativeService.generateChefNarrative(input.targetId, input.context);

      if (result.success && result.narrative && !input.dryRun) {
        const updateResult = await this.chefRepo.updateNarrative(input.targetId, result.narrative);
        output.success = updateResult.success;
        output.itemsUpdated = updateResult.success ? 1 : 0;
        output.narrative = result.narrative;
      } else {
        output.success = result.success;
      }

      this.completeStep(stepNum, result.tokensUsed, { narrativeGenerated: output.success });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(stepNum, errorMessage);
      this.addError('narrative_generation_failed', errorMessage, true);
      throw error;
    }
  }

  private async executeRestaurantNarrativeUpdate(
    input: PartialUpdateInput,
    output: PartialUpdateOutput
  ): Promise<void> {
    const stepNum = this.startStep('Generate restaurant narrative');
    try {
      const result = await this.narrativeService.generateRestaurantNarrative(input.targetId, input.context);

      if (result.success && result.narrative && !input.dryRun) {
        const updateResult = await this.restaurantRepo.updateNarrative(input.targetId, result.narrative);
        output.success = updateResult.success;
        output.itemsUpdated = updateResult.success ? 1 : 0;
        output.narrative = result.narrative;
      } else {
        output.success = result.success;
      }

      this.completeStep(stepNum, result.tokensUsed, { narrativeGenerated: output.success });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(stepNum, errorMessage);
      this.addError('narrative_generation_failed', errorMessage, true);
      throw error;
    }
  }

  private async executeCityNarrativeUpdate(
    input: PartialUpdateInput,
    output: PartialUpdateOutput
  ): Promise<void> {
    const stepNum = this.startStep('Generate city narrative');
    try {
      const result = await this.narrativeService.generateCityNarrative(input.targetId, input.context);

      if (result.success && result.narrative && !input.dryRun) {
        const updateResult = await this.cityRepo.updateNarrative(input.targetId, result.narrative);
        output.success = updateResult.success;
        output.itemsUpdated = updateResult.success ? 1 : 0;
        output.narrative = result.narrative;
      } else {
        output.success = result.success;
      }

      this.completeStep(stepNum, result.tokensUsed, { narrativeGenerated: output.success });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(stepNum, errorMessage);
      this.addError('narrative_generation_failed', errorMessage, true);
      throw error;
    }
  }
}
