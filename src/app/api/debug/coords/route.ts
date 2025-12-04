import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (slug) {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, lat, lng, status, city, state')
      .eq('slug', slug)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      restaurant,
      hasCoords: !!(restaurant?.lat && restaurant?.lng)
    });
  }
  
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
