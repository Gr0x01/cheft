import Link from 'next/link';

interface CityCardProps {
  city: {
    id: string;
    name: string;
    slug: string;
    state: string | null;
    country: string;
    restaurant_count: number;
    chef_count: number;
  };
  index?: number;
}

export function CityCard({ city, index = 0 }: CityCardProps) {
  const displayName = `${city.name}${city.state ? `, ${city.state}` : ''}`;
  
  return (
    <Link
      href={`/cities/${city.slug}`}
      className="group relative block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
        style={{ background: 'var(--accent-primary)' }}
      />

      <div className="relative aspect-[4/3] overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(135deg, var(--slate-800) 0%, var(--slate-900) 100%)' 
          }}
        >
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)' }}
        >
          <svg 
            className="w-20 h-20 transition-transform duration-500 group-hover:scale-110" 
            style={{ color: 'var(--accent-primary)' }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <h3 
            className="font-display text-2xl font-bold leading-tight tracking-tight text-white"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            {displayName}
          </h3>
          <p 
            className="mt-1 font-mono text-xs tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            {city.country}
          </p>
        </div>
      </div>

      <div className="p-5 pl-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {city.restaurant_count}
            </div>
            <div className="font-mono text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
              RESTAURANTS
            </div>
          </div>
          <div className="flex-1 text-right">
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {city.chef_count}
            </div>
            <div className="font-mono text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
              CHEFS
            </div>
          </div>
        </div>

        <div 
          className="pt-4 flex items-center justify-between border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            EXPLORE
          </span>
          <span 
            className="font-mono text-xs font-semibold tracking-wide transition-transform group-hover:translate-x-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            VIEW →
          </span>
        </div>
      </div>

      <div 
        className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]"
      />
    </Link>
  );
}
