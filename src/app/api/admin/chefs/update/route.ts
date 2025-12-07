import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_CHEF_FIELDS = [
  'name', 'slug', 'bio', 'photo_url', 'photo_source',
  'instagram_handle', 'instagram_featured_post',
  'james_beard_status', 'james_beard_year',
  'career_narrative', 'cookbook_titles', 'awards',
  'current_restaurant_focus', 'signature_style',
  'training_background', 'media_features',
];

function sanitizeUpdates(updates: Record<string, unknown>, allowedFields: string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedFields.includes(key))
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chefId, updates } = await request.json();

  if (!chefId) {
    return NextResponse.json({ error: 'Missing chefId' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chefId)) {
    return NextResponse.json({ error: 'Invalid chef ID' }, { status: 400 });
  }

  const sanitizedUpdates = sanitizeUpdates(updates || {}, ALLOWED_CHEF_FIELDS);
  if (Object.keys(sanitizedUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from('chefs')
    .update(sanitizedUpdates)
    .eq('id', chefId);

  if (error) {
    console.error('Failed to update chef:', error);
    return NextResponse.json({ error: 'Failed to update chef' }, { status: 500 });
  }

  console.log(`[Update] Successfully updated chef ${chefId} by ${user.email}`);

  return NextResponse.json({ message: 'Chef updated successfully' });
}
