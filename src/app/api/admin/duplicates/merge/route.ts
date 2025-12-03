import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logDataChange } from '../../../../../../scripts/ingestion/queue/audit-log';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { winnerId, loserId } = await request.json();

    if (!winnerId || !loserId) {
      return NextResponse.json(
        { error: 'Missing winnerId or loserId' },
        { status: 400 }
      );
    }

    if (winnerId === loserId) {
      return NextResponse.json(
        { error: 'Cannot merge restaurant with itself' },
        { status: 400 }
      );
    }

    const { data: winner, error: winnerError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', winnerId)
      .single();

    if (winnerError || !winner) {
      return NextResponse.json(
        { error: 'Winner restaurant not found' },
        { status: 404 }
      );
    }

    const { data: loser, error: loserError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', loserId)
      .single();

    if (loserError || !loser) {
      return NextResponse.json(
        { error: 'Loser restaurant not found' },
        { status: 404 }
      );
    }

    const mergedData: Record<string, unknown> = { ...winner };
    const preservedFields: string[] = [];

    if (!mergedData.address && loser.address) {
      mergedData.address = loser.address;
      preservedFields.push('address');
    }
    if (!mergedData.google_place_id && loser.google_place_id) {
      mergedData.google_place_id = loser.google_place_id;
      preservedFields.push('google_place_id');
    }
    if (!mergedData.google_rating && loser.google_rating) {
      mergedData.google_rating = loser.google_rating;
      mergedData.google_review_count = loser.google_review_count;
      preservedFields.push('google_rating');
    }
    if (!mergedData.website_url && loser.website_url) {
      mergedData.website_url = loser.website_url;
      preservedFields.push('website_url');
    }
    if (!mergedData.phone && loser.phone) {
      mergedData.phone = loser.phone;
      preservedFields.push('phone');
    }
    if (!mergedData.description && loser.description) {
      mergedData.description = loser.description;
      preservedFields.push('description');
    }

    if (Array.isArray(loser.photo_urls) && loser.photo_urls.length > 0) {
      const winnerPhotos = Array.isArray(mergedData.photo_urls) ? mergedData.photo_urls : [];
      const uniquePhotos = [...new Set([...winnerPhotos, ...loser.photo_urls])];
      if (uniquePhotos.length > winnerPhotos.length) {
        mergedData.photo_urls = uniquePhotos;
        preservedFields.push('photo_urls');
      }
    }

    if (Array.isArray(loser.cuisine_tags) && loser.cuisine_tags.length > 0) {
      const winnerTags = Array.isArray(mergedData.cuisine_tags) ? mergedData.cuisine_tags : [];
      const uniqueTags = [...new Set([...winnerTags, ...loser.cuisine_tags])];
      if (uniqueTags.length > winnerTags.length) {
        mergedData.cuisine_tags = uniqueTags;
        preservedFields.push('cuisine_tags');
      }
    }

    if (Array.isArray(loser.awards) && loser.awards.length > 0) {
      const winnerAwards = Array.isArray(mergedData.awards) ? mergedData.awards : [];
      const uniqueAwards = [...new Set([...winnerAwards, ...loser.awards])];
      if (uniqueAwards.length > winnerAwards.length) {
        mergedData.awards = uniqueAwards;
        preservedFields.push('awards');
      }
    }

    if (!mergedData.michelin_stars && loser.michelin_stars) {
      mergedData.michelin_stars = loser.michelin_stars;
      preservedFields.push('michelin_stars');
    }

    if (!mergedData.year_opened && loser.year_opened) {
      mergedData.year_opened = loser.year_opened;
      preservedFields.push('year_opened');
    }

    mergedData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(mergedData)
      .eq('id', winnerId);

    if (updateError) {
      console.error('Failed to update winner:', updateError);
      return NextResponse.json(
        { error: 'Failed to merge data into winner restaurant' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from('restaurants')
      .update({
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loserId);

    if (deleteError) {
      console.error('Failed to hide loser:', deleteError);
    }

    await logDataChange(supabase as any, {
      table_name: 'restaurants',
      record_id: winnerId,
      change_type: 'update',
      old_data: winner,
      new_data: {
        ...mergedData,
        _merge_info: {
          merged_from: loserId,
          loser_name: loser.name,
          preserved_fields: preservedFields,
        },
      },
      source: 'duplicate_merge',
      confidence: 1.0,
    });

    await supabase
      .from('duplicate_candidates')
      .update({
        status: 'resolved',
        merged_into: winnerId,
        resolved_at: new Date().toISOString(),
        resolved_by: user.email || 'admin',
      })
      .or(`restaurant_ids.cs.{${winnerId}},restaurant_ids.cs.{${loserId}}`);

    return NextResponse.json({
      success: true,
      winnerId,
      loserId,
      preservedFields,
      message: `Successfully merged "${loser.name}" into "${winner.name}"`,
    });

  } catch (error) {
    console.error('Merge API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
