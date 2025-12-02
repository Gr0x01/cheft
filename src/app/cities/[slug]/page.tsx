import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { ItemListSchema } from '@/components/seo/SchemaOrg';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { ChefCard } from '@/components/chef/ChefCard';
import { PageHero } from '@/components/ui/PageHero';

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
    is_primary: boolean | null;
    show: { name: string };
  }>;
  restaurants: Array<{ id: string; city: string }>;
  restaurant_count?: number;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createStaticClient();

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

  const title = `TV Chef Restaurants in ${city.name}${city.state ? `, ${city.state}` : ''} (${city.restaurant_count} Locations) | Cheft`;
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
  const supabase = createStaticClient();

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

  const displayName = `${city.name}${city.state ? `, ${city.state}` : ''}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chefmap.com';
  const cityUrl = `${baseUrl}/cities/${slug}`;

  return (
    <>
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

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        <Header />

        <PageHero
          title={displayName}
          subtitle="TV Chef Restaurants & Dining Experiences"
          stats={[
            { value: city.restaurant_count, label: 'RESTAURANTS' },
            { value: city.chef_count, label: 'CHEFS' },
          ]}
          breadcrumbItems={[
            { label: 'Cities', href: '/cities' },
            { label: displayName },
          ]}
        />

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
      </div>
    </>
  );
}
