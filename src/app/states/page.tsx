import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { StateCard } from '@/components/state/StateCard';
import { LocationError } from '@/components/ui/LocationError';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { Footer } from '@/components/ui/Footer';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'Browse by State - TV Chef Restaurants Across America | Cheft',
  description:
    'Explore TV chef restaurants in all 50 US states. Find Top Chef, Iron Chef, and other cooking competition restaurants near you.',
  openGraph: {
    title: 'Browse by State - TV Chef Restaurants Across America | Cheft',
    description:
      'Explore TV chef restaurants in all 50 US states. Find Top Chef, Iron Chef, and other cooking competition restaurants near you.',
    type: 'website',
  },
};

interface StateData {
  id: string;
  slug: string;
  name: string;
  abbreviation: string;
  restaurant_count: number;
  chef_count: number;
  city_count: number;
}

export default async function StatesPage() {
  const supabase = createStaticClient();

  const { data: states, error } = await (supabase as any)
    .from('states')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching states:', error);
    return <LocationError type="state" />;
  }

  const allStates = (states || []) as StateData[];
  const statesWithRestaurants = allStates.filter(s => s.restaurant_count > 0);
  const totalRestaurants = allStates.reduce((sum, s) => sum + s.restaurant_count, 0);
  const totalChefs = allStates.reduce((sum, s) => sum + s.chef_count, 0);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const schemaItems = allStates.map((state, index) => ({
    name: state.name,
    url: `${baseUrl}/states/${state.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'States', url: `${baseUrl}/states` },
  ];

  return (
    <>
      <ItemListSchema
        name="TV Chef Restaurants by State"
        description="Browse TV chef restaurants across all 50 US states"
        url={`${baseUrl}/states`}
        items={schemaItems}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header />

        <PageHero
          title="States"
          subtitle="TV Chef Restaurants Across America"
          stats={[
            { value: totalRestaurants, label: 'RESTAURANTS' },
            { value: statesWithRestaurants.length, label: 'STATES WITH CHEFS' },
            { value: totalChefs, label: 'CHEFS' },
          ]}
          breadcrumbItems={[{ label: 'States' }]}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {statesWithRestaurants.length > 0 && (
            <section className="mb-16">
              <h2 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                States with TV Chef Restaurants
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {statesWithRestaurants
                  .sort((a, b) => b.restaurant_count - a.restaurant_count)
                  .map((state, index) => (
                    <StateCard key={state.id} state={state} index={index} />
                  ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              All States
            </h2>
            <p className="font-ui text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t see your state? Know a TV chef restaurant? Let us know!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allStates.map((state) => (
                <a
                  key={state.id}
                  href={`/states/${state.slug}`}
                  className="group px-3 py-2 border transition-all hover:border-[var(--accent-primary)]"
                  style={{ 
                    background: state.restaurant_count > 0 ? 'white' : 'var(--bg-secondary)',
                    borderColor: 'var(--border-light)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="font-mono text-sm font-medium group-hover:text-[var(--accent-primary)]"
                      style={{ color: state.restaurant_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    >
                      {state.abbreviation}
                    </span>
                    {state.restaurant_count > 0 && (
                      <span 
                        className="font-mono text-xs font-bold"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {state.restaurant_count}
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
