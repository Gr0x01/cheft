import { createClient } from '@/lib/supabase/server';
import { DuplicateReviewClient } from './DuplicateReviewClient';
import { Copy, CheckCircle } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type DuplicateCandidate = Database['public']['Tables']['duplicate_candidates']['Row'];

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  address: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  photo_urls: string[] | null;
  status: 'open' | 'closed' | 'unknown' | null;
  price_tier: string | null;
  website_url: string | null;
  chef_id: string;
}

interface DuplicateCandidateWithRestaurants extends DuplicateCandidate {
  restaurants: Restaurant[];
}

export async function DuplicatesSection() {
  const supabase = await createClient();

  const { data: candidates, error } = await supabase
    .from('duplicate_candidates')
    .select('*')
    .eq('status', 'pending')
    .order('confidence', { ascending: false });

  if (error) {
    console.error('Error fetching duplicates:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-900">Failed to load duplicate candidates</p>
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-5 bg-green-50 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">No Duplicates Found</h3>
        <p className="font-ui text-slate-500 max-w-md mx-auto">
          All restaurant entries appear to be unique. Run the duplicate detection script to scan for potential duplicates.
        </p>
      </div>
    );
  }

  const restaurantIds = candidates.flatMap(c => c.restaurant_ids);
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, city, state, address, google_place_id, google_rating, photo_urls, status, price_tier, website_url, chef_id')
    .in('id', restaurantIds);

  if (!restaurants) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-900">Failed to load restaurant details</p>
      </div>
    );
  }

  const restaurantMap = new Map<string, Restaurant>(
    restaurants.map(r => [r.id, r as Restaurant])
  );

  const candidatesWithRestaurants: DuplicateCandidateWithRestaurants[] = candidates
    .map(candidate => ({
      ...candidate,
      restaurants: candidate.restaurant_ids
        .map((id: string) => restaurantMap.get(id))
        .filter((r): r is Restaurant => r !== undefined),
    }))
    .filter((c): c is DuplicateCandidateWithRestaurants => c.restaurants.length === 2);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-8">
        <div className="flex items-center gap-3 mb-2">
          <Copy className="w-6 h-6 text-orange-500" />
          <h2 className="font-display text-2xl font-bold text-slate-900">Potential Duplicates</h2>
        </div>
        <p className="font-ui text-slate-500">
          Review restaurant pairs that may be duplicates. Merge duplicates to keep data clean.
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="font-ui text-slate-600">{candidatesWithRestaurants.length} pairs to review</span>
          </div>
        </div>
      </div>

      <DuplicateReviewClient candidates={candidatesWithRestaurants} />
    </div>
  );
}
