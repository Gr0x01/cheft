import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createStaticClient } from '@/lib/supabase/static';
import { Header } from '@/components/ui/Header';
import { RestaurantHero } from '@/components/restaurant/RestaurantHero';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { RestaurantMiniCard } from '@/components/restaurant/RestaurantMiniCard';
import { MiniMapWrapper } from '@/components/restaurant/MiniMapWrapper';
import { RestaurantSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import { ReportIssueButton } from '@/components/feedback/ReportIssueButton';
import { sanitizeNarrative } from '@/lib/sanitize';
import { RestaurantPageView } from '@/components/analytics/PostHogPageView';
import { ExternalLinkTracker } from '@/components/analytics/ExternalLinkTracker';

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
  restaurant_narrative: string | null;
  phone: string | null;
  michelin_stars: number | null;
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
  photo_urls?: string[] | null;
  cuisine_tags?: string[] | null;
  chef?: {
    id: string;
    name: string;
    slug: string;
    james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows?: Array<{
      result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary?: boolean;
    }>;
  } | null;
}

async function getCitySlug(city: string, state: string | null): Promise<string | null> {
  const supabase = createStaticClient();
  
  const { data } = await supabase
    .from('cities')
    .select('slug')
    .eq('name', city)
    .eq('state', state || '')
    .single();
  
  return data?.slug || null;
}

async function getRestaurant(slug: string): Promise<RestaurantData | null> {
  const supabase = createStaticClient();

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
      restaurant_narrative,
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

async function getStateRestaurants(state: string | null, excludeId: string): Promise<SiblingRestaurant[]> {
  if (!state) return [];
  
  const supabase = createStaticClient();

  const { data } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      slug,
      city,
      state,
      price_tier,
      status,
      google_rating,
      photo_urls,
      cuisine_tags,
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
    .eq('state', state)
    .eq('is_public', true)
    .neq('id', excludeId)
    .order('google_rating', { ascending: false, nullsFirst: false })
    .limit(6);

  return (data || []) as unknown as SiblingRestaurant[];
}

async function getStateSlug(state: string | null): Promise<string | null> {
  if (!state) return null;
  
  const supabase = createStaticClient();
  
  const { data: byName } = await (supabase as any)
    .from('states')
    .select('slug')
    .eq('name', state)
    .maybeSingle();
  
  if (byName?.slug) return byName.slug;
  
  const { data: byAbbr } = await (supabase as any)
    .from('states')
    .select('slug')
    .eq('abbreviation', state)
    .maybeSingle();
  
  return byAbbr?.slug || null;
}


export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found | Cheft',
    };
  }

  const chefName = restaurant.chef?.name || 'TV Chef';
  const ratingText = restaurant.google_rating ? ` ⭐ ${restaurant.google_rating}` : '';
  const priceText = restaurant.price_tier ? ` ${restaurant.price_tier}` : '';

  const description = restaurant.description
    ? restaurant.description.substring(0, 160)
    : `${restaurant.name} by ${chefName} in ${restaurant.city}${restaurant.state ? `, ${restaurant.state}` : ''}.${ratingText}${priceText}`;

  return {
    title: `${restaurant.name} by ${chefName} - ${restaurant.city} | Cheft`,
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

  const stateRestaurants = await getStateRestaurants(restaurant.state, restaurant.id);
  const stateSlug = await getStateSlug(restaurant.state);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
  const restaurantUrl = `${baseUrl}/restaurants/${restaurant.slug}`;

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Restaurants', url: `${baseUrl}/restaurants` },
    { name: restaurant.name, url: restaurantUrl },
  ];

  return (
    <>
      <RestaurantPageView
        restaurantName={restaurant.name}
        restaurantSlug={restaurant.slug}
        chefName={restaurant.chef?.name || null}
        city={restaurant.city}
        state={restaurant.state}
        priceTier={restaurant.price_tier}
        michelinStars={restaurant.michelin_stars || null}
        status={restaurant.status}
      />
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

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
        <Header currentPage="restaurants" />

        <main>
          <RestaurantHero 
            restaurant={restaurant}
            breadcrumbItems={[
              { label: 'Restaurants', href: '/restaurants' },
              { label: restaurant.name },
            ]}
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
          />

          {/* About This Restaurant - Narrative */}
          {restaurant.restaurant_narrative && (
            <section 
              className="py-12 border-t"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  About This Restaurant
                </h2>
                <p 
                  className="font-ui text-lg leading-relaxed max-w-4xl"
                  style={{ color: 'var(--text-primary)', lineHeight: '1.8' }}
                >
                  {sanitizeNarrative(restaurant.restaurant_narrative)}
                </p>
              </div>
            </section>
          )}

          {restaurant.lat && restaurant.lng && (
            <section className="py-12 border-t" style={{ borderColor: 'var(--border-light)' }}>
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

          {otherRestaurants.length > 0 && (
            <section 
              className="py-12 border-t"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
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
                    <RestaurantMiniCard key={r.id} restaurant={r} bordered />
                  ))}
                </div>
              </div>
            </section>
          )}

          {stateRestaurants.length > 0 && restaurant.state && (
            <section 
              className="py-12 border-t"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    More in {restaurant.state}
                  </h2>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {stateRestaurants.length}+ RESTAURANTS
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {stateRestaurants.map((r: any) => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </div>

                {stateSlug && (
                  <div className="mt-8 text-center">
                    <Link
                      href={`/states/${stateSlug}`}
                      className="inline-flex items-center gap-2 font-mono text-sm font-semibold px-6 py-3 transition-colors"
                      style={{ 
                        background: 'var(--accent-primary)', 
                        color: 'white'
                      }}
                    >
                      VIEW ALL RESTAURANTS IN {restaurant.state.toUpperCase()}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {restaurant.google_rating && (
            <section 
              className="py-8 border-t"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
            >
              <div className="max-w-6xl mx-auto px-4">
                <p 
                  className="font-mono text-[10px] text-center tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Ratings and reviews powered by Google Maps
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
