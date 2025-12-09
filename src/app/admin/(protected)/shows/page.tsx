import { createClient } from '@/lib/supabase/server';
import { ShowsClient } from './ShowsClient';

interface ShowWithStats {
  id: string;
  name: string;
  slug: string;
  network: string | null;
  created_at: string;
  chef_count: number;
  is_public: boolean;
  show_type: string | null;
  parent_show_id: string | null;
  parent_show_name: string | null;
}

interface PotentialShow {
  show_name: string;
  pending_count: number;
}

export default async function ShowsPage() {
  const supabase = await createClient();

  const { data: showsRaw } = await supabase
    .from('shows')
    .select(`
      id,
      name,
      slug,
      network,
      created_at,
      is_public,
      show_type,
      parent_show_id,
      parent:shows!parent_show_id(name)
    `)
    .order('name');

  const { data: chefCounts } = await supabase
    .from('chef_shows')
    .select('show_id')
    .then(result => {
      const counts = new Map<string, number>();
      (result.data || []).forEach((row: { show_id: string }) => {
        counts.set(row.show_id, (counts.get(row.show_id) || 0) + 1);
      });
      return { data: counts };
    });

  const shows: ShowWithStats[] = (showsRaw || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    network: s.network,
    created_at: s.created_at,
    is_public: s.is_public ?? false,
    show_type: s.show_type,
    parent_show_id: s.parent_show_id,
    parent_show_name: s.parent?.name || null,
    chef_count: chefCounts?.get(s.id) || 0,
  }));

  const { data: pendingChefs } = await supabase
    .from('pending_discoveries')
    .select('data')
    .eq('discovery_type', 'chef')
    .eq('status', 'pending');

  const potentialShowsMap = new Map<string, number>();
  const existingShowNames = new Set(shows.map(s => s.name.toLowerCase()));

  if (pendingChefs) {
    for (const chef of pendingChefs) {
      const showName = (chef.data as Record<string, unknown>)?.show_name;
      if (typeof showName === 'string' && showName.trim()) {
        if (!existingShowNames.has(showName.toLowerCase())) {
          potentialShowsMap.set(showName, (potentialShowsMap.get(showName) || 0) + 1);
        }
      }
    }
  }

  const potentialShows: PotentialShow[] = Array.from(potentialShowsMap.entries())
    .map(([show_name, pending_count]) => ({ show_name, pending_count }))
    .sort((a, b) => b.pending_count - a.pending_count);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="pt-4">
        <h1 className="font-display text-4xl font-bold text-stone-900 tracking-tight">Shows</h1>
        <p className="font-mono text-xs text-stone-400 uppercase tracking-[0.2em] mt-1">
          Manage TV shows and trigger chef discovery
        </p>
      </header>

      <ShowsClient 
        shows={shows} 
        potentialShows={potentialShows}
      />
    </div>
  );
}
