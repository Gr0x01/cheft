import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { BaseWorkflow } from './base-workflow';
import { CostEstimate, ValidationResult } from '../types/workflow-types';
import { ChefEnrichmentService } from '../services/chef-enrichment-service';
import { RestaurantDiscoveryService } from '../services/restaurant-discovery-service';
import { ShowDiscoveryService } from '../services/show-discovery-service';
import { StatusVerificationService } from '../services/status-verification-service';
import { ChefRepository } from '../repositories/chef-repository';
import { RestaurantRepository } from '../repositories/restaurant-repository';
import { ShowRepository } from '../repositories/show-repository';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker } from '../shared/token-tracker';

export interface RefreshStaleChefInput {
  chefId: string;
  chefName: string;
  scope: {
    bio?: boolean;
    shows?: boolean;
    restaurants?: boolean;
    restaurantStatus?: boolean;
  };
  dryRun?: boolean;
}

export interface RefreshStaleChefOutput {
  chefId: string;
  chefName: string;
  bioUpdated: boolean;
  showsUpdated: number;
  restaurantsUpdated: number;
  statusesVerified: number;
}

export class RefreshStaleChefWorkflow extends BaseWorkflow<RefreshStaleChefInput, RefreshStaleChefOutput> {
  private supabase: SupabaseClient<Database>;
  private chefEnrichmentService: ChefEnrichmentService;
  private restaurantDiscoveryService: RestaurantDiscoveryService;
  private showDiscoveryService: ShowDiscoveryService;
  private statusVerificationService: StatusVerificationService;
  private chefRepo: ChefRepository;
  private restaurantRepo: RestaurantRepository;
  private showRepo: ShowRepository;

  constructor(
    supabase: SupabaseClient<Database>,
    options: { model?: string; maxRestaurants?: number } = {}
  ) {
    super({
      workflowName: 'refresh-stale-chef',
      maxCostUsd: 10,
      timeoutMs: 600000,
      allowRollback: false,
    });

    this.supabase = supabase;
    const llmClient = new LLMClient({ model: options.model || 'gpt-5-mini' });
    const tokenTracker = TokenTracker.getInstance();
    const maxRestaurants = options.maxRestaurants || 10;

    this.chefEnrichmentService = new ChefEnrichmentService(llmClient, tokenTracker, maxRestaurants);
    this.restaurantDiscoveryService = new RestaurantDiscoveryService(llmClient, tokenTracker, maxRestaurants);
    this.showDiscoveryService = new ShowDiscoveryService(llmClient, tokenTracker);
    this.statusVerificationService = new StatusVerificationService(llmClient, tokenTracker);
    this.chefRepo = new ChefRepository(supabase);
    this.restaurantRepo = new RestaurantRepository(supabase);
    this.showRepo = new ShowRepository(supabase);
  }

