import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MergeRequestSchema = z.object({
  winnerId: z.string().uuid(),
  loserId: z.string().uuid(),
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

    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const validation = MergeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { winnerId, loserId } = validation.data;

    if (winnerId === loserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot merge a restaurant with itself' },
        { status: 400 }
      );
    }

    const { data: winner, error: winnerError } = await adminClient
      .from('restaurants')
      .select('*')
      .eq('id', winnerId)
      .single();

    if (winnerError || !winner) {
      return NextResponse.json(
        { success: false, error: 'Winner restaurant not found' },
        { status: 404 }
      );
    }

    const { data: loser, error: loserError } = await adminClient
      .from('restaurants')
      .select('*')
      .eq('id', loserId)
      .single();

    if (loserError || !loser) {
      return NextResponse.json(
        { success: false, error: 'Loser restaurant not found' },
        { status: 404 }
      );
    }

    const { error: updateError } = await adminClient
      .from('restaurants')
      .update({
        is_public: false,
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', loserId);

    if (updateError) {
      console.error('[Merge] Failed to hide loser restaurant:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to hide duplicate restaurant' },
        { status: 500 }
      );
    }

    const { error: candidateUpdateError } = await adminClient
      .from('duplicate_candidates')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.email || 'admin',
        merged_into: winnerId,
      })
      .contains('restaurant_ids', [winnerId, loserId]);

    if (candidateUpdateError) {
      console.error('[Merge] Failed to update duplicate candidate:', candidateUpdateError);
    }

    console.log(`[Merge] Successfully merged ${loser.name} (${loserId}) into ${winner.name} (${winnerId})`);

    return NextResponse.json({
      success: true,
      winner: { id: winnerId, name: winner.name },
      merged: { id: loserId, name: loser.name },
    });

  } catch (error) {
    console.error('[Merge] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
