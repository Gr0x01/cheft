import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InstagramPostSelector } from './InstagramPostSelector';

interface PageProps {
  params: Promise<{ chefId: string }>;
}

export default async function InstagramSelectorPage({ params }: PageProps) {
  const { chefId } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chefId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: chef, error } = await supabase
    .from('chefs')
    .select('id, name, instagram_handle, featured_instagram_post')
    .eq('id', chefId)
    .single();

  if (error || !chef) {
    notFound();
  }

  return <InstagramPostSelector chef={chef} />;
}
