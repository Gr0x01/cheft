import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { restaurantId, updates } = await request.json();

  if (!restaurantId) {
    return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
  }

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId);

  if (error) {
    console.error('Failed to update restaurant:', error);
    return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 });
  }

  console.log(`[Update] Successfully updated restaurant ${restaurantId} by ${user.email}`);

  return NextResponse.json({ message: 'Restaurant updated successfully' });
}
