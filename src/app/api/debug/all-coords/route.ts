import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, lat, lng, status, is_public')
    .eq('is_public', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = restaurants?.length || 0;
  const withCoords = restaurants?.filter(r => r.lat && r.lng) || [];
  const withoutCoords = restaurants?.filter(r => !r.lat || !r.lng) || [];
  const openWithoutCoords = withoutCoords.filter(r => r.status === 'open');

  return NextResponse.json({
    total,
    withCoords: withCoords.length,
    withoutCoords: withoutCoords.length,
    openWithoutCoords: openWithoutCoords.length,
    percentageWithCoords: ((withCoords.length / total) * 100).toFixed(1),
    sampleWithoutCoords: openWithoutCoords.slice(0, 10).map(r => ({
      name: r.name,
      slug: r.slug,
      status: r.status
    }))
  });
}
