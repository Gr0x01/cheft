import { Header } from '@/components/ui/Header';

export default function StateDetailLoading() {
  return (
    <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />
      
      <div className="bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="h-10 w-48 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4">
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
