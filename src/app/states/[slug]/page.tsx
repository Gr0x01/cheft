import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { ChefCard } from '@/components/chef/ChefCard';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';

interface StatePageProps {
  params: Promise<{ slug: string }>;
}

interface StateData {
  id: string;
  slug: string;
  name: string;
  abbreviation: string;
  restaurant_count: number;
  chef_count: number;
  city_count: number;
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createStaticClient();

  const { data: state } = await (supabase as any)
    .from('states')
    .select('name, abbreviation, restaurant_count, chef_count')
    .eq('slug', slug)
    .single();

  if (!state) {
    return { title: 'State Not Found' };
  }

  const title = `TV Chef Restaurants in ${state.name} (${state.restaurant_count} Locations) | Cheft`;
  const description = state.restaurant_count > 0
    ? `Discover ${state.restaurant_count} restaurants by Top Chef winners and contestants in ${state.name}. Find chef-driven dining across ${state.abbreviation}.`
    : `No TV chef restaurants listed yet in ${state.name}. Know one? Suggest it to us!`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export async function generateStaticParams() {
  const supabase = createStaticClient();

  const { data: states } = await (supabase as any)
    .from('states')
    .select('slug');

  return (states as any[])?.map((state) => ({ slug: state.slug })) ?? [];
}

export const dynamicParams = true;

export default async function StatePage({ params }: StatePageProps) {
  const { slug } = await params;
  const supabase = createStaticClient();

  const { data: state, error: stateError } = await (supabase as any)
    .from('states')
    .select('*')
    .eq('slug', slug)
    .single();

  if (stateError || !state) {
    notFound();
  }

  const typedState = state as StateData;

  const { data: restaurants } = await supabase
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
      chef:chefs!restaurants_chef_id_fkey (
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
    .in('state', [typedState.name, typedState.abbreviation])
    .eq('is_public', true)
    .order('google_rating', { ascending: false, nullsFirst: false });

  const chefIds = [...new Set((restaurants || []).map(r => r.chef?.id).filter(Boolean))];
  
  const { data: chefs } = chefIds.length > 0 
    ? await supabase
        .from('chefs')
        .select(`
          id,
          name,
          slug,
          photo_url,
          mini_bio,
          james_beard_status,
          chef_shows (
            id,
            season,
            result,
            is_primary,
            show:shows (name)
          )
        `)
        .in('id', chefIds)
        .order('name')
    : { data: [] };

  const chefRestaurantCounts = (restaurants || []).reduce((acc, r) => {
    if (r.chef?.id) {
      acc[r.chef.id] = (acc[r.chef.id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const uniqueChefs = (chefs || []).map(chef => ({
    ...chef,
    restaurant_count: chefRestaurantCounts[chef.id] || 0,
    chef_shows: chef.chef_shows?.map((cs: { is_primary?: boolean | null }) => ({
      ...cs,
      is_primary: cs.is_primary ?? undefined,
    })) || [],
  }));

  const citiesInState = [...new Set(restaurants?.map(r => r.city) || [])].sort();

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
    chef: r.chef ? {
      ...r.chef,
      chef_shows: r.chef.chef_shows?.map((cs: any) => ({
        ...cs,
        is_primary: cs.is_primary ?? undefined,
      })) || [],
    } : null,
  }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const stateUrl = `${baseUrl}/states/${slug}`;

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'States', url: `${baseUrl}/states` },
    { name: typedState.name, url: stateUrl },
  ];

  return (
    <>
      {restaurantData.length > 0 && (
        <ItemListSchema
          name={`TV Chef Restaurants in ${typedState.name}`}
          description={`${typedState.restaurant_count} restaurants by Top Chef winners and contestants in ${typedState.name}`}
          url={stateUrl}
          items={restaurantData.slice(0, 50).map((r, i) => ({
            name: r.name,
            url: `${baseUrl}/restaurants/${r.slug}`,
            position: i + 1,
          }))}
        />
      )}
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header />

        <PageHero
          title={typedState.name}
          subtitle="TV Chef Restaurants"
          stats={[
            { value: typedState.restaurant_count, label: 'RESTAURANTS' },
            { value: typedState.chef_count, label: 'CHEFS' },
            { value: typedState.city_count, label: 'CITIES' },
          ]}
          breadcrumbItems={[
            { label: 'States', href: '/states' },
            { label: typedState.name },
          ]}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {restaurantData.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                No Restaurants Yet in {typedState.name}
              </h2>
              <p className="font-ui text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
                Know a TV chef restaurant in {typedState.name}? Help us grow our database!
              </p>
              <Link
                href="/suggest"
                className="inline-flex items-center gap-2 font-mono text-sm font-semibold px-6 py-3 transition-colors"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                SUGGEST A RESTAURANT
              </Link>
            </div>
          ) : (
            <>
              {citiesInState.length > 1 && (
                <section className="mb-8">
                  <h2 className="font-mono text-xs tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    CITIES IN {typedState.abbreviation}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {citiesInState.map(city => {
                      const cityCount = restaurantData.filter(r => r.city === city).length;
                      return (
                        <span
                          key={city}
                          className="font-mono text-xs px-2 py-1 border"
                          style={{ 
                            background: 'var(--bg-secondary)',
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {city} ({cityCount})
                        </span>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="mb-16">
                <div className="flex items-baseline gap-4 mb-6">
                  <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    All Restaurants
                  </h2>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {restaurantData.length} LOCATIONS
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {restaurantData.map((restaurant, index) => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
                  ))}
                </div>
              </section>

              {uniqueChefs && uniqueChefs.length > 0 && (
                <section className="border-t pt-12" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex items-baseline gap-4 mb-6">
                    <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      Chefs in {typedState.name}
                    </h2>
                    <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                      {uniqueChefs.length} CHEFS
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {uniqueChefs.map((chef) => (
                      <ChefCard key={chef.id} chef={chef} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
