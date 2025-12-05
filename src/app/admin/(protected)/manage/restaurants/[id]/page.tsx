import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RestaurantEditorForm } from './RestaurantEditorForm';

export default async function RestaurantEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  
  const [{ data: restaurant, error }, { data: chefs }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('chefs')
      .select('id, name, slug')
      .order('name'),
  ]);

  if (error || !restaurant) {
    redirect('/admin/manage');
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <RestaurantEditorForm restaurant={restaurant} chefs={chefs || []} />
    </div>
  );
}
