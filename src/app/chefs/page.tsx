import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import { ChefCard } from '@/components/chef/ChefCard';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemListSchema, BreadcrumbSchema } from '@/components/seo/SchemaOrg';

export const metadata: Metadata = {
  title: 'All TV Chefs - Top Chef, Iron Chef & More | Cheft',
  description:
    'Browse 180+ chefs from Top Chef, Iron Chef, and other cooking competitions. Find their restaurants, see their achievements, and discover where they cook.',
  openGraph: {
    title: 'All TV Chefs - Top Chef, Iron Chef & More | Cheft',
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
  const supabase = createStaticClient();

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheft.app';
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

  const filterOptions = [
    { href: '/chefs', label: 'ALL', isActive: !params.show && !params.jb },
    { href: '/chefs?show=top+chef', label: 'TOP CHEF', isActive: params.show === 'top chef' },
    { 
      href: '/chefs?jb=winner', 
      label: 'JB WINNERS', 
      isActive: params.jb === 'winner',
      variant: 'warning' as const,
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    },
  ];

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
        <Header currentPage="chefs" />

        <PageHero
          title="TV Chefs"
          subtitle={`${chefsWithCount.length} competition chefs and their restaurants`}
          stats={[
            { value: winnersCount, label: 'WINNERS' },
            { value: jbCount, label: 'JAMES BEARD' },
          ]}
          breadcrumbItems={[{ label: 'Chefs' }]}
        />

        <FilterBar
          searchPlaceholder="Search chefs..."
          searchDefaultValue={params.q}
          filterOptions={filterOptions}
        />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {chefsWithCount.length === 0 ? (
            <EmptyState
              message="No chefs found matching your criteria"
              actionHref="/chefs"
            />
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
