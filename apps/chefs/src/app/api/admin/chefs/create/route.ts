import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createChefSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
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

  const parsed = createChefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name } = parsed.data;
  const baseSlug = parsed.data.slug || generateSlug(name);

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await adminClient
    .from('chefs')
    .select('id')
    .eq('slug', baseSlug)
    .maybeSingle();

  const finalSlug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  const { data, error } = await adminClient
    .from('chefs')
    .insert({
      name,
      slug: finalSlug,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create chef:', error);
    return NextResponse.json({ error: 'Failed to create chef' }, { status: 500 });
  }

  console.log(`[Create] Chef "${name}" created by ${user.email}`);

  return NextResponse.json({ chef: data });
}
