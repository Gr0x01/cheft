import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[DELETE-PHOTO] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, itemId, photoUrl } = await request.json();
    console.log('[DELETE-PHOTO] Request:', { type, itemId, photoUrl });

    if (!type || !itemId || !photoUrl) {
      console.error('[DELETE-PHOTO] Missing fields:', { type, itemId, photoUrl });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['chef', 'restaurant'].includes(type)) {
      console.error('[DELETE-PHOTO] Invalid type:', type);
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      console.error('[DELETE-PHOTO] Invalid UUID:', itemId);
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    if (!photoUrl.startsWith('https://')) {
      console.error('[DELETE-PHOTO] Invalid URL protocol:', photoUrl);
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const isSupabaseStorageUrl = photoUrl.includes('/storage/v1/object/public/');
    
    if (isSupabaseStorageUrl) {
      const bucketName = type === 'chef' ? 'chef-photos' : 'restaurant-photos';
      const parts = photoUrl.split('/storage/v1/object/public/');
      
      if (parts.length === 2) {
        const pathParts = parts[1].split('/');
        const bucket = pathParts[0];
        const filePath = pathParts.slice(1).join('/');
        
        console.log('[DELETE-PHOTO] Supabase storage photo detected:', { bucket, filePath });
        
        if (bucket === bucketName) {
          const { error: deleteError } = await serviceSupabase.storage
            .from(bucketName)
            .remove([filePath]);

          if (deleteError) {
            console.error('[DELETE-PHOTO] Storage delete error:', deleteError);
            return NextResponse.json({ error: `Storage deletion failed: ${deleteError.message}` }, { status: 500 });
          }
          console.log('[DELETE-PHOTO] Storage file deleted successfully');
        } else {
          console.log('[DELETE-PHOTO] Bucket mismatch, skipping storage deletion:', { expected: bucketName, got: bucket });
        }
      }
    } else {
      console.log('[DELETE-PHOTO] External photo URL (Wikipedia/etc), skipping storage deletion');
    }

    if (type === 'chef') {
      const { error: updateError } = await serviceSupabase
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
      const { data: restaurant } = await serviceSupabase
        .from('restaurants')
        .select('photo_urls')
        .eq('id', itemId)
        .single();

      const photoUrls = (restaurant?.photo_urls || []).filter((url: string) => url !== photoUrl);

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

    console.log('[DELETE-PHOTO] Success');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE-PHOTO] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
