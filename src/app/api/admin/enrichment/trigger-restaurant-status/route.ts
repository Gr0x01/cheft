import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import {
  verifyAdminAuth,
  createUnauthorizedResponse,
  createBadRequestResponse,
  createServerErrorResponse,
  createSuccessResponse,
} from '@/lib/auth/admin';
import { checkBudgetAvailable } from '@/lib/enrichment/budget';
import { ENRICHMENT_TYPE, ENRICHMENT_CONFIG } from '@/lib/enrichment/constants';

const TriggerRestaurantStatusSchema = z.object({
  restaurantId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const validated = TriggerRestaurantStatusSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error: missing Supabase credentials');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, chef_id, status')
      .eq('id', validated.restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return createBadRequestResponse('Restaurant not found', { restaurantId: validated.restaurantId });
    }

    const estimatedCost = ENRICHMENT_CONFIG.COST_ESTIMATES.STATUS_CHECK;
    const budgetCheck = await checkBudgetAvailable(supabase, estimatedCost);
    
    if (!budgetCheck.allowed) {
      return createBadRequestResponse(
        'Cannot verify restaurant status: would exceed monthly budget',
        {
          currentSpent: budgetCheck.spentUsd,
          budgetLimit: budgetCheck.budgetUsd,
          estimatedCost,
          remainingBudget: budgetCheck.remainingUsd,
        }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .insert({
        chef_id: restaurant.chef_id,
        status: 'queued',
        enrichment_type: ENRICHMENT_TYPE.MANUAL_STATUS,
        priority_score: 100,
        triggered_by: authResult.user!.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobError || !job) {
      return createServerErrorResponse('Failed to create status verification job', jobError);
    }

    return createSuccessResponse({
      success: true,
      jobId: job.id,
      restaurantName: restaurant.name,
      currentStatus: restaurant.status,
      estimatedCost,
      budgetWarning: budgetCheck.allowed ? undefined : budgetCheck.reason,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request body', error.errors);
    }

    console.error('[Admin Enrichment] Error creating status check job:', error);
    return createServerErrorResponse(
      'Failed to create status verification job',
      error instanceof Error ? error.message : String(error)
    );
  }
}
