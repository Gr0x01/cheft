import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'TV Chef Restaurants - 311 Locations Nationwide | ChefMap',
  description:
    'Browse 311 restaurants from Top Chef, Iron Chef, and other cooking competition winners and contestants. Find TV chef restaurants near you.',
  openGraph: {
    title: 'TV Chef Restaurants - 311 Locations Nationwide | ChefMap',
    description:
      'Browse 311 restaurants from Top Chef, Iron Chef, and other cooking competition contestants.',
    type: 'website',
  },
};

interface RestaurantWithChef {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  price_tier: '$' | '$$' | '$$$' | '$$$$' | null;
  cuisine_tags: string[] | null;
  status: 'open' | 'closed' | 'unknown';
  google_rating: number | null;
  google_review_count: number | null;
  photo_urls: string[] | null;
  chef: {
    id: string;
    name: string;
    slug: string;
    james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows: Array<{
      result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary: boolean;
    }>;
  } | null;
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; price?: string; cuisine?: string; status?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
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
      chef:chefs (
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
    .eq('is_public', true);

  if (params.status === 'open') {
    query = query.eq('status', 'open');
  } else if (params.status === 'closed') {
    query = query.eq('status', 'closed');
  }

  if (params.price && ['$', '$$', '$$$', '$$$$'].includes(params.price)) {
    query = query.eq('price_tier', params.price as '$' | '$$' | '$$$' | '$$$$');
  }

  if (params.city) {
    query = query.ilike('city', `%${params.city}%`);
  }

  if (params.cuisine) {
    query = query.contains('cuisine_tags', [params.cuisine]);
  }

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,city.ilike.%${params.q}%`);
  }

  if (params.sort === 'rating') {
    query = query.order('google_rating', { ascending: false, nullsFirst: false });
  } else if (params.sort === 'reviews') {
    query = query.order('google_review_count', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('name');
  }

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('Error fetching restaurants:', error);
    return <div className="p-8 text-center text-red-600">Failed to load restaurants</div>;
  }

  const filteredRestaurants = (restaurants || []) as unknown as RestaurantWithChef[];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chefmap.com';
  const schemaItems = filteredRestaurants.slice(0, 100).map((restaurant, index) => ({
    name: restaurant.name,
    url: `${baseUrl}/restaurants/${restaurant.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Restaurants', url: `${baseUrl}/restaurants` },
  ];

  const openCount = filteredRestaurants.filter(r => r.status === 'open').length;
  const cities = [...new Set(filteredRestaurants.map(r => r.city))].sort();

  return (
    <>
      <ItemListSchema
        name="TV Chef Restaurants Directory"
        description="Browse restaurants from Top Chef, Iron Chef, and other cooking competitions"
        url={`${baseUrl}/restaurants`}
        items={schemaItems}
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

        <section 
          className="relative overflow-hidden border-b"
          style={{ background: 'var(--slate-900)', borderColor: 'var(--accent-primary)' }}
        >
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20">
            <Breadcrumbs
              items={[{ label: 'Restaurants' }]}
              className="mb-8 [&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/30"
            />
            
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
                  Restaurants
                </h1>
                <p className="mt-4 font-ui text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {filteredRestaurants.length} locations from TV chef competitors
                </p>
              </div>
              
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="font-mono text-3xl font-bold text-white">{openCount}</div>
                  <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--accent-primary)' }}>OPEN NOW</div>
                </div>
                <div 
                  className="w-px"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
                <div className="text-center">
                  <div className="font-mono text-3xl font-bold text-white">{cities.length}</div>
                  <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--accent-primary)' }}>CITIES</div>
                </div>
              </div>
            </div>
          </div>
          
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'var(--accent-primary)' }}
          />
        </section>

        <section className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <form className="w-full lg:w-auto lg:min-w-[300px]">
                <div className="relative">
                  <input
                    type="search"
                    name="q"
                    placeholder="Search restaurants..."
                    defaultValue={params.q || ''}
                    className="w-full h-11 pl-11 pr-4 font-ui text-sm border-2 transition-colors focus:outline-none"
                    style={{ 
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-light)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/restaurants"
                  className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                  style={{ 
                    background: !params.status && !params.price ? 'var(--accent-primary)' : 'transparent',
                    color: !params.status && !params.price ? 'white' : 'var(--text-secondary)',
                    border: `2px solid ${!params.status && !params.price ? 'var(--accent-primary)' : 'var(--border-light)'}`
                  }}
                >
                  ALL
                </Link>
                <Link
                  href="/restaurants?status=open"
                  className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                  style={{ 
                    background: params.status === 'open' ? 'var(--accent-success)' : 'transparent',
                    color: params.status === 'open' ? 'white' : 'var(--text-secondary)',
                    border: `2px solid ${params.status === 'open' ? 'var(--accent-success)' : 'var(--border-light)'}`
                  }}
                >
                  OPEN
                </Link>
                <Link
                  href="/restaurants?sort=rating"
                  className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all flex items-center gap-1.5"
                  style={{ 
                    background: params.sort === 'rating' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'transparent',
                    color: params.sort === 'rating' ? '#78350f' : 'var(--text-secondary)',
                    border: `2px solid ${params.sort === 'rating' ? '#f59e0b' : 'var(--border-light)'}`
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  TOP RATED
                </Link>
                <div className="flex gap-2">
                  <Link
                    href="/restaurants?price=$"
                    className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                    style={{ 
                      background: params.price === '$' ? 'var(--accent-primary)' : 'transparent',
                      color: params.price === '$' ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${params.price === '$' ? 'var(--accent-primary)' : 'var(--border-light)'}`
                    }}
                  >
                    $
                  </Link>
                  <Link
                    href="/restaurants?price=$$"
                    className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                    style={{ 
                      background: params.price === '$$' ? 'var(--accent-primary)' : 'transparent',
                      color: params.price === '$$' ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${params.price === '$$' ? 'var(--accent-primary)' : 'var(--border-light)'}`
                    }}
                  >
                    $$
                  </Link>
                  <Link
                    href="/restaurants?price=$$$"
                    className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                    style={{ 
                      background: params.price === '$$$' ? 'var(--accent-primary)' : 'transparent',
                      color: params.price === '$$$' ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${params.price === '$$$' ? 'var(--accent-primary)' : 'var(--border-light)'}`
                    }}
                  >
                    $$$
                  </Link>
                  <Link
                    href="/restaurants?price=$$$$"
                    className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                    style={{ 
                      background: params.price === '$$$$' ? 'var(--accent-primary)' : 'transparent',
                      color: params.price === '$$$$' ? 'white' : 'var(--text-secondary)',
                      border: `2px solid ${params.price === '$$$$' ? 'var(--accent-primary)' : 'var(--border-light)'}`
                    }}
                  >
                    $$$$
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="max-w-7xl mx-auto px-4 py-12">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-ui text-lg" style={{ color: 'var(--text-muted)' }}>
                No restaurants found matching your criteria
              </p>
              <Link 
                href="/restaurants" 
                className="mt-4 inline-block font-mono text-sm tracking-wider"
                style={{ color: 'var(--accent-primary)' }}
              >
                CLEAR FILTERS →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRestaurants.map((restaurant, index) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
