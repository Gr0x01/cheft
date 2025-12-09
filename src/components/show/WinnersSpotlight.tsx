'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trophy, MapPin, ChevronRight } from 'lucide-react';
import { getStorageUrl } from '@/lib/utils/storage';
import { MichelinStar } from '../icons/MichelinStar';

interface Winner {
  chef: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
  };
  season: string;
  flagship: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string | null;
    photo_url: string | null;
    michelin_stars: number | null;
    price_tier: string | null;
  } | null;
}

interface WinnersSpotlightProps {
  winners: Winner[];
  showName: string;
  showSlug: string;
}

const TOP_CHEF_SEASON_NAMES: Record<string, string> = {
  '3': 'Miami',
  '4': 'Chicago',
  '5': 'New York',
  '6': 'Las Vegas',
  '7': 'Washington D.C.',
  '8': 'All-Stars',
  '9': 'Texas',
  '10': 'Seattle',
  '11': 'New Orleans',
  '12': 'Boston',
  '13': 'California',
  '14': 'Charleston',
  '15': 'Colorado',
  '16': 'Kentucky',
  '17': 'All-Stars L.A.',
  '18': 'Portland',
  '19': 'Houston',
  '20': 'World All-Stars',
  '21': 'Wisconsin',
  '22': 'Canada',
};

function WinnerCard({ winner, index }: { winner: Winner; index: number }) {
  const seasonName = TOP_CHEF_SEASON_NAMES[winner.season];
  const restaurantPhotoUrl = winner.flagship?.photo_url
    ? getStorageUrl('restaurant-photos', winner.flagship.photo_url)
    : null;

  return (
    <div 
      className="group relative flex flex-col bg-white border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={{ 
        borderColor: 'var(--border-light)',
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div 
        className="absolute top-0 left-0 w-1.5 h-full"
        style={{ background: '#f59e0b' }}
      />

      <div className="relative h-40 overflow-hidden" style={{ background: 'var(--slate-900)' }}>
        {restaurantPhotoUrl ? (
          <Image
            src={restaurantPhotoUrl}
            alt={winner.flagship?.name || ''}
            fill
            className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute top-3 left-4 flex items-center gap-2">
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1"
            style={{ background: '#f59e0b' }}
          >
            <Trophy className="w-3.5 h-3.5 text-white" />
            <span className="font-mono text-[11px] font-bold tracking-wide text-white">
              S{winner.season}
            </span>
          </div>
          {seasonName && (
            <span className="font-mono text-[10px] tracking-wide text-white/80">
              {seasonName}
            </span>
          )}
        </div>

        {winner.flagship?.michelin_stars && winner.flagship.michelin_stars > 0 && (
          <div className="absolute top-3 right-3">
            <div 
              className="flex items-center gap-0.5 px-2 py-1"
              style={{ background: '#D3072B' }}
            >
              {Array.from({ length: winner.flagship.michelin_stars }).map((_, i) => (
                <MichelinStar key={i} size={10} className="text-white" />
              ))}
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-4 right-4">
          <Link 
            href={`/chefs/${winner.chef.slug}`}
            className="block group/chef"
          >
            <h3 className="font-display text-2xl font-bold text-white leading-tight group-hover/chef:text-amber-300 transition-colors">
              {winner.chef.name}
            </h3>
          </Link>
        </div>
      </div>

      {winner.flagship ? (
        <Link 
          href={`/restaurants/${winner.flagship.slug}`}
          className="flex-1 p-4 pl-5 flex flex-col justify-between group/restaurant hover:bg-slate-50 transition-colors"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-display text-lg font-semibold leading-tight group-hover/restaurant:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                {winner.flagship.name}
              </h4>
              {winner.flagship.price_tier && (
                <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: 'var(--accent-primary)' }}>
                  {winner.flagship.price_tier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="font-mono text-[11px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {winner.flagship.city}{winner.flagship.state ? `, ${winner.flagship.state}` : ''}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-end mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <span className="font-mono text-[10px] font-semibold tracking-wider flex items-center gap-1 group-hover/restaurant:gap-2 transition-all" style={{ color: 'var(--accent-primary)' }}>
              VISIT <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      ) : (
        <Link 
          href={`/chefs/${winner.chef.slug}`}
          className="flex-1 p-4 pl-5 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <span className="font-mono text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
            View chef profile →
          </span>
        </Link>
      )}
    </div>
  );
}

export function WinnersSpotlight({ winners, showName, showSlug }: WinnersSpotlightProps) {
  const winnersWithRestaurants = winners.filter(w => w.flagship);
  
  if (winnersWithRestaurants.length === 0) return null;

  const displayWinners = winnersWithRestaurants.slice(0, 6);

  return (
    <section className="py-12 border-b" style={{ background: 'white', borderColor: 'var(--border-light)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Where Winners Cook
            </h2>
            <p className="mt-2 font-ui text-sm" style={{ color: 'var(--text-secondary)' }}>
              {showName} champions and their flagship restaurants
            </p>
          </div>
          {winnersWithRestaurants.length > 6 && (
            <Link 
              href={`/shows/${showSlug}/winners`}
              className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider hover:gap-2.5 transition-all"
              style={{ color: 'var(--accent-primary)' }}
            >
              SEE ALL {winnersWithRestaurants.length} WINNERS <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayWinners.map((winner, index) => (
            <WinnerCard key={`${winner.chef.id}-s${winner.season}`} winner={winner} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
