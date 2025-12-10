import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { MapPinRpcRow } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('get_restaurant_map_pins');
    
    if (error) throw error;
    
    const pins = (data as MapPinRpcRow[] | null) || [];
    
    return NextResponse.json(pins, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
  } catch (error) {
    console.error('Error fetching map pins:', error);
    return NextResponse.json({ error: 'Failed to fetch map pins' }, { status: 500 });
  }
}
