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
import { checkBudgetAvailable, estimateCostFromTokens } from '@/lib/enrichment/budget';
import { ENRICHMENT_TYPE, ENRICHMENT_CONFIG } from '@/lib/enrichment/constants';

const TriggerChefSchema = z.object({
  chefId: z.string().uuid(),
  enrichmentType: z.enum(['full', 'restaurants_only', 'photo_only']),
  priority: z.number().min(0).max(100).optional().default(100),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const validated = TriggerChefSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error: missing Supabase credentials');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { data: chef, error: chefError } = await supabase
      .from('chefs')
      .select('id, name')
      .eq('id', validated.chefId)
      .single();

    if (chefError || !chef) {
      return createBadRequestResponse('Chef not found', { chefId: validated.chefId });
    }

    const enrichmentTypeMap = {
      full: ENRICHMENT_TYPE.MANUAL_FULL,
      restaurants_only: ENRICHMENT_TYPE.MANUAL_RESTAURANTS,
      photo_only: ENRICHMENT_TYPE.MANUAL_FULL,
    };

    const jobType = enrichmentTypeMap[validated.enrichmentType];

    const estimatedCost = validated.enrichmentType === 'full' || validated.enrichmentType === 'photo_only'
      ? ENRICHMENT_CONFIG.COST_ESTIMATES.FULL_ENRICHMENT
      : ENRICHMENT_CONFIG.COST_ESTIMATES.RESTAURANTS_ONLY;

    const budgetCheck = await checkBudgetAvailable(supabase, estimatedCost);
    
    if (!budgetCheck.allowed) {
      return createBadRequestResponse(
        'Cannot trigger enrichment: would exceed monthly budget',
        {
          currentSpent: budgetCheck.spentUsd,
          budgetLimit: budgetCheck.budgetUsd,
          estimatedCost,
          remainingBudget: budgetCheck.remainingUsd,
          suggestion: 'Try again next month or increase the monthly budget limit via /api/admin/enrichment/budget'
        }
      );
    }

    const { data: existingJob } = await supabase
      .from('enrichment_jobs')
      .select('id, status')
      .eq('chef_id', validated.chefId)
      .in('status', ['queued', 'processing'])
      .maybeSingle();

    if (existingJob) {
      return createBadRequestResponse(
        'Chef already has a pending enrichment job',
        { jobId: existingJob.id, status: existingJob.status }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .insert({
        chef_id: validated.chefId,
        status: 'queued',
        enrichment_type: jobType,
        priority_score: validated.priority,
        triggered_by: authResult.user!.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobError || !job) {
      return createServerErrorResponse('Failed to create enrichment job', jobError);
    }

    const { count: queuedCount } = await supabase
      .from('enrichment_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    return createSuccessResponse({
      success: true,
      jobId: job.id,
      chefName: chef.name,
      enrichmentType: validated.enrichmentType,
      estimatedCost,
      queuePosition: (queuedCount || 0) + 1,
      budgetWarning: budgetCheck.allowed ? undefined : budgetCheck.reason,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request body', error.errors);
    }

    console.error('[Admin Enrichment] Error creating job:', error);
    return createServerErrorResponse(
      'Failed to create enrichment job',
      error instanceof Error ? error.message : String(error)
    );
  }
}
