import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const DeleteRequestSchema = z.object({
  restaurantId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = DeleteRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { restaurantId } = validation.data;

    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: restaurant, error: fetchError } = await adminClient
      .from('restaurants')
      .select('id, name, slug')
      .eq('id', restaurantId)
      .single();

    if (fetchError || !restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const { error: embeddingError } = await adminClient
      .from('restaurant_embeddings')
      .delete()
      .eq('restaurant_id', restaurantId);

    if (embeddingError) {
      console.error('[Delete] Failed to delete embeddings:', embeddingError);
    }

    const { error: deleteError } = await adminClient
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);

    if (deleteError) {
      console.error('[Delete] Failed to delete restaurant:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete restaurant' },
        { status: 500 }
      );
    }

    console.log(`[Delete] Permanently deleted restaurant: ${restaurant.name} (${restaurant.slug}) by ${user.email}`);

    revalidatePath('/admin/entities');

    return NextResponse.json({
      success: true,
      restaurantId,
      name: restaurant.name,
    });

  } catch (error) {
    console.error('[Delete] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
