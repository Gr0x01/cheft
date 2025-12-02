import Link from 'next/link';
import Image from 'next/image';

interface RelatedChefsProps {
  chefs: Array<{
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
    chef_shows?: Array<{
      show?: { name: string } | null;
      result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    }>;
  }>;
  title?: string;
  subtitle?: string;
}

export function RelatedChefs({ chefs, title = "Related Chefs", subtitle }: RelatedChefsProps) {
  if (chefs.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {chefs.map((chef) => {
          const primaryShow = chef.chef_shows?.[0];
          const isWinner = primaryShow?.result === 'winner';
          const isJBWinner = chef.james_beard_status === 'winner';

          return (
            <Link
              key={chef.id}
              href={`/chefs/${chef.slug}`}
              className="group block bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2" style={{ background: 'var(--accent-primary)' }} />

              <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--slate-100)' }}>
                {chef.photo_url ? (
                  <Image
                    src={chef.photo_url}
                    alt={chef.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--slate-100) 0%, var(--slate-200) 100%)' }}
                  >
                    <span 
                      className="font-display text-5xl font-bold"
                      style={{ color: 'var(--slate-300)' }}
                    >
                      {chef.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {(isWinner || isJBWinner) && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {isWinner && (
                      <span 
                        className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5"
                        style={{ background: 'var(--accent-success)', color: 'white' }}
                      >
                        WINNER
                      </span>
                    )}
                    {isJBWinner && (
                      <span 
                        className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5"
                        style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f' }}
                      >
                        JB
                      </span>
                    )}
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 
                    className="font-display text-lg font-bold leading-tight tracking-tight text-white"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    {chef.name}
                  </h3>
                </div>
              </div>

              <div 
                className="absolute inset-0 border-2 border-transparent transition-colors duration-300 pointer-events-none group-hover:border-[var(--accent-primary)]"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
