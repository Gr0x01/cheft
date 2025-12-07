import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createRestaurantSchema = z.object({
  name: z.string().min(1).max(200),
  chef_id: z.string().uuid(),
  city: z.string().min(1).max(100),
  state: z.string().max(50).nullable().optional(),
  country: z.string().max(50).optional().default('USA'),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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

  const parsed = createRestaurantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, chef_id, city, state, country } = parsed.data;

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const slug = generateSlug(name);

  const { data: existing } = await adminClient
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data, error } = await adminClient
    .from('restaurants')
    .insert({
      name,
      slug: finalSlug,
      chef_id,
      city,
      state: state || null,
      country: country || 'USA',
      status: 'open',
      is_public: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create restaurant:', error);
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
  }

  console.log(`[Create] Restaurant "${name}" created by ${user.email}`);

  return NextResponse.json({ restaurant: data });
}
