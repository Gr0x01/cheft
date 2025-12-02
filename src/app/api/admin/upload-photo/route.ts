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

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as 'chef' | 'restaurant';
  const itemId = formData.get('itemId') as string;

  if (!file || !type || !itemId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['chef', 'restaurant'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: jpg, png, webp' }, { status: 400 });
  }

  const bucketName = type === 'chef' ? 'chef-photos' : 'restaurant-photos';
  const fileName = `${itemId}/photo-${Date.now()}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: uploadData, error: uploadError } = await serviceSupabase.storage
    .from(bucketName)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = serviceSupabase.storage.from(bucketName).getPublicUrl(fileName);

  if (type === 'chef') {
    const { error: updateError } = await serviceSupabase
      .from('chefs')
      .update({
        photo_url: publicUrl,
        photo_source: 'manual',
      })
      .eq('id', itemId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { data: restaurant } = await serviceSupabase
      .from('restaurants')
      .select('photo_urls')
      .eq('id', itemId)
      .single();

    const photoUrls = restaurant?.photo_urls || [];
    photoUrls.unshift(publicUrl);

    const { error: updateError } = await serviceSupabase
      .from('restaurants')
      .update({
        photo_urls: photoUrls,
      })
      .eq('id', itemId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, url: publicUrl });
}
