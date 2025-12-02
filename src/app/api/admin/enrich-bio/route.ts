import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chefId } = await request.json();

  if (!chefId) {
    return NextResponse.json({ error: 'Missing chefId' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chefId)) {
    return NextResponse.json({ error: 'Invalid chef ID' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Bio enrichment triggered. Run the enrichment script manually for now.',
  });
}
