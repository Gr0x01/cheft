/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const approveSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
});

const duplicateDataSchema = z.object({
  action: z.literal('potential_duplicate'),
  existing_restaurant: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  new_restaurant: z.object({
    name: z.string(),
    city: z.string().optional(),
  }).optional(),
});

const notFoundDataSchema = z.object({
  action: z.literal('not_found_by_llm'),
  restaurant_id: z.string().uuid(),
  restaurant_name: z.string(),
});

const newRestaurantDataSchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  ownership: z.string().optional(),
  price_range: z.string().optional(),
  status: z.string().optional(),
});

const showDataSchema = z.object({
  showName: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200).optional(),
  season: z.string().max(50).nullable().optional(),
  result: z.string().optional(),
  performanceBlurb: z.string().max(1000).optional().nullable(),
}).refine(data => data.showName || data.name, {
  message: 'Either showName or name is required',
});

const chefDataSchema = z.object({
  name: z.string().min(1).max(200),
});

function generateSlug(name: string, city?: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (city) {
    const cleanCity = city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${cleanName}-${cleanCity}`;
  }

  return cleanName;
}

type AdminClient = SupabaseClient<any, any, any>;

async function handleRestaurantApproval(
  adminClient: AdminClient,
  discovery: { id: string; data: Record<string, unknown>; source_chef_id: string | null; source_chef_name: string | null },
  userId: string
): Promise<{ success: boolean; message: string; entityId?: string }> {
  const data = discovery.data;
  const action = data.action as string | undefined;

  if (action === 'potential_duplicate') {
    const parsed = duplicateDataSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: 'Invalid duplicate discovery data' };
    }
    return {
      success: true,
      message: `Kept existing restaurant "${parsed.data.existing_restaurant.name}" - duplicate rejected`,
      entityId: parsed.data.existing_restaurant.id,
    };
  }

  if (action === 'not_found_by_llm') {
    const parsed = notFoundDataSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: 'Invalid not-found discovery data' };
    }
    const { restaurant_id, restaurant_name } = parsed.data;

    const { error } = await adminClient
      .from('restaurants')
      .update({
        status: 'closed',
        last_verified_at: new Date().toISOString(),
        verification_source: 'admin_review_not_found_by_llm',
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant_id);

    if (error) {
      return { success: false, message: `Failed to mark closed: ${error.message}` };
    }

    return {
      success: true,
      message: `Marked "${restaurant_name}" as closed`,
      entityId: restaurant_id,
    };
  }

  const parsed = newRestaurantDataSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: `Invalid restaurant data: ${parsed.error.issues[0]?.message}` };
  }

  const chefId = discovery.source_chef_id;
  if (!chefId) {
    return { success: false, message: 'Missing chef_id' };
  }

  const { name, city, state, country, address, ownership, price_range, status } = parsed.data;

  const slug = generateSlug(name, city);

  const { data: existing } = await adminClient
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const validPriceRanges = ['$', '$$', '$$$', '$$$$'];
  const priceRange = validPriceRanges.includes(price_range || '')
    ? price_range
    : null;

  const validRoles = ['owner', 'executive_chef', 'partner', 'consultant'];
  const role = validRoles.includes(ownership || '')
    ? ownership
    : 'owner';

  const { data: created, error } = await adminClient
    .from('restaurants')
    .insert({
      name,
      slug: finalSlug,
      chef_id: chefId,
      chef_role: role,
      city,
      state: state || null,
      country: country || 'US',
      address: address || null,
      price_tier: priceRange,
      status: status || 'unknown',
      is_public: true,
      source_notes: 'Created via admin approval from Tavily extraction',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, message: `Failed to create restaurant: ${error.message}` };
  }

  return {
    success: true,
    message: `Created restaurant "${name}" in ${city}`,
    entityId: created?.id,
  };
}

async function handleShowApproval(
  adminClient: AdminClient,
  discovery: { id: string; data: Record<string, unknown>; source_chef_id: string | null },
  userId: string
): Promise<{ success: boolean; message: string; entityId?: string }> {
  const parsed = showDataSchema.safeParse(discovery.data);
  if (!parsed.success) {
    return { success: false, message: `Invalid show data: ${parsed.error.issues[0]?.message}` };
  }

  const chefId = discovery.source_chef_id;
  if (!chefId) {
    return { success: false, message: 'Missing chef_id' };
  }

  const showName = (parsed.data.showName || parsed.data.name)!;
  const season = parsed.data.season ?? null;
  const result = parsed.data.result;

  const showNameLower = showName.toLowerCase().trim();
  const showNameMap: Record<string, string> = {
    'top chef': 'top-chef',
    'top chef masters': 'top-chef-masters',
    'tournament of champions': 'tournament-of-champions',
    'chopped': 'chopped',
    'beat bobby flay': 'beat-bobby-flay',
    'iron chef': 'iron-chef',
    'iron chef america': 'iron-chef-america',
    "hell's kitchen": 'hells-kitchen',
    'hells kitchen': 'hells-kitchen',
    'masterchef': 'masterchef',
    'next level chef': 'next-level-chef',
    "guy's grocery games": 'guys-grocery-games',
  };

  const slug = showNameMap[showNameLower];
  let showId: string | null = null;

  if (slug) {
    const { data: show } = await adminClient
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    showId = show?.id || null;
  }

  if (!showId) {
    const { data: show } = await adminClient
      .from('shows')
      .select('id')
      .ilike('name', showName)
      .maybeSingle();
    showId = show?.id || null;
  }

  if (!showId) {
    return { success: false, message: `Show "${showName}" not found in database` };
  }

  let existingQuery = adminClient
    .from('chef_shows')
    .select('id')
    .eq('chef_id', chefId)
    .eq('show_id', showId);

  if (season === null) {
    existingQuery = existingQuery.is('season', null);
  } else {
    existingQuery = existingQuery.eq('season', season);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    return {
      success: true,
      message: `Chef already linked to ${showName}${season ? ` S${season}` : ''}`,
      entityId: existing.id,
    };
  }

  const validResults = ['winner', 'finalist', 'contestant', 'judge'];
  const resultValue = validResults.includes(result || '') ? result : 'contestant';

  const { data: created, error } = await adminClient
    .from('chef_shows')
    .insert({
      chef_id: chefId,
      show_id: showId,
      season: season || null,
      season_name: season ? `${showName} ${season}` : showName,
      result: resultValue,
      is_primary: false,
      performance_blurb: parsed.data.performanceBlurb || null,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, message: `Failed to link show: ${error.message}` };
  }

  return {
    success: true,
    message: `Linked chef to ${showName}${season ? ` S${season}` : ''}`,
    entityId: created?.id,
  };
}

async function handleChefApproval(
  adminClient: AdminClient,
  discovery: { id: string; data: Record<string, unknown> },
  userId: string
): Promise<{ success: boolean; message: string; entityId?: string }> {
  const parsed = chefDataSchema.safeParse(discovery.data);
  if (!parsed.success) {
    return { success: false, message: `Invalid chef data: ${parsed.error.issues[0]?.message}` };
  }

  const { name } = parsed.data;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data: existing } = await adminClient
    .from('chefs')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      message: `Chef "${name}" already exists`,
      entityId: existing.id,
    };
  }

  const { data: created, error } = await adminClient
    .from('chefs')
    .insert({
      name,
      slug,
      is_public: true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, message: `Failed to create chef: ${error.message}` };
  }

  return {
    success: true,
    message: `Created chef "${name}"`,
    entityId: created?.id,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, action } = parsed.data;

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: discovery, error: fetchError } = await adminClient
    .from('pending_discoveries')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !discovery) {
    return NextResponse.json({ error: 'Discovery not found' }, { status: 404 });
  }

  if (action === 'reject') {
    const { error: updateError } = await adminClient
      .from('pending_discoveries')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Discovery rejected' });
  }

  let result: { success: boolean; message: string; entityId?: string };

  const discoveryData = {
    id: discovery.id as string,
    data: discovery.data as Record<string, unknown>,
    source_chef_id: discovery.source_chef_id as string | null,
    source_chef_name: discovery.source_chef_name as string | null,
  };

  switch (discovery.discovery_type) {
    case 'restaurant':
      result = await handleRestaurantApproval(adminClient, discoveryData, user.id);
      break;
    case 'show':
      result = await handleShowApproval(adminClient, discoveryData, user.id);
      break;
    case 'chef':
      result = await handleChefApproval(adminClient, discoveryData, user.id);
      break;
    default:
      return NextResponse.json({ error: 'Unknown discovery type' }, { status: 400 });
  }

  if (!result.success) {
    await adminClient
      .from('pending_discoveries')
      .update({
        status: 'needs_review',
        error_message: result.message,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', id);

    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  const { error: updateError } = await adminClient
    .from('pending_discoveries')
    .update({
      status: 'merged',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update discovery status:', updateError);
  }

  console.log(`[Approve] ${discovery.discovery_type} approved by ${user.email}: ${result.message}`);

  return NextResponse.json({
    success: true,
    message: result.message,
    entityId: result.entityId,
  });
}
