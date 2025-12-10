import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { CountryCard } from '@/components/country/CountryCard';
import { LocationError } from '@/components/ui/LocationError';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { Footer } from '@/components/ui/Footer';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'Browse by Country - TV Chef Restaurants Worldwide | Cheft',
  description:
    'Explore TV chef restaurants around the world. Find restaurants from Chef\'s Table, Iron Chef, and other international cooking shows.',
  openGraph: {
    title: 'Browse by Country - TV Chef Restaurants Worldwide | Cheft',
    description:
      'Explore TV chef restaurants around the world. Find restaurants from Chef\'s Table, Iron Chef, and other international cooking shows.',
    type: 'website',
  },
};

interface CountryData {
  id: string;
  slug: string;
  name: string;
  code: string;
  restaurant_count: number;
  chef_count: number;
  city_count: number;
}

export default async function CountriesPage() {
  const supabase = createStaticClient();

  const { data: countries, error } = await (supabase as any)
    .from('countries')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching countries:', error);
    return <LocationError type="country" />;
  }

  const allCountries = (countries || []) as CountryData[];
  const countriesWithRestaurants = allCountries.filter(c => c.restaurant_count > 0);
  const totalRestaurants = allCountries.reduce((sum, c) => sum + c.restaurant_count, 0);
  const totalChefs = allCountries.reduce((sum, c) => sum + c.chef_count, 0);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const schemaItems = allCountries.map((country, index) => ({
    name: country.name,
    url: `${baseUrl}/countries/${country.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Countries', url: `${baseUrl}/countries` },
  ];

  return (
    <>
      <ItemListSchema
        name="TV Chef Restaurants by Country"
        description="Browse TV chef restaurants around the world"
        url={`${baseUrl}/countries`}
        items={schemaItems}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="countries" />

        <PageHero
          title="Countries"
          subtitle="TV Chef Restaurants Worldwide"
          stats={[
            { value: totalRestaurants, label: 'RESTAURANTS' },
            { value: countriesWithRestaurants.length, label: 'COUNTRIES' },
            { value: totalChefs, label: 'CHEFS' },
          ]}
          breadcrumbItems={[{ label: 'Countries' }]}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {countriesWithRestaurants.length > 0 && (
            <section className="mb-16">
              <h2 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                Countries with TV Chef Restaurants
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {countriesWithRestaurants
                  .sort((a, b) => b.restaurant_count - a.restaurant_count)
                  .map((country, index) => (
                    <CountryCard key={country.id} country={country} index={index} />
                  ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              All Countries
            </h2>
            <p className="font-ui text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t see your country? Know a TV chef restaurant? Let us know!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allCountries.map((country) => (
                <a
                  key={country.id}
                  href={`/countries/${country.slug}`}
                  className="group px-3 py-2 border transition-all hover:border-[var(--accent-primary)]"
                  style={{ 
                    background: country.restaurant_count > 0 ? 'white' : 'var(--bg-secondary)',
                    borderColor: 'var(--border-light)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="font-mono text-sm font-medium group-hover:text-[var(--accent-primary)] truncate"
                      style={{ color: country.restaurant_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    >
                      {country.code}
                    </span>
                    {country.restaurant_count > 0 && (
                      <span 
                        className="font-mono text-xs font-bold"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {country.restaurant_count}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
