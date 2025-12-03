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

const BulkRefreshSchema = z.object({
  chefIds: z.array(z.string().uuid()).min(1).max(25),
  enrichmentType: z.enum(['full', 'restaurants_only']),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const validated = BulkRefreshSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error: missing Supabase credentials');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { data: chefs, error: chefsError } = await supabase
      .from('chefs')
      .select('id, name')
      .in('id', validated.chefIds);

    if (chefsError || !chefs || chefs.length === 0) {
      return createBadRequestResponse('No valid chefs found', { chefIds: validated.chefIds });
    }

    if (chefs.length !== validated.chefIds.length) {
      const foundIds = chefs.map(c => c.id);
      const missingIds = validated.chefIds.filter(id => !foundIds.includes(id));
      console.warn(`[Admin Enrichment] Some chef IDs not found: ${missingIds.join(', ')}`);
    }

    const enrichmentTypeMap = {
      full: ENRICHMENT_TYPE.MANUAL_FULL,
      restaurants_only: ENRICHMENT_TYPE.MANUAL_RESTAURANTS,
    };

    const jobType = enrichmentTypeMap[validated.enrichmentType];

    const estimatedCostPerChef = validated.enrichmentType === 'full'
      ? ENRICHMENT_CONFIG.COST_ESTIMATES.FULL_ENRICHMENT
      : ENRICHMENT_CONFIG.COST_ESTIMATES.RESTAURANTS_ONLY;

    const totalEstimatedCost = estimatedCostPerChef * chefs.length;

    const budgetCheck = await checkBudgetAvailable(supabase, totalEstimatedCost);
    
    if (!budgetCheck.allowed) {
      return createBadRequestResponse(
        'Bulk refresh would exceed monthly budget',
        {
          estimatedCost: totalEstimatedCost,
          budgetRemaining: budgetCheck.remainingUsd,
          reason: budgetCheck.reason,
        }
      );
    }

    const { data: existingJobs } = await supabase
      .from('enrichment_jobs')
      .select('chef_id')
      .in('chef_id', validated.chefIds)
      .in('status', ['queued', 'processing']);

    const existingChefIds = new Set((existingJobs || []).map(j => j.chef_id));
    const chefsToEnrich = chefs.filter(c => !existingChefIds.has(c.id));

    if (chefsToEnrich.length === 0) {
      return createBadRequestResponse(
        'All selected chefs already have pending enrichment jobs',
        { existingJobCount: existingChefIds.size }
      );
    }

    const jobsToInsert = chefsToEnrich.map(chef => ({
      chef_id: chef.id,
      status: 'queued' as const,
      enrichment_type: jobType,
      priority_score: 75,
      triggered_by: authResult.user!.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: jobs, error: jobsError } = await supabase
      .from('enrichment_jobs')
      .insert(jobsToInsert)
      .select('id');

    if (jobsError || !jobs) {
      return createServerErrorResponse('Failed to create bulk enrichment jobs', jobsError);
    }

    return createSuccessResponse({
      success: true,
      jobsCreated: jobs.length,
      chefsSkipped: chefs.length - jobs.length,
      totalChefs: chefs.length,
      estimatedCost: totalEstimatedCost,
      enrichmentType: validated.enrichmentType,
      budgetStatus: {
        budgetUsd: budgetCheck.budgetUsd,
        spentUsd: budgetCheck.spentUsd,
        remainingAfter: budgetCheck.remainingUsd - totalEstimatedCost,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request body', error.errors);
    }

    console.error('[Admin Enrichment] Error creating bulk jobs:', error);
    return createServerErrorResponse(
      'Failed to create bulk enrichment jobs',
      error instanceof Error ? error.message : String(error)
    );
  }
}
