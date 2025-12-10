import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const KeepAllRequestSchema = z.object({
  groupId: z.string().uuid(),
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
    const validation = KeepAllRequestSchema.safeParse(body);

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

    const { groupId } = validation.data;

    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: candidateUpdateError } = await adminClient
      .from('duplicate_candidates')
      .update({
        status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: user.email || 'admin',
      })
      .eq('group_id', groupId);

    if (candidateUpdateError) {
      console.error('[KeepAll] Failed to mark group as ignored:', candidateUpdateError);
      return NextResponse.json(
        { success: false, error: 'Failed to mark group as reviewed' },
        { status: 500 }
      );
    }

    console.log(`[KeepAll] Group ${groupId} marked as not duplicates by ${user.email}`);

    return NextResponse.json({
      success: true,
      groupId,
    });

  } catch (error) {
    console.error('[KeepAll] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
