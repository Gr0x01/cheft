import Image from 'next/image';

interface ChefHeroProps {
  chef: {
    name: string;
    photo_url?: string | null;
    mini_bio?: string | null;
    james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
    instagram_handle?: string | null;
    current_position?: string | null;
    social_links?: {
      instagram?: string;
      twitter?: string;
      website?: string;
    } | null;
    chef_shows?: Array<{
      show?: { name: string } | null;
      season?: string | null;
      result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
      is_primary?: boolean;
    }>;
  };
  className?: string;
}

export function ChefHero({ chef }: ChefHeroProps) {
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const isWinner = primaryShow?.result === 'winner';
  const isJBWinner = chef.james_beard_status === 'winner';

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Copper accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'var(--accent-primary)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Photo */}
          <div className="flex-shrink-0 relative">
            <div 
              className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 relative overflow-hidden"
              style={{ 
                border: '4px solid var(--accent-primary)',
                boxShadow: '8px 8px 0 var(--accent-primary)'
              }}
            >
              {chef.photo_url ? (
                <Image
                  src={chef.photo_url}
                  alt={chef.name}
                  fill
                  className="object-cover"
                  sizes="256px"
                  priority
                />
              ) : (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--slate-700) 0%, var(--slate-800) 100%)' }}
                >
                  <span className="font-display text-8xl font-bold text-white/20">
                    {chef.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Achievement badges stacked */}
            <div className="absolute -bottom-3 -right-3 flex flex-col gap-1">
              {isWinner && (
                <span 
                  className="font-mono text-[10px] font-bold tracking-widest px-3 py-1.5"
                  style={{ background: 'var(--accent-success)', color: 'white' }}
                >
                  WINNER
                </span>
              )}
              {isJBWinner && (
                <span 
                  className="font-mono text-[10px] font-bold tracking-widest px-3 py-1.5 flex items-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  JAMES BEARD
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h1 
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-none tracking-tight"
            >
              {chef.name}
            </h1>

            {/* Current position */}
            {chef.current_position && (
              <p 
                className="mt-3 font-mono text-sm tracking-wide"
                style={{ color: 'var(--accent-primary)' }}
              >
                {chef.current_position.toUpperCase()}
              </p>
            )}

            {/* Show info */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {primaryShow?.show?.name && (
                <span 
                  className="font-ui text-sm font-medium px-3 py-1.5"
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    color: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {primaryShow.show.name}
                </span>
              )}
              {primaryShow?.result && primaryShow.result !== 'contestant' && (
                <span 
                  className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 uppercase"
                  style={{ 
                    background: primaryShow.result === 'winner' ? 'var(--accent-success)' : 
                               primaryShow.result === 'finalist' ? '#f59e0b' : 
                               '#6366f1',
                    color: 'white'
                  }}
                >
                  {primaryShow.result}
                </span>
              )}
              {primaryShow?.season && (
                <span 
                  className="font-mono text-xs tracking-wide px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                >
                  {primaryShow.season}
                </span>
              )}
              {chef.james_beard_status === 'nominated' && (
                <span 
                  className="font-mono text-xs font-bold tracking-wider px-3 py-1.5 flex items-center gap-1"
                  style={{ background: '#fb923c', color: '#7c2d12' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  JB NOMINEE
                </span>
              )}
              {chef.james_beard_status === 'semifinalist' && (
                <span 
                  className="font-mono text-xs tracking-wider px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                >
                  JB SEMIFINALIST
                </span>
              )}
            </div>

            {/* Bio */}
            {chef.mini_bio && (
              <p 
                className="mt-6 font-ui text-base leading-relaxed max-w-2xl"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {chef.mini_bio}
              </p>
            )}

            {/* Social links */}
            {(chef.instagram_handle || chef.social_links) && (
              <div className="mt-6 flex gap-4">
                {(chef.instagram_handle || chef.social_links?.instagram) && (
                  <a
                    href={`https://instagram.com/${chef.instagram_handle || chef.social_links?.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/social flex items-center gap-2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <svg className="w-5 h-5 transition-colors group-hover/social:text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                    <span className="font-mono text-xs tracking-wide group-hover/social:text-white transition-colors">
                      @{chef.instagram_handle || chef.social_links?.instagram}
                    </span>
                  </a>
                )}
                {chef.social_links?.twitter && (
                  <a
                    href={`https://twitter.com/${chef.social_links.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-blue-400"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    aria-label="Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {chef.social_links?.website && (
                  <a
                    href={chef.social_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    aria-label="Website"
                  >
                    <svg className="w-5 h-5 hover:text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom border */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'var(--accent-primary)' }}
      />
    </section>
  );
}
