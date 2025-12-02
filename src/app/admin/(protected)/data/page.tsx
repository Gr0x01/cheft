import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';
import { BarChart3, Image, FileText, MapPin, Star } from 'lucide-react';

type Chef = Database['public']['Tables']['chefs']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

type ChefPreview = {
  id: string;
  name: string;
  slug: string;
};

type RestaurantPreview = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
};

async function getDataStats() {
  const supabase = await createClient();

  const [
    { count: totalChefs },
    { count: chefsWithPhotos },
    { count: chefsWithBios },
    { count: totalRestaurants },
    { count: restaurantsWithPhotos },
    { count: restaurantsWithRatings },
    { count: restaurantsWithPlaceIds },
  ] = await Promise.all([
    supabase.from('chefs').select('*', { count: 'exact', head: true }),
    supabase.from('chefs').select('*', { count: 'exact', head: true }).not('photo_url', 'is', null),
    supabase.from('chefs').select('*', { count: 'exact', head: true }).not('mini_bio', 'is', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('photo_urls', 'is', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('google_rating', 'is', null),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('google_place_id', 'is', null),
  ]);

  return {
    chefs: {
      total: totalChefs || 0,
      withPhotos: chefsWithPhotos || 0,
      withBios: chefsWithBios || 0,
    },
    restaurants: {
      total: totalRestaurants || 0,
      withPhotos: restaurantsWithPhotos || 0,
      withRatings: restaurantsWithRatings || 0,
      withPlaceIds: restaurantsWithPlaceIds || 0,
    },
  };
}

async function getMissingData(): Promise<{
  chefsNoPhotos: ChefPreview[];
  chefsNoBios: ChefPreview[];
  restaurantsNoPlaces: RestaurantPreview[];
}> {
  const supabase = await createClient();

  const [
    { data: chefsNoPhotos },
    { data: chefsNoBios },
    { data: restaurantsNoPlaces },
  ] = await Promise.all([
    supabase
      .from('chefs')
      .select('id, name, slug')
      .is('photo_url', null)
      .order('name')
      .limit(10),
    supabase
      .from('chefs')
      .select('id, name, slug')
      .is('mini_bio', null)
      .order('name')
      .limit(10),
    supabase
      .from('restaurants')
      .select('id, name, slug, city, state')
      .is('google_place_id', null)
      .order('name')
      .limit(10),
  ]);

  return {
    chefsNoPhotos: (chefsNoPhotos || []) as ChefPreview[],
    chefsNoBios: (chefsNoBios || []) as ChefPreview[],
    restaurantsNoPlaces: (restaurantsNoPlaces || []) as RestaurantPreview[],
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  total,
  color = 'slate',
}: {
  icon: any;
  label: string;
  value: number;
  total: number;
  color?: 'slate' | 'green' | 'blue' | 'amber';
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-ui">{label}</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">
            {value}
            <span className="text-sm text-slate-400 ml-2">/ {total}</span>
          </p>
          <p className="text-sm text-slate-600 mt-1">{percentage}% complete</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color === 'green' ? 'bg-emerald-500' : color === 'blue' ? 'bg-blue-500' : color === 'amber' ? 'bg-amber-500' : 'bg-slate-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function DataDashboard() {
  const stats = await getDataStats();
  const missing = await getMissingData();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Data Dashboard</h1>
        <p className="text-slate-600 mt-2">Track data completeness and identify missing information</p>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Chef Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            icon={Image}
            label="Chefs with Photos"
            value={stats.chefs.withPhotos}
            total={stats.chefs.total}
            color="blue"
          />
          <StatCard
            icon={FileText}
            label="Chefs with Bios"
            value={stats.chefs.withBios}
            total={stats.chefs.total}
            color="green"
          />
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Restaurant Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={MapPin}
            label="Google Places Linked"
            value={stats.restaurants.withPlaceIds}
            total={stats.restaurants.total}
            color="amber"
          />
          <StatCard
            icon={Star}
            label="Restaurants with Ratings"
            value={stats.restaurants.withRatings}
            total={stats.restaurants.total}
            color="green"
          />
          <StatCard
            icon={Image}
            label="Restaurants with Photos"
            value={stats.restaurants.withPhotos}
            total={stats.restaurants.total}
            color="blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {missing.chefsNoPhotos.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Missing Chef Photos</h3>
            <ul className="space-y-2">
              {missing.chefsNoPhotos.map((chef) => (
                <li key={chef.id} className="text-sm text-slate-600">
                  <a
                    href={`/chefs/${chef.slug}`}
                    className="hover:text-slate-900 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {chef.name}
                  </a>
                </li>
              ))}
            </ul>
            {stats.chefs.total - stats.chefs.withPhotos > 10 && (
              <p className="text-xs text-slate-500 mt-4">
                + {stats.chefs.total - stats.chefs.withPhotos - 10} more
              </p>
            )}
          </div>
        )}

        {missing.chefsNoBios.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Missing Chef Bios</h3>
            <ul className="space-y-2">
              {missing.chefsNoBios.map((chef) => (
                <li key={chef.id} className="text-sm text-slate-600">
                  <a
                    href={`/chefs/${chef.slug}`}
                    className="hover:text-slate-900 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {chef.name}
                  </a>
                </li>
              ))}
            </ul>
            {stats.chefs.total - stats.chefs.withBios > 10 && (
              <p className="text-xs text-slate-500 mt-4">
                + {stats.chefs.total - stats.chefs.withBios - 10} more
              </p>
            )}
          </div>
        )}

        {missing.restaurantsNoPlaces.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Missing Google Places</h3>
            <ul className="space-y-2">
              {missing.restaurantsNoPlaces.map((restaurant) => (
                <li key={restaurant.id} className="text-sm text-slate-600">
                  <a
                    href={`/restaurants/${restaurant.slug}`}
                    className="hover:text-slate-900 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {restaurant.name}
                  </a>
                  <span className="text-xs text-slate-400 ml-2">
                    {restaurant.city}, {restaurant.state}
                  </span>
                </li>
              ))}
            </ul>
            {stats.restaurants.total - stats.restaurants.withPlaceIds > 10 && (
              <p className="text-xs text-slate-500 mt-4">
                + {stats.restaurants.total - stats.restaurants.withPlaceIds - 10} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
