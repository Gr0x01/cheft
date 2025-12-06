import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { BaseWorkflow } from './base-workflow';
import { CostEstimate, ValidationResult } from '../types/workflow-types';
import { ChefBioService } from '../services/chef-bio-service';
import { RestaurantDiscoveryService } from '../services/restaurant-discovery-service';
import { ShowDiscoveryService } from '../services/show-discovery-service';
import { ShowDescriptionService } from '../services/show-description-service';
import { NarrativeService } from '../services/narrative-service';
import { ChefRepository } from '../repositories/chef-repository';
import { RestaurantRepository } from '../repositories/restaurant-repository';
import { ShowRepository } from '../repositories/show-repository';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker } from '../shared/token-tracker';

export interface ManualChefAdditionInput {
  chefId: string;
  chefName: string;
  initialShowName: string;
  initialShowSeason?: string;
  initialShowResult?: string;
  skipNarrative?: boolean;
  dryRun?: boolean;
}

export interface ManualChefAdditionOutput {
  chefId: string;
  chefName: string;
  bioCreated: boolean;
  totalShows: number;
  totalRestaurants: number;
  narrativeCreated: boolean;
  rollbackPerformed: boolean;
}

export class ManualChefAdditionWorkflow extends BaseWorkflow<ManualChefAdditionInput, ManualChefAdditionOutput> {
  private supabase: SupabaseClient<Database>;
  private chefBioService: ChefBioService;
  private restaurantDiscoveryService: RestaurantDiscoveryService;
  private showDiscoveryService: ShowDiscoveryService;
  private showDescriptionService: ShowDescriptionService;
  private narrativeService: NarrativeService;
  private chefRepo: ChefRepository;
  private restaurantRepo: RestaurantRepository;
  private showRepo: ShowRepository;
  private createdRestaurantIds: string[] = [];

  constructor(
    supabase: SupabaseClient<Database>,
    options: { model?: string; maxRestaurants?: number } = {}
  ) {
    super({
      workflowName: 'manual-chef-addition',
      maxCostUsd: 15,
      timeoutMs: 1200000,
      allowRollback: true,
    });

    this.supabase = supabase;
    const llmClient = new LLMClient({ model: options.model || 'gpt-5-mini' });
    const tokenTracker = TokenTracker.getInstance();
    const maxRestaurants = options.maxRestaurants || 10;

    this.chefRepo = new ChefRepository(supabase);
    this.restaurantRepo = new RestaurantRepository(supabase);
    this.showRepo = new ShowRepository(supabase);
    
    this.chefBioService = new ChefBioService(llmClient, tokenTracker);
    this.restaurantDiscoveryService = new RestaurantDiscoveryService(llmClient, tokenTracker, maxRestaurants);
    this.showDiscoveryService = new ShowDiscoveryService(llmClient, tokenTracker);
    this.showDescriptionService = new ShowDescriptionService(tokenTracker, this.showRepo);
    this.narrativeService = new NarrativeService(tokenTracker);
  }

