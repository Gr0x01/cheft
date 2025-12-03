import { createClient } from '@/lib/supabase/server';
import { DuplicateReviewClient } from './DuplicateReviewClient';

export async function DuplicatesSection() {
  const supabase = await createClient();

  const { data: candidates, error } = await supabase
    .from('duplicate_candidates')
    .select(`
      id,
      restaurant_ids,
      confidence,
      reasoning,
      status
    `)
    .eq('status', 'pending')
    .order('confidence', { ascending: false });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900 mb-2">Error Loading Duplicates</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-5 bg-green-50 rounded-full">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">No Duplicates Found</h3>
        <p className="font-ui text-slate-500 max-w-md mx-auto mb-4">
          Your restaurant database is clean. Run the duplicate scan to check for new duplicates.
        </p>
        <code className="inline-block bg-slate-900 text-slate-100 px-4 py-2 rounded font-mono text-sm">
          npm run find-duplicates
        </code>
      </div>
    );
  }

  const restaurantIds = candidates.flatMap(c => c.restaurant_ids);
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, city, state, address, google_place_id, google_rating, photo_urls, status, price_tier, website_url, chef_id')
    .in('id', restaurantIds);

  const restaurantMap = new Map(restaurants?.map(r => [r.id, r]) || []);

  const candidatesWithRestaurants = candidates.map(candidate => ({
    ...candidate,
    restaurants: candidate.restaurant_ids.map(id => restaurantMap.get(id)).filter(Boolean),
  })).filter(c => c.restaurants.length === 2);

  return <DuplicateReviewClient candidates={candidatesWithRestaurants} />;
}
