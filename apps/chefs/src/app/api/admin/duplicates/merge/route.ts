import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MergeRequestSchema = z.object({
  groupId: z.string().uuid(),
  keeperIds: z.array(z.string().uuid()).min(1),
  loserIds: z.array(z.string().uuid()),
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

    const { groupId, keeperIds, loserIds } = validation.data;

    const overlap = keeperIds.filter(id => loserIds.includes(id));
    if (overlap.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Keeper and loser IDs cannot overlap' },
        { status: 400 }
      );
    }

    if (loserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No restaurants to hide' },
        { status: 400 }
      );
    }

    const { data: keepers } = await adminClient
      .from('restaurants')
      .select('id, name')
      .in('id', keeperIds);

    const { data: losers } = await adminClient
      .from('restaurants')
      .select('id, name')
      .in('id', loserIds);

    if (!keepers || keepers.length !== keeperIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some keeper restaurants not found' },
        { status: 404 }
      );
    }

    if (!losers || losers.length !== loserIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some loser restaurants not found' },
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
      .in('id', loserIds);

    if (updateError) {
      console.error('[Merge] Failed to hide loser restaurants:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to hide duplicate restaurants' },
        { status: 500 }
      );
    }

    const { error: candidateUpdateError } = await adminClient
      .from('duplicate_candidates')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.email || 'admin',
        merged_into: keeperIds[0],
      })
      .eq('group_id', groupId);

    if (candidateUpdateError) {
      console.error('[Merge] Failed to update duplicate candidates:', candidateUpdateError);
    }

    console.log(`[Merge] Successfully merged group ${groupId}:`);
    console.log(`  Kept: ${keepers.map(k => k.name).join(', ')}`);
    console.log(`  Hidden: ${losers.map(l => l.name).join(', ')}`);

    return NextResponse.json({
      success: true,
      kept: keepers.length,
      hidden: losers.length,
      keepers: keepers.map(k => ({ id: k.id, name: k.name })),
      merged: losers.map(l => ({ id: l.id, name: l.name })),
    });

  } catch (error) {
    console.error('[Merge] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
