import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ItemListSchema } from '@/components/seo/SchemaOrg';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { ChefCard } from '@/components/chef/ChefCard';

interface CityPageProps {
  params: Promise<{ slug: string }>;
}

interface City {
  id: string;
  name: string;
  state: string | null;
  country: string;
  slug: string;
  restaurant_count: number;
  chef_count: number;
}

interface ChefWithRestaurants {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  mini_bio: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  chef_shows: Array<{
    id: string;
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary: boolean;
    show: { name: string } | null;
  }>;
  restaurants: Array<{ id: string; city: string }>;
  restaurant_count?: number;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: city } = await supabase
    .from('cities')
    .select('name, state, restaurant_count')
    .eq('slug', slug)
    .single();

  if (!city) {
    return {
      title: 'City Not Found',
    };
  }

  const title = `TV Chef Restaurants in ${city.name}${city.state ? `, ${city.state}` : ''} (${city.restaurant_count} Locations) | ChefMap`;
  const description = `Discover ${city.restaurant_count} restaurants by Top Chef winners and contestants in ${city.name}${city.state ? `, ${city.state}` : ''}. Find chef-driven dining experiences with ratings, photos, and reviews.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export async function generateStaticParams() {
  const supabase = createStaticClient();

  const { data: cities } = await supabase
    .from('cities')
    .select('slug')
    .gte('restaurant_count', 3)
    .order('restaurant_count', { ascending: false })
    .limit(100);

  return cities?.map((city) => ({
    slug: city.slug,
  })) ?? [];
}

export const dynamicParams = true;

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (cityError || !city) {
    notFound();
  }

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
      website_url,
      google_rating,
      google_review_count,
      photo_urls,
      chef:chefs!restaurants_chef_id_fkey (
        id,
        name,
        slug,
        photo_url
      )
    `)
    .eq('city', city.name)
    .eq('is_public', true)
    .order('google_rating', { ascending: false, nullsFirst: false });

  const { data: chefs } = await supabase
    .from('chefs')
    .select(`
      id,
      name,
      slug,
      photo_url,
      mini_bio,
      james_beard_status,
      chef_shows!inner (
        id,
        season,
        result,
        is_primary,
        show:shows (name)
      ),
      restaurants!restaurants_chef_id_fkey!inner (
        id,
        city
      )
    `)
    .eq('restaurants.city', city.name)
    .order('name');

  const uniqueChefs = chefs?.reduce((acc, chef) => {
    if (!acc.find((c) => c.id === chef.id)) {
      const restaurantCount = chefs.filter((c) => c.id === chef.id).length;
      acc.push({
        ...chef,
        restaurant_count: restaurantCount,
      });
    }
    return acc;
  }, [] as ChefWithRestaurants[]);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Cities', href: '/cities' },
    { label: `${city.name}${city.state ? `, ${city.state}` : ''}` },
  ];

  const displayName = `${city.name}${city.state ? `, ${city.state}` : ''}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chefmap.com';
  const cityUrl = `${baseUrl}/cities/${slug}`;

  return (
    <main className="min-h-screen" style={{ background: 'var(--page-background)' }}>
      <ItemListSchema
        name={`TV Chef Restaurants in ${displayName}`}
        description={`${city.restaurant_count} restaurants by Top Chef winners and contestants in ${displayName}`}
        url={cityUrl}
        items={restaurants?.slice(0, 50).map((r, i: number) => ({
          name: r.name,
          url: `${baseUrl}/restaurants/${r.slug}`,
          position: i + 1,
        })) ?? []}
      />
      
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'var(--accent-primary)' }}
        />

        <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="text-center">
            <h1
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-none tracking-tight"
            >
              {displayName}
            </h1>
            <p className="mt-4 font-ui text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
              TV Chef Restaurants & Dining Experiences
            </p>

            <div className="mt-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">
                  {city.restaurant_count}
                </div>
                <div
                  className="mt-1 font-mono text-xs tracking-wider uppercase"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Restaurants
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">
                  {city.chef_count}
                </div>
                <div
                  className="mt-1 font-mono text-xs tracking-wider uppercase"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Chefs
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: 'var(--accent-primary)' }}
        />
      </section>

      {/* Restaurants */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2
            className="font-display text-3xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Restaurants
          </h2>
          <p className="mt-2 font-ui" style={{ color: 'var(--text-muted)' }}>
            {city.restaurant_count} locations by Top Chef winners and contestants
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants?.map((restaurant: any) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>

      {/* Chefs */}
      {uniqueChefs && uniqueChefs.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 py-12 border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <div className="mb-8">
            <h2
              className="font-display text-3xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Chefs in {city.name}
            </h2>
            <p className="mt-2 font-ui" style={{ color: 'var(--text-muted)' }}>
              Meet the TV chefs behind these restaurants
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {uniqueChefs.map((chef: any) => (
              <ChefCard key={chef.id} chef={chef} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
