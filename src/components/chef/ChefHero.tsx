import Image from 'next/image';
import { Breadcrumbs } from '../seo/Breadcrumbs';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ChefHeroProps {
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  chef: {
    name: string;
    photo_url?: string | null;
    mini_bio?: string | null;
    james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
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

export function ChefHero({ chef, breadcrumbItems }: ChefHeroProps) {
  const primaryShow = chef.chef_shows?.find(cs => cs.is_primary) || chef.chef_shows?.[0];
  const isWinner = primaryShow?.result === 'winner';
  const photoUrl = chef.photo_url;

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
        {breadcrumbItems && (
          <Breadcrumbs
            items={breadcrumbItems}
            className="mb-8 [&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/30"
          />
        )}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Photo */}
          <div className="flex-shrink-0 relative md:mt-3">
            <div 
              className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 relative overflow-hidden"
              style={{ 
                border: '4px solid var(--accent-primary)',
                boxShadow: '8px 8px 0 var(--accent-primary)'
              }}
            >
              {photoUrl ? (
                <Image
                  src={photoUrl}
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
                    {getInitials(chef.name)}
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
              {chef.james_beard_status === 'winner' && (
                <span 
                  className="font-mono text-[10px] font-bold tracking-widest px-3 py-1.5 flex items-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', color: '#ffffff' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  JAMES BEARD
                </span>
              )}
              {chef.james_beard_status === 'nominated' && (
                <span 
                  className="font-mono text-[10px] font-bold tracking-widest px-3 py-1.5 flex items-center gap-1"
                  style={{ background: '#1d4ed8', color: '#ffffff' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  JB NOMINEE
                </span>
              )}
              {chef.james_beard_status === 'semifinalist' && (
                <span 
                  className="font-mono text-[10px] tracking-widest px-3 py-1.5"
                  style={{ background: '#dbeafe', color: '#1e3a8a' }}
                >
                  JB SEMIFINALIST
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
