import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ChefCard } from '@/components/chef/ChefCard';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'All TV Chefs - Top Chef, Iron Chef & More | ChefMap',
  description:
    'Browse 180+ chefs from Top Chef, Iron Chef, and other cooking competitions. Find their restaurants, see their achievements, and discover where they cook.',
  openGraph: {
    title: 'All TV Chefs - Top Chef, Iron Chef & More | ChefMap',
    description:
      'Browse 180+ chefs from Top Chef, Iron Chef, and other cooking competitions.',
    type: 'website',
  },
};

interface ChefWithRestaurantCount {
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
  restaurants: Array<{ id: string }>;
}

export default async function ChefsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; jb?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
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
      ),
      restaurants!restaurants_chef_id_fkey (id)
    `)
    .order('name');

  if (params.jb === 'winner') {
    query = query.eq('james_beard_status', 'winner');
  } else if (params.jb === 'any') {
    query = query.not('james_beard_status', 'is', null);
  }

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`);
  }

  const { data: chefs, error } = await query;

  if (error) {
    console.error('Error fetching chefs:', error);
    return <div className="p-8 text-center text-red-600">Failed to load chefs</div>;
  }

  let filteredChefs = (chefs || []) as unknown as ChefWithRestaurantCount[];

  if (params.show) {
    filteredChefs = filteredChefs.filter(chef =>
      chef.chef_shows?.some(cs =>
        cs.show?.name?.toLowerCase().includes(params.show!.toLowerCase())
      )
    );
  }

  const chefsWithCount = filteredChefs.map(chef => ({
    ...chef,
    restaurant_count: chef.restaurants?.length || 0,
  }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chefmap.com';
  const schemaItems = chefsWithCount.slice(0, 100).map((chef, index) => ({
    name: chef.name,
    url: `${baseUrl}/chefs/${chef.slug}`,
    position: index + 1,
  }));

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Chefs', url: `${baseUrl}/chefs` },
  ];

  const winnersCount = chefsWithCount.filter(c => c.chef_shows?.some(cs => cs.result === 'winner')).length;
  const jbCount = chefsWithCount.filter(c => c.james_beard_status).length;

  return (
    <>
      <ItemListSchema
        name="TV Chefs Directory"
        description="Browse all chefs from Top Chef, Iron Chef, and other cooking competitions"
        url={`${baseUrl}/chefs`}
        items={schemaItems}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
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
                className="font-mono text-xs tracking-wider font-semibold"
                style={{ color: 'var(--accent-primary)' }}
              >
                CHEFS
              </Link>
              <Link 
                href="/restaurants" 
                className="font-mono text-xs tracking-wider transition-colors hover:text-[var(--accent-primary)]"
                style={{ color: 'var(--text-muted)' }}
              >
                RESTAURANTS
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section 
          className="relative overflow-hidden border-b"
          style={{ background: 'var(--slate-900)', borderColor: 'var(--accent-primary)' }}
        >
          {/* Pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20">
            <Breadcrumbs
              items={[{ label: 'Chefs' }]}
              className="mb-8 [&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/30"
            />
            
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
                  TV Chefs
                </h1>
                <p className="mt-4 font-ui text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {chefsWithCount.length} competition chefs and their restaurants
                </p>
              </div>
              
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="font-mono text-3xl font-bold text-white">{winnersCount}</div>
                  <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--accent-primary)' }}>WINNERS</div>
                </div>
                <div 
                  className="w-px"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
                <div className="text-center">
                  <div className="font-mono text-3xl font-bold text-white">{jbCount}</div>
                  <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--accent-primary)' }}>JAMES BEARD</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Copper accent */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'var(--accent-primary)' }}
          />
        </section>

        {/* Filters */}
        <section className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <form className="w-full sm:w-auto sm:min-w-[300px]">
                <div className="relative">
                  <input
                    type="search"
                    name="q"
                    placeholder="Search chefs..."
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
                  href="/chefs"
                  className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                  style={{ 
                    background: !params.show && !params.jb ? 'var(--accent-primary)' : 'transparent',
                    color: !params.show && !params.jb ? 'white' : 'var(--text-secondary)',
                    border: `2px solid ${!params.show && !params.jb ? 'var(--accent-primary)' : 'var(--border-light)'}`
                  }}
                >
                  ALL
                </Link>
                <Link
                  href="/chefs?show=top+chef"
                  className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all"
                  style={{ 
                    background: params.show === 'top chef' ? 'var(--accent-primary)' : 'transparent',
                    color: params.show === 'top chef' ? 'white' : 'var(--text-secondary)',
                    border: `2px solid ${params.show === 'top chef' ? 'var(--accent-primary)' : 'var(--border-light)'}`
                  }}
                >
                  TOP CHEF
                </Link>
                <Link
                  href="/chefs?jb=winner"
                  className="font-mono text-xs tracking-wider font-semibold px-4 py-2.5 transition-all flex items-center gap-1.5"
                  style={{ 
                    background: params.jb === 'winner' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'transparent',
                    color: params.jb === 'winner' ? '#78350f' : 'var(--text-secondary)',
                    border: `2px solid ${params.jb === 'winner' ? '#f59e0b' : 'var(--border-light)'}`
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  JB WINNERS
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <main className="max-w-7xl mx-auto px-4 py-12">
          {chefsWithCount.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-ui text-lg" style={{ color: 'var(--text-muted)' }}>
                No chefs found matching your criteria
              </p>
              <Link 
                href="/chefs" 
                className="mt-4 inline-block font-mono text-sm tracking-wider"
                style={{ color: 'var(--accent-primary)' }}
              >
                CLEAR FILTERS →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {chefsWithCount.map((chef, index) => (
                <ChefCard key={chef.id} chef={chef} index={index} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
