import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, lat, lng, status')
    .eq('is_public', true)
    .eq('status', 'open')
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withCoords = restaurants?.filter(r => r.lat && r.lng) || [];
  const withoutCoords = restaurants?.filter(r => !r.lat || !r.lng) || [];

  return NextResponse.json({
    total: restaurants?.length || 0,
    withCoords: withCoords.length,
    withoutCoords: withoutCoords.length,
    samples: {
      withCoords: withCoords.slice(0, 3),
      withoutCoords: withoutCoords.slice(0, 3)
    }
  });
}
