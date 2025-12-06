import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { RestaurantsPageClient } from './RestaurantsPageClient';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'TV Chef Restaurants - 500+ Locations Nationwide | Cheft',
  description:
    'Browse 500+ restaurants from Top Chef, Iron Chef, and other cooking competition winners and contestants. Filter by city, price, Michelin stars, and more.',
  openGraph: {
    title: 'TV Chef Restaurants - 500+ Locations Nationwide | Cheft',
    description:
      'Browse 500+ restaurants from Top Chef, Iron Chef, and other cooking competition contestants.',
    type: 'website',
  },
};

export default async function RestaurantsPage() {
  const supabase = createStaticClient();

  const { data: restaurants, error } = await supabase
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
      michelin_stars,
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
    .eq('is_public', true)
    .order('name');

  if (error) {
    console.error('Error fetching restaurants:', error);
    return <div className="p-8 text-center text-red-600">Failed to load restaurants</div>;
  }

  const restaurantData = (restaurants || []).map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    city: r.city,
    state: r.state,
    price_tier: r.price_tier as '$' | '$$' | '$$$' | '$$$$' | null,
    cuisine_tags: r.cuisine_tags,
    status: r.status as 'open' | 'closed' | 'unknown',
    google_rating: r.google_rating,
    google_review_count: r.google_review_count,
    photo_urls: r.photo_urls,
    michelin_stars: r.michelin_stars,
    chef: r.chef,
  }));

  const cityMap = new Map<string, { state: string | null; count: number }>();
  restaurantData.forEach(r => {
    const key = r.city;
    const existing = cityMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      cityMap.set(key, { state: r.state, count: 1 });
    }
  });
  
  const cities = Array.from(cityMap.entries())
    .map(([name, data]) => ({ name, state: data.state, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const totalRestaurants = restaurantData.length;
  const openCount = restaurantData.filter(r => r.status === 'open').length;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const schemaItems = restaurantData.slice(0, 100).map((restaurant, index) => ({
    name: restaurant.name,
    url: `${baseUrl}/restaurants/${restaurant.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Restaurants', url: `${baseUrl}/restaurants` },
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

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="restaurants" />

        <PageHero
          title="Restaurants"
          subtitle={`${totalRestaurants} locations from TV chef competitors`}
          stats={[
            { value: openCount, label: 'OPEN NOW' },
            { value: cities.length, label: 'CITIES' },
          ]}
          breadcrumbItems={[{ label: 'Restaurants' }]}
        />

        <RestaurantsPageClient
          initialRestaurants={restaurantData}
          cities={cities}
          totalRestaurants={totalRestaurants}
        />
      </div>
    </>
  );
}
