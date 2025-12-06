import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { BaseWorkflow } from './base-workflow';
import { CostEstimate, ValidationResult } from '../types/workflow-types';
import { ChefBioService } from '../services/chef-bio-service';
import { RestaurantDiscoveryService } from '../services/restaurant-discovery-service';
import { ShowDiscoveryService } from '../services/show-discovery-service';
import { StatusVerificationService } from '../services/status-verification-service';
import { ShowDescriptionService } from '../services/show-description-service';
import { NarrativeService } from '../services/narrative-service';
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
    narrative?: boolean;
  };
  dryRun?: boolean;
}

export interface RefreshStaleChefOutput {
  chefId: string;
  chefName: string;
  bioUpdated: boolean;
  showsUpdated: number;
  restaurantsUpdated: number;
  restaurantsDeleted: number;
  statusesVerified: number;
  narrativeCreated: boolean;
}

export class RefreshStaleChefWorkflow extends BaseWorkflow<RefreshStaleChefInput, RefreshStaleChefOutput> {
  private supabase: SupabaseClient<Database>;
  private chefBioService: ChefBioService;
  private restaurantDiscoveryService: RestaurantDiscoveryService;
  private showDiscoveryService: ShowDiscoveryService;
  private statusVerificationService: StatusVerificationService;
  private showDescriptionService: ShowDescriptionService;
  private narrativeService: NarrativeService;
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
      timeoutMs: 900000,
      allowRollback: false,
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
    this.statusVerificationService = new StatusVerificationService(llmClient, tokenTracker);
    this.showDescriptionService = new ShowDescriptionService(tokenTracker, this.showRepo);
    this.narrativeService = new NarrativeService(tokenTracker);
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
                      input.scope.restaurants || input.scope.restaurantStatus ||
                      input.scope.narrative;
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

    if (input.scope.narrative) {
      estimatedTokens += 3000;
      maxTokens += 6000;
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
      restaurantsDeleted: 0,
      statusesVerified: 0,
      narrativeCreated: false,
    };

    if (input.scope.bio) {
      const stepNum = this.startStep('Enrich chef bio');
      try {
        const result = await this.chefBioService.enrichBio(
          input.chefId,
          input.chefName,
          'unknown',
          {}
        );

        if (result.success && !input.dryRun) {
          if (result.miniBio) {
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
          const { saved, skipped, newCombinations } = await this.showRepo.saveChefShows(input.chefId, result.tvShows);
          output.showsUpdated = saved;
          
          if (newCombinations.length > 0) {
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
          const foundRestaurantIds: string[] = [];
          
          for (const restaurant of result.restaurants) {
            if (!restaurant.name || !restaurant.city) continue;
            
            const saveResult = await this.restaurantRepo.createRestaurant(input.chefId, restaurant);
            if (saveResult.success) {
              if (saveResult.restaurantId) {
                foundRestaurantIds.push(saveResult.restaurantId);
              }
              if (saveResult.isNew) {
                newRestaurants++;
              }
            }
          }
          output.restaurantsUpdated = newRestaurants;

          try {
            const staleResult = await this.restaurantRepo.deleteStaleRestaurants(input.chefId, foundRestaurantIds);
            output.restaurantsDeleted = staleResult.deleted;
          } catch (cleanupError) {
            const cleanupMsg = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
            console.error(`   ⚠️  Stale cleanup failed (non-fatal): ${cleanupMsg}`);
            this.addError('stale_cleanup_failed', cleanupMsg, false);
          }
        }

        this.completeStep(stepNum, result.tokensUsed, { 
          restaurantsAdded: output.restaurantsUpdated,
          restaurantsDeleted: output.restaurantsDeleted,
        });
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

    if (input.scope.narrative && !input.dryRun) {
      const narrativeStep = this.startStep('Generate chef narrative');
      try {
        const { data: contextData } = await this.supabase
          .from('chefs')
          .select(`
            name,
            mini_bio,
            james_beard_status,
            chef_shows (
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
        this.addError('narrative_generation_failed', errorMessage, false);
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
