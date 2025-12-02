import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import { RestaurantHero } from '@/components/restaurant/RestaurantHero';
import { MiniMapWrapper } from '@/components/restaurant/MiniMapWrapper';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RestaurantSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';

interface RestaurantPageProps {
  params: Promise<{ slug: string }>;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  price_tier: string | null;
  cuisine_tags: string[] | null;
  status: 'open' | 'closed' | 'unknown';
  website_url: string | null;
  maps_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  photo_urls: string[] | null;
  description: string | null;
  phone: string | null;
  chef: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows: Array<{
      id: string;
      season: string | null;
      result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary: boolean;
      show: { name: string; slug: string } | null;
    }>;
    restaurants: SiblingRestaurant[];
  } | null;
}

interface SiblingRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  price_tier: string | null;
  status: 'open' | 'closed' | 'unknown';
  google_rating: number | null;
}

async function getCitySlug(city: string, state: string | null): Promise<string | null> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('cities')
    .select('slug')
    .eq('name', city)
    .eq('state', state || '')
    .single();
  
  return data?.slug || null;
}

async function getRestaurant(slug: string): Promise<RestaurantData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      slug,
      address,
      city,
      state,
      country,
      lat,
      lng,
      price_tier,
      cuisine_tags,
      status,
      website_url,
      maps_url,
      google_rating,
      google_review_count,
      photo_urls,
      description,
      phone,
      chef:chefs (
        id,
        name,
        slug,
        photo_url,
        james_beard_status,
        chef_shows (
          id,
          season,
          result,
          is_primary,
          show:shows (name, slug)
        ),
        restaurants!restaurants_chef_id_fkey (
          id,
          name,
          slug,
          city,
          state,
          price_tier,
          status,
          google_rating
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as RestaurantData;
}


export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found | ChefMap',
    };
  }

  const chefName = restaurant.chef?.name || 'TV Chef';
  const ratingText = restaurant.google_rating ? ` ⭐ ${restaurant.google_rating}` : '';
  const priceText = restaurant.price_tier ? ` ${restaurant.price_tier}` : '';

  const description = restaurant.description
    ? restaurant.description.substring(0, 160)
    : `${restaurant.name} by ${chefName} in ${restaurant.city}${restaurant.state ? `, ${restaurant.state}` : ''}.${ratingText}${priceText}`;

  return {
    title: `${restaurant.name} by ${chefName} - ${restaurant.city} | ChefMap`,
    description,
    openGraph: {
      title: `${restaurant.name} by ${chefName}`,
      description,
      type: 'website',
      images: restaurant.photo_urls?.[0] ? [restaurant.photo_urls[0]] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${restaurant.name} by ${chefName}`,
      description,
      images: restaurant.photo_urls?.[0] ? [restaurant.photo_urls[0]] : undefined,
    },
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createStaticClient();
  
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('is_public', true)
    .limit(500);

  return ((restaurants || []) as Array<{ slug: string }>).map(r => ({
    slug: r.slug,
  }));
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) {
    notFound();
  }

  const otherRestaurants = restaurant.chef?.restaurants
    .filter(r => r.id !== restaurant.id)
    .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0))
    .slice(0, 6) || [];

  const citySlug = await getCitySlug(restaurant.city, restaurant.state);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chefmap.com';
  const restaurantUrl = `${baseUrl}/restaurants/${restaurant.slug}`;

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Restaurants', url: `${baseUrl}/restaurants` },
    { name: restaurant.name, url: restaurantUrl },
  ];

  return (
    <>
      <RestaurantSchema
        name={restaurant.name}
        description={restaurant.description}
        image={restaurant.photo_urls || []}
        url={restaurantUrl}
        telephone={restaurant.phone}
        priceRange={restaurant.price_tier}
        servesCuisine={restaurant.cuisine_tags || []}
        address={{
          streetAddress: restaurant.address,
          addressLocality: restaurant.city,
          addressRegion: restaurant.state,
          postalCode: null,
          addressCountry: restaurant.country,
        }}
        geo={restaurant.lat && restaurant.lng ? { latitude: restaurant.lat, longitude: restaurant.lng } : null}
        aggregateRating={
          restaurant.google_rating && restaurant.google_review_count
            ? { ratingValue: restaurant.google_rating, reviewCount: restaurant.google_review_count }
            : null
        }
        founder={
          restaurant.chef
            ? { name: restaurant.chef.name, url: `${baseUrl}/chefs/${restaurant.chef.slug}` }
            : undefined
        }
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        <header 
          className="sticky top-0 z-50 border-b"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
        >
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ background: 'var(--accent-primary)' }}
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                ChefMap
              </span>
            </Link>
            <nav className="flex gap-8">
              <Link 
                href="/chefs" 
                className="font-mono text-xs tracking-wider transition-colors hover:text-[var(--accent-primary)]"
                style={{ color: 'var(--text-muted)' }}
              >
                CHEFS
              </Link>
              <Link 
                href="/restaurants" 
                className="font-mono text-xs tracking-wider font-semibold"
                style={{ color: 'var(--accent-primary)' }}
              >
                RESTAURANTS
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <div className="max-w-6xl mx-auto px-4 pt-6">
            <Breadcrumbs
              items={[
                { label: 'Restaurants', href: '/restaurants' },
                { label: restaurant.name },
              ]}
            />
          </div>

          <RestaurantHero restaurant={restaurant} />

          {restaurant.lat && restaurant.lng && (
            <section className="py-12">
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  Location
                </h2>
                <div 
                  className="h-64 sm:h-80 overflow-hidden"
                  style={{ border: '2px solid var(--border-light)' }}
                >
                  <MiniMapWrapper 
                    lat={restaurant.lat} 
                    lng={restaurant.lng} 
                    name={restaurant.name}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  {restaurant.maps_url && (
                    <a
                      href={restaurant.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-mono text-sm font-semibold px-4 py-2 transition-colors"
                      style={{ 
                        background: 'var(--accent-primary)', 
                        color: 'white'
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      GET DIRECTIONS
                    </a>
                  )}
                  {restaurant.website_url && (
                    <a
                      href={restaurant.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-mono text-sm font-semibold px-4 py-2 transition-colors"
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        color: 'var(--text-primary)',
                        border: '2px solid var(--border-light)'
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      VISIT WEBSITE
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* More in City */}
          {citySlug && (
            <section 
              className="py-12 border-t"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  More in {restaurant.city}
                </h2>
                <p className="font-ui mb-6" style={{ color: 'var(--text-muted)' }}>
                  Explore all TV chef restaurants in this city
                </p>
                <Link
                  href={`/cities/${citySlug}`}
                  className="inline-flex items-center gap-2 font-mono text-sm font-semibold px-4 py-2 transition-colors"
                  style={{ 
                    background: 'var(--accent-primary)', 
                    color: 'white'
                  }}
                >
                  VIEW ALL RESTAURANTS IN {restaurant.city.toUpperCase()}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </section>
          )}

          {otherRestaurants.length > 0 && (
            <section 
              className="py-12 border-t"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    More from {restaurant.chef?.name}
                  </h2>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {otherRestaurants.length} OTHER LOCATION{otherRestaurants.length !== 1 ? 'S' : ''}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otherRestaurants.map(r => (
                    <Link
                      key={r.id}
                      href={`/restaurants/${r.slug}`}
                      className="group relative block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    >
                      <div 
                        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
                        style={{ background: r.status === 'closed' ? 'var(--text-muted)' : 'var(--accent-primary)' }}
                      />
                      
                      <div className={`p-4 pl-5 ${r.status === 'closed' ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h3 
                              className={`font-display text-lg font-bold truncate transition-colors group-hover:text-[var(--accent-primary)] ${r.status === 'closed' ? 'line-through' : ''}`}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {r.name}
                            </h3>
                            <p className="font-mono text-xs tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
                              {r.city}{r.state ? `, ${r.state}` : ''}
                            </p>
                          </div>
                          {r.price_tier && (
                            <span 
                              className="font-mono text-sm font-bold flex-shrink-0"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              {r.price_tier}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          {r.google_rating ? (
                            <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                              <span className="font-mono text-sm font-bold">{r.google_rating}</span>
                            </div>
                          ) : (
                            <span />
                          )}
                          <span 
                            className="font-mono text-xs font-semibold tracking-wide transition-transform group-hover:translate-x-1"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            VIEW →
                          </span>
                        </div>
                      </div>

                      <div className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {citySlug && (
            <section className="py-12">
              <div className="max-w-6xl mx-auto px-4 text-center">
                <Link
                  href={`/cities/${citySlug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 font-mono text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5"
                  style={{ 
                    background: 'var(--accent-primary)', 
                    color: 'white',
                  }}
                >
                  VIEW ALL RESTAURANTS IN {restaurant.city.toUpperCase()}
                  {restaurant.state && `, ${restaurant.state.toUpperCase()}`}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
