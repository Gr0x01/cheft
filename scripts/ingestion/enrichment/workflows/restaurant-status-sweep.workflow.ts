import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../../src/lib/database.types';
import { BaseWorkflow } from './base-workflow';
import { CostEstimate, ValidationResult } from '../types/workflow-types';
import { StatusVerificationService } from '../services/status-verification-service';
import { RestaurantRepository } from '../repositories/restaurant-repository';
import { TokenTracker } from '../shared/token-tracker';
import { configure as configureSynthesis } from '../shared/synthesis-client';

export interface RestaurantStatusSweepInput {
  restaurantIds?: string[];
  criteria?: {
    notVerifiedInDays?: number;
    status?: 'open' | 'closed' | 'unknown';
    chefId?: string;
  };
  limit?: number;
  minConfidence?: number;
  batchSize?: number;
  dryRun?: boolean;
}

export interface RestaurantStatusSweepOutput {
  totalProcessed: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  updates: Array<{
    restaurantId: string;
    restaurantName: string;
    oldStatus: string;
    newStatus: string;
    confidence: number;
  }>;
}

interface RestaurantData {
  id: string;
  name: string;
  city: string;
  state: string | null;
  status: string;
  chef_id: string;
  chefs: { name: string } | null;
}

export class RestaurantStatusSweepWorkflow extends BaseWorkflow<RestaurantStatusSweepInput, RestaurantStatusSweepOutput> {
  private supabase: SupabaseClient<Database>;
  private statusVerificationService: StatusVerificationService;
  private restaurantRepo: RestaurantRepository;

  constructor(
    supabase: SupabaseClient<Database>,
    options: { model?: string } = {}
  ) {
    super({
      workflowName: 'restaurant-status-sweep',
      maxCostUsd: 5,
      timeoutMs: 900000,
      allowRollback: false,
    });

    this.supabase = supabase;
    configureSynthesis({ accuracyModel: options.model || 'gpt-4o-mini' });
    const tokenTracker = TokenTracker.getInstance();

    this.statusVerificationService = new StatusVerificationService(tokenTracker);
    this.restaurantRepo = new RestaurantRepository(supabase);
  }

  validate(input: RestaurantStatusSweepInput): ValidationResult {
    const errors: string[] = [];

    if (input.restaurantIds && input.criteria) {
      errors.push('Cannot specify both restaurantIds and criteria');
    }

    if (!input.restaurantIds && !input.criteria) {
      errors.push('Must specify either restaurantIds or criteria');
    }

    if (input.restaurantIds) {
      for (const id of input.restaurantIds) {
        if (!id || id.length !== 36) {
          errors.push(`Invalid restaurant ID: ${id}`);
        }
      }
    }

    if (input.limit && input.limit < 1) {
      errors.push('Limit must be at least 1');
    }

    if (input.minConfidence && (input.minConfidence < 0 || input.minConfidence > 1)) {
      errors.push('minConfidence must be between 0 and 1');
    }

    if (input.batchSize && input.batchSize < 1) {
      errors.push('batchSize must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async estimateCost(input: RestaurantStatusSweepInput): Promise<CostEstimate> {
    let restaurantCount = 0;

    if (input.restaurantIds) {
      restaurantCount = input.restaurantIds.length;
    } else if (input.criteria) {
      const query = this.supabase
        .from('restaurants')
        .select('id', { count: 'exact', head: true });

      if (input.criteria.status) {
        query.eq('status', input.criteria.status);
      }

      if (input.criteria.chefId) {
        query.eq('chef_id', input.criteria.chefId);
      }

      if (input.criteria.notVerifiedInDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.criteria.notVerifiedInDays);
        query.or(`status_verified_at.is.null,status_verified_at.lt.${cutoffDate.toISOString()}`);
      }

      const { count } = await query;
      restaurantCount = count || 0;
    }

    const limit = input.limit || restaurantCount;
    const actualCount = Math.min(restaurantCount, limit);

    const tokensPerRestaurant = 500;
    const estimatedTokens = actualCount * tokensPerRestaurant;
    const maxTokens = actualCount * 1000;

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

  async executeSteps(input: RestaurantStatusSweepInput): Promise<RestaurantStatusSweepOutput> {
    const output: RestaurantStatusSweepOutput = {
      totalProcessed: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalFailed: 0,
      updates: [],
    };

    const stepNum = this.startStep('Fetch restaurants to verify');
    let restaurants: RestaurantData[] = [];

    try {
      if (input.restaurantIds) {
        const { data, error } = await this.supabase
          .from('restaurants')
          .select('id, name, city, state, status, chef_id, chefs!restaurants_chef_id_fkey(name)')
          .in('id', input.restaurantIds);

        if (error) throw error;
        restaurants = (data || []) as RestaurantData[];
      } else if (input.criteria) {
        let query = this.supabase
          .from('restaurants')
          .select('id, name, city, state, status, chef_id, chefs!restaurants_chef_id_fkey(name)')
          .order('status_verified_at', { ascending: true, nullsFirst: true });

        if (input.criteria.status) {
          query = query.eq('status', input.criteria.status);
        }

        if (input.criteria.chefId) {
          query = query.eq('chef_id', input.criteria.chefId);
        }

        if (input.criteria.notVerifiedInDays) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - input.criteria.notVerifiedInDays);
          query = query.or(`status_verified_at.is.null,status_verified_at.lt.${cutoffDate.toISOString()}`);
        }

        if (input.limit) {
          query = query.limit(input.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        restaurants = (data || []) as RestaurantData[];
      }

      this.completeStep(stepNum, undefined, { restaurantCount: restaurants.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failStep(stepNum, errorMessage);
      throw new Error(`Failed to fetch restaurants: ${errorMessage}`);
    }

    if (restaurants.length === 0) {
      return output;
    }

    const batchSize = input.batchSize || 10;
    const minConfidence = input.minConfidence ?? 0.7;

    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(restaurants.length / batchSize);
      const stepNum = this.startStep(`Verify batch ${batchNum}/${totalBatches} (${batch.length} restaurants)`);

      try {
        const results = await Promise.allSettled(
          batch.map(async (restaurant) => {
            const chefName = restaurant.chefs?.name || 'Unknown Chef';
            
            const result = await this.statusVerificationService.verifyStatus(
              restaurant.id,
              restaurant.name,
              chefName,
              restaurant.city,
              restaurant.state || undefined
            );

            output.totalProcessed++;

            if (!result.success) {
              output.totalFailed++;
              return { restaurant, result, updated: false };
            }

            if (result.confidence < minConfidence || result.status === 'unknown') {
              output.totalSkipped++;
              return { restaurant, result, updated: false };
            }

            if (result.status === restaurant.status) {
              output.totalSkipped++;
              return { restaurant, result, updated: false };
            }

            if (!input.dryRun) {
              const updateResult = await this.restaurantRepo.updateStatus(
                restaurant.id,
                result.status,
                result.confidence,
                result.reason
              );

              if (!updateResult.success) {
                output.totalFailed++;
                return { restaurant, result, updated: false };
              }
            }

            output.totalUpdated++;
            output.updates.push({
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              oldStatus: restaurant.status,
              newStatus: result.status,
              confidence: result.confidence,
            });

            return { restaurant, result, updated: true };
          })
        );

        const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
        const rejected = results.filter((r) => r.status === 'rejected').length;

        this.completeStep(stepNum, undefined, { 
          batchSize: batch.length, 
          fulfilled, 
          rejected 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.failStep(stepNum, errorMessage);
        this.addError('batch_verification_failed', errorMessage, false);
      }
    }

    return output;
  }
}
