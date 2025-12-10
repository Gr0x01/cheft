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
import { updateBudgetLimit, ensureBudgetExists } from '@/lib/enrichment/budget';

const UpdateBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  budgetUsd: z.number().min(0).max(1000),
});

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const validated = UpdateBudgetSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error: missing Supabase credentials');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const monthDate = new Date(validated.month);

    const ensureResult = await ensureBudgetExists(supabase, monthDate, validated.budgetUsd);
    
    if (!ensureResult.success) {
      return createServerErrorResponse('Failed to ensure budget exists', ensureResult.error);
    }

    const updateResult = await updateBudgetLimit(supabase, validated.budgetUsd, monthDate);

    if (!updateResult.success) {
      return createServerErrorResponse('Failed to update budget limit', updateResult.error);
    }

    const { data: updatedBudget } = await supabase
      .from('enrichment_budgets')
      .select('*')
      .eq('month', validated.month)
      .single();

    return createSuccessResponse({
      success: true,
      budget: updatedBudget,
      message: `Budget for ${validated.month} updated to $${validated.budgetUsd}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request body', error.errors);
    }

    console.error('[Admin Enrichment] Error updating budget:', error);
    return createServerErrorResponse(
      'Failed to update budget',
      error instanceof Error ? error.message : String(error)
    );
  }
}
