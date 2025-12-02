import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';

export const metadata: Metadata = {
  title: 'TV Chef Restaurants - 311 Locations Nationwide | Cheft',
  description:
    'Browse 311 restaurants from Top Chef, Iron Chef, and other cooking competition winners and contestants. Find TV chef restaurants near you.',
  openGraph: {
    title: 'TV Chef Restaurants - 311 Locations Nationwide | Cheft',
    description:
      'Browse 311 restaurants from Top Chef, Iron Chef, and other cooking competition contestants.',
    type: 'website',
  },
};

interface RestaurantWithChef {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  price_tier: '$' | '$$' | '$$$' | '$$$$' | null;
  cuisine_tags: string[] | null;
  status: 'open' | 'closed' | 'unknown';
  google_rating: number | null;
  google_review_count: number | null;
  photo_urls: string[] | null;
  chef: {
    id: string;
    name: string;
    slug: string;
    james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows: Array<{
      result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary: boolean;
    }>;
  } | null;
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; price?: string; cuisine?: string; status?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('restaurants')
    .select(`
      id,
      name,
      slug,
      city,
      state,
      price_tier,
      cuisine_tags,
      status,
      google_rating,
      google_review_count,
      photo_urls,
      chef:chefs (
        id,
        name,
        slug,
        james_beard_status,
        chef_shows (
          result,
          is_primary
        )
      )
    `)
    .eq('is_public', true);

  if (params.status === 'open') {
    query = query.eq('status', 'open');
  } else if (params.status === 'closed') {
    query = query.eq('status', 'closed');
  }

  if (params.price && ['$', '$$', '$$$', '$$$$'].includes(params.price)) {
    query = query.eq('price_tier', params.price as '$' | '$$' | '$$$' | '$$$$');
  }

  if (params.city) {
    query = query.ilike('city', `%${params.city}%`);
  }

  if (params.cuisine) {
    query = query.contains('cuisine_tags', [params.cuisine]);
  }

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,city.ilike.%${params.q}%`);
  }

  if (params.sort === 'rating') {
    query = query.order('google_rating', { ascending: false, nullsFirst: false });
  } else if (params.sort === 'reviews') {
    query = query.order('google_review_count', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('name');
  }

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('Error fetching restaurants:', error);
    return <div className="p-8 text-center text-red-600">Failed to load restaurants</div>;
  }

  const filteredRestaurants = (restaurants || []) as unknown as RestaurantWithChef[];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chefmap.com';
  const schemaItems = filteredRestaurants.slice(0, 100).map((restaurant, index) => ({
    name: restaurant.name,
    url: `${baseUrl}/restaurants/${restaurant.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Restaurants', url: `${baseUrl}/restaurants` },
  ];

  const openCount = filteredRestaurants.filter(r => r.status === 'open').length;
  const cities = [...new Set(filteredRestaurants.map(r => r.city))].sort();

  const filterOptions = [
    { href: '/restaurants', label: 'ALL', isActive: !params.status && !params.price },
    { href: '/restaurants?status=open', label: 'OPEN', isActive: params.status === 'open', variant: 'success' as const },
    { 
      href: '/restaurants?sort=rating', 
      label: 'TOP RATED', 
      isActive: params.sort === 'rating',
      variant: 'warning' as const,
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    },
    { href: '/restaurants?price=$', label: '$', isActive: params.price === '$' },
    { href: '/restaurants?price=$$', label: '$$', isActive: params.price === '$$' },
    { href: '/restaurants?price=$$$', label: '$$$', isActive: params.price === '$$$' },
    { href: '/restaurants?price=$$$$', label: '$$$$', isActive: params.price === '$$$$' },
  ];

  return (
    <>
      <ItemListSchema
        name="TV Chef Restaurants Directory"
        description="Browse restaurants from Top Chef, Iron Chef, and other cooking competitions"
        url={`${baseUrl}/restaurants`}
        items={schemaItems}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        <Header currentPage="restaurants" />

        <PageHero
          title="Restaurants"
          subtitle={`${filteredRestaurants.length} locations from TV chef competitors`}
          stats={[
            { value: openCount, label: 'OPEN NOW' },
            { value: cities.length, label: 'CITIES' },
          ]}
          breadcrumbItems={[{ label: 'Restaurants' }]}
        />

        <FilterBar
          searchPlaceholder="Search restaurants..."
          searchDefaultValue={params.q}
          filterOptions={filterOptions}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {filteredRestaurants.length === 0 ? (
            <EmptyState
              message="No restaurants found matching your criteria"
              actionHref="/restaurants"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRestaurants.map((restaurant, index) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
