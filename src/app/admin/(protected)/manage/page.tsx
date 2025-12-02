import { createClient } from '@/lib/supabase/server';
import { ManageTabs } from './ManageTabs';

export default async function ManagePage() {
  const supabase = await createClient();

  const [{ data: chefs }, { data: restaurants }] = await Promise.all([
    supabase
      .from('chefs')
      .select('*')
      .order('name'),
    supabase
      .from('restaurants')
      .select('*')
      .order('name'),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Manage Data</h1>
        <p className="text-slate-600 mt-2">Edit, upload, and manage chef and restaurant data</p>
      </div>

      <ManageTabs chefs={chefs || []} restaurants={restaurants || []} />
    </div>
  );
}
