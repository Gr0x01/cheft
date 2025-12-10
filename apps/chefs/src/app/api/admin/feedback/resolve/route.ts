import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entity_type, entity_id, issue_type } = await request.json();

    if (!entity_type || !['chef', 'restaurant'].includes(entity_type)) {
      return NextResponse.json(
        { error: 'Invalid entity_type' },
        { status: 400 }
      );
    }

    if (!entity_id || !UUID_REGEX.test(entity_id)) {
      return NextResponse.json(
        { error: 'Invalid entity_id' },
        { status: 400 }
      );
    }

    if (!issue_type || !['closed', 'incorrect_info', 'wrong_photo', 'other'].includes(issue_type)) {
      return NextResponse.json(
        { error: 'Invalid issue_type' },
        { status: 400 }
      );
    }

    const { error: resolveError } = await supabase.rpc('resolve_feedback', {
      p_entity_type: entity_type,
      p_entity_id: entity_id,
      p_issue_type: issue_type,
      p_reviewed_by: user.email || 'unknown',
    });

    if (resolveError) {
      console.error('Error resolving feedback:', resolveError);
      return NextResponse.json(
        { error: 'Failed to resolve feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in resolve feedback API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