  validate(input: RefreshStaleChefInput): ValidationResult {
    const errors: string[] = [];

    if (!input.chefId || input.chefId.length !== 36) {
      errors.push('Invalid chef ID (must be UUID)');
    }

    if (!input.chefName || input.chefName.trim().length === 0) {
      errors.push('Chef name is required');
    }

    const hasScope = input.scope.bio || input.scope.shows || 
                      input.scope.restaurants || input.scope.restaurantStatus;
    if (!hasScope) {
      errors.push('At least one scope flag must be enabled');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async estimateCost(input: RefreshStaleChefInput): Promise<CostEstimate> {
    let estimatedTokens = 0;
    let maxTokens = 0;

    if (input.scope.bio) {
      estimatedTokens += 2000;
      maxTokens += 4000;
    }

    if (input.scope.shows) {
      estimatedTokens += 1500;
      maxTokens += 3000;
    }

    if (input.scope.restaurants) {
      estimatedTokens += 2500;
      maxTokens += 5000;
    }

    if (input.scope.restaurantStatus) {
      const { data: restaurants } = await this.supabase
        .from('restaurants')
        .select('id')
        .eq('chef_id', input.chefId)
        .eq('status', 'open');

      const restaurantCount = restaurants?.length || 0;
      estimatedTokens += restaurantCount * 500;
      maxTokens += restaurantCount * 1000;
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

  async executeSteps(input: RefreshStaleChefInput): Promise<RefreshStaleChefOutput> {
    const output: RefreshStaleChefOutput = {
      chefId: input.chefId,
      chefName: input.chefName,
      bioUpdated: false,
      showsUpdated: 0,
      restaurantsUpdated: 0,
      statusesVerified: 0,
    };

    if (input.scope.bio) {
      const stepNum = this.startStep('Enrich chef bio');
      try {
        const result = await this.chefEnrichmentService.enrichChef(
          input.chefId,
          input.chefName,
          'unknown',
          {}
        );

        if (result.success && !input.dryRun) {
          if (result.miniBio || result.notableAwards) {
            await this.chefRepo.updateBioAndAwards(
              input.chefId,
              result.miniBio,
              result.jamesBeardStatus,
              result.notableAwards
            );
            output.bioUpdated = true;
          }
        }

        this.completeStep(stepNum, result.tokensUsed, { bioUpdated: output.bioUpdated });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(stepNum, errorMessage);
        this.addError('bio_enrichment_failed', errorMessage, false);
      }
    }

    if (input.scope.shows) {
      const stepNum = this.startStep('Discover TV shows');
      try {
        const result = await this.showDiscoveryService.findAllShows(input.chefId, input.chefName);

        if (result.success && result.tvShows && !input.dryRun) {
          const { saved, skipped } = await this.showRepo.saveChefShows(input.chefId, result.tvShows);
          output.showsUpdated = saved;
        }

        this.completeStep(stepNum, result.tokensUsed, { showsSaved: output.showsUpdated });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(stepNum, errorMessage);
        this.addError('show_discovery_failed', errorMessage, false);
      }
    }

    if (input.scope.restaurants) {
      const stepNum = this.startStep('Discover restaurants');
      try {
        const result = await this.restaurantDiscoveryService.findRestaurants(
          input.chefId,
          input.chefName,
          'unknown',
          {}
        );

        if (result.success && result.restaurants && !input.dryRun) {
          let newRestaurants = 0;
          for (const restaurant of result.restaurants) {
            if (!restaurant.name || !restaurant.city) continue;
            
            const saveResult = await this.restaurantRepo.createRestaurant(input.chefId, restaurant);
            if (saveResult.success && saveResult.isNew) {
              newRestaurants++;
            }
          }
          output.restaurantsUpdated = newRestaurants;
        }

        this.completeStep(stepNum, result.tokensUsed, { restaurantsAdded: output.restaurantsUpdated });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(stepNum, errorMessage);
        this.addError('restaurant_discovery_failed', errorMessage, false);
      }
    }

    if (input.scope.restaurantStatus) {
      const stepNum = this.startStep('Verify restaurant statuses');
      try {
        const { data: restaurants } = await this.supabase
          .from('restaurants')
          .select('id, name, city, state')
          .eq('chef_id', input.chefId)
          .eq('status', 'open');

        if (restaurants && restaurants.length > 0) {
          let verified = 0;
          for (const restaurant of restaurants) {
            try {
              const result = await this.statusVerificationService.verifyStatus(
                restaurant.id,
                restaurant.name,
                input.chefName,
                restaurant.city,
                restaurant.state || undefined
              );

              if (result.success && !input.dryRun && result.confidence >= 0.7 && result.status !== 'unknown') {
                await this.restaurantRepo.updateStatus(
                  restaurant.id,
                  result.status,
                  result.confidence,
                  result.reason
                );
                verified++;
              }
            } catch (error) {
              console.error(`Failed to verify restaurant ${restaurant.id}:`, error);
            }
          }
          output.statusesVerified = verified;
        }

        this.completeStep(stepNum, undefined, { statusesVerified: output.statusesVerified });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(stepNum, errorMessage);
        this.addError('status_verification_failed', errorMessage, false);
      }
    }

    if (!input.dryRun) {
      const stepNum = this.startStep('Update enrichment timestamp');
      try {
        await this.chefRepo.setEnrichmentTimestamp(input.chefId);
        this.completeStep(stepNum);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(stepNum, errorMessage);
      }
    }

    return output;
  }
}