  validate(input: ManualChefAdditionInput): ValidationResult {
    const errors: string[] = [];

    if (!input.chefId || input.chefId.length !== 36) {
      errors.push('Invalid chef ID (must be UUID)');
    }

    if (!input.chefName || input.chefName.trim().length === 0) {
      errors.push('Chef name is required');
    }

    if (!input.initialShowName || input.initialShowName.trim().length === 0) {
      errors.push('Initial show name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async estimateCost(input: ManualChefAdditionInput): Promise<CostEstimate> {
    let estimatedTokens = 0;
    let maxTokens = 0;

    estimatedTokens += 2000;
    maxTokens += 4000;

    estimatedTokens += 1500;
    maxTokens += 3000;

    estimatedTokens += 2500;
    maxTokens += 5000;

    if (!input.skipNarrative) {
      estimatedTokens += 2000;
      maxTokens += 4000;
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

  async executeSteps(input: ManualChefAdditionInput): Promise<ManualChefAdditionOutput> {
    const output: ManualChefAdditionOutput = {
      chefId: input.chefId,
      chefName: input.chefName,
      bioCreated: false,
      totalShows: 0,
      totalRestaurants: 0,
      narrativeCreated: false,
      rollbackPerformed: false,
    };

    this.createdRestaurantIds = [];

    const verifyStep = this.startStep('Verify chef exists in database');
    try {
      const { data: chef, error } = await this.supabase
        .from('chefs')
        .select('id, name')
        .eq('id', input.chefId)
        .single();

      if (error || !chef) {
        throw new Error('Chef not found in database');
      }

      this.completeStep(verifyStep, undefined, { chefFound: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(verifyStep, errorMessage);
      throw error;
    }

    const bioStep = this.startStep('Enrich chef bio and awards');
    try {
      const result = await this.chefBioService.enrichBio(
        input.chefId,
        input.chefName,
        input.initialShowName,
        {
          season: input.initialShowSeason,
          result: input.initialShowResult,
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Bio enrichment failed');
      }

      if (!input.dryRun && result.miniBio) {
        const updateResult = await this.chefRepo.updateBioAndAwards(
          input.chefId,
          result.miniBio,
          result.jamesBeardStatus,
          result.notableAwards
        );

        if (!updateResult.success) {
          throw new Error(`Failed to save bio: ${updateResult.error}`);
        }

        output.bioCreated = true;
      }

      this.completeStep(bioStep, result.tokensUsed, { bioCreated: output.bioCreated });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(bioStep, errorMessage);
      throw error;
    }

    const showsStep = this.startStep('Discover all TV show appearances');
    try {
      const result = await this.showDiscoveryService.findAllShows(input.chefId, input.chefName);

      if (!result.success) {
        throw new Error(result.error || 'Show discovery failed');
      }

      if (!input.dryRun && result.tvShows && result.tvShows.length > 0) {
        const { saved, skipped, newCombinations } = await this.showRepo.saveChefShows(input.chefId, result.tvShows);
        output.totalShows = saved;
        
        if (newCombinations.length > 0 && !input.dryRun) {
          console.log(`   🔄 Generating SEO descriptions for ${newCombinations.length} new show/season pages...`);
          for (const { showId, season } of newCombinations) {
            const show = await this.supabase.from('shows').select('name, network').eq('id', showId).single();
            if (show.data && season) {
              const { data: seasonData } = await this.supabase
                .from('chef_shows')
                .select('chef:chefs(id, name), result')
                .eq('show_id', showId)
                .eq('season', season)
                .eq('result', 'winner')
                .maybeSingle();
              
              const context = {
                showName: show.data.name,
                season,
                network: show.data.network,
                winner: seasonData?.chef ? { name: (seasonData.chef as any).name, chefId: (seasonData.chef as any).id } : null,
                chefCount: 1,
                restaurantCount: 0,
              };
              await this.showDescriptionService.ensureSeasonDescription(showId, season, context);
            } else if (show.data && !season) {
              await this.showDescriptionService.ensureShowDescription(showId, show.data.name, show.data.network);
            }
          }
          const cost = newCombinations.length * 0.02;
          console.log(`   💰 SEO generation cost: $${cost.toFixed(2)}`);
        }
      }

      this.completeStep(showsStep, result.tokensUsed, { showsSaved: output.totalShows });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(showsStep, errorMessage);
      throw error;
    }

    const restaurantsStep = this.startStep('Discover restaurants');
    try {
      const result = await this.restaurantDiscoveryService.findRestaurants(
        input.chefId,
        input.chefName,
        input.initialShowName,
        {
          season: input.initialShowSeason,
          result: input.initialShowResult,
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Restaurant discovery failed');
      }

      if (!input.dryRun && result.restaurants && result.restaurants.length > 0) {
        let newRestaurants = 0;
        for (const restaurant of result.restaurants) {
          if (!restaurant.name || !restaurant.city) continue;
          
          const saveResult = await this.restaurantRepo.createRestaurant(input.chefId, restaurant);
          if (saveResult.success && saveResult.isNew && saveResult.restaurantId) {
            newRestaurants++;
            this.createdRestaurantIds.push(saveResult.restaurantId);
          }
        }
        output.totalRestaurants = newRestaurants;
      }

      this.completeStep(restaurantsStep, result.tokensUsed, { restaurantsAdded: output.totalRestaurants });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(restaurantsStep, errorMessage);
      throw error;
    }

    if (!input.skipNarrative && !input.dryRun) {
      const narrativeStep = this.startStep('Generate chef narrative');
      try {
        const { data: contextData } = await this.supabase
          .from('chefs')
          .select(`
            name,
            mini_bio,
            james_beard_status,
            chef_shows!inner (
              season,
              result,
              is_primary,
              show:shows (name)
            ),
            restaurants!restaurants_chef_id_fkey (
              name,
              city,
              state,
              cuisine_tags,
              status
            )
          `)
          .eq('id', input.chefId)
          .single();

        if (contextData) {
          const shows = ((contextData as any).chef_shows || []).map((cs: any) => ({
            show_name: cs.show?.name || '',
            season: cs.season,
            result: cs.result,
            is_primary: cs.is_primary,
          }));

          const restaurants = ((contextData as any).restaurants || []).map((r: any) => ({
            name: r.name,
            city: r.city,
            state: r.state,
            cuisine_tags: r.cuisine_tags,
            status: r.status,
          }));

          const cities = [...new Set(restaurants.map((r: any) => `${r.city}${r.state ? `, ${r.state}` : ''}`))] as string[];

          const context = {
            name: (contextData as any).name,
            mini_bio: (contextData as any).mini_bio,
            james_beard_status: (contextData as any).james_beard_status,
            current_position: null,
            shows,
            restaurants,
            restaurant_count: restaurants.length,
            cities,
          };

          const result = await this.narrativeService.generateChefNarrative(input.chefId, context);

          if (result.success && result.narrative) {
            const updateResult = await this.chefRepo.updateNarrative(input.chefId, result.narrative);
            output.narrativeCreated = updateResult.success;
          }

          this.completeStep(narrativeStep, result.tokensUsed, { narrativeCreated: output.narrativeCreated });
        } else {
          this.skipStep(narrativeStep, 'No context data available');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(narrativeStep, errorMessage);
      }
    }

    if (!input.dryRun) {
      const timestampStep = this.startStep('Update enrichment timestamp');
      try {
        await this.chefRepo.setEnrichmentTimestamp(input.chefId);
        this.completeStep(timestampStep);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(timestampStep, errorMessage);
      }
    }

    return output;
  }

  protected async rollback(): Promise<void> {
    console.log(`[${this.config.workflowName}] Rolling back changes...`);

    if (this.createdRestaurantIds.length > 0) {
      console.log(`  Deleting ${this.createdRestaurantIds.length} created restaurants...`);
      const { error } = await this.supabase
        .from('restaurants')
        .delete()
        .in('id', this.createdRestaurantIds);

      if (error) {
        console.error('  Failed to delete restaurants:', error);
        throw new Error(`Rollback failed: ${error.message}`);
      }
    }

    console.log(`[${this.config.workflowName}] Rollback complete`);
  }
}
