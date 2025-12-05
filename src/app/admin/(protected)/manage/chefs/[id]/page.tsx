import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChefEditorForm } from './ChefEditorForm';

export default async function ChefEditorPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  
  const { data: chef, error } = await supabase
    .from('chefs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !chef) {
    redirect('/admin/manage');
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <ChefEditorForm chef={chef} />
    </div>
  );
}
