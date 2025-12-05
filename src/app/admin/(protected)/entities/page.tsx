import { createClient } from '@/lib/supabase/server';
import { EntitiesClient } from './EntitiesClient';

export default async function EntitiesPage() {
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
    <EntitiesClient 
      chefs={chefs || []} 
      restaurants={restaurants || []} 
    />
  );
}
