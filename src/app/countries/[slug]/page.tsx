import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { ChefCard } from '@/components/chef/ChefCard';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { Footer } from '@/components/ui/Footer';

interface CountryPageProps {
  params: Promise<{ slug: string }>;
}

interface CountryData {
  id: string;
  slug: string;
  name: string;
  code: string;
  restaurant_count: number;
  chef_count: number;
  city_count: number;
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createStaticClient();

  const { data: country } = await (supabase as any)
    .from('countries')
    .select('name, code, restaurant_count, chef_count')
    .eq('slug', slug)
    .single();

  if (!country) {
    return { title: 'Country Not Found' };
  }

  const title = `TV Chef Restaurants in ${country.name} (${country.restaurant_count} Locations) | Cheft`;
  const description = country.restaurant_count > 0
    ? `Discover ${country.restaurant_count} restaurants by renowned chefs in ${country.name}. Find world-class dining from Chef's Table and more.`
    : `No TV chef restaurants listed yet in ${country.name}. Know one? Suggest it to us!`;

  return {
    title,
    description,
    alternates: {
      canonical: `/countries/${slug}`,
    },
    openGraph: { title, description, type: 'website' },
  };
}

export async function generateStaticParams() {
  const supabase = createStaticClient();

  const { data: countries } = await (supabase as any)
    .from('countries')
    .select('slug');

  return (countries as any[])?.map((country) => ({ slug: country.slug })) ?? [];
}

export const dynamicParams = true;

export default async function CountryPage({ params }: CountryPageProps) {
  const { slug } = await params;
  const supabase = createStaticClient();

  const { data: country, error: countryError } = await (supabase as any)
    .from('countries')
    .select('*')
    .eq('slug', slug)
    .single();

  if (countryError || !country) {
    notFound();
  }

  const typedCountry = country as CountryData;

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
    .in('country', [typedCountry.name, typedCountry.code])
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

  const citiesInCountry = [...new Set(restaurants?.map(r => r.city) || [])].sort();

  const restaurantData = (restaurants || []).map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    city: r.city,
    state: r.state,
    country: typedCountry.name,
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
  const countryUrl = `${baseUrl}/countries/${slug}`;

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Countries', url: `${baseUrl}/countries` },
    { name: typedCountry.name, url: countryUrl },
  ];

  return (
    <>
      {restaurantData.length > 0 && (
        <ItemListSchema
          name={`TV Chef Restaurants in ${typedCountry.name}`}
          description={`${typedCountry.restaurant_count} restaurants by renowned chefs in ${typedCountry.name}`}
          url={countryUrl}
          items={restaurantData.slice(0, 50).map((r, i) => ({
            name: r.name,
            url: `${baseUrl}/restaurants/${r.slug}`,
            position: i + 1,
          }))}
        />
      )}
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="countries" />

        <PageHero
          title={typedCountry.name}
          subtitle="TV Chef Restaurants"
          stats={[
            { value: typedCountry.restaurant_count, label: 'RESTAURANTS' },
            { value: typedCountry.chef_count, label: 'CHEFS' },
            { value: typedCountry.city_count, label: 'CITIES' },
          ]}
          breadcrumbItems={[
            { label: 'Countries', href: '/countries' },
            { label: typedCountry.name },
          ]}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {restaurantData.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                No Restaurants Yet in {typedCountry.name}
              </h2>
              <p className="font-ui text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
                Know a TV chef restaurant in {typedCountry.name}? Help us grow our database!
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
              {citiesInCountry.length > 1 && (
                <section className="mb-8">
                  <h2 className="font-mono text-xs tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    CITIES IN {typedCountry.code}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {citiesInCountry.map(city => {
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
                      Chefs in {typedCountry.name}
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

        <Footer />
      </div>
    </>
  );
}
