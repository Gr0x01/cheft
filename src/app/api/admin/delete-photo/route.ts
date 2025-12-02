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

  const { type, itemId, photoUrl } = await request.json();

  if (!type || !itemId || !photoUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['chef', 'restaurant'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  if (!photoUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
  }

  const fileName = photoUrl.split('/').pop();
  const filePath = `${type}s/${fileName}`;

  const { error: deleteError } = await supabase.storage
    .from('photos')
    .remove([filePath]);

  if (deleteError) {
    console.error('Storage delete error:', deleteError);
  }

  if (type === 'chef') {
    const { error: updateError } = await supabase
      .from('chefs')
      .update({
        photo_url: null,
        photo_source: null,
      })
      .eq('id', itemId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('photo_urls')
      .eq('id', itemId)
      .single();

    const photoUrls = (restaurant?.photo_urls || []).filter((url) => url !== photoUrl);

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        photo_urls: photoUrls,
      })
      .eq('id', itemId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
