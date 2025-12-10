import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { ChefCard } from '@/components/chef/ChefCard';
import { PageHero } from '@/components/ui/PageHero';
import { sanitizeNarrative } from '@/lib/sanitize';
import { CityPageClient } from './CityPageClient';

interface CityPageProps {
  params: Promise<{ slug: string }>;
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
    is_primary?: boolean;
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
    .select('name, state, restaurant_count, city_narrative')
    .eq('slug', slug)
    .single();

  if (!city) {
    return { title: 'City Not Found' };
  }

  const title = `TV Chef Restaurants in ${city.name}${city.state ? `, ${city.state}` : ''} (${city.restaurant_count} Locations) | Cheft`;
  const description = `Discover ${city.restaurant_count} restaurants by Top Chef winners and contestants in ${city.name}${city.state ? `, ${city.state}` : ''}. Find chef-driven dining experiences with ratings, photos, and reviews.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
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

  return cities?.map((city) => ({ slug: city.slug })) ?? [];
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
        chef_shows: chef.chef_shows.map(cs => ({
          ...cs,
          is_primary: cs.is_primary ?? undefined,
        })),
      });
    }
    return acc;
  }, [] as ChefWithRestaurants[]);

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

  const displayName = `${city.name}${city.state ? `, ${city.state}` : ''}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const cityUrl = `${baseUrl}/cities/${slug}`;

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Cities', url: `${baseUrl}/cities` },
    { name: displayName, url: cityUrl },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
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

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
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

        {city.city_narrative && (
          <section className="py-8 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="max-w-7xl mx-auto px-4">
              <p className="font-ui text-lg leading-relaxed max-w-4xl" style={{ color: 'var(--text-primary)', lineHeight: '1.8' }}>
                {sanitizeNarrative(city.city_narrative)}
              </p>
            </div>
          </section>
        )}

        <CityPageClient restaurants={restaurantData} />

        {uniqueChefs && uniqueChefs.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-12 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Chefs in {city.name}
              </h2>
              <p className="mt-2 font-ui" style={{ color: 'var(--text-muted)' }}>
                Meet the TV chefs behind these restaurants
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {uniqueChefs.map((chef: ChefWithRestaurants) => (
                <ChefCard key={chef.id} chef={chef} />
              ))}
            </div>
          </section>
        )}

        <Footer />
      </div>
    </>
  );
}
