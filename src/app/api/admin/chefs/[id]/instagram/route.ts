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

const UpdateInstagramSchema = z.object({
  instagramHandle: z.string().nullable().optional().transform(val => {
    if (!val) return null;
    const cleaned = val.replace(/^@/, '').trim();
    if (!cleaned || !/^[a-zA-Z0-9._]{1,30}$/.test(cleaned)) {
      throw new Error('Invalid Instagram handle format');
    }
    return cleaned;
  }),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const { id: chefId } = await params;
    
    if (!chefId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chefId)) {
      return createBadRequestResponse('Invalid chef ID');
    }

    const body = await request.json();
    const validated = UpdateInstagramSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { data: chef, error: fetchError } = await supabase
      .from('chefs')
      .select('id, name')
      .eq('id', chefId)
      .single();

    if (fetchError || !chef) {
      return createBadRequestResponse('Chef not found');
    }

    const { error: updateError } = await supabase
      .from('chefs')
      .update({
        instagram_handle: validated.instagramHandle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId);

    if (updateError) {
      return createServerErrorResponse('Failed to update Instagram handle', updateError);
    }

    return createSuccessResponse({
      success: true,
      chefId,
      instagramHandle: validated.instagramHandle,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request', error.errors);
    }

    console.error('[Admin Instagram Update] Error:', error);
    return createServerErrorResponse(
      'Failed to update Instagram handle',
      error instanceof Error ? error.message : String(error)
    );
  }
}
