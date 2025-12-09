import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const VALID_SHOW_TYPES = ['core', 'spinoff', 'variant', 'named_season'] as const;
type ShowType = typeof VALID_SHOW_TYPES[number];

function isValidShowType(type: unknown): type is ShowType {
  return typeof type === 'string' && VALID_SHOW_TYPES.includes(type as ShowType);
}

function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { showId, updates } = body;

  if (!showId || !isValidUUID(showId)) {
    return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 });
  }

  if (!updates || typeof updates !== 'object') {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const sanitizedUpdates: Record<string, unknown> = {};

  if ('is_public' in updates) {
    if (typeof updates.is_public !== 'boolean') {
      return NextResponse.json({ error: 'is_public must be a boolean' }, { status: 400 });
    }
    sanitizedUpdates.is_public = updates.is_public;
  }

  if ('show_type' in updates) {
    const trimmedType = typeof updates.show_type === 'string' ? updates.show_type.trim() : updates.show_type;
    if (trimmedType !== null && !isValidShowType(trimmedType)) {
      return NextResponse.json({ error: 'Invalid show_type' }, { status: 400 });
    }
    sanitizedUpdates.show_type = trimmedType || null;
  }

  if ('parent_show_id' in updates) {
    if (updates.parent_show_id !== null && !isValidUUID(updates.parent_show_id)) {
      return NextResponse.json({ error: 'Invalid parent_show_id' }, { status: 400 });
    }
    if (updates.parent_show_id === showId) {
      return NextResponse.json({ error: 'Show cannot be its own parent' }, { status: 400 });
    }
    sanitizedUpdates.parent_show_id = updates.parent_show_id;
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (sanitizedUpdates.parent_show_id) {
    const { data: descendants } = await adminClient
      .from('shows')
      .select('id')
      .eq('parent_show_id', showId);
    
    if (descendants?.some(d => d.id === sanitizedUpdates.parent_show_id)) {
      return NextResponse.json({ error: 'Cannot create circular reference' }, { status: 400 });
    }
  }

  const { error } = await adminClient
    .from('shows')
    .update(sanitizedUpdates)
    .eq('id', showId);

  if (error) {
    console.error('Failed to update show:', error);
    return NextResponse.json({ error: 'Failed to update show' }, { status: 500 });
  }

  console.log(`[Update] Show ${showId} updated by ${user.email}:`, sanitizedUpdates);

  return NextResponse.json({ success: true });
}
