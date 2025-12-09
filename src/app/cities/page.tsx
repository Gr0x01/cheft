import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { CityCard } from '@/components/city/CityCard';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { Footer } from '@/components/ui/Footer';

export const revalidate = 604800; // 1 week

export const metadata: Metadata = {
  title: 'All Cities - TV Chef Restaurants Nationwide | Cheft',
  description:
    'Browse 162 cities with TV chef restaurants from Top Chef, Iron Chef, and other cooking competitions. Find chef-driven dining in your city.',
  openGraph: {
    title: 'All Cities - TV Chef Restaurants Nationwide | Cheft',
    description:
      'Browse 162 cities with TV chef restaurants from Top Chef, Iron Chef, and other cooking competitions.',
    type: 'website',
  },
};

interface City {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  country: string;
  restaurant_count: number;
  chef_count: number;
}

export default async function CitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const params = await searchParams;
  const supabase = createStaticClient();

  let query = supabase
    .from('cities')
    .select('*')
    .order('restaurant_count', { ascending: false });

  if (params.state) {
    query = query.eq('state', params.state);
  }

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`);
  }

  const { data: cities, error } = await query;

  if (error) {
    console.error('Error fetching cities:', error);
    return <div className="p-8 text-center text-red-600">Failed to load cities</div>;
  }

  const filteredCities = (cities || []) as City[];

  const totalRestaurants = filteredCities.reduce((sum, city) => sum + city.restaurant_count, 0);
  const totalChefs = filteredCities.reduce((sum, city) => sum + city.chef_count, 0);
  const usStates = [...new Set(filteredCities.filter(c => c.state).map(c => c.state))].length;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const schemaItems = filteredCities.slice(0, 100).map((city, index) => ({
    name: `${city.name}${city.state ? `, ${city.state}` : ''}`,
    url: `${baseUrl}/cities/${city.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Cities', url: `${baseUrl}/cities` },
  ];

  const filterOptions = [
    { href: '/cities', label: 'ALL', isActive: !params.state },
  ];

  return (
    <>
      <ItemListSchema
        name="TV Chef Restaurant Cities"
        description="Browse cities with restaurants from Top Chef, Iron Chef, and other cooking competitions"
        url={`${baseUrl}/cities`}
        items={schemaItems}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="cities" />

        <PageHero
          title="Cities"
          subtitle={`${filteredCities.length} cities with TV chef restaurants`}
          stats={[
            { value: totalRestaurants, label: 'RESTAURANTS' },
            { value: usStates, label: 'US STATES' },
          ]}
          breadcrumbItems={[{ label: 'Cities' }]}
        />

        <FilterBar
          searchPlaceholder="Search cities..."
          searchDefaultValue={params.q}
          filterOptions={filterOptions}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {filteredCities.length === 0 ? (
            <EmptyState
              message="No cities found matching your criteria"
              actionHref="/cities"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCities.map((city, index) => (
                <CityCard key={city.id} city={city} index={index} />
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
