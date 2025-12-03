import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_ENTITY_TYPES = ['chef', 'restaurant'] as const;
const VALID_ISSUE_TYPES = ['closed', 'incorrect_info', 'wrong_photo', 'other'] as const;

type EntityType = typeof VALID_ENTITY_TYPES[number];
type IssueType = typeof VALID_ISSUE_TYPES[number];

interface FeedbackRequest {
  entity_type: EntityType;
  entity_id: string;
  issue_type: IssueType;
  message?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity_type, entity_id, issue_type, message } = body as FeedbackRequest;

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const supabase = await createClient();

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentSubmissions } = await supabase
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .eq('issue_type', issue_type)
      .gte('created_at', fifteenMinutesAgo);

    if (recentSubmissions && recentSubmissions > 0) {
      return NextResponse.json(
        { error: 'A similar report was recently submitted. Please wait before submitting again.' },
        { status: 429 }
      );
    }

    if (!entity_type || !VALID_ENTITY_TYPES.includes(entity_type)) {
      return NextResponse.json(
        { error: 'Invalid entity_type. Must be "chef" or "restaurant".' },
        { status: 400 }
      );
    }

    if (!entity_id || !isValidUUID(entity_id)) {
      return NextResponse.json(
        { error: 'Invalid entity_id. Must be a valid UUID.' },
        { status: 400 }
      );
    }

    if (!issue_type || !VALID_ISSUE_TYPES.includes(issue_type)) {
      return NextResponse.json(
        { error: 'Invalid issue_type. Must be one of: closed, incorrect_info, wrong_photo, other.' },
        { status: 400 }
      );
    }

    if (message && typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message. Must be a string.' },
        { status: 400 }
      );
    }

    if (message && message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1000 characters.' },
        { status: 400 }
      );
    }

    const { data: entity } = entity_type === 'chef'
      ? await supabase.from('chefs').select('id').eq('id', entity_id).single()
      : await supabase.from('restaurants').select('id').eq('id', entity_id).single();

    if (!entity) {
      return NextResponse.json(
        { error: `${entity_type === 'chef' ? 'Chef' : 'Restaurant'} not found.` },
        { status: 404 }
      );
    }

    const { error: insertError } = await supabase
      .from('user_feedback')
      .insert({
        entity_type,
        entity_id,
        issue_type,
        message: message || null,
      });

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit feedback. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Thank you for your feedback!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
