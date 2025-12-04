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

const UpdateFeaturedPostSchema = z.object({
  featuredInstagramPost: z.string().nullable().optional().transform(val => {
    if (!val) return null;
    const trimmed = val.trim();
    if (!trimmed || !/^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]{11,}\/?$/.test(trimmed)) {
      throw new Error('Invalid Instagram post URL format. Expected: https://www.instagram.com/p/POST_ID/');
    }
    return trimmed;
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
    const validated = UpdateFeaturedPostSchema.parse(body);

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
        featured_instagram_post: validated.featuredInstagramPost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chefId);

    if (updateError) {
      console.error('[Admin Featured Post Update] Database error:', updateError);
      return createServerErrorResponse('Failed to update featured Instagram post');
    }

    return createSuccessResponse({
      success: true,
      chefId,
      featuredInstagramPost: validated.featuredInstagramPost,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request', error.errors);
    }

    console.error('[Admin Featured Post Update] Error:', error);
    return createServerErrorResponse(
      'Failed to update featured Instagram post',
      error instanceof Error ? error.message : String(error)
    );
  }
}
