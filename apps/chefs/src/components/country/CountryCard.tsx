import Link from 'next/link';

interface CountryCardProps {
  country: {
    id: string;
    slug: string;
    name: string;
    code: string;
    restaurant_count: number;
    chef_count: number;
    city_count: number;
  };
  index?: number;
}

export function CountryCard({ country, index = 0 }: CountryCardProps) {
  const hasRestaurants = country.restaurant_count > 0;
  
  return (
    <Link
      href={`/countries/${country.slug}`}
      className="group relative block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${index * 30}ms` }}
      aria-label={`View ${country.restaurant_count} restaurants in ${country.name}`}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2"
        style={{ background: hasRestaurants ? 'var(--accent-primary)' : 'var(--border-light)' }}
      />

      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 
              className="font-display text-xl font-bold transition-colors group-hover:text-[var(--accent-primary)]"
              style={{ color: 'var(--text-primary)' }}
            >
              {country.name}
            </h3>
            <span 
              className="font-mono text-xs tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {country.code}
            </span>
          </div>
          <div 
            className="font-mono text-3xl font-bold"
            style={{ color: hasRestaurants ? 'var(--accent-primary)' : 'var(--text-muted)' }}
          >
            {country.restaurant_count}
          </div>
        </div>

        {hasRestaurants ? (
          <div className="flex items-center gap-4 text-center">
            <div className="flex-1">
              <div className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {country.chef_count}
              </div>
              <div className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
                CHEFS
              </div>
            </div>
            <div className="h-8 w-px" style={{ background: 'var(--border-light)' }} />
            <div className="flex-1">
              <div className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {country.city_count}
              </div>
              <div className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
                CITIES
              </div>
            </div>
          </div>
        ) : (
          <p 
            className="font-mono text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            No restaurants yet
          </p>
        )}

        <div 
          className="mt-4 pt-4 flex items-center justify-between border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <span className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {hasRestaurants ? 'EXPLORE' : 'VIEW'}
          </span>
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
  );
}
